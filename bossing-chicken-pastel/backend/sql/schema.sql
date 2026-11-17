-- Bossing Chicken Pastel — MySQL 8 / MariaDB 10.5+
-- The six original ERD entities are retained. Additional fields and two
-- supporting tables make online checkout, audit history and settings possible.
CREATE DATABASE IF NOT EXISTS bossing_ordering
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bossing_ordering;

CREATE TABLE IF NOT EXISTS customer (
  customer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  contact_number VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  address VARCHAR(350) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_name (customer_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_user (
  admin_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  role ENUM('staff','admin') NOT NULL DEFAULT 'staff',
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_item (
  menu_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  food_name VARCHAR(140) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(70) NOT NULL DEFAULT 'Chicken Pastel',
  availability TINYINT(1) NOT NULL DEFAULT 1,
  flavor VARCHAR(30) NOT NULL DEFAULT 'original',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_menu_category (category),
  CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_tbl (
  order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_type ENUM('pickup','delivery') NOT NULL,
  delivery_address VARCHAR(350) NULL,
  customer_note VARCHAR(500) NULL,
  payment_method ENUM('cash_on_pickup','cash_on_delivery') NOT NULL,
  subtotal_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  order_status ENUM('pending','confirmed','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  processed_by BIGINT UNSIGNED NULL,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id)
    REFERENCES customer(customer_id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_staff FOREIGN KEY (processed_by)
    REFERENCES admin_user(admin_id) ON DELETE SET NULL,
  INDEX idx_order_date (order_date),
  INDEX idx_order_status (order_status),
  INDEX idx_order_customer_date (customer_id, order_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_detail (
  order_detail_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  menu_id BIGINT UNSIGNED NOT NULL,
  food_name_snapshot VARCHAR(140) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_detail_order FOREIGN KEY (order_id)
    REFERENCES order_tbl(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_detail_menu FOREIGN KEY (menu_id)
    REFERENCES menu_item(menu_id) ON DELETE RESTRICT,
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  UNIQUE KEY uniq_order_menu (order_id, menu_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sales_report (
  report_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL,
  total_orders INT UNSIGNED NOT NULL DEFAULT 0,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  generated_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_staff FOREIGN KEY (generated_by)
    REFERENCES admin_user(admin_id) ON DELETE RESTRICT,
  UNIQUE KEY uniq_report_staff_date (report_date, generated_by),
  INDEX idx_report_date (report_date)
) ENGINE=InnoDB;

-- Added table: records every staff status change for accountability.
CREATE TABLE IF NOT EXISTS order_status_history (
  history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  old_status VARCHAR(25) NOT NULL,
  new_status VARCHAR(25) NOT NULL,
  changed_by BIGINT UNSIGNED NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_order FOREIGN KEY (order_id)
    REFERENCES order_tbl(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_history_staff FOREIGN KEY (changed_by)
    REFERENCES admin_user(admin_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Added table: editable delivery fee without changing application code.
CREATE TABLE IF NOT EXISTS system_setting (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT INTO system_setting (setting_key, setting_value)
VALUES ('delivery_fee', '50.00')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- Sample products and prices for development, editable by the administrator.
INSERT INTO menu_item (food_name, description, price, category, flavor)
SELECT 'Original Chicken Pastel', 'Our comforting signature chicken pastel with savory, home-style flavor.', 100.00, 'Signature Jars', 'original'
WHERE NOT EXISTS (SELECT 1 FROM menu_item WHERE food_name = 'Original Chicken Pastel');
INSERT INTO menu_item (food_name, description, price, category, flavor)
SELECT 'Spicy Chicken Pastel', 'The familiar classic with a little extra heat.', 100.00, 'Signature Jars', 'spicy'
WHERE NOT EXISTS (SELECT 1 FROM menu_item WHERE food_name = 'Spicy Chicken Pastel');
INSERT INTO menu_item (food_name, description, price, category, flavor)
SELECT 'Garlic Chicken Pastel', 'Rich garlic aroma meets tender, flavorful chicken.', 150.00, 'Signature Jars', 'garlic'
WHERE NOT EXISTS (SELECT 1 FROM menu_item WHERE food_name = 'Garlic Chicken Pastel');
INSERT INTO menu_item (food_name, description, price, category, flavor)
SELECT 'Chili Garlic Chicken Pastel', 'A punchy blend of chili and garlic for bold food lovers.', 150.00, 'Signature Jars', 'chili-garlic'
WHERE NOT EXISTS (SELECT 1 FROM menu_item WHERE food_name = 'Chili Garlic Chicken Pastel');
