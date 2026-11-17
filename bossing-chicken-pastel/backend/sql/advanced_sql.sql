-- Optional demonstration of stored procedures, functions and triggers.
-- Import AFTER schema.sql, preferably with MySQL CLI or phpMyAdmin's SQL tab.
USE bossing_ordering;
DELIMITER //
DROP FUNCTION IF EXISTS fn_order_items_total //
CREATE FUNCTION fn_order_items_total(p_order_id BIGINT UNSIGNED)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(10,2);
  SELECT COALESCE(SUM(subtotal),0) INTO v_total
  FROM order_detail WHERE order_id = p_order_id;
  RETURN v_total;
END //

DROP PROCEDURE IF EXISTS sp_generate_daily_sales //
CREATE PROCEDURE sp_generate_daily_sales(IN p_date DATE, IN p_admin_id BIGINT UNSIGNED)
BEGIN
  INSERT INTO sales_report(report_date, total_orders, total_sales, generated_by)
  SELECT p_date, COUNT(*), COALESCE(SUM(total_amount), 0), p_admin_id
  FROM order_tbl
  WHERE order_status='completed' AND order_date >= p_date
    AND order_date < DATE_ADD(p_date, INTERVAL 1 DAY)
  ON DUPLICATE KEY UPDATE total_orders=VALUES(total_orders),
      total_sales=VALUES(total_sales), created_at=CURRENT_TIMESTAMP;
END //

DROP TRIGGER IF EXISTS trg_order_detail_insert //
CREATE TRIGGER trg_order_detail_insert BEFORE INSERT ON order_detail
FOR EACH ROW SET NEW.subtotal = ROUND(NEW.unit_price * NEW.quantity, 2) //

DROP TRIGGER IF EXISTS trg_order_detail_update //
CREATE TRIGGER trg_order_detail_update BEFORE UPDATE ON order_detail
FOR EACH ROW SET NEW.subtotal = ROUND(NEW.unit_price * NEW.quantity, 2) //
DELIMITER ;

-- Examples: SELECT fn_order_items_total(1);
-- CALL sp_generate_daily_sales(CURDATE(), 1);
