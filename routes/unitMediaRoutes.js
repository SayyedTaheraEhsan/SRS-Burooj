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

// GET UNIT PHOTOS
router.get("/:unitId", (req, res) => {
  const sql = `
    SELECT *
    FROM unit_media
    WHERE unit_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [req.params.unitId], (err, results) => {
    if (err) {
      console.error("Error fetching unit media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch unit photos",
      });
    }

    res.json({
      success: true,
      media: results,
    });
  });
});

// UPLOAD UNIT PHOTOS
router.post(
  "/:unitId/photos",
  authenticateAdmin,
  upload.array("photos", 20),
  (req, res) => {
    const unitId = req.params.unitId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo.",
      });
    }

    const values = req.files.map((file) => [
      unitId,
      "photo",
      `/uploads/${file.filename}`,
    ]);

    const sql = `
      INSERT INTO unit_media
      (unit_id, media_type, media_url)
      VALUES ?
    `;

    db.query(sql, [values], (err) => {
      if (err) {
        console.error("Error saving unit photos:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to save unit photos",
        });
      }

      res.json({
        success: true,
        message: "Unit photos uploaded successfully",
      });
    });
  }
);

// DELETE UNIT PHOTO
router.delete("/:mediaId", authenticateAdmin, (req, res) => {
  const selectSql = `
    SELECT *
    FROM unit_media
    WHERE id = ?
  `;

  db.query(selectSql, [req.params.mediaId], (err, results) => {
    if (err) {
      console.error("Error finding unit media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to find unit photo",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit photo not found",
      });
    }

    const media = results[0];

    const filePath = path.join(
      __dirname,
      "..",
      media.media_url
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const deleteSql = `
      DELETE FROM unit_media
      WHERE id = ?
    `;

    db.query(deleteSql, [req.params.mediaId], (deleteErr) => {
      if (deleteErr) {
        console.error("Error deleting unit photo:", deleteErr);

        return res.status(500).json({
          success: false,
          message: "Failed to delete unit photo",
        });
      }

      res.json({
        success: true,
        message: "Unit photo deleted successfully",
      });
    });
  });
});

module.exports = router;