<?php
declare(strict_types=1);

namespace Cute;

/** Food library: single foods/drinks (nutrients per 100 g or mL) and meals (lists of foods with amounts). */
final class Foods
{
    public static function list(int $uid): array
    {
        $foods = array_map([self::class, 'foodOut'], Db::all(
            'SELECT * FROM foods WHERE user_id = ? AND archived = 0 ORDER BY name COLLATE NOCASE', [$uid]
        ));
        $meals = array_map(fn ($m) => self::mealOut($uid, $m), Db::all(
            'SELECT * FROM meals WHERE user_id = ? AND archived = 0 ORDER BY name COLLATE NOCASE', [$uid]
        ));

        return ['foods' => $foods, 'meals' => $meals];
    }

    public static function foodOut(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'kind' => $row['kind'],
            'unit' => $row['kind'] === 'drink' ? 'mL' : 'g',
            'nutrients' => json_decode($row['nutrients'], true),
            'updated_at' => $row['updated_at'],
        ];
    }

    public static function getFood(int $uid, int $id, bool $allowArchived = true): array
    {
        $row = Db::one('SELECT * FROM foods WHERE id = ? AND user_id = ?' . ($allowArchived ? '' : ' AND archived = 0'), [$id, $uid]);
        if (!$row) {
            throw new HttpError(404, 'Food not found');
        }

        return self::foodOut($row);
    }

    public static function saveFood(int $uid, array $in, ?int $id = null): array
    {
        $name = Valid::str($in['name'] ?? null, 'name', 80);
        $kind = in_array($in['kind'] ?? null, ['food', 'drink'], true) ? $in['kind'] : throw new HttpError(422, 'kind must be food or drink');
        $nutrients = Valid::nutrients($in['nutrients'] ?? []);
        $json = json_encode($nutrients, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
        if ($id === null) {
            Db::run('INSERT INTO foods (user_id, name, kind, nutrients) VALUES (?, ?, ?, ?)', [$uid, $name, $kind, $json]);
            $id = Db::lastId();
        } else {
            self::getFood($uid, $id, false);
            Db::run("UPDATE foods SET name = ?, kind = ?, nutrients = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", [$name, $kind, $json, $id, $uid]);
        }

        return self::getFood($uid, $id);
    }

    public static function archiveFood(int $uid, int $id): void
    {
        self::getFood($uid, $id);
        Db::run('UPDATE foods SET archived = 1 WHERE id = ? AND user_id = ?', [$id, $uid]);
    }

    public static function mealOut(int $uid, array $meal): array
    {
        $items = Db::all(
            'SELECT mi.food_id, mi.amount, f.name, f.kind, f.nutrients FROM meal_items mi JOIN foods f ON f.id = mi.food_id WHERE mi.meal_id = ? ORDER BY mi.id',
            [$meal['id']]
        );
        $total = Valid::zero();
        $weight = 0.0;
        $outItems = [];
        foreach ($items as $it) {
            $per100 = json_decode($it['nutrients'], true);
            $total = Valid::add($total, Valid::scale($per100, (float) $it['amount']));
            $weight += (float) $it['amount'];
            $outItems[] = [
                'food_id' => (int) $it['food_id'], 'name' => $it['name'],
                'unit' => $it['kind'] === 'drink' ? 'mL' : 'g', 'amount' => (float) $it['amount'],
            ];
        }

        return [
            'id' => (int) $meal['id'],
            'name' => $meal['name'],
            'items' => $outItems,
            'weight' => round($weight, 1),
            'totals' => $total,
            // Per 100 g of the finished meal, so you can log "I ate 250 g of it".
            'per100' => $weight > 0 ? Valid::scale($total, 100 / $weight * 100) : Valid::zero(),
        ];
    }

    public static function getMeal(int $uid, int $id): array
    {
        $row = Db::one('SELECT * FROM meals WHERE id = ? AND user_id = ?', [$id, $uid]);
        if (!$row) {
            throw new HttpError(404, 'Meal not found');
        }

        return self::mealOut($uid, $row);
    }

    public static function saveMeal(int $uid, array $in, ?int $id = null): array
    {
        $name = Valid::str($in['name'] ?? null, 'name', 80);
        $items = $in['items'] ?? null;
        if (!is_array($items) || count($items) === 0 || count($items) > 50) {
            throw new HttpError(422, 'A meal needs between 1 and 50 ingredients');
        }

        $clean = [];
        foreach ($items as $i => $it) {
            if (!is_array($it)) {
                throw new HttpError(422, 'Invalid ingredient');
            }
            $foodId = Valid::int($it['food_id'] ?? null, "ingredient $i");
            self::getFood($uid, $foodId);   // must belong to this user
            $clean[] = [$foodId, (float) Valid::num($it['amount'] ?? null, 'amount', 0.1, 10000)];
        }

        return Db::tx(function () use ($uid, $name, $clean, $id) {
            if ($id === null) {
                Db::run('INSERT INTO meals (user_id, name) VALUES (?, ?)', [$uid, $name]);
                $id = Db::lastId();
            } else {
                self::getMeal($uid, $id);
                Db::run("UPDATE meals SET name = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", [$name, $id, $uid]);
                Db::run('DELETE FROM meal_items WHERE meal_id = ?', [$id]);
            }
            foreach ($clean as [$foodId, $amount]) {
                Db::run('INSERT INTO meal_items (meal_id, food_id, amount) VALUES (?, ?, ?)', [$id, $foodId, $amount]);
            }
            
            return self::getMeal($uid, $id);
        });
    }

    public static function archiveMeal(int $uid, int $id): void
    {
        self::getMeal($uid, $id);
        Db::run('UPDATE meals SET archived = 1 WHERE id = ? AND user_id = ?', [$id, $uid]);
    }
}
