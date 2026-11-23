<?php
declare(strict_types=1);

namespace Cute;

/**
 * Days and what was eaten on them.
 *
 * A day stays "open" until you End it or Skip it. The "current day" is the oldest open day.
 * When nothing is open, the next calendar day after the last one you logged is opened
 * (never a day in the future), with weight and height copied from your latest values.
 */
final class Days
{
    public static function today(): string
    {
        return date('Y-m-d');
    }

    private static function nextDate(string $date): string
    {
        return (new \DateTimeImmutable($date))->modify('+1 day')->format('Y-m-d');
    }

    /** Returns the date of the current day, creating it when needed, or null when today is already closed. */
    public static function currentDate(int $uid): ?string
    {
        $open = Db::one("SELECT date FROM days WHERE user_id = ? AND status = 'open' ORDER BY date LIMIT 1", [$uid]);
        if ($open) {
            return $open['date'];
        }

        $last = Db::one('SELECT MAX(date) d FROM days WHERE user_id = ?', [$uid])['d'] ?? null;
        $next = $last ? self::nextDate($last) : self::today();
        if ($next > self::today()) {
            return null;
        }

        self::create($uid, $next, 'open');

        return $next;
    }

    private static function create(int $uid, string $date, string $status): void
    {
        $prev = Db::one('SELECT weight_kg, height_cm FROM days WHERE user_id = ? AND date < ? AND (weight_kg IS NOT NULL OR height_cm IS NOT NULL) ORDER BY date DESC LIMIT 1', [$uid, $date]);
        $height = $prev['height_cm'] ?? null;
        if ($height === null) {
            $height = Db::one('SELECT height_cm FROM days WHERE user_id = ? AND height_cm IS NOT NULL ORDER BY date DESC LIMIT 1', [$uid])['height_cm'] ?? null;
        }

        Db::run(
            'INSERT OR IGNORE INTO days (user_id, date, status, weight_kg, height_cm, water_ml) VALUES (?, ?, ?, ?, ?, 0)',
            [$uid, $date, $status, $status === 'skipped' ? null : ($prev['weight_kg'] ?? null), $height]
        );
    }

    /** Makes sure a row exists for a past or present date that you want to edit. */
    private static function ensure(int $uid, string $date): array
    {
        if ($date > self::today()) {
            throw new HttpError(422, "You can't log days in the future");
        }

        $row = Db::one('SELECT * FROM days WHERE user_id = ? AND date = ?', [$uid, $date]);
        if (!$row) {
            self::create($uid, $date, 'closed');
            $row = Db::one('SELECT * FROM days WHERE user_id = ? AND date = ?', [$uid, $date]);
        }

        return $row;
    }

    public static function bundle(int $uid, string $date): array
    {
        $row = Db::one('SELECT * FROM days WHERE user_id = ? AND date = ?', [$uid, $date]);
        $entries = Db::all('SELECT * FROM entries WHERE user_id = ? AND date = ? ORDER BY id', [$uid, $date]);
        $totals = Valid::zero();
        $outEntries = [];
        foreach ($entries as $e) {
            $t = Valid::scale(json_decode($e['per100'], true), (float) $e['amount']);
            $totals = Valid::add($totals, $t);
            $outEntries[] = [
                'id' => (int) $e['id'], 'kind' => $e['kind'], 'name' => $e['name'], 'unit' => $e['unit'],
                'amount' => (float) $e['amount'], 'food_id' => $e['food_id'] !== null ? (int) $e['food_id'] : null,
                'meal_id' => $e['meal_id'] !== null ? (int) $e['meal_id'] : null, 'totals' => $t,
            ];
        }

        $weight = $row['weight_kg'] ?? null;
        $height = $row['height_cm'] ?? null;
        if ($height === null) {
            $height = Db::one('SELECT height_cm FROM days WHERE user_id = ? AND height_cm IS NOT NULL ORDER BY date DESC LIMIT 1', [$uid])['height_cm'] ?? null;
        }

        return [
            'date' => $date,
            'today' => self::today(),
            'status' => $row['status'] ?? 'none',
            'weight_kg' => $weight !== null ? (float) $weight : null,
            'height_cm' => $height !== null ? (float) $height : null,
            'bmi' => self::bmi($weight, $height),
            'water_ml' => (int) ($row['water_ml'] ?? 0),
            'entries' => $outEntries,
            'totals' => $totals,
            'is_current' => ($row['status'] ?? '') === 'open'
                && $date === (Db::one("SELECT MIN(date) d FROM days WHERE user_id = ? AND status = 'open'", [$uid])['d'] ?? null),
        ];
    }

    public static function bmi(mixed $weight, mixed $height): ?float
    {
        if ($weight === null || $height === null || (float) $height <= 0) {
            return null;
        }

        $m = (float) $height / 100;

        return round((float) $weight / ($m * $m), 1);
    }

    public static function current(int $uid): array
    {
        $date = self::currentDate($uid);
        if ($date === null) {
            $b = self::bundle($uid, self::today());
            $b['done'] = true;
            return $b;
        }

        $b = self::bundle($uid, $date);
        $b['done'] = false;
        $b['behind'] = $date < self::today();

        return $b;
    }

    public static function patch(int $uid, string $date, array $in): array
    {
        self::ensure($uid, $date);
        $sets = [];
        $params = [];
        if (array_key_exists('weight_kg', $in)) {
            $sets[] = 'weight_kg = ?';
            $params[] = Valid::num($in['weight_kg'], 'weight', 20, 400, true);
        }

        if (array_key_exists('height_cm', $in)) {
            $sets[] = 'height_cm = ?';
            $params[] = Valid::num($in['height_cm'], 'height', 50, 260, true);
        }

        if (array_key_exists('water_ml', $in)) {
            $sets[] = 'water_ml = ?';
            $params[] = (int) Valid::num($in['water_ml'], 'water', 0, 20000);
        }

        if ($sets) {
            $params[] = $uid;
            $params[] = $date;
            Db::run('UPDATE days SET ' . implode(', ', $sets) . ' WHERE user_id = ? AND date = ?', $params);
        }

        return self::bundle($uid, $date);
    }

    public static function addEntry(int $uid, string $date, array $in): array
    {
        self::ensure($uid, $date);
        $amount = (float) Valid::num($in['amount'] ?? null, 'amount', 0.1, 10000);
        if (!empty($in['meal_id'])) {
            $meal = Foods::getMeal($uid, Valid::int($in['meal_id'], 'meal_id'));
            if ($meal['weight'] <= 0) {
                throw new HttpError(422, 'This meal has no ingredients');
            }

            Db::run(
                'INSERT INTO entries (user_id, date, kind, meal_id, name, unit, amount, per100) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$uid, $date, 'meal', $meal['id'], $meal['name'], 'g', $amount, json_encode($meal['per100'], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION)]
            );
        } else {
            $food = Foods::getFood($uid, Valid::int($in['food_id'] ?? null, 'food_id'));
            Db::run(
                'INSERT INTO entries (user_id, date, kind, food_id, name, unit, amount, per100) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$uid, $date, $food['kind'], $food['id'], $food['name'], $food['unit'], $amount, json_encode($food['nutrients'], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION)]
            );
        }

        return self::bundle($uid, $date);
    }

    private static function entry(int $uid, int $id): array
    {
        $e = Db::one('SELECT * FROM entries WHERE id = ? AND user_id = ?', [$id, $uid]);
        if (!$e) {
            throw new HttpError(404, 'Entry not found');
        }

        return $e;
    }

    public static function updateEntry(int $uid, int $id, array $in): array
    {
        $e = self::entry($uid, $id);
        $amount = (float) Valid::num($in['amount'] ?? null, 'amount', 0.1, 10000);
        Db::run('UPDATE entries SET amount = ? WHERE id = ? AND user_id = ?', [$amount, $id, $uid]);

        return self::bundle($uid, $e['date']);
    }

    public static function deleteEntry(int $uid, int $id): array
    {
        $e = self::entry($uid, $id);
        Db::run('DELETE FROM entries WHERE id = ? AND user_id = ?', [$id, $uid]);

        return self::bundle($uid, $e['date']);
    }

    public static function setStatus(int $uid, string $date, string $action): array
    {
        self::ensure($uid, $date);
        Db::tx(function () use ($uid, $date, $action) {
            match ($action) {
                'close' => Db::run("UPDATE days SET status = 'closed', closed_at = datetime('now') WHERE user_id = ? AND date = ?", [$uid, $date]),
                'reopen' => Db::run("UPDATE days SET status = 'open', closed_at = NULL WHERE user_id = ? AND date = ?", [$uid, $date]),
                'skip' => (function () use ($uid, $date) {
                    // Skipping closes the day with no information.
                    Db::run('DELETE FROM entries WHERE user_id = ? AND date = ?', [$uid, $date]);
                    Db::run("UPDATE days SET status = 'skipped', closed_at = datetime('now'), water_ml = 0, weight_kg = NULL WHERE user_id = ? AND date = ?", [$uid, $date]);
                })(),
                default => throw new HttpError(404, 'Unknown action'),
            };
        });

        return self::bundle($uid, $date);
    }

    /** Skips every empty open day before today and fills gaps, so you land on today. */
    public static function catchUp(int $uid): array
    {
        $today = self::today();
        Db::tx(function () use ($uid, $today) {
            $blocking = Db::one("SELECT d.date FROM days d WHERE d.user_id = ? AND d.status = 'open' AND d.date < ? AND (d.water_ml > 0 OR EXISTS (SELECT 1 FROM entries e WHERE e.user_id = d.user_id AND e.date = d.date)) ORDER BY d.date LIMIT 1", [$uid, $today]);
            if ($blocking) {
                throw new HttpError(409, 'Day ' . $blocking['date'] . ' still has food or water logged. End it first, or skip it on purpose.');
            }
            Db::run("UPDATE days SET status = 'skipped', closed_at = datetime('now'), water_ml = 0, weight_kg = NULL WHERE user_id = ? AND status = 'open' AND date < ?", [$uid, $today]);
            $last = Db::one('SELECT MAX(date) d FROM days WHERE user_id = ? AND date < ?', [$uid, $today])['d'] ?? null;
            if ($last) {
                for ($d = self::nextDate($last); $d < $today; $d = self::nextDate($d)) {
                    self::create($uid, $d, 'skipped');
                }
            }
        });

        return self::current($uid);
    }

    public static function calendar(int $uid, string $month): array
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            throw new HttpError(422, 'month must look like YYYY-MM');
        }

        $rows = Db::all("SELECT date, status FROM days WHERE user_id = ? AND date LIKE ? ORDER BY date", [$uid, $month . '-%']);
        
        return ['month' => $month, 'today' => self::today(), 'days' => $rows,
            'current' => Db::one("SELECT MIN(date) d FROM days WHERE user_id = ? AND status = 'open'", [$uid])['d'] ?? null];
    }
}
