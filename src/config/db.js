const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "campus_lost_n_found",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});

const TARGET_STATUS_ENUM = "enum('pending','claimed','resolved')";

async function ensureItemStatusSchema(connection, databaseName) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_TYPE AS columnType, COLUMN_DEFAULT AS columnDefault
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'items' AND COLUMN_NAME = 'status'`,
    [databaseName]
  );

  if (rows.length === 0) {
    return;
  }

  const columnType = String(rows[0].columnType || "").toLowerCase();
  const columnDefault = String(rows[0].columnDefault || "").toLowerCase();
  const needsMigration =
    columnType !== TARGET_STATUS_ENUM || columnDefault !== "pending";

  if (!needsMigration) {
    return;
  }

  // Migrate legacy "active" rows safely before enforcing the final enum.
  await connection.query(`
    ALTER TABLE items
    MODIFY COLUMN status ENUM('active', 'pending', 'claimed', 'resolved') NOT NULL DEFAULT 'pending'
  `);
  await connection.query(`
    UPDATE items
    SET status = 'pending'
    WHERE status = 'active'
  `);
  await connection.query(`
    ALTER TABLE items
    MODIFY COLUMN status ENUM('pending', 'claimed', 'resolved') NOT NULL DEFAULT 'pending'
  `);
}

async function verifyDatabaseConnection() {
  const databaseName = process.env.DB_NAME || "campus_lost_n_found";
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    await ensureItemStatusSchema(connection, databaseName);
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  verifyDatabaseConnection,
};
