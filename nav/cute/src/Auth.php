<?php
declare(strict_types=1);

namespace Cute;

/**
 * Login, sessions and CSRF protection.
 *
 * - Passwords: Argon2id hashes (password_hash), created only from the command line (bin/cute-user.php).
 * - Sessions: HttpOnly + Secure + SameSite=Strict cookie, strict mode, ID regenerated on login.
 * - CSRF: every state-changing API call must send the per-session token in the X-CSRF-Token header.
 * - Brute force: failed logins are counted per username and per IP; over the limit you get HTTP 429.
 */
final class Auth
{
    private const DUMMY_HASH = '$argon2id$v=19$m=65536,t=4,p=1$MWpDMlZ5T3RKWFBWNjF0aA$BeD6BRgLmzMy5O25Fka029YMG7N4VN4tLlWG12DAURk';

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $path = (string) config('session_path');
        if (!is_dir($path)) {
            mkdir($path, 0700, true);
        }

        $lifetime = (int) config('session_lifetime');
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string) $lifetime);
        ini_set('session.sid_length', '48');
        ini_set('session.sid_bits_per_character', '6');
        session_save_path($path);
        session_name('cute_sid');
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => (bool) config('secure_cookies'),
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();

        // Absolute expiry, independent of the cookie.
        if (isset($_SESSION['created']) && time() - (int) $_SESSION['created'] > $lifetime) {
            self::destroy();
            session_start();
        }
    }

    public static function userId(): ?int
    {
        return isset($_SESSION['uid']) ? (int) $_SESSION['uid'] : null;
    }

    public static function requireUser(): int
    {
        $uid = self::userId();
        if ($uid === null) {
            throw new HttpError(401, 'Not logged in');
        }

        // Make sure the account still exists (e.g. removed via CLI).
        if (!Db::one('SELECT 1 FROM users WHERE id = ?', [$uid])) {
            self::destroy();
            throw new HttpError(401, 'Not logged in');
        }

        return $uid;
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf'];
    }

    public static function checkCsrf(): void
    {
        $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $expected = $_SESSION['csrf'] ?? '';
        if ($expected === '' || !is_string($sent) || !hash_equals($expected, $sent)) {
            throw new HttpError(403, 'Invalid CSRF token');
        }
    }

    /** Rejects requests whose Origin header (sent by browsers on POST/PUT/DELETE) is another site. */
    public static function checkOrigin(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        if ($origin === null) {
            return;
        }

        $host = $_SERVER['HTTP_HOST'] ?? '';
        $originHost = parse_url($origin, PHP_URL_HOST);
        $originPort = parse_url($origin, PHP_URL_PORT);
        $full = $originHost . ($originPort ? ':' . $originPort : '');
        if (!is_string($originHost) || !hash_equals(strtolower($host), strtolower($full))) {
            throw new HttpError(403, 'Cross-origin request blocked');
        }
    }

    public static function login(string $username, string $password): array
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $username = trim($username);
        $now = time();
        $window = $now - (int) config('failure_window_seconds');

        Db::run('DELETE FROM login_attempts WHERE at < ?', [$now - 86400]);
        $userFails = (int) Db::one('SELECT COUNT(*) c FROM login_attempts WHERE username = ? COLLATE NOCASE AND success = 0 AND at >= ?', [$username, $window])['c'];
        $ipFails = (int) Db::one('SELECT COUNT(*) c FROM login_attempts WHERE ip = ? AND success = 0 AND at >= ?', [$ip, $window])['c'];
        if ($userFails >= (int) config('max_failures_per_user') || $ipFails >= (int) config('max_failures_per_ip')) {
            throw new HttpError(429, 'Too many attempts. Take a little break and try again in a few minutes.');
        }

        $user = $username === '' ? null : Db::one('SELECT id, username, password_hash FROM users WHERE username = ?', [$username]);
        // Always run a hash check, so a wrong username takes as long as a wrong password.
        $ok = password_verify($password, $user['password_hash'] ?? self::DUMMY_HASH) && $user !== null;

        Db::run('INSERT INTO login_attempts (ip, username, success, at) VALUES (?, ?, ?, ?)', [$ip, mb_substr($username, 0, 100), $ok ? 1 : 0, $now]);
        if (!$ok) {
            usleep(random_int(200_000, 400_000));
            throw new HttpError(401, 'That username and password don\'t match.');
        }

        if (password_needs_rehash($user['password_hash'], PASSWORD_ARGON2ID)) {
            Db::run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_ARGON2ID), $user['id']]);
        }

        session_regenerate_id(true);   // prevents session fixation
        $_SESSION = [
            'uid' => (int) $user['id'],
            'created' => $now,
            'csrf' => bin2hex(random_bytes(32)),
        ];
        
        return ['username' => $user['username'], 'csrf' => $_SESSION['csrf']];
    }

    public static function destroy(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 3600,
                'path' => $p['path'],
                'secure' => $p['secure'],
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
            session_destroy();
        }
    }
}
