<?php
declare(strict_types=1);

/**
 * Manage login accounts from the command line. There is deliberately no sign-up page.
 *
 *   php bin/cute-user.php add <username>        create a user (asks for the password)
 *   php bin/cute-user.php passwd <username>     change a password
 *   php bin/cute-user.php remove <username>     delete a user and ALL their data
 *   php bin/cute-user.php list                  list users
 *   php bin/cute-user.php unlock <username>     clear failed-login lockouts
 *   php bin/cute-user.php check                 check PHP, paths and file ownership
 */

if (PHP_SAPI !== 'cli') {
    exit(1);
}

require dirname(__DIR__) . '/src/bootstrap.php';

use Cute\Db;

function askPassword(string $prompt): string
{
    $env = getenv('CUTE_PASSWORD');   // for scripted setups; avoid in shell history
    if ($env !== false && $env !== '') {
        return $env;
    }
    fwrite(STDOUT, $prompt);
    $tty = stream_isatty(STDIN);
    if ($tty) {
        shell_exec('stty -echo');
    }
    $pw = rtrim((string) fgets(STDIN), "\r\n");
    if ($tty) {
        shell_exec('stty echo');
        fwrite(STDOUT, PHP_EOL);
    }
    return $pw;
}

function newPassword(): string
{
    $a = askPassword('Password: ');
    if (strlen($a) < 12) {
        fwrite(STDERR, "Please use at least 12 characters.\n");
        exit(1);
    }
    if (getenv('CUTE_PASSWORD') === false && askPassword('Again: ') !== $a) {
        fwrite(STDERR, "Passwords don't match.\n");
        exit(1);
    }
    return password_hash($a, PASSWORD_ARGON2ID);
}

/**
 * When this script runs as root (sudo without -u www-data), SQLite creates the database
 * files owned by root, and php-fpm (www-data) then can't write to them: every login fails.
 * So after each command, give the files back to whoever owns the data folder.
 */
function fixOwnership(): void
{
    if (!function_exists('posix_geteuid') || posix_geteuid() !== 0) {
        return;
    }
    $db = (string) \Cute\config('db_path');
    $dir = dirname($db);
    $owner = @fileowner($dir);
    $group = @filegroup($dir);
    if ($owner === false || $owner === 0) {
        fwrite(STDERR, "Note: $dir is owned by root. Run: chown -R www-data:www-data $dir\n");
        return;
    }
    foreach ([$db, "$db-wal", "$db-shm"] as $f) {
        if (file_exists($f)) {
            @chown($f, $owner);
            @chgrp($f, $group);
        }
    }
}
register_shutdown_function('fixOwnership');

[$cmd, $name] = [$argv[1] ?? '', $argv[2] ?? ''];
switch ($cmd) {
    case 'add':
        if (!preg_match('/^[A-Za-z0-9_.-]{2,40}$/', $name)) {
            fwrite(STDERR, "Username: 2-40 letters, digits, dot, dash or underscore.\n");
            exit(1);
        }

        if (Db::one('SELECT 1 FROM users WHERE username = ?', [$name])) {
            fwrite(STDERR, "User exists already.\n");
            exit(1);
        }

        Db::run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [$name, newPassword()]);
        echo "Created $name.\n";

        break;
    case 'passwd':
        if (!Db::one('SELECT 1 FROM users WHERE username = ?', [$name])) {
            fwrite(STDERR, "No such user.\n");
            exit(1);
        }

        Db::run('UPDATE users SET password_hash = ? WHERE username = ?', [newPassword(), $name]);
        echo "Password changed. Existing sessions stay valid until they expire; delete the files in your session_path (e.g. /var/lib/cute/sessions/*) to log out everywhere.\n";

        break;
    case 'remove':
        $u = Db::one('SELECT id FROM users WHERE username = ?', [$name]);
        if (!$u) {
            fwrite(STDERR, "No such user.\n");
            exit(1);
        }

        fwrite(STDOUT, "Type the username again to delete it and all its data: ");
        if (trim((string) fgets(STDIN)) !== $name) {
            exit(1);
        }

        Db::tx(function () use ($u) {
            Db::run('DELETE FROM entries WHERE user_id = ?', [$u['id']]);
            Db::run('DELETE FROM days WHERE user_id = ?', [$u['id']]);
            Db::run('DELETE FROM meals WHERE user_id = ?', [$u['id']]);
            Db::run('DELETE FROM foods WHERE user_id = ?', [$u['id']]);
            Db::run('DELETE FROM settings WHERE user_id = ?', [$u['id']]);
            Db::run('DELETE FROM users WHERE id = ?', [$u['id']]);
        });

        echo "Removed $name.\n";

        break;
    case 'list':
        foreach (Db::all('SELECT username, created_at FROM users ORDER BY id') as $u) {
            echo $u['username'] . "\t(created " . $u['created_at'] . ")\n";
        }

        break;
    case 'check':
        // Quick health check of the server setup.
        $db = (string) \Cute\config('db_path');
        $sess = (string) \Cute\config('session_path');
        $rows = [
            ['PHP version >= 8.1', version_compare(PHP_VERSION, '8.1', '>='), PHP_VERSION],
            ['pdo_sqlite loaded', extension_loaded('pdo_sqlite'), ''],
            ['mbstring loaded', extension_loaded('mbstring'), 'CLI only: also check php-fpm (php-fpm8.3 -m | grep mbstring)'],
            ['Argon2id available', defined('PASSWORD_ARGON2ID'), ''],
            ['Data folder exists', is_dir(dirname($db)), dirname($db)],
            ['Database file', is_file($db), $db],
            ['Session folder', is_dir($sess), $sess],
        ];

        foreach ([$db, "$db-wal", "$db-shm", dirname($db), $sess] as $f) {
            if (file_exists($f)) {
                $o = function_exists('posix_getpwuid') ? (posix_getpwuid(fileowner($f))['name'] ?? fileowner($f)) : fileowner($f);
                $rows[] = ["owner of $f", $o !== 'root' && $o !== 0, (string) $o];
            }
        }

        foreach ($rows as [$label, $ok, $info]) {
            printf("%s  %-45s %s\n", $ok ? 'ok ' : 'BAD', $label, $info);
        }

        echo "Everything php-fpm touches should be owned by its user (usually www-data).\n";
        
        break;
    case 'unlock':
        Db::run('DELETE FROM login_attempts WHERE username = ? COLLATE NOCASE', [$name]);
        echo "Cleared failed attempts for $name.\n";

        break;
    default:
        fwrite(STDERR, "Usage: php bin/cute-user.php add|passwd|remove|list|unlock <username> | check\n");
        exit(1);
}
