<?php
declare(strict_types=1);
// Usage: php backend/tools/create_admin.php
// Run in the project root after importing the database schema.
require_once dirname(__DIR__, 2) . '/api/bootstrap.php';
if (PHP_SAPI !== 'cli') exit("Run this tool from the command line.\n");
function ask(string $prompt): string {
    fwrite(STDOUT, $prompt);
    return trim((string)fgets(STDIN));
}
$username = ask('Admin username: ');
$name = ask('Full name: ');
$password = ask('Password (min 8 characters): ');
if (!preg_match('/^[a-zA-Z0-9_.-]{3,80}$/', $username) || $name === '' || strlen($password) < 8) {
    exit("Invalid input. Use a username of 3+ safe characters and a strong password.\n");
}
try {
    $stmt = db()->prepare("INSERT INTO admin_user(username,role,full_name,password_hash) VALUES(?,'admin',?,?)");
    $stmt->execute([$username,$name,password_hash($password,PASSWORD_DEFAULT)]);
    fwrite(STDOUT,"Administrator created. Sign in with username: $username\n");
} catch (Throwable $e) {
    fwrite(STDERR,"Could not create administrator. Confirm the database is imported and username unused.\n");
    exit(1);
}
