<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $name = getenv('DB_NAME') ?: 'bossing_ordering';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASSWORD') ?: '';
    $port = getenv('DB_PORT') ?: '3306';
    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+08:00'");
    return $pdo;
}

function respond(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $message, int $status = 400): never {
    respond(['error' => $message], $status);
}

function input(): array {
    $raw = file_get_contents('php://input');
    if (strlen($raw ?: '') > 100000) fail('Request is too large', 413);
    $data = json_decode($raw ?: '{}', true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) fail('Invalid JSON payload');
    return $data;
}

function required_string(array $data, string $key, int $max = 190): string {
    if (!isset($data[$key]) || !is_string($data[$key])) fail("$key is required");
    $value = trim($data[$key]);
    if ($value === '' || mb_strlen($value) > $max) fail("Invalid $key");
    return $value;
}

function optional_string(array $data, string $key, int $max = 350): ?string {
    if (!isset($data[$key]) || $data[$key] === '') return null;
    if (!is_string($data[$key]) || mb_strlen($data[$key]) > $max) fail("Invalid $key");
    return trim($data[$key]);
}

function user(): ?array {
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function require_user(): array {
    $current = user();
    if (!$current) fail('Please sign in to continue', 401);
    if ($current['role'] !== 'customer') {
        $stmt = db()->prepare('SELECT is_active, role FROM admin_user WHERE admin_id = ?');
        $stmt->execute([$current['id']]);
        $row = $stmt->fetch();
        if (!$row || !$row['is_active']) {
            unset($_SESSION['user']);
            fail('Account is inactive', 403);
        }
        $current['role'] = $row['role'];
        $_SESSION['user']['role'] = $row['role'];
    }
    return $current;
}

function require_staff(bool $adminOnly = false): array {
    $current = require_user();
    if (!in_array($current['role'], $adminOnly ? ['admin'] : ['staff','admin'], true)) {
        fail('You do not have permission to do that', 403);
    }
    return $current;
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function verify_csrf(): void {
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($provided) || !hash_equals(csrf_token(), $provided)) {
        fail('Session verification failed. Please reload and try again.', 419);
    }
}

function clean_menu(array $row): array {
    $row['menu_id'] = (int)$row['menu_id'];
    $row['price'] = (float)$row['price'];
    $row['availability'] = (bool)$row['availability'];
    return $row;
}

function setting(string $key, string $default): string {
    $stmt = db()->prepare('SELECT setting_value FROM system_setting WHERE setting_key=?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : (string)$value;
}
