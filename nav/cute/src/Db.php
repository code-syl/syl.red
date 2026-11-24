<?php
declare(strict_types=1);

namespace Cute;

use PDO;

/**
 * Tiny PDO wrapper around one SQLite file. Every query uses prepared statements,
 * so user input never becomes part of the SQL text (no SQL injection).
 */
final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $path = (string) config('db_path');
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0700, true);
            }

            $pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA journal_mode = WAL');   // readers don't block the writer
            $pdo->exec('PRAGMA busy_timeout = 5000');
            self::$pdo = $pdo;
            self::migrate($pdo);
        }

        return self::$pdo;
    }

    /** @param array<int|string,mixed> $params */
    public static function all(string $sql, array $params = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);

        return $st->fetchAll();
    }

    /** @param array<int|string,mixed> $params */
    public static function one(string $sql, array $params = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        $row = $st->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<int|string,mixed> $params */
    public static function run(string $sql, array $params = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);

        return $st->rowCount();
    }

    public static function lastId(): int
    {
        return (int) self::pdo()->lastInsertId();
    }

    /** @template T @param callable():T $fn @return T */
    public static function tx(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $result = $fn();
            $pdo->commit();

            return $result;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            
            throw $e;
        }
    }

    private static function migrate(PDO $pdo): void
    {
        $version = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
        if ($version < 1) {
            $pdo->exec(<<<SQL
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY,
                ip TEXT NOT NULL,
                username TEXT NOT NULL,
                success INTEGER NOT NULL,
                at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_attempts_at ON login_attempts(at);
            CREATE TABLE IF NOT EXISTS settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('food','drink')),
                nutrients TEXT NOT NULL,           -- JSON, per 100 g or per 100 mL
                archived INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_foods_user ON foods(user_id, archived);
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                archived INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS meal_items (
                id INTEGER PRIMARY KEY,
                meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
                food_id INTEGER NOT NULL REFERENCES foods(id),
                amount REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS days (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TEXT NOT NULL,                 -- YYYY-MM-DD
                status TEXT NOT NULL CHECK (status IN ('open','closed','skipped')),
                weight_kg REAL,
                height_cm REAL,
                water_ml INTEGER NOT NULL DEFAULT 0,
                closed_at TEXT,
                PRIMARY KEY (user_id, date)
            );
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TEXT NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('food','drink','meal')),
                food_id INTEGER,
                meal_id INTEGER,
                name TEXT NOT NULL,
                unit TEXT NOT NULL CHECK (unit IN ('g','mL')),
                amount REAL NOT NULL,
                per100 TEXT NOT NULL,              -- JSON snapshot of nutrients per 100 units
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
            PRAGMA user_version = 1;
            SQL);
            $version = 1;
        }
        if ($version < 2) {
            // v2: optional brand on foods (and on the snapshot stored with each logged item).
            // ADD COLUMN with a default is instant in SQLite and keeps all existing rows.
            // BEGIN IMMEDIATE takes the write lock first, so two requests arriving at the same
            // moment can't both run the migration; the second one re-checks and skips.
            $pdo->exec('BEGIN IMMEDIATE');
            try {
                if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() < 2) {
                    $pdo->exec("ALTER TABLE foods ADD COLUMN brand TEXT NOT NULL DEFAULT ''");
                    $pdo->exec("ALTER TABLE entries ADD COLUMN brand TEXT NOT NULL DEFAULT ''");
                    $pdo->exec('PRAGMA user_version = 2');
                }
                $pdo->exec('COMMIT');
            } catch (\Throwable $e) {
                $pdo->exec('ROLLBACK');
                throw $e;
            }
        }
    }
}
