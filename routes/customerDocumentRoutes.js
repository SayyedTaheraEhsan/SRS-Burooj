const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ======================================================
// UPLOAD FOLDER
// ======================================================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "customer-documents"
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
    const ext = path.extname(file.originalname);

    const uniqueName =
      "document-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      ext;

    cb(null, uniqueName);
  },
});

// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are allowed."
      )
    );
  }
};

// ======================================================
// MULTER
// ======================================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// ======================================================
// GET ALL CUSTOMER DOCUMENTS
// ======================================================

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      cd.id,
      cd.customer_id,
      cd.document_name,
      cd.document_type,
      cd.document_url,
      cd.document_status,
      cd.uploaded_at,
      u.name AS customer_name,
      u.email AS customer_email
    FROM customer_documents cd
    LEFT JOIN customer_profiles cp
      ON cd.customer_id = cp.id
    LEFT JOIN users u
      ON cp.user_id = u.id
    ORDER BY cd.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(
        "GET CUSTOMER DOCUMENTS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer documents.",
      });
    }

    res.json({
      success: true,
      documents: results,
    });
  });
});

// ======================================================
// GET DOCUMENTS OF ONE CUSTOMER
// ======================================================

router.get("/customer/:customerId", (req, res) => {
  const customerId = Number(req.params.customerId);

  if (!customerId) {
    return res.status(400).json({
      success: false,
      message: "Valid customer ID is required.",
    });
  }

  const sql = `
    SELECT
      cd.id,
      cd.customer_id,
      cd.document_name,
      cd.document_type,
      cd.document_url,
      cd.document_status,
      cd.uploaded_at,
      u.name AS customer_name,
      u.email AS customer_email
    FROM customer_documents cd
    LEFT JOIN customer_profiles cp
      ON cd.customer_id = cp.id
    LEFT JOIN users u
      ON cp.user_id = u.id
    WHERE cd.customer_id = ?
    ORDER BY cd.id DESC
  `;

  db.query(sql, [customerId], (err, results) => {
    if (err) {
      console.error(
        "GET CUSTOMER DOCUMENTS BY CUSTOMER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer documents.",
      });
    }

    res.json({
      success: true,
      documents: results,
    });
  });
});

// ======================================================
// ADD / UPLOAD CUSTOMER DOCUMENT
// ======================================================

router.post(
  "/",
  authenticateAdmin,
  upload.single("document"),
  (req, res) => {
    const {
      customer_id,
      document_name,
      document_type,
      document_status,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Customer is required.",
      });
    }

    if (!document_name || !document_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Document name is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a document file.",
      });
    }

    const documentUrl =
      "/uploads/customer-documents/" +
      req.file.filename;

    const sql = `
      INSERT INTO customer_documents
      (
        customer_id,
        document_name,
        document_type,
        document_url,
        document_status
      )
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      Number(customer_id),
      document_name.trim(),
      document_type || null,
      documentUrl,
      document_status || "Active",
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error(
          "ADD CUSTOMER DOCUMENT ERROR:",
          err
        );

        // Delete uploaded file if database save fails
        if (req.file) {
          const uploadedFile = path.join(
            uploadDir,
            req.file.filename
          );

          if (fs.existsSync(uploadedFile)) {
            fs.unlinkSync(uploadedFile);
          }
        }

        return res.status(500).json({
          success: false,
          message:
            "Failed to save customer document.",
        });
      }

      res.status(201).json({
        success: true,
        message:
          "Customer document uploaded successfully.",
        documentId: result.insertId,
        documentUrl,
      });
    });
  }
);

// ======================================================
// UPDATE DOCUMENT DETAILS
// ======================================================

router.put("/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);

  const {
    document_name,
    document_type,
    document_status,
  } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Valid document ID is required.",
    });
  }

  if (!document_name || !document_name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Document name is required.",
    });
  }

  const sql = `
    UPDATE customer_documents
    SET
      document_name = ?,
      document_type = ?,
      document_status = ?
    WHERE id = ?
  `;

  const values = [
    document_name.trim(),
    document_type || null,
    document_status || "Active",
    id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(
        "UPDATE CUSTOMER DOCUMENT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update customer document.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json({
      success: true,
      message:
        "Customer document updated successfully.",
    });
  });
});

// ======================================================
// DELETE CUSTOMER DOCUMENT
// ======================================================

router.delete("/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Valid document ID is required.",
    });
  }

  const selectSql = `
    SELECT document_url
    FROM customer_documents
    WHERE id = ?
  `;

  db.query(selectSql, [id], (selectErr, results) => {
    if (selectErr) {
      console.error(
        "FIND CUSTOMER DOCUMENT ERROR:",
        selectErr
      );

      return res.status(500).json({
        success: false,
        message: "Failed to find document.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const documentUrl = results[0].document_url;

    const deleteSql = `
      DELETE FROM customer_documents
      WHERE id = ?
    `;

    db.query(
      deleteSql,
      [id],
      (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error(
            "DELETE CUSTOMER DOCUMENT ERROR:",
            deleteErr
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to delete customer document.",
          });
        }

        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Document not found.",
          });
        }

        // Delete physical file
        if (documentUrl) {
          const relativePath =
            documentUrl.replace(/^\/+/, "");

          const filePath = path.join(
            __dirname,
            "..",
            relativePath
          );

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        res.json({
          success: true,
          message:
            "Customer document deleted successfully.",
        });
      }
    );
  });
});

// ======================================================
// MULTER / ROUTE ERROR HANDLER
// ======================================================

router.use((error, req, res, next) => {
  console.error(
    "CUSTOMER DOCUMENT ROUTE ERROR:",
    error
  );

  res.status(400).json({
    success: false,
    message:
      error.message ||
      "Document upload error.",
  });
});

module.exports = router;