const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

const router = express.Router();

// =====================================================
// PROMOTION IMAGE UPLOAD
// =====================================================

const uploadFolder = path.join(
  __dirname,
  "..",
  "uploads",
  "promotions"
);

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);

    const uniqueName =
      "promotion-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 100000) +
      extension;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

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
      cb(
        new Error(
          "Only JPG, JPEG, PNG and WEBP images are allowed."
        )
      );
    }
  },
});

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
      console.error(
        "GET advertisements error:",
        error
      );

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
      console.error(
        "GET advertisement error:",
        error
      );

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
  (req, res) => {
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

    const image = req.file
      ? `/uploads/promotions/${req.file.filename}`
      : "";

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

    db.query(
      sql,
      values,
      (error, result) => {
        if (error) {
          console.error(
            "POST advertisement error:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Advertisement save nahi hua.",
          });
        }

        res.status(201).json({
          success: true,
          message:
            "Promotion successfully added.",
          advertisementId: result.insertId,
          image,
        });
      }
    );
  }
);

// =====================================================
// UPDATE ADVERTISEMENT
// =====================================================

router.put(
  "/:id",
  authenticateAdmin,
  upload.single("image"),
  (req, res) => {
    const { id } = req.params;

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

    // First get old advertisement
    const getSql = `
      SELECT image
      FROM advertisements
      WHERE id = ?
    `;

    db.query(
      getSql,
      [id],
      (getError, rows) => {
        if (getError) {
          console.error(
            "GET old advertisement error:",
            getError
          );

          return res.status(500).json({
            success: false,
            message:
              "Old advertisement load nahi hua.",
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message:
              "Advertisement nahi mila.",
          });
        }

        let image = rows[0].image || "";

        // New image selected
        if (req.file) {
          image =
            `/uploads/promotions/${req.file.filename}`;
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

        db.query(
          updateSql,
          values,
          (updateError) => {
            if (updateError) {
              console.error(
                "PUT advertisement error:",
                updateError
              );

              return res.status(500).json({
                success: false,
                message:
                  "Advertisement update nahi hua.",
              });
            }

            res.json({
              success: true,
              message:
                "Promotion successfully updated.",
              image,
            });
          }
        );
      }
    );
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

  db.query(
    getSql,
    [id],
    (getError, rows) => {
      if (getError) {
        console.error(
          "GET advertisement before delete error:",
          getError
        );

        return res.status(500).json({
          success: false,
          message:
            "Advertisement delete nahi hua.",
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Advertisement nahi mila.",
        });
      }

      const imagePath = rows[0].image;

      const deleteSql = `
        DELETE FROM advertisements
        WHERE id = ?
      `;

      db.query(
        deleteSql,
        [id],
        (deleteError) => {
          if (deleteError) {
            console.error(
              "DELETE advertisement error:",
              deleteError
            );

            return res.status(500).json({
              success: false,
              message:
                "Advertisement delete nahi hua.",
            });
          }

          // Delete uploaded image from server
          if (
            imagePath &&
            imagePath.startsWith(
              "/uploads/promotions/"
            )
          ) {
            const fullImagePath =
              path.join(
                __dirname,
                "..",
                imagePath
              );

            if (fs.existsSync(fullImagePath)) {
              fs.unlink(
                fullImagePath,
                () => {}
              );
            }
          }

          res.json({
            success: true,
            message:
              "Promotion successfully deleted.",
          });
        }
      );
    }
  );
});

// =====================================================
// MULTER ERROR HANDLER
// =====================================================

router.use(
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          "Image upload error: " +
          error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next();
  }
);

module.exports = router;