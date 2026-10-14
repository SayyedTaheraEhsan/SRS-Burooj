const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

// GET PAYMENT HISTORY FOR CUSTOMER PROPERTY
router.get("/:customerPropertyId", (req, res) => {
  const sql = `
    SELECT *
    FROM customer_payment_history
    WHERE customer_property_id = ?
    ORDER BY payment_date DESC, id DESC
  `;

  db.query(sql, [req.params.customerPropertyId], (err, results) => {
    if (err) {
      console.error("Error fetching payment history:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment history",
        error: err.message,
      });
    }

    res.json({
      success: true,
      payments: results,
    });
  });
});

// ADD PAYMENT HISTORY
router.post("/", authenticateAdmin, (req, res) => {
  const {
    customer_property_id,
    payment_date,
    amount,
    payment_mode,
    transaction_reference,
    receipt_number,
    notes,
  } = req.body;

  if (
    !customer_property_id ||
    !payment_date ||
    amount === undefined ||
    amount === null ||
    amount === ""
  ) {
    return res.status(400).json({
      success: false,
      message: "Customer property, payment date and amount are required.",
    });
  }

  const sql = `
    INSERT INTO customer_payment_history
    (
      customer_property_id,
      payment_date,
      amount,
      payment_mode,
      transaction_reference,
      receipt_number,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    customer_property_id,
    payment_date,
    amount,
    payment_mode || null,
    transaction_reference || null,
    receipt_number || null,
    notes || null,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error adding payment history:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to add payment history",
        error: err.message,
      });
    }

    // Update customer's total paid amount
    const updateSql = `
      UPDATE customer_properties
      SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM customer_payment_history
        WHERE customer_property_id = ?
      )
      WHERE id = ?
    `;

    db.query(
      updateSql,
      [customer_property_id, customer_property_id],
      (updateErr) => {
        if (updateErr) {
          console.error(
            "Payment added but paid amount update failed:",
            updateErr
          );
        }

        res.status(201).json({
          success: true,
          message: "Payment history added successfully",
          paymentId: result.insertId,
        });
      }
    );
  });
});

// DELETE PAYMENT HISTORY
router.delete("/:id", authenticateAdmin, (req, res) => {
  const findSql = `
    SELECT customer_property_id
    FROM customer_payment_history
    WHERE id = ?
  `;

  db.query(findSql, [req.params.id], (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to find payment",
        error: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const customerPropertyId = results[0].customer_property_id;

    const deleteSql = `
      DELETE FROM customer_payment_history
      WHERE id = ?
    `;

    db.query(deleteSql, [req.params.id], (deleteErr) => {
      if (deleteErr) {
        console.error("Error deleting payment:", deleteErr);

        return res.status(500).json({
          success: false,
          message: "Failed to delete payment",
          error: deleteErr.message,
        });
      }

      const updateSql = `
        UPDATE customer_properties
        SET paid_amount = (
          SELECT COALESCE(SUM(amount), 0)
          FROM customer_payment_history
          WHERE customer_property_id = ?
        )
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [customerPropertyId, customerPropertyId],
        (updateErr) => {
          if (updateErr) {
            console.error(
              "Payment deleted but paid amount update failed:",
              updateErr
            );
          }

          res.json({
            success: true,
            message: "Payment deleted successfully",
          });
        }
      );
    });
  });
});

module.exports = router;