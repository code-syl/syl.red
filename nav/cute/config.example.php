<?php
// Copy to config.php and adjust. config.php is NOT web-accessible (it lives outside public/).
return [
    // Absolute path to the SQLite database file. Keep it OUTSIDE any web root.
    // The folder must be writable by php-fpm (www-data) and nobody else: chmod 700.
    'db_path'        => '/var/lib/cute/cute.sqlite',

    // Where PHP session files are stored (also outside the web root, and out of
    // /var/lib/php so the system cron does not wipe them before 30 days).
    'session_path'   => '/var/lib/cute/sessions',

    // Your local timezone decides what "today" is.
    'timezone'       => 'Europe/Amsterdam',

    // How long you stay logged in on a device (seconds). 30 days by default.
    'session_lifetime' => 60 * 60 * 24 * 30,

    // Only send the session cookie over HTTPS. Keep true in production.
    'secure_cookies' => true,

    // Login throttling: max failed attempts per window.
    'max_failures_per_user' => 5,
    'max_failures_per_ip'   => 10,
    'failure_window_seconds' => 15 * 60,

    // Largest backup file accepted on import (bytes). Keep nginx client_max_body_size >= this.
    'max_import_bytes' => 20 * 1024 * 1024,
];
