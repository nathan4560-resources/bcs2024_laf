USE campus_lost_n_found;

-- Default admin: username = admin, password = admin123
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$10$XQpGq8K5Z3E5h5E5h5E5hOJG8e5h5E5h5E5h5E5h5E5h5E5h5E5h5')
ON DUPLICATE KEY UPDATE username = username;

INSERT INTO items (title, description, category, location, item_date, contact_info, status)
VALUES
  (
    'Black Wallet',
    'Black leather wallet with student card inside.',
    'lost',
    'Library Level 2',
    '2026-02-20',
    'student1@qiu.edu.my',
    'pending'
  ),
  (
    'Water Bottle',
    'Blue stainless steel bottle found near Block A cafeteria.',
    'found',
    'Block A Cafeteria',
    '2026-02-21',
    'security.office@qiu.edu.my',
    'pending'
  );
