<?php
declare(strict_types=1);

namespace Cute;

final class Settings
{
    public const THEMES = ['light', 'dark', 'mocha', 'auto'];

    public static function defaults(): array
    {
        return [
            'goals' => ['kcal' => 1800, 'protein' => 110, 'carbs' => 220, 'fat' => 60, 'fiber' => 25, 'water_ml' => 2000],
            'theme' => 'auto',
        ];
    }

    public static function get(int $uid): array
    {
        $row = Db::one('SELECT data FROM settings WHERE user_id = ?', [$uid]);
        $data = $row ? json_decode($row['data'], true) : [];
        $d = self::defaults();

        return [
            'goals' => array_merge($d['goals'], is_array($data['goals'] ?? null) ? $data['goals'] : []),
            'theme' => in_array($data['theme'] ?? null, self::THEMES, true) ? $data['theme'] : $d['theme'],
        ];
    }

    public static function clean(array $in, ?array $base = null): array
    {
        $s = $base ?? self::defaults();
        if (isset($in['goals'])) {
            if (!is_array($in['goals'])) {
                throw new HttpError(422, 'goals must be an object');
            }
            $limits = ['kcal' => 10000, 'protein' => 1000, 'carbs' => 2000, 'fat' => 1000, 'fiber' => 500, 'water_ml' => 20000];
            foreach ($limits as $k => $max) {
                if (array_key_exists($k, $in['goals'])) {
                    $s['goals'][$k] = Valid::num($in['goals'][$k], $k, 0, $max);
                }
            }
        }

        if (isset($in['theme'])) {
            if (!in_array($in['theme'], self::THEMES, true)) {
                throw new HttpError(422, 'Unknown theme');
            }
            $s['theme'] = $in['theme'];
        }

        return $s;
    }

    public static function save(int $uid, array $in): array
    {
        $s = self::clean($in, self::get($uid));
        Db::run(
            'INSERT INTO settings (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data',
            [$uid, json_encode($s, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION)]
        );
        
        return $s;
    }
}
