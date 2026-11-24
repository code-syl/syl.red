<?php
declare(strict_types=1);

namespace Cute;

/**
 * Export everything to one JSON file and import it again (merge or replace).
 * Records reference each other with "ref" numbers instead of database ids,
 * so a backup can be restored into a fresh install with different ids.
 */
final class Backup
{
    public const FORMAT = 1;

    public static function export(int $uid): array
    {
        $foods = [];
        foreach (Db::all('SELECT * FROM foods WHERE user_id = ? ORDER BY id', [$uid]) as $f) {
            $foods[] = ['ref' => (int) $f['id'], 'name' => $f['name'], 'brand' => $f['brand'], 'kind' => $f['kind'],
                'nutrients' => json_decode($f['nutrients'], true), 'archived' => (bool) $f['archived']];
        }

        $meals = [];
        foreach (Db::all('SELECT * FROM meals WHERE user_id = ? ORDER BY id', [$uid]) as $m) {
            $items = array_map(fn ($i) => ['food_ref' => (int) $i['food_id'], 'amount' => (float) $i['amount']],
                Db::all('SELECT food_id, amount FROM meal_items WHERE meal_id = ? ORDER BY id', [$m['id']]));
            $meals[] = ['ref' => (int) $m['id'], 'name' => $m['name'], 'archived' => (bool) $m['archived'], 'items' => $items];
        }

        $entriesByDate = [];
        foreach (Db::all('SELECT * FROM entries WHERE user_id = ? ORDER BY date, id', [$uid]) as $e) {
            $entriesByDate[$e['date']][] = [
                'kind' => $e['kind'], 'name' => $e['name'], 'brand' => $e['brand'], 'unit' => $e['unit'], 'amount' => (float) $e['amount'],
                'per100' => json_decode($e['per100'], true),
                'food_ref' => $e['food_id'] !== null ? (int) $e['food_id'] : null,
                'meal_ref' => $e['meal_id'] !== null ? (int) $e['meal_id'] : null,
            ];
        }

        $days = [];
        foreach (Db::all('SELECT * FROM days WHERE user_id = ? ORDER BY date', [$uid]) as $d) {
            $days[] = [
                'date' => $d['date'], 'status' => $d['status'],
                'weight_kg' => $d['weight_kg'] !== null ? (float) $d['weight_kg'] : null,
                'height_cm' => $d['height_cm'] !== null ? (float) $d['height_cm'] : null,
                'water_ml' => (int) $d['water_ml'], 'closed_at' => $d['closed_at'],
                'entries' => $entriesByDate[$d['date']] ?? [],
            ];
        }

        return [
            'app' => 'cute.syl.red', 'format' => self::FORMAT, 'app_version' => APP_VERSION,
            'exported_at' => date('c'),
            'settings' => Settings::get($uid), 'foods' => $foods, 'meals' => $meals, 'days' => $days,
        ];
    }

    /** Validates a backup and returns a clean copy. Throws 422 with a readable message if anything is off. */
    public static function validate(array $b): array
    {
        if (($b['app'] ?? null) !== 'cute.syl.red' || ($b['format'] ?? null) !== self::FORMAT) {
            throw new HttpError(422, "This doesn't look like a cute.syl.red backup (or it's from a newer version).");
        }

        foreach (['foods', 'meals', 'days'] as $k) {
            if (!is_array($b[$k] ?? null) || !array_is_list($b[$k])) {
                throw new HttpError(422, "Backup is missing its $k list");
            }
        }

        if (count($b['foods']) > 20000 || count($b['meals']) > 5000 || count($b['days']) > 40000) {
            throw new HttpError(422, 'Backup is unexpectedly large');
        }

        $out = ['settings' => Settings::clean(is_array($b['settings'] ?? null) ? $b['settings'] : []), 'foods' => [], 'meals' => [], 'days' => []];
        $foodRefs = [];
        foreach ($b['foods'] as $i => $f) {
            if (!is_array($f)) {
                throw new HttpError(422, "Food #$i is invalid");
            }
            $ref = Valid::int($f['ref'] ?? null, "food #$i ref");
            $kind = in_array($f['kind'] ?? null, ['food', 'drink'], true) ? $f['kind'] : throw new HttpError(422, "Food #$i has an unknown kind");
            $out['foods'][] = ['ref' => $ref, 'name' => Valid::str($f['name'] ?? null, "food #$i name", 80),
                'brand' => Valid::str($f['brand'] ?? '', "food #$i brand", 60, true), 'kind' => $kind,
                'nutrients' => Valid::nutrients($f['nutrients'] ?? []), 'archived' => !empty($f['archived'])];
            $foodRefs[$ref] = true;
        }

        $mealRefs = [];
        foreach ($b['meals'] as $i => $m) {
            if (!is_array($m) || !is_array($m['items'] ?? null) || count($m['items']) > 50) {
                throw new HttpError(422, "Meal #$i is invalid");
            }
            $ref = Valid::int($m['ref'] ?? null, "meal #$i ref");
            $items = [];
            foreach ($m['items'] as $it) {
                $fr = Valid::int($it['food_ref'] ?? null, "meal #$i ingredient");
                if (!isset($foodRefs[$fr])) {
                    throw new HttpError(422, "Meal #$i uses a food that isn't in the backup");
                }
                $items[] = ['food_ref' => $fr, 'amount' => (float) Valid::num($it['amount'] ?? null, 'amount', 0.1, 10000)];
            }
            $out['meals'][] = ['ref' => $ref, 'name' => Valid::str($m['name'] ?? null, "meal #$i name", 80), 'archived' => !empty($m['archived']), 'items' => $items];
            $mealRefs[$ref] = true;
        }

        $seen = [];
        foreach ($b['days'] as $i => $d) {
            if (!is_array($d)) {
                throw new HttpError(422, "Day #$i is invalid");
            }

            $date = Valid::date($d['date'] ?? null, "day #$i date");
            if (isset($seen[$date])) {
                throw new HttpError(422, "Day $date appears twice");
            }

            $seen[$date] = true;
            $status = in_array($d['status'] ?? null, ['open', 'closed', 'skipped'], true) ? $d['status'] : throw new HttpError(422, "Day $date has an unknown status");
            $entries = [];
            if (!is_array($d['entries'] ?? []) || count($d['entries'] ?? []) > 500) {
                throw new HttpError(422, "Day $date has invalid entries");
            }

            foreach (($d['entries'] ?? []) as $e) {
                if (!is_array($e)) {
                    throw new HttpError(422, "Day $date has an invalid entry");
                }

                $fr = isset($e['food_ref']) ? Valid::int($e['food_ref'], 'food_ref') : null;
                $mr = isset($e['meal_ref']) ? Valid::int($e['meal_ref'], 'meal_ref') : null;
                $entries[] = [
                    'kind' => in_array($e['kind'] ?? null, ['food', 'drink', 'meal'], true) ? $e['kind'] : throw new HttpError(422, "Day $date has an entry with an unknown kind"),
                    'name' => Valid::str($e['name'] ?? null, 'entry name', 80),
                    'brand' => Valid::str($e['brand'] ?? '', 'entry brand', 60, true),
                    'unit' => in_array($e['unit'] ?? null, ['g', 'mL'], true) ? $e['unit'] : throw new HttpError(422, "Day $date has an entry with an unknown unit"),
                    'amount' => (float) Valid::num($e['amount'] ?? null, 'amount', 0.1, 10000),
                    'per100' => Valid::nutrients($e['per100'] ?? []),
                    'food_ref' => $fr !== null && isset($foodRefs[$fr]) ? $fr : null,
                    'meal_ref' => $mr !== null && isset($mealRefs[$mr]) ? $mr : null,
                ];
            }

            $closedAt = $d['closed_at'] ?? null;
            $out['days'][] = [
                'date' => $date, 'status' => $status,
                'weight_kg' => Valid::num($d['weight_kg'] ?? null, 'weight', 20, 400, true),
                'height_cm' => Valid::num($d['height_cm'] ?? null, 'height', 50, 260, true),
                'water_ml' => (int) Valid::num($d['water_ml'] ?? 0, 'water', 0, 20000),
                'closed_at' => is_string($closedAt) && preg_match('/^[\d\- :T+Z]{10,30}$/', $closedAt) ? $closedAt : null,
                'entries' => $entries,
            ];
        }

        $out['exported_at'] = is_string($b['exported_at'] ?? null) ? mb_substr($b['exported_at'], 0, 40) : null;
        
        return $out;
    }

    /**
     * Finds the existing food a backup food should update: same name, type and brand.
     * Backups made before brands existed have no brand, so those also match an existing
     * food with the same name and type whatever its brand is (no duplicates after you add brands).
     */
    private static function matchFood(int $uid, array $f): ?int
    {
        $row = Db::one(
            'SELECT id FROM foods WHERE user_id = ? AND lower(name) = lower(?) AND kind = ? AND lower(brand) = lower(?) ORDER BY archived, id LIMIT 1',
            [$uid, $f['name'], $f['kind'], $f['brand']]
        );
        if (!$row && $f['brand'] === '') {
            $row = Db::one(
                'SELECT id FROM foods WHERE user_id = ? AND lower(name) = lower(?) AND kind = ? ORDER BY archived, id LIMIT 1',
                [$uid, $f['name'], $f['kind']]
            );
        }
        return $row ? (int) $row['id'] : null;
    }

    public static function preview(int $uid, array $raw): array
    {
        $b = self::validate($raw);
        $currentFoods = (int) Db::one('SELECT COUNT(*) c FROM foods WHERE user_id = ?', [$uid])['c'];

        $existingMeals = [];
        foreach (Db::all('SELECT name FROM meals WHERE user_id = ?', [$uid]) as $m) {
            $existingMeals[mb_strtolower($m['name'])] = true;
        }

        $existingDays = [];
        foreach (Db::all('SELECT date FROM days WHERE user_id = ?', [$uid]) as $d) {
            $existingDays[$d['date']] = true;
        }

        $count = fn (array $list, callable $key, array $existing) => [
            'total' => count($list),
            'matching' => count(array_filter($list, fn ($x) => isset($existing[$key($x)]))),
        ];

        $dates = array_column($b['days'], 'date');
        sort($dates);

        return [
            'exported_at' => $b['exported_at'],
            'foods' => ['total' => count($b['foods']), 'matching' => count(array_filter($b['foods'], fn ($f) => self::matchFood($uid, $f) !== null))],
            'meals' => $count($b['meals'], fn ($m) => mb_strtolower($m['name']), $existingMeals),
            'days' => $count($b['days'], fn ($d) => $d['date'], $existingDays) + [
                'first' => $dates[0] ?? null, 'last' => $dates ? end($dates) : null,
                'entries' => array_sum(array_map(fn ($d) => count($d['entries']), $b['days'])),
            ],
            'current' => [
                'foods' => $currentFoods, 'meals' => count($existingMeals), 'days' => count($existingDays),
            ],
        ];
    }

    public static function import(int $uid, array $raw, string $mode): array
    {
        if (!in_array($mode, ['merge', 'replace'], true)) {
            throw new HttpError(422, 'mode must be merge or replace');
        }
        $b = self::validate($raw);

        Db::tx(function () use ($uid, $b, $mode) {
            if ($mode === 'replace') {
                Db::run('DELETE FROM entries WHERE user_id = ?', [$uid]);
                Db::run('DELETE FROM days WHERE user_id = ?', [$uid]);
                Db::run('DELETE FROM meals WHERE user_id = ?', [$uid]);   // cascades to meal_items
                Db::run('DELETE FROM foods WHERE user_id = ?', [$uid]);
            }
            Settings::save($uid, $b['settings']);

            $foodIds = [];
            foreach ($b['foods'] as $f) {
                $json = json_encode($f['nutrients'], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
                $existingId = self::matchFood($uid, $f);
                if ($existingId !== null) {
                    // A brandless (older) backup never wipes a brand you've added since.
                    Db::run("UPDATE foods SET name = ?, brand = CASE WHEN ? = '' THEN brand ELSE ? END, nutrients = ?, archived = ?, updated_at = datetime('now') WHERE id = ?",
                        [$f['name'], $f['brand'], $f['brand'], $json, $f['archived'] ? 1 : 0, $existingId]);
                    $foodIds[$f['ref']] = $existingId;
                } else {
                    Db::run('INSERT INTO foods (user_id, name, brand, kind, nutrients, archived) VALUES (?, ?, ?, ?, ?, ?)', [$uid, $f['name'], $f['brand'], $f['kind'], $json, $f['archived'] ? 1 : 0]);
                    $foodIds[$f['ref']] = Db::lastId();
                }
            }

            $mealIds = [];
            foreach ($b['meals'] as $m) {
                $existing = Db::one('SELECT id FROM meals WHERE user_id = ? AND lower(name) = lower(?) ORDER BY archived, id LIMIT 1', [$uid, $m['name']]);
                if ($existing) {
                    $id = (int) $existing['id'];
                    Db::run("UPDATE meals SET name = ?, archived = ?, updated_at = datetime('now') WHERE id = ?", [$m['name'], $m['archived'] ? 1 : 0, $id]);
                    Db::run('DELETE FROM meal_items WHERE meal_id = ?', [$id]);
                } else {
                    Db::run('INSERT INTO meals (user_id, name, archived) VALUES (?, ?, ?)', [$uid, $m['name'], $m['archived'] ? 1 : 0]);
                    $id = Db::lastId();
                }
                foreach ($m['items'] as $it) {
                    Db::run('INSERT INTO meal_items (meal_id, food_id, amount) VALUES (?, ?, ?)', [$id, $foodIds[$it['food_ref']], $it['amount']]);
                }
                $mealIds[$m['ref']] = $id;
            }

            foreach ($b['days'] as $d) {
                Db::run('DELETE FROM entries WHERE user_id = ? AND date = ?', [$uid, $d['date']]);
                Db::run(
                    'INSERT INTO days (user_id, date, status, weight_kg, height_cm, water_ml, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status, weight_kg = excluded.weight_kg,
                     height_cm = excluded.height_cm, water_ml = excluded.water_ml, closed_at = excluded.closed_at',
                    [$uid, $d['date'], $d['status'], $d['weight_kg'], $d['height_cm'], $d['water_ml'], $d['closed_at']]
                );
                
                foreach ($d['entries'] as $e) {
                    Db::run(
                        'INSERT INTO entries (user_id, date, kind, food_id, meal_id, name, brand, unit, amount, per100) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [$uid, $d['date'], $e['kind'], $e['food_ref'] !== null ? $foodIds[$e['food_ref']] : null,
                            $e['meal_ref'] !== null ? $mealIds[$e['meal_ref']] : null, $e['name'], $e['brand'], $e['unit'], $e['amount'],
                            json_encode($e['per100'], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION)]
                    );
                }
            }
        });
        return ['ok' => true, 'mode' => $mode, 'foods' => count($b['foods']), 'meals' => count($b['meals']), 'days' => count($b['days'])];
    }
}
