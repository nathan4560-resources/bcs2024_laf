const { body, param, query } = require("express-validator");

const CATEGORY_VALUES = ["lost", "found"];
const STATUS_VALUES = ["pending", "claimed", "resolved"];
const STATUS_UPDATE_VALUES = ["pending", "claimed", "resolved"];

// ── SQL Injection Detection ─────────────────────────────────────────
// Pattern matches common SQL injection payloads:
//   - Boolean logic: OR 1=1, AND 1=1, OR 'a'='a'
//   - Comment sequences: --, /*, #
//   - UNION-based: UNION SELECT
//   - Stacked queries: ; DROP, ; DELETE, ; INSERT, ; UPDATE
//   - Common functions: SLEEP(), BENCHMARK(), WAITFOR
//   - Tautologies: '=' or "="
const SQL_INJECTION_PATTERNS = [
  /(\b(OR|AND)\b\s+[\w'"]+\s*[=<>!]+\s*[\w'"]+)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(--|\/\*|#)/,
  /(\bUNION\b[\s\S]*\bSELECT\b)/i,
  /(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/i,
  /('\s*=\s*'|"\s*=\s*")/,
  /(\bSELECT\b[\s\S]*\bFROM\b)/i,
  /(\b(DROP|ALTER|TRUNCATE)\s+(TABLE|DATABASE)\b)/i,
  /(\bEXEC\s*\()/i,
  /(0x[0-9a-fA-F]+)/,
  /(\bCHAR\s*\(\s*\d+)/i,
  /(\bCONCAT\s*\()/i,
  /(\bINFORMATION_SCHEMA\b)/i,
  /(\bORDERS?\s*--)/i,
];

function containsSqlInjection(value) {
  if (typeof value !== "string") return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// Custom validator that rejects SQL injection attempts
function noSqlInjection(value) {
  if (containsSqlInjection(value)) {
    throw new Error(
      "Input rejected: potentially dangerous content detected. SQL-like patterns are not allowed."
    );
  }
  return true;
}

const idParamValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Item ID must be a positive integer.")
    .toInt(),
];

const createItemValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 100 })
    .withMessage("Title must not exceed 100 characters.")
    .custom(noSqlInjection)
    .escape(),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required.")
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters.")
    .custom(noSqlInjection)
    .escape(),
  body("category")
    .trim()
    .toLowerCase()
    .isIn(CATEGORY_VALUES)
    .withMessage("Category must be either lost or found."),
  body("location")
    .trim()
    .notEmpty()
    .withMessage("Location is required.")
    .isLength({ max: 120 })
    .withMessage("Location must not exceed 120 characters.")
    .custom(noSqlInjection)
    .escape(),
  body("itemDate")
    .notEmpty()
    .withMessage("Date is required.")
    .isISO8601()
    .withMessage("Date must be in a valid format (YYYY-MM-DD)."),
  body("contactInfo")
    .trim()
    .notEmpty()
    .withMessage("Contact information is required.")
    .isLength({ max: 120 })
    .withMessage("Contact information must not exceed 120 characters.")
    .matches(/^[^<>]{3,120}$/)
    .withMessage("Contact information contains invalid characters.")
    .custom(noSqlInjection)
    .escape(),
  body("status")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(STATUS_VALUES)
    .withMessage("Status must be pending, claimed, or resolved."),
];

const replaceItemValidation = [...idParamValidation, ...createItemValidation];

const statusUpdateValidation = [
  ...idParamValidation,
  body("status")
    .trim()
    .toLowerCase()
    .isIn(STATUS_UPDATE_VALUES)
    .withMessage("Status update must be pending, claimed, or resolved."),
];

const listQueryValidation = [
  query("category")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(CATEGORY_VALUES)
    .withMessage("Category filter must be either lost or found."),
  query("status")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(STATUS_VALUES)
    .withMessage("Status filter must be pending, claimed, or resolved."),
];

const loginValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required.")
    .isLength({ max: 50 })
    .withMessage("Username must not exceed 50 characters.")
    .custom(noSqlInjection),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ max: 128 })
    .withMessage("Password must not exceed 128 characters."),
];

module.exports = {
  idParamValidation,
  createItemValidation,
  replaceItemValidation,
  statusUpdateValidation,
  listQueryValidation,
  loginValidation,
  containsSqlInjection,
};
