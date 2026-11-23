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
    case 'unlock':
        Db::run('DELETE FROM login_attempts WHERE username = ? COLLATE NOCASE', [$name]);
        echo "Cleared failed attempts for $name.\n";
        
        break;
    default:
        fwrite(STDERR, "Usage: php bin/cute-user.php add|passwd|remove|list|unlock <username>\n");
        exit(1);
}
