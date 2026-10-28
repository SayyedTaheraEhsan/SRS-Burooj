const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");
const db = require("../db");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Existing local files are retained.
// New construction progress photos will be uploaded to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpe?g|png|webp)$/i.test(
      path.extname(file.originalname)
    );
    const mimeAllowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.mimetype);

    if (allowed && mimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed"));
    }
  },
});

function uploadConstructionPhoto(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "srs-burooj/construction",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
}

// Only remove files belonging to the old local uploads folder.
// Do not delete Cloudinary assets or unrelated/private documents here.
function removeOldLocalPhoto(photoUrl) {
  if (
    !photoUrl ||
    !photoUrl.startsWith("/uploads/construction/")
  ) {
    return;
  }

  const filename = path.basename(photoUrl);
  const filePath = path.join(
    __dirname,
    "../uploads/construction",
    filename
  );

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("Could not remove old local construction photo:", error.message);
    }
  }
}

// ADD CONSTRUCTION PROGRESS
router.post(
  "/",
  authenticateAdmin,
  upload.single("progress_photo"),
  async (req, res) => {
    const {
      customer_property_id,
      progress_date,
      progress_percentage,
      update_note,
    } = req.body;

    if (!customer_property_id) {
      return res.status(400).json({
        success: false,
        message: "Customer property ID is required",
      });
    }

    if (
      progress_percentage === undefined ||
      progress_percentage === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Progress percentage is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Construction progress photo is required",
      });
    }

    let photoUrl;

    try {
      photoUrl = await uploadConstructionPhoto(req.file);
    } catch (error) {
      console.error("Construction photo upload failed:", error.message);
      return res.status(502).json({
        success: false,
        message: "Unable to upload construction photo. Please try again.",
      });
    }

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
        progress_percentage,
        photoUrl,
        update_note || null,
        progress_date || null,
      ],
      (err, result) => {
        if (err) {
          console.error("Error saving construction progress:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to save construction progress",
          });
        }

        return res.status(201).json({
          success: true,
          message: "Construction progress updated successfully",
          progressId: result.insertId,
          photo: photoUrl,
        });
      }
    );
  }
);

// GET ALL CONSTRUCTION PROGRESS
router.get("/", (req, res) => {
  const sql = `
    SELECT
      id,
      customer_property_id,
      progress AS progress_percentage,
      photo_url AS progress_photo,
      update_note,
      update_date AS progress_date,
      created_at
    FROM construction_updates
    ORDER BY update_date DESC, created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching construction progress:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch construction progress",
      });
    }

    return res.json({ success: true, progress: results });
  });
});

// GET CUSTOMER PROPERTY PROGRESS HISTORY
router.get("/:customerPropertyId", (req, res) => {
  const sql = `
    SELECT
      id,
      customer_property_id,
      progress AS progress_percentage,
      photo_url AS progress_photo,
      update_note,
      update_date AS progress_date,
      created_at
    FROM construction_updates
    WHERE customer_property_id = ?
    ORDER BY update_date DESC, created_at DESC
  `;

  db.query(sql, [req.params.customerPropertyId], (err, results) => {
    if (err) {
      console.error("Error fetching property progress:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch construction progress",
      });
    }

    return res.json({ success: true, progress: results });
  });
});// EDIT CONSTRUCTION PROGRESS
router.put(
  "/:id",
  authenticateAdmin,
  upload.single("progress_photo"),
  async (req, res) => {
    const id = req.params.id;
    const {
      customer_property_id,
      progress_date,
      progress_percentage,
      update_note,
    } = req.body;

    if (!customer_property_id) {
      return res.status(400).json({
        success: false,
        message: "Customer property ID is required",
      });
    }

    if (
      progress_percentage === undefined ||
      progress_percentage === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Progress percentage is required",
      });
    }

    db.query(
      "SELECT photo_url FROM construction_updates WHERE id = ?",
      [id],
      async (selectErr, results) => {
        if (selectErr) {
          console.error("Error finding construction update:", selectErr);
          return res.status(500).json({
            success: false,
            message: "Failed to find construction update",
          });
        }

        if (!results.length) {
          return res.status(404).json({
            success: false,
            message: "Construction update not found",
          });
        }

        const oldPhoto = results[0].photo_url;
        let newPhoto = oldPhoto;

        if (req.file) {
          try {
            newPhoto = await uploadConstructionPhoto(req.file);
          } catch (error) {
            console.error("Construction photo upload failed:", error.message);
            return res.status(502).json({
              success: false,
              message: "Unable to upload construction photo. Please try again.",
            });
          }
        }

        const sql = req.file
          ? `UPDATE construction_updates
             SET customer_property_id = ?, progress = ?, photo_url = ?,
                 update_note = ?, update_date = ?
             WHERE id = ?`
          : `UPDATE construction_updates
             SET customer_property_id = ?, progress = ?,
                 update_note = ?, update_date = ?
             WHERE id = ?`;

        const values = req.file
          ? [
              customer_property_id,
              progress_percentage,
              newPhoto,
              update_note || null,
              progress_date || null,
              id,
            ]
          : [
              customer_property_id,
              progress_percentage,
              update_note || null,
              progress_date || null,
              id,
            ];

        db.query(sql, values, (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Error updating construction progress:", updateErr);
            return res.status(500).json({
              success: false,
              message: "Failed to update construction progress",
            });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: "Construction update not found",
            });
          }

          // Only remove an old local photo after a successful update.
          // Existing Cloudinary photos are deliberately left untouched.
          if (req.file) {
            removeOldLocalPhoto(oldPhoto);
          }

          return res.json({
            success: true,
            message: "Construction progress updated successfully",
            photo: newPhoto,
          });
        });
      }
    );
  }
);// DELETE CONSTRUCTION PROGRESS
router.delete("/:id", authenticateAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT photo_url FROM construction_updates WHERE id = ?",
    [id],
    (selectErr, results) => {
      if (selectErr) {
        console.error("Error finding construction photo:", selectErr);
        return res.status(500).json({
          success: false,
          message: "Failed to find construction update",
        });
      }

      if (!results.length) {
        return res.status(404).json({
          success: false,
          message: "Construction update not found",
        });
      }

      const photoUrl = results[0].photo_url;

      db.query(
        "DELETE FROM construction_updates WHERE id = ?",
        [id],
        (deleteErr, deleteResult) => {
          if (deleteErr) {
            console.error("Error deleting construction progress:", deleteErr);
            return res.status(500).json({
              success: false,
              message: "Failed to delete construction progress",
            });
          }

          if (!deleteResult.affectedRows) {
            return res.status(404).json({
              success: false,
              message: "Construction update not found",
            });
          }

          // Only delete old local construction files.
          // Do not delete Cloudinary assets or private customer documents.
          removeOldLocalPhoto(photoUrl);

          return res.json({
            success: true,
            message: "Construction progress deleted successfully",
          });
        }
      );
    }
  );
});

module.exports = router;