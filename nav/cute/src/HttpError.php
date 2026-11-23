<?php
declare(strict_types=1);

namespace Cute;

/** Thrown by handlers to send a JSON error with a given HTTP status. */
final class HttpError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
