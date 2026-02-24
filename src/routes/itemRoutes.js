const express = require("express");
const validateRequest = require("../middleware/validateRequest");
const authenticateAdmin = require("../middleware/auth");
const {
  createItemValidation,
  replaceItemValidation,
  statusUpdateValidation,
  idParamValidation,
  listQueryValidation,
  loginValidation,
} = require("../validation/itemValidation");
const {
  createItem,
  getItems,
  getItemById,
  replaceItem,
  updateItemStatus,
  deleteItem,
} = require("../controllers/itemController");
const { login, verifyToken } = require("../controllers/authController");

const router = express.Router();

// ── Public routes (student side) ────────────────────────────────────
router.get("/", listQueryValidation, validateRequest, getItems);
router.get("/:id", idParamValidation, validateRequest, getItemById);
router.post("/", createItemValidation, validateRequest, createItem);

// ── Auth routes ─────────────────────────────────────────────────────
router.post("/auth/login", loginValidation, validateRequest, login);
router.get("/auth/verify", authenticateAdmin, verifyToken);

// ── Admin-only routes (require authentication) ──────────────────────
router.put(
  "/:id",
  authenticateAdmin,
  replaceItemValidation,
  validateRequest,
  replaceItem
);
router.patch(
  "/:id/status",
  authenticateAdmin,
  statusUpdateValidation,
  validateRequest,
  updateItemStatus
);
router.delete(
  "/:id",
  authenticateAdmin,
  idParamValidation,
  validateRequest,
  deleteItem
);

module.exports = router;
