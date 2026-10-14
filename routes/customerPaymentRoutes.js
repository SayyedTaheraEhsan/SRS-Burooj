const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();

const db = require("../db");

// =====================================================
// GET PAYMENT PLANS FOR A CUSTOMER PROPERTY
// =====================================================
router.get("/plans/:customerPropertyId", (req, res) => {
  const { customerPropertyId } = req.params;

  const sql = `
    SELECT *
    FROM customer_payment_plans
    WHERE customer_property_id = ?
    ORDER BY due_date ASC, id ASC
  `;

  db.query(sql, [customerPropertyId], (err, results) => {
    if (err) {
      console.error("Payment plans fetch error:", err);
      return res.status(500).json({
        message: "Failed to fetch payment plans"
      });
    }

    res.json(results);
  });
});

// =====================================================
// ADD PAYMENT PLAN / INSTALLMENT
// =====================================================
router.post("/plans", authenticateAdmin, (req, res) => {
  const {
    customer_property_id,
    installment_name,
    milestone,
    percentage,
    installment_amount,
    due_date,
    payment_status,
    payment_date,
    payment_note
  } = req.body;

  if (!customer_property_id || !installment_name) {
    return res.status(400).json({
      message: "Customer property and installment name are required"
    });
  }

  const sql = `
    INSERT INTO customer_payment_plans
    (
      customer_property_id,
      installment_name,
      milestone,
      percentage,
      installment_amount,
      due_date,
      payment_status,
      payment_date,
      payment_note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    customer_property_id,
    installment_name,
    milestone || null,
    percentage || 0,
    installment_amount || 0,
    due_date || null,
    payment_status || "Pending",
    payment_date || null,
    payment_note || null
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Payment plan insert error:", err);
      return res.status(500).json({
        message: "Failed to add payment plan"
      });
    }

    res.status(201).json({
      message: "Payment plan added successfully",
      id: result.insertId
    });
  });
});

// =====================================================
// UPDATE PAYMENT PLAN / INSTALLMENT
// =====================================================
router.put("/plans/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const {
    installment_name,
    milestone,
    percentage,
    installment_amount,
    due_date,
    payment_status,
    payment_date,
    payment_note
  } = req.body;

  const sql = `
    UPDATE customer_payment_plans
    SET
      installment_name = ?,
      milestone = ?,
      percentage = ?,
      installment_amount = ?,
      due_date = ?,
      payment_status = ?,
      payment_date = ?,
      payment_note = ?
    WHERE id = ?
  `;

  const values = [
    installment_name,
    milestone || null,
    percentage || 0,
    installment_amount || 0,
    due_date || null,
    payment_status || "Pending",
    payment_date || null,
    payment_note || null,
    id
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Payment plan update error:", err);
      return res.status(500).json({
        message: "Failed to update payment plan"
      });
    }

    res.json({
      message: "Payment plan updated successfully"
    });
  });
});

// =====================================================
// DELETE PAYMENT PLAN / INSTALLMENT
// =====================================================
router.delete("/plans/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const sql = `
    DELETE FROM customer_payment_plans
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Payment plan delete error:", err);
      return res.status(500).json({
        message: "Failed to delete payment plan"
      });
    }

    res.json({
      message: "Payment plan deleted successfully"
    });
  });
});
// =====================================================
// ALL PAYMENT TRANSACTIONS - ADMIN REPORTS
// =====================================================
router.get("/reports/all", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      cp.id,
      cp.customer_property_id,
      cp.payment_amount,
      cp.due_date,
      cp.payment_date,
      cp.payment_status,
      cp.transaction_reference,
      cp.receipt_number,
      cp.payment_method,
      cp.payment_note,
      cp.receipt_note,
      cp.created_at,

      u.name AS customer_name,
      u.email AS customer_email,
      c.phone AS customer_phone,

      cprop.project_name,
      cprop.unit_number,
      cprop.unit_type,
      cprop.agreement_value,
      cprop.property_value,
      cprop.paid_amount,
      cprop.remaining_amount

    FROM customer_payments cp

    LEFT JOIN customer_properties cprop
      ON cp.customer_property_id = cprop.id

    LEFT JOIN customer_profiles c
      ON cprop.customer_id = c.id

    LEFT JOIN users u
      ON c.user_id = u.id

    ORDER BY cp.payment_date DESC, cp.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin reports payment fetch error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment report",
        error: err.message,
      });
    }

    res.json({
      success: true,
      payments: results,
    });
  });
});
// =====================================================
// GET PAYMENT TRANSACTION HISTORY
// =====================================================
router.get("/history/:customerPropertyId", (req, res) => {
  const { customerPropertyId } = req.params;

  const sql = `
    SELECT *
    FROM customer_payments
    WHERE customer_property_id = ?
    ORDER BY payment_date DESC, id DESC
  `;

  db.query(sql, [customerPropertyId], (err, results) => {
    if (err) {
      console.error("Payment history fetch error:", err);
      return res.status(500).json({
        message: "Failed to fetch payment history"
      });
    }

    res.json(results);
  });
});

// =====================================================
// ADD PAYMENT TRANSACTION
// =====================================================
router.post("/history", authenticateAdmin, (req, res) => {
  const {
    customer_property_id,
    payment_amount,
    due_date,
    payment_status,
    payment_date,
    transaction_reference,
    receipt_number,
    payment_method,
    payment_note,
    receipt_note
  } = req.body;

  if (!customer_property_id || payment_amount === undefined) {
    return res.status(400).json({
      message: "Customer property and payment amount are required"
    });
  }

  const sql = `
    INSERT INTO customer_payments
    (
      customer_property_id,
      payment_amount,
      due_date,
      payment_status,
      payment_date,
      transaction_reference,
      receipt_number,
      payment_method,
      payment_note,
      receipt_note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    customer_property_id,
    payment_amount,
    due_date || null,
    payment_status || "Pending",
    payment_date || null,
    transaction_reference || null,
    receipt_number || null,
    payment_method || "Other",
    payment_note || null,
    receipt_note || null
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Payment transaction insert error:", err);
      return res.status(500).json({
        message: "Failed to add payment transaction"
      });
    }

    res.status(201).json({
      message: "Payment transaction added successfully",
      id: result.insertId
    });
  });
});

// =====================================================
// UPDATE PAYMENT TRANSACTION
// =====================================================
router.put("/history/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const {
    payment_amount,
    due_date,
    payment_status,
    payment_date,
    transaction_reference,
    receipt_number,
    payment_method,
    payment_note,
    receipt_note
  } = req.body;

  const sql = `
    UPDATE customer_payments
    SET
      payment_amount = ?,
      due_date = ?,
      payment_status = ?,
      payment_date = ?,
      transaction_reference = ?,
      receipt_number = ?,
      payment_method = ?,
      payment_note = ?,
      receipt_note = ?
    WHERE id = ?
  `;

  const values = [
    payment_amount,
    due_date || null,
    payment_status || "Pending",
    payment_date || null,
    transaction_reference || null,
    receipt_number || null,
    payment_method || "Other",
    payment_note || null,
    receipt_note || null,
    id
  ];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("Payment transaction update error:", err);
      return res.status(500).json({
        message: "Failed to update payment transaction"
      });
    }

    res.json({
      message: "Payment transaction updated successfully"
    });
  });
});

// =====================================================
// DELETE PAYMENT TRANSACTION
// =====================================================
router.delete("/history/:id", authenticateAdmin, (req, res) => {
  const { id } = req.params;

  const sql = `
    DELETE FROM customer_payments
    WHERE id = ?
  `;

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Payment transaction delete error:", err);
      return res.status(500).json({
        message: "Failed to delete payment transaction"
      });
    }

    res.json({
      message: "Payment transaction deleted successfully"
    });
  });
});


/* PAYMENT PROPERTY OPTIONS */
router.get("/property-options", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      cp.id AS customer_property_id,
      cp.customer_login_id,
      cp.project_name,
      cp.unit_number,
      cp.unit_type,
      cp.agreement_value,
      cp.property_value,
      cp.paid_amount,
      cp.remaining_amount,
      u.name AS customer_name,
      u.email AS customer_email,
      c.phone AS customer_phone
    FROM customer_properties cp
    LEFT JOIN customer_profiles c ON cp.customer_id = c.id
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY u.name ASC, cp.project_name ASC, cp.unit_number ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Payment property options error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load customer properties"
      });
    }

    res.json({
      success: true,
      properties: results
    });
  });
});
module.exports = router;


