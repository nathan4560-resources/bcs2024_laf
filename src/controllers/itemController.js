const { matchedData } = require("express-validator");
const { pool } = require("../config/db");

const ITEM_SELECT_FIELDS = `
  id,
  title,
  description,
  category,
  location,
  DATE_FORMAT(item_date, '%Y-%m-%d') AS itemDate,
  contact_info AS contactInfo,
  status,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
  DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
`;

async function findItemById(id) {
  const [rows] = await pool.execute(
    `SELECT ${ITEM_SELECT_FIELDS} FROM items WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createItem(req, res, next) {
  try {
    const data = matchedData(req, {
      locations: ["body"],
      includeOptionals: true,
    });

    const status = "pending";

    const [result] = await pool.execute(
      `INSERT INTO items (
        title, description, category, location, item_date, contact_info, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description,
        data.category,
        data.location,
        data.itemDate,
        data.contactInfo,
        status,
      ]
    );

    const item = await findItemById(result.insertId);

    return res.status(201).json({
      message: "Report submitted successfully.",
      item,
    });
  } catch (error) {
    return next(error);
  }
}

async function getItems(req, res, next) {
  try {
    const filters = matchedData(req, {
      locations: ["query"],
      includeOptionals: true,
    });

    const whereClauses = [];
    const queryValues = [];

    if (filters.category) {
      whereClauses.push("category = ?");
      queryValues.push(filters.category);
    }

    if (filters.status) {
      whereClauses.push("status = ?");
      queryValues.push(filters.status);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [rows] = await pool.execute(
      `SELECT ${ITEM_SELECT_FIELDS}
       FROM items
       ${whereSql}
       ORDER BY created_at DESC`,
      queryValues
    );

    return res.status(200).json({
      count: rows.length,
      items: rows,
    });
  } catch (error) {
    return next(error);
  }
}

async function getItemById(req, res, next) {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const item = await findItemById(id);

    if (!item) {
      return res.status(404).json({
        message: "Item report not found.",
      });
    }

    return res.status(200).json({
      item,
    });
  } catch (error) {
    return next(error);
  }
}

async function replaceItem(req, res, next) {
  try {
    const data = matchedData(req, {
      locations: ["params", "body"],
      includeOptionals: true,
    });

    const [result] = await pool.execute(
      `UPDATE items
       SET title = ?,
           description = ?,
           category = ?,
           location = ?,
           item_date = ?,
           contact_info = ?,
           status = ?
       WHERE id = ?`,
      [
        data.title,
        data.description,
        data.category,
        data.location,
        data.itemDate,
        data.contactInfo,
        data.status || "pending",
        data.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Item report not found.",
      });
    }

    const item = await findItemById(data.id);

    return res.status(200).json({
      message: "Item report updated successfully.",
      item,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateItemStatus(req, res, next) {
  try {
    const data = matchedData(req, {
      locations: ["params", "body"],
    });

    // Normalise and guard the status value
    const newStatus = (data.status || "").trim().toLowerCase();
    const ALLOWED = ["pending", "claimed", "resolved"];
    if (!ALLOWED.includes(newStatus)) {
      return res.status(400).json({
        message: "Status must be pending, claimed, or resolved.",
      });
    }

    const currentItem = await findItemById(data.id);

    if (!currentItem) {
      return res.status(404).json({
        message: "Item report not found.",
      });
    }

    // ── RESOLVED → Delete the item ──────────────────────────────────
    if (newStatus === "resolved") {
      await pool.execute(`DELETE FROM items WHERE id = ?`, [data.id]);

      return res.status(200).json({
        message: "Item has been resolved and removed from the system.",
        action: "deleted",
        item: currentItem,
      });
    }

    // ── CLAIMED → Move lost items to found category ─────────────────
    if (newStatus === "claimed") {
      const newCategory =
        currentItem.category === "lost" ? "found" : currentItem.category;

      await pool.execute(
        `UPDATE items SET status = ?, category = ? WHERE id = ?`,
        [newStatus, newCategory, data.id]
      );

      const updatedItem = await findItemById(data.id);

      return res.status(200).json({
        message:
          currentItem.category === "lost"
            ? "Status updated to claimed. Item moved from Lost to Found."
            : "Status updated to claimed.",
        action: "claimed",
        item: updatedItem,
      });
    }

    // ── PENDING (reset) ─────────────────────────────────────────────
    await pool.execute(`UPDATE items SET status = ? WHERE id = ?`, [
      newStatus,
      data.id,
    ]);

    const updatedItem = await findItemById(data.id);

    return res.status(200).json({
      message: "Status updated successfully.",
      action: "updated",
      item: updatedItem,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteItem(req, res, next) {
  try {
    const { id } = matchedData(req, { locations: ["params"] });

    const [result] = await pool.execute(`DELETE FROM items WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Item report not found.",
      });
    }

    return res.status(200).json({
      message: "Item report deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createItem,
  getItems,
  getItemById,
  replaceItem,
  updateItemStatus,
  deleteItem,
};
