const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedImages.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG and WEBP images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// GET PROGRESS HISTORY
router.get("/:customerPropertyId", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT *
    FROM construction_progress_updates
    WHERE customer_property_id = ?
    ORDER BY progress_date DESC, id DESC
  `;

  db.query(sql, [req.params.customerPropertyId], (err, results) => {
    if (err) {
      console.error("Error fetching construction progress:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch construction progress",
        error: err.message,
      });
    }

    res.json({
      success: true,
      progress: results,
    });
  });
});

// ADD PROGRESS UPDATE
router.post(
  "/",
  authenticateAdmin,
  upload.single("progress_photo"),
  (req, res) => {
    const {
      customer_property_id,
      progress_date,
      progress_percentage,
      update_note,
    } = req.body;

    if (
      !customer_property_id ||
      !progress_date ||
      progress_percentage === undefined ||
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer property, progress date, percentage and photo are required.",
      });
    }

    const progressPhoto = `/uploads/${req.file.filename}`;

    const sql = `
      INSERT INTO construction_progress_updates
      (
        customer_property_id,
        progress_date,
        progress_percentage,
        progress_photo,
        update_note
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      customer_property_id,
      progress_date,
      progress_percentage,
      progressPhoto,
      update_note || null,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error adding construction progress:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to add construction progress",
          error: err.message,
        });
      }

      // Keep latest progress percentage in customer_properties
      const updateCustomerSql = `
        UPDATE customer_properties
        SET project_progress = ?
        WHERE id = ?
      `;

      db.query(
        updateCustomerSql,
        [progress_percentage, customer_property_id],
        (updateErr) => {
          if (updateErr) {
            console.error(
              "Progress saved but customer progress update failed:",
              updateErr
            );
          }

          res.status(201).json({
            success: true,
            message: "Construction progress added successfully",
            progressId: result.insertId,
          });
        }
      );
    });
  }
);

// DELETE PROGRESS UPDATE
router.delete("/:id", authenticateAdmin, (req, res) => {
  const findSql = `
    SELECT *
    FROM construction_progress_updates
    WHERE id = ?
  `;

  db.query(findSql, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to find progress update",
        error: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Progress update not found",
      });
    }

    const progress = results[0];

    const filePath = path.join(
      __dirname,
      "..",
      progress.progress_photo
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const deleteSql = `
      DELETE FROM construction_progress_updates
      WHERE id = ?
    `;

    db.query(deleteSql, [req.params.id], (deleteErr) => {
      if (deleteErr) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete progress update",
          error: deleteErr.message,
        });
      }

      res.json({
        success: true,
        message: "Construction progress deleted successfully",
      });
    });
  });
});

module.exports = router;