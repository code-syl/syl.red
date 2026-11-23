<?php
declare(strict_types=1);

namespace Cute;

/** Per-day numbers for the Stats page. The browser groups them into weeks/months for long ranges. */
final class Stats
{
    public static function range(int $uid, string $from, string $to): array
    {
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }

        $span = (new \DateTimeImmutable($from))->diff(new \DateTimeImmutable($to))->days;
        if ($span > 366 * 30) {
            throw new HttpError(422, 'Range too long (max 30 years)');
        }

        $days = [];
        foreach (Db::all('SELECT date, status, weight_kg, height_cm, water_ml FROM days WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date', [$uid, $from, $to]) as $d) {
            $days[$d['date']] = [
                'date' => $d['date'], 'status' => $d['status'],
                'weight_kg' => $d['weight_kg'] !== null ? (float) $d['weight_kg'] : null,
                'bmi' => Days::bmi($d['weight_kg'], $d['height_cm']),
                'water_ml' => (int) $d['water_ml'],
                'totals' => Valid::zero(),
            ];
        }

        foreach (Db::all('SELECT date, amount, per100 FROM entries WHERE user_id = ? AND date BETWEEN ? AND ?', [$uid, $from, $to]) as $e) {
            if (!isset($days[$e['date']])) {
                continue;
            }
            $days[$e['date']]['totals'] = Valid::add($days[$e['date']]['totals'], Valid::scale(json_decode($e['per100'], true), (float) $e['amount']));
        }

        $first = Db::one('SELECT MIN(date) d FROM days WHERE user_id = ?', [$uid])['d'] ?? null;
        
        return ['from' => $from, 'to' => $to, 'first_date' => $first, 'today' => Days::today(), 'days' => array_values($days)];
    }
}
