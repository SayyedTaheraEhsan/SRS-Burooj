const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

// =====================================================
// GET ALL INQUIRIES
// =====================================================
router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      phone,
      email,
      source,
      status,
      callback_date,
      feedback,
      message,
      created_at
    FROM inquiries
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("GET INQUIRIES ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch inquiries",
      });
    }

    res.json({
      success: true,
      inquiries: results,
    });
  });
});

// =====================================================
// GET SINGLE INQUIRY
// =====================================================
router.get("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id,
      name,
      phone,
      email,
      source,
      status,
      callback_date,
      feedback,
      message,
      created_at
    FROM inquiries
    WHERE id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("GET SINGLE INQUIRY ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch inquiry",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      inquiry: results[0],
    });
  });
});

// =====================================================
// CREATE INQUIRY
// Website / Instagram / Facebook / Phone / Reference
// =====================================================
router.post("/", (req, res) => {
  const {
    name,
    phone,
    email,
    source,
    status,
    callback_date,
    feedback,
    message,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name and phone are required",
    });
  }

  const sql = `
    INSERT INTO inquiries
    (
      name,
      phone,
      email,
      source,
      status,
      callback_date,
      feedback,
      message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    phone,
    email || null,
    source || "Website",
    status || "New",
    callback_date || null,
    feedback || null,
    message || null,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("CREATE INQUIRY ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to create inquiry",
      });
    }

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      inquiryId: result.insertId,
    });
  });
});

// =====================================================
// UPDATE INQUIRY
// =====================================================
router.put("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const {
    name,
    phone,
    email,
    source,
    status,
    callback_date,
    feedback,
    message,
  } = req.body;

  const sql = `
    UPDATE inquiries
    SET
      name = ?,
      phone = ?,
      email = ?,
      source = ?,
      status = ?,
      callback_date = ?,
      feedback = ?,
      message = ?
    WHERE id = ?
  `;

  const values = [
    name,
    phone,
    email || null,
    source || "Website",
    status || "New",
    callback_date || null,
    feedback || null,
    message || null,
    id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("UPDATE INQUIRY ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to update inquiry",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Inquiry updated successfully",
    });
  });
});

// =====================================================
// DELETE INQUIRY
// =====================================================
router.delete("/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM inquiries WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("DELETE INQUIRY ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to delete inquiry",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  });
});

module.exports = router;