const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const router = express.Router();

// Upload folder
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File storage
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

// File validation
const fileFilter = (req, file, cb) => {
  const allowedImages = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  const allowedVideos = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (
    allowedImages.includes(file.mimetype) ||
    allowedVideos.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP and MP4 videos are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// GET PROJECT MEDIA
router.get("/:projectId", (req, res) => {
  const sql = `
    SELECT *
    FROM project_media
    WHERE project_id = ?
    ORDER BY id DESC
  `;

  db.query(sql, [req.params.projectId], (err, results) => {
    if (err) {
      console.error("Error fetching project media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch project media",
      });
    }

    res.json({
      success: true,
      media: results,
    });
  });
});

// UPLOAD PROJECT PHOTOS
router.post(
  "/:projectId/photos",
  authenticateAdmin,
  upload.array("photos", 20),
  (req, res) => {
    const projectId = req.params.projectId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one photo.",
      });
    }

    const values = req.files.map((file) => [
      projectId,
      "photo",
      `/uploads/${file.filename}`,
    ]);

    const sql = `
      INSERT INTO project_media
      (project_id, media_type, media_url)
      VALUES ?
    `;

    db.query(sql, [values], (err) => {
      if (err) {
        console.error("Error saving project photos:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to save project photos",
        });
      }

      res.json({
        success: true,
        message: "Project photos uploaded successfully",
      });
    });
  }
);

// UPLOAD / REPLACE PROJECT VIDEO
router.post(
  "/:projectId/video",
  authenticateAdmin,
  upload.single("video"),
  (req, res) => {
    const projectId = req.params.projectId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a video.",
      });
    }

    const selectSql = `
      SELECT *
      FROM project_media
      WHERE project_id = ?
      AND media_type = 'video'
    `;

    db.query(selectSql, [projectId], (err, existingVideos) => {
      if (err) {
        console.error("Error checking existing video:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to check existing video",
        });
      }

      const newVideoUrl = `/uploads/${req.file.filename}`;

      // Delete old video file
      existingVideos.forEach((video) => {
        const oldFilePath = path.join(
          __dirname,
          "..",
          video.media_url
        );

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      });

      const deleteSql = `
        DELETE FROM project_media
        WHERE project_id = ?
        AND media_type = 'video'
      `;

      db.query(deleteSql, [projectId], (deleteErr) => {
        if (deleteErr) {
          console.error(
            "Error deleting old project video:",
            deleteErr
          );

          return res.status(500).json({
            success: false,
            message: "Failed to replace project video",
          });
        }

        const insertSql = `
          INSERT INTO project_media
          (project_id, media_type, media_url)
          VALUES (?, 'video', ?)
        `;

        db.query(
          insertSql,
          [projectId, newVideoUrl],
          (insertErr) => {
            if (insertErr) {
              console.error(
                "Error saving project video:",
                insertErr
              );

              return res.status(500).json({
                success: false,
                message: "Failed to save project video",
              });
            }

            res.json({
              success: true,
              message: "Project video uploaded successfully",
            });
          }
        );
      });
    });
  }
);

// DELETE MEDIA
router.delete("/:mediaId", authenticateAdmin, (req, res) => {
  const selectSql = `
    SELECT *
    FROM project_media
    WHERE id = ?
  `;

  db.query(selectSql, [req.params.mediaId], (err, results) => {
    if (err) {
      console.error("Error finding media:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to find media",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
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
      DELETE FROM project_media
      WHERE id = ?
    `;

    db.query(deleteSql, [req.params.mediaId], (deleteErr) => {
      if (deleteErr) {
        console.error("Error deleting media:", deleteErr);

        return res.status(500).json({
          success: false,
          message: "Failed to delete media",
        });
      }

      res.json({
        success: true,
        message: "Media deleted successfully",
      });
    });
  });
});

module.exports = router;