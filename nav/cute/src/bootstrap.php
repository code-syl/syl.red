<?php
declare(strict_types=1);

namespace Cute;

const APP_VERSION = '1.0.0';

$configFile = dirname(__DIR__) . '/config.php';
if (!is_file($configFile)) {
    $configFile = dirname(__DIR__) . '/config.example.php';
}

/** @var array<string,mixed> $CONFIG */
$GLOBALS['CUTE_CONFIG'] = require $configFile;

function config(string $key): mixed
{
    return $GLOBALS['CUTE_CONFIG'][$key] ?? null;
}

date_default_timezone_set((string) config('timezone'));

if (PHP_SAPI !== 'cli') {
    // Never print PHP errors to the browser; they go to the php-fpm error log instead.
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('expose_php', '0');
}

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'Cute\\')) {
        return;
    }
    
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, 5)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
