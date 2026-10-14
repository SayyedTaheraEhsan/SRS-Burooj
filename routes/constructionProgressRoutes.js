const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

// ======================================================
// UPLOAD FOLDER
// ======================================================

const uploadDir = path.join(
  __dirname,
  "../uploads/construction"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      "construction-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;

  const extension = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimeType = allowedTypes.test(file.mimetype);

  if (extension && mimeType) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed"
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// ======================================================
// ADD CONSTRUCTION PROGRESS
// ======================================================

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

    if (!customer_property_id) {
      return res.status(400).json({
        success: false,
        message: "Customer property ID is required",
      });
    }

    if (progress_percentage === undefined) {
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

    const photoPath =
      "/uploads/construction/" +
      req.file.filename;

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
        photoPath,
        update_note || null,
        progress_date || null,
      ],
      (err, result) => {
        if (err) {
          console.error(
            "Error saving construction progress:",
            err
          );

          return res.status(500).json({
            success: false,
            message: "Failed to save construction progress",
          });
        }

        res.status(201).json({
          success: true,
          message:
            "Construction progress updated successfully",
          progressId: result.insertId,
          photo: photoPath,
        });
      }
    );
  }
);

// ======================================================
// GET ALL CONSTRUCTION PROGRESS
// ======================================================

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
      console.error(
        "Error fetching all construction progress:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch construction progress",
      });
    }

    res.json({
      success: true,
      progress: results,
    });
  });
});

// ======================================================
// GET CUSTOMER PROPERTY PROGRESS HISTORY
// ======================================================

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

  db.query(
    sql,
    [req.params.customerPropertyId],
    (err, results) => {
      if (err) {
        console.error(
          "Error fetching construction progress:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Failed to fetch construction progress",
        });
      }

      res.json({
        success: true,
        progress: results,
      });
    }
  );
});

// ======================================================
// EDIT CONSTRUCTION PROGRESS
// ======================================================

router.put(
  "/:id",
  authenticateAdmin,
  upload.single("progress_photo"),
  (req, res) => {
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

    if (progress_percentage === undefined) {
      return res.status(400).json({
        success: false,
        message: "Progress percentage is required",
      });
    }

    // First get old photo
    const selectSql = `
      SELECT photo_url
      FROM construction_updates
      WHERE id = ?
    `;

    db.query(
      selectSql,
      [id],
      (selectErr, results) => {
        if (selectErr) {
          console.error(
            "Error finding construction update:",
            selectErr
          );

          return res.status(500).json({
            success: false,
            message: "Failed to find construction update",
          });
        }

        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Construction update not found",
          });
        }

        const oldPhoto = results[0].photo_url;

        let sql;
        let values;

        if (req.file) {
          const newPhotoPath =
            "/uploads/construction/" +
            req.file.filename;

          sql = `
            UPDATE construction_updates
            SET
              customer_property_id = ?,
              progress = ?,
              photo_url = ?,
              update_note = ?,
              update_date = ?
            WHERE id = ?
          `;

          values = [
            customer_property_id,
            progress_percentage,
            newPhotoPath,
            update_note || null,
            progress_date || null,
            id,
          ];
        } else {
          sql = `
            UPDATE construction_updates
            SET
              customer_property_id = ?,
              progress = ?,
              update_note = ?,
              update_date = ?
            WHERE id = ?
          `;

          values = [
            customer_property_id,
            progress_percentage,
            update_note || null,
            progress_date || null,
            id,
          ];
        }

        db.query(
          sql,
          values,
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error(
                "Error updating construction progress:",
                updateErr
              );

              return res.status(500).json({
                success: false,
                message:
                  "Failed to update construction progress",
              });
            }

            if (updateResult.affectedRows === 0) {
              return res.status(404).json({
                success: false,
                message:
                  "Construction update not found",
              });
            }

            // Delete old photo only when new photo uploaded
            if (req.file && oldPhoto) {
              const oldFilePath = path.join(
                __dirname,
                "..",
                oldPhoto
              );

              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            }

            res.json({
              success: true,
              message:
                "Construction progress updated successfully",
            });
          }
        );
      }
    );
  }
);

// ======================================================
// DELETE CONSTRUCTION PROGRESS
// ======================================================

router.delete("/:id", authenticateAdmin, (req, res) => {
  const id = req.params.id;

  const selectSql = `
    SELECT photo_url
    FROM construction_updates
    WHERE id = ?
  `;

  db.query(
    selectSql,
    [id],
    (selectErr, results) => {
      if (selectErr) {
        console.error(
          "Error finding construction photo:",
          selectErr
        );

        return res.status(500).json({
          success: false,
          message: "Failed to find construction update",
        });
      }

      const photoUrl =
        results.length > 0
          ? results[0].photo_url
          : null;

      const deleteSql = `
        DELETE FROM construction_updates
        WHERE id = ?
      `;

      db.query(
        deleteSql,
        [id],
        (deleteErr, deleteResult) => {
          if (deleteErr) {
            console.error(
              "Error deleting construction progress:",
              deleteErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Failed to delete construction progress",
            });
          }

          if (deleteResult.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: "Construction update not found",
            });
          }

          // Delete physical photo
          if (photoUrl) {
            const filePath = path.join(
              __dirname,
              "..",
              photoUrl
            );

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }

          res.json({
            success: true,
            message:
              "Construction progress deleted successfully",
          });
        }
      );
    }
  );
});

module.exports = router;