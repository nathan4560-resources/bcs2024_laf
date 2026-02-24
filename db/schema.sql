CREATE DATABASE IF NOT EXISTS campus_lost_n_found;
USE campus_lost_n_found;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('lost', 'found') NOT NULL,
  location VARCHAR(120) NOT NULL,
  item_date DATE NOT NULL,
  contact_info VARCHAR(120) NOT NULL,
  status ENUM('pending', 'claimed', 'resolved') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_item_date (item_date)
);

-- Legacy compatibility:
-- Older databases may still use 'active' instead of 'pending'.
-- Expand enum temporarily, migrate values, then enforce final enum.
ALTER TABLE items
  MODIFY COLUMN status ENUM('active', 'pending', 'claimed', 'resolved') NOT NULL DEFAULT 'pending';

UPDATE items
SET status = 'pending'
WHERE status = 'active';

ALTER TABLE items
  MODIFY COLUMN status ENUM('pending', 'claimed', 'resolved') NOT NULL DEFAULT 'pending';

-- Admin credentials table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
