const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { matchedData } = require("express-validator");

const JWT_SECRET = process.env.JWT_SECRET || "campus_lost_found_secret_key";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Use environment-based admin credentials (hashed at startup)
let adminPasswordHash = null;

async function initAdminHash() {
  adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
}

// Initialize on module load
initAdminHash();

async function login(req, res, next) {
  try {
    const data = matchedData(req, { locations: ["body"] });

    // Validate against env-based admin credentials
    if (data.username !== ADMIN_USERNAME) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const passwordValid = await bcrypt.compare(
      data.password,
      adminPasswordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const token = jwt.sign(
      { username: data.username, role: "admin" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
    });
  } catch (error) {
    return next(error);
  }
}

function verifyToken(req, res) {
  // If this handler runs, the auth middleware already validated the token
  return res.status(200).json({
    message: "Token is valid.",
    admin: req.admin,
  });
}

module.exports = {
  login,
  verifyToken,
};
