<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$route = trim((string)($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], true)) fail('Method not allowed', 405);
csrf_token();
if ($method !== 'GET') verify_csrf();

try {
    if ($route === 'auth/me' && $method === 'GET') {
        $current = user();
        if ($current && $current['role'] !== 'customer') $current = require_user();
        respond(['user' => $current, 'csrf' => csrf_token()]);
    }

    if ($route === 'auth/register' && $method === 'POST') {
        $body = input();
        $name = required_string($body, 'customer_name', 120);
        $phone = required_string($body, 'contact_number', 30);
        $email = strtolower(required_string($body, 'email', 190));
        $address = optional_string($body, 'address', 350);
        $password = required_string($body, 'password', 255);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address');
        if (strlen($password) < 8) fail('Password must contain at least 8 characters');
        $stmt = db()->prepare('SELECT customer_id FROM customer WHERE email=?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) fail('An account with this email already exists', 409);
        $stmt = db()->prepare('INSERT INTO customer(customer_name,contact_number,email,address,password_hash) VALUES (?,?,?,?,?)');
        $stmt->execute([$name, $phone, $email, $address, password_hash($password, PASSWORD_DEFAULT)]);
        session_regenerate_id(true);
        $_SESSION['user'] = ['id'=>(int)db()->lastInsertId(), 'name'=>$name, 'email'=>$email, 'role'=>'customer', 'address'=>$address, 'contact_number'=>$phone];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        respond(['user'=>$_SESSION['user'], 'csrf'=>csrf_token()], 201);
    }

    if ($route === 'auth/login' && $method === 'POST') {
        $body = input();
        $identifier = required_string($body, 'identifier', 190);
        $password = required_string($body, 'password', 255);
        if (str_contains($identifier, '@')) {
            $stmt = db()->prepare('SELECT customer_id,customer_name,email,contact_number,address,password_hash FROM customer WHERE email=?');
            $stmt->execute([strtolower($identifier)]);
            $row = $stmt->fetch();
            if (!$row || !password_verify($password, $row['password_hash'])) fail('Incorrect email or password', 401);
            $profile = ['id'=>(int)$row['customer_id'], 'name'=>$row['customer_name'], 'email'=>$row['email'], 'role'=>'customer', 'address'=>$row['address'], 'contact_number'=>$row['contact_number']];
        } else {
            $stmt = db()->prepare('SELECT admin_id,username,role,full_name,password_hash,is_active FROM admin_user WHERE username=?');
            $stmt->execute([$identifier]);
            $row = $stmt->fetch();
            if (!$row || !$row['is_active'] || !password_verify($password, $row['password_hash'])) fail('Incorrect username or password', 401);
            $profile = ['id'=>(int)$row['admin_id'], 'name'=>$row['full_name'], 'email'=>$row['username'], 'role'=>$row['role']];
        }
        session_regenerate_id(true);
        $_SESSION['user'] = $profile;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        respond(['user'=>$profile, 'csrf'=>csrf_token()]);
    }

    if ($route === 'auth/logout' && $method === 'POST') {
        $_SESSION = [];
        session_regenerate_id(true);
        respond(['user'=>null, 'csrf'=>csrf_token()]);
    }

    if ($route === 'settings' && $method === 'GET') {
        respond(['delivery_fee'=>(float)setting('delivery_fee','50.00')]);
    }

    if ($route === 'settings' && $method === 'PATCH') {
        require_staff(true);
        $body = input();
        $fee = $body['delivery_fee'] ?? null;
        if (!is_numeric($fee) || (float)$fee < 0 || (float)$fee > 1000) fail('Delivery fee must be between ₱0 and ₱1,000');
        $stmt = db()->prepare("INSERT INTO system_setting(setting_key,setting_value) VALUES('delivery_fee',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)");
        $stmt->execute([number_format((float)$fee, 2, '.', '')]);
        respond(['delivery_fee'=>(float)$fee]);
    }

    if ($route === 'menu' && $method === 'GET') {
        $current = user();
        $all = false;
        if (($_GET['all'] ?? '0') === '1' && $current && in_array($current['role'], ['admin','staff'], true)) {
            require_staff();
            $all = true;
        }
        $q = trim((string)($_GET['q'] ?? ''));
        $sql = 'SELECT menu_id,food_name,description,price,category,availability,flavor FROM menu_item WHERE 1=1';
        $args = [];
        if (!$all) $sql .= ' AND availability=1';
        if ($q !== '') { $sql .= ' AND (food_name LIKE ? OR category LIKE ?)'; $args = ["%$q%", "%$q%"]; }
        $sql .= ' ORDER BY menu_id ASC';
        $stmt = db()->prepare($sql);
        $stmt->execute($args);
        respond(['items'=>array_map('clean_menu', $stmt->fetchAll())]);
    }

    if ($route === 'menu' && in_array($method, ['POST','PUT','DELETE'], true)) {
        require_staff();
        $body = input();
        if ($method === 'DELETE') {
            $menuId = filter_var($body['menu_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$menuId || $menuId < 1) fail('Invalid menu item');
            $stmt = db()->prepare('UPDATE menu_item SET availability=0 WHERE menu_id=?');
            $stmt->execute([$menuId]);
            if (!$stmt->rowCount()) fail('Menu item not found', 404);
            respond(['ok'=>true]);
        }
        $name = required_string($body, 'food_name', 140);
        $category = required_string($body, 'category', 70);
        $description = optional_string($body, 'description', 3000);
        $price = $body['price'] ?? null;
        if (!is_numeric($price) || (float)$price < 0 || (float)$price > 99999) fail('Invalid menu price');
        $price = number_format((float)$price, 2, '.', '');
        $available = !empty($body['availability']) ? 1 : 0;
        $flavor = in_array($body['flavor'] ?? '', ['original','spicy','garlic','chili-garlic'], true) ? $body['flavor'] : 'original';
        if ($method === 'POST') {
            $stmt = db()->prepare('INSERT INTO menu_item(food_name,description,price,category,availability,flavor) VALUES(?,?,?,?,?,?)');
            $stmt->execute([$name,$description,$price,$category,$available,$flavor]);
            respond(['menu_id'=>(int)db()->lastInsertId()], 201);
        }
        $menuId = filter_var($body['menu_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$menuId || $menuId < 1) fail('Invalid menu item');
        $stmt = db()->prepare('UPDATE menu_item SET food_name=?,description=?,price=?,category=?,availability=?,flavor=? WHERE menu_id=?');
        $stmt->execute([$name,$description,$price,$category,$available,$flavor,$menuId]);
        respond(['menu_id'=>(int)$menuId]);
    }

    if ($route === 'orders' && $method === 'POST') {
        $current = require_user();
        if ($current['role'] !== 'customer') fail('Only customer accounts can place orders', 403);
        $body = input();
        $type = $body['order_type'] ?? '';
        if (!in_array($type, ['pickup','delivery'], true)) fail('Choose pickup or delivery');
        $address = $type === 'delivery' ? required_string($body, 'delivery_address', 350) : null;
        $note = optional_string($body, 'customer_note', 500);
        $lines = $body['items'] ?? [];
        if (!is_array($lines) || !$lines || count($lines) > 30) fail('Your cart must contain 1 to 30 items');
        $quantities = [];
        foreach ($lines as $line) {
            if (!is_array($line)) fail('Invalid cart item');
            $id = filter_var($line['menu_id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($line['quantity'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1 || !$qty || $qty < 1 || $qty > 30) fail('Invalid item quantity');
            $quantities[$id] = ($quantities[$id] ?? 0) + $qty;
            if ($quantities[$id] > 30) fail('Maximum of 30 per item');
        }
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $items = [];
            $subtotal = 0.0;
            ksort($quantities);
            $select = $pdo->prepare('SELECT menu_id,food_name,price,availability FROM menu_item WHERE menu_id=? FOR UPDATE');
            foreach ($quantities as $id => $qty) {
                $select->execute([$id]);
                $item = $select->fetch();
                if (!$item || !$item['availability']) fail('A menu item in your cart is no longer available', 409);
                $unit = (float)$item['price'];
                $lineTotal = round($unit * $qty, 2);
                $subtotal += $lineTotal;
                $items[] = ['menu_id'=>$id,'food_name'=>$item['food_name'],'quantity'=>$qty,'unit_price'=>$unit,'subtotal'=>$lineTotal];
            }
            $fee = $type === 'delivery' ? (float)setting('delivery_fee','50.00') : 0;
            $total = round($subtotal + $fee, 2);
            $payment = $type === 'delivery' ? 'cash_on_delivery' : 'cash_on_pickup';
            $insert = $pdo->prepare('INSERT INTO order_tbl(customer_id,order_type,delivery_address,customer_note,payment_method,subtotal_amount,delivery_fee,total_amount) VALUES(?,?,?,?,?,?,?,?)');
            $insert->execute([$current['id'],$type,$address,$note,$payment,$subtotal,$fee,$total]);
            $orderId = (int)$pdo->lastInsertId();
            $detail = $pdo->prepare('INSERT INTO order_detail(order_id,menu_id,food_name_snapshot,quantity,unit_price,subtotal) VALUES(?,?,?,?,?,?)');
            foreach ($items as $line) $detail->execute([$orderId,$line['menu_id'],$line['food_name'],$line['quantity'],$line['unit_price'],$line['subtotal']]);
            $pdo->commit();
            respond(['order_id'=>$orderId,'total_amount'=>$total], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    if ($route === 'orders' && $method === 'GET') {
        $current = require_user();
        $staff = in_array($current['role'], ['admin','staff'], true);
        $sql = 'SELECT o.*,c.customer_name,c.contact_number,c.email FROM order_tbl o JOIN customer c ON c.customer_id=o.customer_id';
        $args = [];
        if (!$staff) { $sql .= ' WHERE o.customer_id=?'; $args[] = $current['id']; }
        $sql .= ' ORDER BY o.order_date DESC, o.order_id DESC LIMIT 150';
        $stmt = db()->prepare($sql);
        $stmt->execute($args);
        $orders = $stmt->fetchAll();
        if (!$orders) respond(['orders'=>[]]);
        $ids = array_map(fn($row)=>(int)$row['order_id'], $orders);
        $marks = implode(',', array_fill(0,count($ids),'?'));
        $details = db()->prepare("SELECT order_id,menu_id,food_name_snapshot AS food_name,quantity,unit_price,subtotal FROM order_detail WHERE order_id IN ($marks) ORDER BY order_detail_id");
        $details->execute($ids);
        $grouped = [];
        foreach ($details->fetchAll() as $row) {
            $row['menu_id'] = (int)$row['menu_id'];
            $row['quantity'] = (int)$row['quantity'];
            $row['unit_price'] = (float)$row['unit_price'];
            $row['subtotal'] = (float)$row['subtotal'];
            $grouped[$row['order_id']][] = $row;
        }
        foreach ($orders as &$order) {
            $order['order_id'] = (int)$order['order_id'];
            $order['subtotal_amount'] = (float)$order['subtotal_amount'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];
            $order['total_amount'] = (float)$order['total_amount'];
            $order['items'] = $grouped[$order['order_id']] ?? [];
        }
        unset($order);
        respond(['orders'=>$orders]);
    }

    if ($route === 'orders/status' && $method === 'PATCH') {
        $current = require_staff();
        $body = input();
        $orderId = filter_var($body['order_id'] ?? null, FILTER_VALIDATE_INT);
        $next = $body['order_status'] ?? '';
        $allowed = [
            'pending'=>['confirmed','cancelled'],
            'confirmed'=>['preparing','cancelled'],
            'preparing'=>['ready','cancelled'],
            'ready'=>['completed','cancelled'],
            'completed'=>[], 'cancelled'=>[],
        ];
        if (!$orderId || !is_string($next)) fail('Invalid order update');
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT order_status FROM order_tbl WHERE order_id=? FOR UPDATE');
            $stmt->execute([$orderId]);
            $previous = $stmt->fetchColumn();
            if ($previous === false) fail('Order not found', 404);
            if (!in_array($next, $allowed[$previous] ?? [], true)) fail('That status transition is not allowed', 409);
            $stmt = $pdo->prepare('UPDATE order_tbl SET order_status=?, processed_by=? WHERE order_id=?');
            $stmt->execute([$next,$current['id'],$orderId]);
            $stmt = $pdo->prepare('INSERT INTO order_status_history(order_id,old_status,new_status,changed_by) VALUES(?,?,?,?)');
            $stmt->execute([$orderId,$previous,$next,$current['id']]);
            $pdo->commit();
            respond(['ok'=>true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    if ($route === 'dashboard/summary' && $method === 'GET') {
        require_staff();
        $stats = db()->query("SELECT COUNT(*) AS total_orders,
          COALESCE(SUM(order_status IN ('pending','confirmed','preparing')),0) AS active_orders,
          COALESCE(SUM(order_status='completed'),0) AS completed_orders,
          COALESCE(SUM(CASE WHEN order_status='completed' THEN total_amount ELSE 0 END),0) AS total_revenue,
          COALESCE(SUM(CASE WHEN order_status='completed' AND DATE(order_date)=CURDATE() THEN total_amount ELSE 0 END),0) AS today_revenue
          FROM order_tbl")->fetch();
        foreach ($stats as $k=>$v) $stats[$k] = str_contains($k,'revenue') ? (float)$v : (int)$v;
        respond(['summary'=>$stats]);
    }

    if ($route === 'reports' && $method === 'GET') {
        require_staff();
        $rows = db()->query('SELECT r.*,a.full_name AS generated_by_name FROM sales_report r JOIN admin_user a ON a.admin_id=r.generated_by ORDER BY report_date DESC,created_at DESC LIMIT 100')->fetchAll();
        foreach ($rows as &$row) { $row['report_id']=(int)$row['report_id']; $row['total_orders']=(int)$row['total_orders']; $row['total_sales']=(float)$row['total_sales']; }
        unset($row);
        respond(['reports'=>$rows]);
    }

    if ($route === 'reports/generate' && $method === 'POST') {
        $current = require_staff();
        $date = required_string(input(), 'report_date', 10);
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) fail('Date must be YYYY-MM-DD');
        $stmt = db()->prepare("INSERT INTO sales_report(report_date,total_orders,total_sales,generated_by)
          SELECT ?, COUNT(*), COALESCE(SUM(total_amount),0), ? FROM order_tbl
          WHERE order_status='completed' AND order_date >= ? AND order_date < DATE_ADD(?, INTERVAL 1 DAY)
          ON DUPLICATE KEY UPDATE total_orders=VALUES(total_orders),total_sales=VALUES(total_sales),created_at=CURRENT_TIMESTAMP");
        $stmt->execute([$date,$current['id'],$date,$date]);
        respond(['ok'=>true]);
    }

    if ($route === 'users' && $method === 'GET') {
        require_staff(true);
        $customers = db()->query('SELECT customer_id,customer_name,email,contact_number,created_at FROM customer ORDER BY created_at DESC LIMIT 150')->fetchAll();
        $staff = db()->query('SELECT admin_id,username,full_name,role,is_active,created_at FROM admin_user ORDER BY created_at DESC LIMIT 100')->fetchAll();
        respond(['customers'=>$customers,'staff'=>$staff]);
    }

    if ($route === 'users/staff' && $method === 'POST') {
        require_staff(true);
        $body = input();
        $username = required_string($body, 'username', 80);
        $name = required_string($body, 'full_name', 120);
        $password = required_string($body, 'password', 255);
        $role = $body['role'] ?? 'staff';
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,80}$/', $username)) fail('Username must be 3+ characters: letters, numbers, dot, dash or underscore');
        if (strlen($password) < 8) fail('Password must be at least 8 characters');
        if (!in_array($role, ['staff','admin'], true)) fail('Invalid staff role');
        $stmt = db()->prepare('SELECT admin_id FROM admin_user WHERE username=?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) fail('Username is already taken', 409);
        $stmt = db()->prepare('INSERT INTO admin_user(username,full_name,role,password_hash) VALUES(?,?,?,?)');
        $stmt->execute([$username,$name,$role,password_hash($password,PASSWORD_DEFAULT)]);
        respond(['admin_id'=>(int)db()->lastInsertId()], 201);
    }

    if ($route === 'users/staff' && $method === 'PATCH') {
        $current = require_staff(true);
        $body = input();
        $adminId = filter_var($body['admin_id'] ?? null,FILTER_VALIDATE_INT);
        $role = $body['role'] ?? '';
        $active = $body['is_active'] ?? null;
        if (!$adminId || !in_array($role,['staff','admin'],true) || !is_bool($active)) fail('Invalid staff update');
        if ($adminId === $current['id']) fail('You cannot change your own role or active status', 409);
        $stmt = db()->prepare('UPDATE admin_user SET role=?,is_active=? WHERE admin_id=?');
        $stmt->execute([$role,(int)$active,$adminId]);
        respond(['ok'=>true]);
    }

    fail('Endpoint not found', 404);
} catch (PDOException $e) {
    error_log('Bossing database error: '.$e->getMessage());
    if ($e->getCode() === '23000') fail('This record conflicts with existing data', 409);
    fail('Database request failed. Check the server configuration.', 500);
} catch (Throwable $e) {
    error_log('Bossing application error: '.$e->getMessage());
    fail('The request could not be completed', 500);
}
