const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const db = require("../db");

// ==========================================
// CONSTRUCTION PHOTO UPLOAD FOLDER
// ==========================================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "construction"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName =
      "construction-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 100000) +
      extension;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
});

// ==========================================
// GET CONSTRUCTION UPDATES
// ==========================================

router.get(
  "/property/:customerPropertyId",
  (req, res) => {
    const customerPropertyId =
      req.params.customerPropertyId;

    const sql = `
      SELECT
        id,
        customer_property_id,
        progress,
        photo_url,
        update_note,
        update_date,
        created_at
      FROM construction_updates
      WHERE customer_property_id = ?
      ORDER BY update_date DESC, created_at DESC
    `;

    db.query(
      sql,
      [customerPropertyId],
      (err, results) => {
        if (err) {
          console.error(
            "Construction updates fetch error:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to fetch construction updates",
          });
        }

        return res.json({
          success: true,
          updates: results,
        });
      }
    );
  }
);

// ==========================================
// ADD CONSTRUCTION UPDATE + PHOTO
// ==========================================

router.post(
  "/",
  authenticateAdmin,
  upload.single("photo"),
  (req, res) => {
    const {
      customer_property_id,
      progress,
      update_note,
      update_date,
    } = req.body;

    if (!customer_property_id) {
      return res.status(400).json({
        success: false,
        message: "Customer property ID is required",
      });
    }

    const photoUrl = req.file
      ? `/uploads/construction/${req.file.filename}`
      : null;

    const sql = `
      INSERT INTO construction_updates
      (
        customer_property_id,
        progress,
        photo_url,
        update_note,
        update_date
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        customer_property_id,
        progress || 0,
        photoUrl,
        update_note || null,
        update_date || null,
      ],
      (err, result) => {
        if (err) {
          console.error(
            "Construction update add error:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to add construction update",
          });
        }

        return res.status(201).json({
          success: true,
          message:
            "Construction update added successfully",
          updateId: result.insertId,
          photo_url: photoUrl,
        });
      }
    );
  }
);

module.exports = router;