const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const db = require("../db");

const router = express.Router();

// =====================================================
// CLOUDINARY CONFIGURATION
// Uses the same Render environment variables as construction progress.
// =====================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
    }
  },
});

function uploadPromotionImage(file) {
  return new Promise((resolve, reject) => {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return reject(
        new Error("Cloudinary configuration is missing on the server.")
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "srs-burooj/promotions",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error("Cloudinary did not return an image URL."));
        }
        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
}

// =====================================================
// GET ALL ADVERTISEMENTS
// =====================================================

router.get("/", (req, res) => {
  const sql = `
    SELECT *
    FROM advertisements
    ORDER BY featured DESC, id DESC
  `;

  db.query(sql, (error, results) => {
    if (error) {
      console.error("GET advertisements error:", error);
      return res.status(500).json({
        success: false,
        message: "Advertisements load nahi ho rahe.",
      });
    }

    res.json({
      success: true,
      advertisements: results,
    });
  });
});

// =====================================================
// GET SINGLE ADVERTISEMENT
// =====================================================

router.get("/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT *
    FROM advertisements
    WHERE id = ?
  `;

  db.query(sql, [id], (error, results) => {
    if (error) {
      console.error("GET advertisement error:", error);
      return res.status(500).json({
        success: false,
        message: "Advertisement load nahi hua.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Advertisement nahi mila.",
      });
    }

    res.json({
      success: true,
      advertisement: results[0],
    });
  });
});

// =====================================================
// ADD ADVERTISEMENT
// =====================================================

router.post(
  "/",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        title,
        advertisement_type,
        description,
        offer_title,
        offer_details,
        offer_start_date,
        offer_end_date,
        project_name,
        location,
        unit_type,
        bhk,
        area,
        floor,
        bathrooms,
        price,
        status,
        featured,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Promotion title required hai.",
        });
      }

      // Upload image to Cloudinary if a file was selected.
      const image = req.file ? await uploadPromotionImage(req.file) : "";

      const sql = `
        INSERT INTO advertisements (
          title,
          advertisement_type,
          description,
          offer_title,
          offer_details,
          offer_start_date,
          offer_end_date,
          project_name,
          location,
          unit_type,
          bhk,
          area,
          floor,
          bathrooms,
          price,
          image,
          status,
          featured
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        title.trim(),
        advertisement_type || "Property",
        description || null,
        offer_title || null,
        offer_details || null,
        offer_start_date || null,
        offer_end_date || null,
        project_name || null,
        location || null,
        unit_type || null,
        bhk || null,
        area || null,
        floor || null,
        bathrooms || null,
        price || null,
        image,
        status || "Active",
        Number(featured) === 1 ? 1 : 0,
      ];

      db.query(sql, values, (error, result) => {
        if (error) {
          console.error("POST advertisement error:", error);
          return res.status(500).json({
            success: false,
            message: "Advertisement save nahi hua.",
          });
        }

        res.status(201).json({
          success: true,
          message: "Promotion successfully added.",
          advertisementId: result.insertId,
          image,
        });
      });
    } catch (error) {
      console.error("POST advertisement image upload error:", error);
      return res.status(500).json({
        success: false,
        message: "Promotion image upload nahi ho payi. Please dobara try karein.",
      });
    }
  }
);

// =====================================================
// UPDATE ADVERTISEMENT
// =====================================================

router.put(
  "/:id",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    const { id } = req.params;

    try {
      const {
        title,
        advertisement_type,
        description,
        offer_title,
        offer_details,
        offer_start_date,
        offer_end_date,
        project_name,
        location,
        unit_type,
        bhk,
        area,
        floor,
        bathrooms,
        price,
        status,
        featured,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Promotion title required hai.",
        });
      }

      const getSql = `
        SELECT image
        FROM advertisements
        WHERE id = ?
      `;

      db.query(getSql, [id], async (getError, rows) => {
        if (getError) {
          console.error("GET old advertisement error:", getError);
          return res.status(500).json({
            success: false,
            message: "Old advertisement load nahi hua.",
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Advertisement nahi mila.",
          });
        }

        try {
          // Keep the existing image unless a new image is uploaded.
          let image = rows[0].image || "";
          if (req.file) {
            image = await uploadPromotionImage(req.file);
          }

          const updateSql = `
            UPDATE advertisements
            SET
              title = ?,
              advertisement_type = ?,
              description = ?,
              offer_title = ?,
              offer_details = ?,
              offer_start_date = ?,
              offer_end_date = ?,
              project_name = ?,
              location = ?,
              unit_type = ?,
              bhk = ?,
              area = ?,
              floor = ?,
              bathrooms = ?,
              price = ?,
              image = ?,
              status = ?,
              featured = ?
            WHERE id = ?
          `;

          const values = [
            title.trim(),
            advertisement_type || "Property",
            description || null,
            offer_title || null,
            offer_details || null,
            offer_start_date || null,
            offer_end_date || null,
            project_name || null,
            location || null,
            unit_type || null,
            bhk || null,
            area || null,
            floor || null,
            bathrooms || null,
            price || null,
            image,
            status || "Active",
            Number(featured) === 1 ? 1 : 0,
            id,
          ];

          db.query(updateSql, values, (updateError) => {
            if (updateError) {
              console.error("PUT advertisement error:", updateError);
              return res.status(500).json({
                success: false,
                message: "Advertisement update nahi hua.",
              });
            }

            res.json({
              success: true,
              message: "Promotion successfully updated.",
              image,
            });
          });
        } catch (uploadError) {
          console.error("PUT advertisement image upload error:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Promotion image upload nahi ho payi. Please dobara try karein.",
          });
        }
      });
    } catch (error) {
      console.error("PUT advertisement error:", error);
      return res.status(500).json({
        success: false,
        message: "Advertisement update nahi hua.",
      });
    }
  }
);

// =====================================================
// DELETE ADVERTISEMENT
// =====================================================

router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const getSql = `
    SELECT image
    FROM advertisements
    WHERE id = ?
  `;

  db.query(getSql, [id], (getError, rows) => {
    if (getError) {
      console.error("GET advertisement before delete error:", getError);
      return res.status(500).json({
        success: false,
        message: "Advertisement delete nahi hua.",
      });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Advertisement nahi mila.",
      });
    }

    const imagePath = rows[0].image;
    const deleteSql = `
      DELETE FROM advertisements
      WHERE id = ?
    `;

    db.query(deleteSql, [id], (deleteError) => {
      if (deleteError) {
        console.error("DELETE advertisement error:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Advertisement delete nahi hua.",
        });
      }

      // Only remove legacy local files. Never delete Cloudinary assets here.
      if (
        imagePath &&
        imagePath.startsWith("/uploads/promotions/")
      ) {
        const safeFileName = path.basename(imagePath);
        const fullImagePath = path.join(
          __dirname,
          "..",
          "uploads",
          "promotions",
          safeFileName
        );

        if (fs.existsSync(fullImagePath)) {
          fs.unlink(fullImagePath, (unlinkError) => {
            if (unlinkError) {
              console.error("Legacy promotion image cleanup error:", unlinkError);
            }
          });
        }
      }

      res.json({
        success: true,
        message: "Promotion successfully deleted.",
      });
    });
  });
});

// =====================================================
// MULTER / ROUTE ERROR HANDLER
// =====================================================

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: "Image upload error: " + error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;
