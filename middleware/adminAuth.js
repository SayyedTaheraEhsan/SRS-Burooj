const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "srs-burooj-secret-key";

function authenticateAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const token = header.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || decoded.role !== "admin" || !decoded.id) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Admin authentication error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin session",
    });
  }
}

module.exports = authenticateAdmin;
