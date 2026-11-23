<?php
declare(strict_types=1);

use Cute\Auth;
use Cute\Backup;
use Cute\Days;
use Cute\Foods;
use Cute\Http;
use Cute\HttpError;
use Cute\Settings;
use Cute\Stats;
use Cute\Valid;

require dirname(__DIR__) . '/src/bootstrap.php';

Http::securityHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// ---------------------------------------------------------------------------
// Everything that isn't /api/ gets the app shell. The shell contains no data:
// the JavaScript asks /api/session whether you're logged in.
// ---------------------------------------------------------------------------
if (!str_starts_with($path, '/api/')) {
    if ($method !== 'GET' && $method !== 'HEAD') {
        http_response_code(405);
        exit;
    }

    $v = static fn (string $f) => rawurlencode((string) @filemtime(__DIR__ . '/assets/' . $f));
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');

    echo <<<HTML
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#FFF5F3">
    <title>cute.syl.red</title>
    <link rel="icon" href="/assets/img/icon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/app.css?v={$v('app.css')}">
    <script src="/assets/app.js?v={$v('app.js')}" defer></script>
    </head>
    <body>
    <div id="app" class="app" aria-live="polite"></div>
    <noscript>cute.syl.red needs JavaScript.</noscript>
    </body>
    </html>
    HTML;

    exit;
}

// ---------------------------------------------------------------------------
// JSON API
// ---------------------------------------------------------------------------
try {
    Auth::startSession();
    $isWrite = !in_array($method, ['GET', 'HEAD'], true);
    if ($isWrite) {
        Auth::checkOrigin();
    }

    // Public endpoints
    if ($path === '/api/session' && $method === 'GET') {
        $uid = Auth::userId();
        if ($uid === null) {
            Http::json(['loggedIn' => false]);
        }
        $user = \Cute\Db::one('SELECT username FROM users WHERE id = ?', [$uid]);
        if (!$user) {
            Auth::destroy();
            Http::json(['loggedIn' => false]);
        }
        Http::json(['loggedIn' => true, 'username' => $user['username'], 'csrf' => Auth::csrfToken(), 'settings' => Settings::get($uid)]);
    }
    if ($path === '/api/login' && $method === 'POST') {
        $in = Http::body(10_000);
        $res = Auth::login((string) ($in['username'] ?? ''), (string) ($in['password'] ?? ''));
        Http::json(['loggedIn' => true] + $res + ['settings' => Settings::get(Auth::requireUser())]);
    }

    // Everything below needs a logged-in user, and writes need the CSRF token.
    $uid = Auth::requireUser();
    if ($isWrite) {
        Auth::checkCsrf();
    }
    session_write_close();   // release the session lock so parallel requests don't queue

    $routes = [
        ['POST', '#^/api/logout$#', function () {
            session_start();
            Auth::destroy();
            return ['loggedIn' => false];
        }],
        ['GET', '#^/api/today$#', fn () => Days::current($uid)],
        ['POST', '#^/api/days/catch-up$#', fn () => Days::catchUp($uid)],
        ['GET', '#^/api/days/(\d{4}-\d{2}-\d{2})$#', fn ($d) => Days::bundle($uid, Valid::date($d))],
        ['PATCH', '#^/api/days/(\d{4}-\d{2}-\d{2})$#', fn ($d) => Days::patch($uid, Valid::date($d), Http::body())],
        ['POST', '#^/api/days/(\d{4}-\d{2}-\d{2})/(close|skip|reopen)$#', fn ($d, $a) => Days::setStatus($uid, Valid::date($d), $a)],
        ['POST', '#^/api/days/(\d{4}-\d{2}-\d{2})/entries$#', fn ($d) => Days::addEntry($uid, Valid::date($d), Http::body())],
        ['PATCH', '#^/api/entries/(\d+)$#', fn ($id) => Days::updateEntry($uid, (int) $id, Http::body())],
        ['DELETE', '#^/api/entries/(\d+)$#', fn ($id) => Days::deleteEntry($uid, (int) $id)],
        ['GET', '#^/api/calendar/(\d{4}-\d{2})$#', fn ($m) => Days::calendar($uid, $m)],

        ['GET', '#^/api/foods$#', fn () => Foods::list($uid)],
        ['POST', '#^/api/foods$#', fn () => Foods::saveFood($uid, Http::body())],
        ['PUT', '#^/api/foods/(\d+)$#', fn ($id) => Foods::saveFood($uid, Http::body(), (int) $id)],
        ['DELETE', '#^/api/foods/(\d+)$#', function ($id) use ($uid) { Foods::archiveFood($uid, (int) $id); return ['ok' => true]; }],
        ['POST', '#^/api/meals$#', fn () => Foods::saveMeal($uid, Http::body())],
        ['PUT', '#^/api/meals/(\d+)$#', fn ($id) => Foods::saveMeal($uid, Http::body(), (int) $id)],
        ['DELETE', '#^/api/meals/(\d+)$#', function ($id) use ($uid) { Foods::archiveMeal($uid, (int) $id); return ['ok' => true]; }],

        ['GET', '#^/api/settings$#', fn () => Settings::get($uid)],
        ['PUT', '#^/api/settings$#', fn () => Settings::save($uid, Http::body())],

        ['GET', '#^/api/stats$#', fn () => Stats::range($uid, Valid::date($_GET['from'] ?? null, 'from'), Valid::date($_GET['to'] ?? null, 'to'))],

        ['GET', '#^/api/export$#', function () use ($uid) {
            header('Content-Disposition: attachment; filename="cute-syl-red-backup-' . date('Y-m-d') . '.json"');
            
            return Backup::export($uid);
        }],
        ['POST', '#^/api/import/preview$#', fn () => Backup::preview($uid, Http::body((int) \Cute\config('max_import_bytes')))],
        ['POST', '#^/api/import/(merge|replace)$#', fn ($mode) => Backup::import($uid, Http::body((int) \Cute\config('max_import_bytes')), $mode)],
    ];

    $allowed = false;
    foreach ($routes as [$m, $re, $fn]) {
        if (preg_match($re, $path, $match)) {
            $allowed = true;
            if ($m === $method) {
                Http::json($fn(...array_slice($match, 1)));
            }
        }
    }

    throw new HttpError($allowed ? 405 : 404, $allowed ? 'Method not allowed' : 'Not found');
} catch (HttpError $e) {
    Http::json(['error' => $e->getMessage()], $e->status);
} catch (\Throwable $e) {
    error_log('[cute] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Http::json(['error' => 'Something went wrong on the server.'], 500);
}
