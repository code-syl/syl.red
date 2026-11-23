<?php
declare(strict_types=1);

namespace Cute;

/** Input validation helpers. Everything from the outside world is checked here before it touches the DB. */
final class Valid
{
    /** Macro nutrients, always stored per 100 g / 100 mL. */
    public const MACROS = ['kcal', 'protein', 'carbs', 'sugar', 'fat', 'satfat', 'fiber', 'salt'];

    public static function str(mixed $v, string $field, int $max = 120, bool $allowEmpty = false): string
    {
        if (!is_string($v)) {
            throw new HttpError(422, "$field must be text");
        }

        $v = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $v) ?? '');
        if (!$allowEmpty && $v === '') {
            throw new HttpError(422, "$field is required");
        }

        if (mb_strlen($v) > $max) {
            throw new HttpError(422, "$field is too long (max $max)");
        }

        return $v;
    }

    public static function num(mixed $v, string $field, float $min, float $max, bool $nullable = false): ?float
    {
        if ($v === null || $v === '') {
            if ($nullable) {
                return null;
            }
            throw new HttpError(422, "$field is required");
        }

        if (is_string($v) && is_numeric($v)) {
            $v = (float) $v;
        }

        if (!is_int($v) && !is_float($v)) {
            throw new HttpError(422, "$field must be a number");
        }

        $v = (float) $v;
        if (!is_finite($v) || $v < $min || $v > $max) {
            throw new HttpError(422, "$field must be between $min and $max");
        }

        return round($v, 3);
    }

    public static function int(mixed $v, string $field): int
    {
        if (is_string($v) && ctype_digit($v)) {
            $v = (int) $v;
        }

        if (!is_int($v) || $v < 1) {
            throw new HttpError(422, "$field must be a positive id");
        }

        return $v;
    }

    public static function date(mixed $v, string $field = 'date'): string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            throw new HttpError(422, "$field must look like YYYY-MM-DD");
        }

        [$y, $m, $d] = array_map('intval', explode('-', $v));
        if (!checkdate($m, $d, $y) || $y < 1970 || $y > 2200) {
            throw new HttpError(422, "$field is not a real date");
        }

        return $v;
    }

    /**
     * Normalises a nutrients object: {kcal, protein, ..., micros: {"Iron (mg)": 1.2}}.
     * @return array{kcal:float,protein:float,carbs:float,sugar:float,fat:float,satfat:float,fiber:float,salt:float,micros:array<string,float>}
     */
    public static function nutrients(mixed $n): array
    {
        if (!is_array($n)) {
            throw new HttpError(422, 'nutrients must be an object');
        }

        $out = [];
        foreach (self::MACROS as $k) {
            $max = $k === 'kcal' ? 2000 : 1000;   // per 100 g, so 1000 g of anything is impossible already
            $out[$k] = (float) (self::num($n[$k] ?? 0, $k, 0, $max) ?? 0);
        }

        $micros = [];
        $in = $n['micros'] ?? [];
        if (!is_array($in)) {
            throw new HttpError(422, 'micros must be an object');
        }

        if (count($in) > 40) {
            throw new HttpError(422, 'Too many micronutrients (max 40)');
        }

        foreach ($in as $name => $val) {
            $name = self::str((string) $name, 'micronutrient name', 40);
            if ($val === null || $val === '') {
                continue;
            }
            $micros[$name] = (float) self::num($val, $name, 0, 100000);
        }

        $out['micros'] = $micros;

        return $out;
    }

    /** Scales a per-100 nutrients array to an amount. */
    public static function scale(array $per100, float $amount): array
    {
        $f = $amount / 100;
        $out = [];
        foreach (self::MACROS as $k) {
            $out[$k] = round(((float) ($per100[$k] ?? 0)) * $f, 2);
        }

        $out['micros'] = [];
        foreach (($per100['micros'] ?? []) as $name => $v) {
            $out['micros'][$name] = round((float) $v * $f, 3);
        }

        return $out;
    }

    public static function add(array $a, array $b): array
    {
        foreach (self::MACROS as $k) {
            $a[$k] = round(($a[$k] ?? 0) + ($b[$k] ?? 0), 2);
        }

        $a['micros'] ??= [];
        foreach (($b['micros'] ?? []) as $name => $v) {
            $a['micros'][$name] = round(($a['micros'][$name] ?? 0) + $v, 3);
        }

        return $a;
    }

    public static function zero(): array
    {
        $z = array_fill_keys(self::MACROS, 0.0);
        $z['micros'] = [];
        
        return $z;
    }
}
