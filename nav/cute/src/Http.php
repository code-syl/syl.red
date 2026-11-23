<?php
declare(strict_types=1);

namespace Cute;

final class Http
{
    public static function securityHeaders(): void
    {
        // Defence in depth: nginx sends these too, but PHP sets them in case the config is missed.
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()');
        header('Cross-Origin-Opener-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-origin');
    }

    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
        exit;
    }

    /** Reads a JSON request body. Requiring application/json also blocks cross-site HTML form posts. */
    public static function body(int $maxBytes = 1_000_000): array
    {
        $type = $_SERVER['CONTENT_TYPE'] ?? '';
        if (!str_starts_with(strtolower($type), 'application/json')) {
            throw new HttpError(415, 'Expected application/json');
        }

        $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($len > $maxBytes) {
            throw new HttpError(413, 'Request too large');
        }

        $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
        if ($raw === false || strlen($raw) > $maxBytes) {
            throw new HttpError(413, 'Request too large');
        }

        if ($raw === '') {
            return [];
        }
        
        try {
            $data = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpError(400, 'Invalid JSON');
        }
        if (!is_array($data)) {
            throw new HttpError(400, 'Expected a JSON object');
        }

        return $data;
    }
}
