const express = require("express");
const db = require("../db");
const authenticateAdmin = require("../middleware/adminAuth");

const router = express.Router();

db.query(
  `CREATE TABLE IF NOT EXISTS website_settings (
    id INT PRIMARY KEY,
    settings LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
  )`,
  (error) => {
    if (error) {
      console.error("Website settings table setup failed:", error.message);
    } else {
      console.log("Website settings table is ready.");
    }
  }
);

router.get("/", (req, res) => {
  db.query(
    "SELECT settings FROM website_settings WHERE id = 1 LIMIT 1",
    (error, rows) => {
      if (error) {
        console.error("Website settings read failed:", error.message);
        return res.status(500).json({
          success: false,
          message: "Unable to load website settings.",
        });
      }

      if (!rows || rows.length === 0) {
        return res.json({ success: true, settings: null });
      }

      try {
        return res.json({
          success: true,
          settings: JSON.parse(rows[0].settings),
        });
      } catch (parseError) {
        console.error("Website settings data is invalid:", parseError.message);
        return res.status(500).json({
          success: false,
          message: "Website settings data is invalid.",
        });
      }
    }
  );
});

router.put("/", authenticateAdmin, (req, res) => {
  const settings = req.body && req.body.settings;

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return res.status(400).json({
      success: false,
      message: "Valid website settings are required.",
    });
  }

  db.query(
    `INSERT INTO website_settings (id, settings)
     VALUES (1, ?)
     ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    [JSON.stringify(settings)],
    (error) => {
      if (error) {
        console.error("Website settings save failed:", error.message);
        return res.status(500).json({
          success: false,
          message: "Unable to save website settings.",
        });
      }

      return res.json({
        success: true,
        message: "Website settings saved successfully.",
      });
    }
  );
});

module.exports = router;
