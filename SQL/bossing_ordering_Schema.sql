-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 17, 2026 at 04:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bossing_ordering`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generate_daily_sales` (IN `p_date` DATE, IN `p_admin_id` BIGINT UNSIGNED)   BEGIN
  INSERT INTO sales_report(report_date, total_orders, total_sales, generated_by)
  SELECT p_date, COUNT(*), COALESCE(SUM(total_amount), 0), p_admin_id
  FROM order_tbl
  WHERE order_status='completed' AND order_date >= p_date
    AND order_date < DATE_ADD(p_date, INTERVAL 1 DAY)
  ON DUPLICATE KEY UPDATE total_orders=VALUES(total_orders),
      total_sales=VALUES(total_sales), created_at=CURRENT_TIMESTAMP;
END$$

--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_order_items_total` (`p_order_id` BIGINT UNSIGNED) RETURNS DECIMAL(10,2) READS SQL DATA BEGIN
  DECLARE v_total DECIMAL(10,2);
  SELECT COALESCE(SUM(subtotal),0) INTO v_total
  FROM order_detail WHERE order_id = p_order_id;
  RETURN v_total;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admin_user`
--

CREATE TABLE `admin_user` (
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(80) NOT NULL,
  `role` enum('staff','admin') NOT NULL DEFAULT 'staff',
  `full_name` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin_user`
--

INSERT INTO `admin_user` (`admin_id`, `username`, `role`, `full_name`, `password_hash`, `is_active`, `created_at`) VALUES
(1, 'admin', 'admin', 'Juan delacrux', '$2y$10$XL3diC.AXgwdYJIgcrT2CuLXkm.5zdNR21tdGgESYx6xlGOli.zpy', 1, '2026-11-17 08:30:03'),
(2, 'maria', 'staff', 'Maria Delacruz', '$2y$10$VpeSjJp9vygVhspsQMn4FeQGgN/jkHDPSlMl8EtRGAztPiiuS07Zq', 1, '2026-11-17 08:44:04');

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `customer_name` varchar(120) NOT NULL,
  `contact_number` varchar(30) NOT NULL,
  `email` varchar(190) NOT NULL,
  `address` varchar(350) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `menu_item`
--

CREATE TABLE `menu_item` (
  `menu_id` bigint(20) UNSIGNED NOT NULL,
  `food_name` varchar(140) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(70) NOT NULL DEFAULT 'Chicken Pastel',
  `availability` tinyint(1) NOT NULL DEFAULT 1,
  `flavor` varchar(30) NOT NULL DEFAULT 'original',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `menu_item`
--

INSERT INTO `menu_item` (`menu_id`, `food_name`, `description`, `price`, `category`, `availability`, `flavor`, `created_at`, `updated_at`) VALUES
(1, 'Original Chicken Pastel', 'Our comforting signature chicken pastel with savory, home-style flavor.', 100.00, 'Signature Jars', 1, 'original', '2026-11-17 08:07:48', '2026-11-17 08:07:48'),
(2, 'Spicy Chicken Pastel', 'The familiar classic with a little extra heat.', 100.00, 'Signature Jars', 1, 'spicy', '2026-11-17 08:07:48', '2026-11-17 08:07:48'),
(3, 'Garlic Chicken Pastel', 'Rich garlic aroma meets tender, flavorful chicken.', 150.00, 'Signature Jars', 1, 'garlic', '2026-11-17 08:07:48', '2026-11-17 08:07:48'),
(4, 'Chili Garlic Chicken Pastel', 'A punchy blend of chili and garlic for bold food lovers.', 150.00, 'Signature Jars', 1, 'chili-garlic', '2026-11-17 08:07:48', '2026-11-17 08:07:48'),
(5, 'Spicy Dragon Liver Pastel', 'Dragon Liver Pastel Very F****ng Hot', 800.00, 'Signature Jars', 1, 'spicy', '2026-11-17 08:46:30', '2026-11-17 08:46:30');

-- --------------------------------------------------------

--
-- Table structure for table `order_detail`
--

CREATE TABLE `order_detail` (
  `order_detail_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `menu_id` bigint(20) UNSIGNED NOT NULL,
  `food_name_snapshot` varchar(140) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

--
-- Triggers `order_detail`
--
DELIMITER $$
CREATE TRIGGER `trg_order_detail_insert` BEFORE INSERT ON `order_detail` FOR EACH ROW SET NEW.subtotal = ROUND(NEW.unit_price * NEW.quantity, 2)
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_order_detail_update` BEFORE UPDATE ON `order_detail` FOR EACH ROW SET NEW.subtotal = ROUND(NEW.unit_price * NEW.quantity, 2)
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `order_status_history`
--

CREATE TABLE `order_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` varchar(25) NOT NULL,
  `new_status` varchar(25) NOT NULL,
  `changed_by` bigint(20) UNSIGNED NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_tbl`
--

CREATE TABLE `order_tbl` (
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `order_date` datetime NOT NULL DEFAULT current_timestamp(),
  `order_type` enum('pickup','delivery') NOT NULL,
  `delivery_address` varchar(350) DEFAULT NULL,
  `customer_note` varchar(500) DEFAULT NULL,
  `payment_method` enum('cash_on_pickup','cash_on_delivery') NOT NULL,
  `subtotal_amount` decimal(10,2) NOT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `order_status` enum('pending','confirmed','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
  `processed_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_report`
--

CREATE TABLE `sales_report` (
  `report_id` bigint(20) UNSIGNED NOT NULL,
  `report_date` date NOT NULL,
  `total_orders` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_sales` decimal(12,2) NOT NULL DEFAULT 0.00,
  `generated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_setting`
--

CREATE TABLE `system_setting` (
  `setting_key` varchar(60) NOT NULL,
  `setting_value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_setting`
--

INSERT INTO `system_setting` (`setting_key`, `setting_value`) VALUES
('delivery_fee', '50.00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_user`
--
ALTER TABLE `admin_user`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_customer_name` (`customer_name`);

--
-- Indexes for table `menu_item`
--
ALTER TABLE `menu_item`
  ADD PRIMARY KEY (`menu_id`),
  ADD KEY `idx_menu_category` (`category`);

--
-- Indexes for table `order_detail`
--
ALTER TABLE `order_detail`
  ADD PRIMARY KEY (`order_detail_id`),
  ADD UNIQUE KEY `uniq_order_menu` (`order_id`,`menu_id`),
  ADD KEY `fk_detail_menu` (`menu_id`);

--
-- Indexes for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_history_order` (`order_id`),
  ADD KEY `fk_history_staff` (`changed_by`);

--
-- Indexes for table `order_tbl`
--
ALTER TABLE `order_tbl`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `fk_order_staff` (`processed_by`),
  ADD KEY `idx_order_date` (`order_date`),
  ADD KEY `idx_order_status` (`order_status`),
  ADD KEY `idx_order_customer_date` (`customer_id`,`order_date`);

--
-- Indexes for table `sales_report`
--
ALTER TABLE `sales_report`
  ADD PRIMARY KEY (`report_id`),
  ADD UNIQUE KEY `uniq_report_staff_date` (`report_date`,`generated_by`),
  ADD KEY `fk_report_staff` (`generated_by`),
  ADD KEY `idx_report_date` (`report_date`);

--
-- Indexes for table `system_setting`
--
ALTER TABLE `system_setting`
  ADD PRIMARY KEY (`setting_key`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_user`
--
ALTER TABLE `admin_user`
  MODIFY `admin_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `menu_item`
--
ALTER TABLE `menu_item`
  MODIFY `menu_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_detail`
--
ALTER TABLE `order_detail`
  MODIFY `order_detail_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_status_history`
--
ALTER TABLE `order_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_tbl`
--
ALTER TABLE `order_tbl`
  MODIFY `order_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_report`
--
ALTER TABLE `sales_report`
  MODIFY `report_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `order_detail`
--
ALTER TABLE `order_detail`
  ADD CONSTRAINT `fk_detail_menu` FOREIGN KEY (`menu_id`) REFERENCES `menu_item` (`menu_id`),
  ADD CONSTRAINT `fk_detail_order` FOREIGN KEY (`order_id`) REFERENCES `order_tbl` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD CONSTRAINT `fk_history_order` FOREIGN KEY (`order_id`) REFERENCES `order_tbl` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_history_staff` FOREIGN KEY (`changed_by`) REFERENCES `admin_user` (`admin_id`);

--
-- Constraints for table `order_tbl`
--
ALTER TABLE `order_tbl`
  ADD CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  ADD CONSTRAINT `fk_order_staff` FOREIGN KEY (`processed_by`) REFERENCES `admin_user` (`admin_id`) ON DELETE SET NULL;

--
-- Constraints for table `sales_report`
--
ALTER TABLE `sales_report`
  ADD CONSTRAINT `fk_report_staff` FOREIGN KEY (`generated_by`) REFERENCES `admin_user` (`admin_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
