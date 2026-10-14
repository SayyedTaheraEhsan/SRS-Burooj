const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

// ======================================================
// GET ALL NOTIFICATIONS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        title,
        description,
        created_at
      FROM updates
      ORDER BY id DESC
    `);

    res.json({
      success: true,
      notifications: rows,
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
});

// ======================================================
// GET SINGLE NOTIFICATION
// ======================================================

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.query(
      `
      SELECT
        id,
        title,
        description,
        created_at
      FROM updates
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({
      success: true,
      notification: rows[0],
    });
  } catch (error) {
    console.error("GET NOTIFICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notification.",
    });
  }
});

// ======================================================
// CREATE NOTIFICATION
// ======================================================

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required.",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO updates
      (
        title,
        description
      )
      VALUES (?, ?)
      `,
      [
        title.trim(),
        description ? description.trim() : null,
      ]
    );

    res.json({
      success: true,
      message: "Notification created successfully.",
      notificationId: result.insertId,
    });
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create notification.",
    });
  }
});

// ======================================================
// UPDATE NOTIFICATION
// ======================================================

router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Valid notification ID is required.",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required.",
      });
    }

    await db.query(
      `
      UPDATE updates
      SET
        title = ?,
        description = ?
      WHERE id = ?
      `,
      [
        title.trim(),
        description ? description.trim() : null,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Notification updated successfully.",
    });
  } catch (error) {
    console.error("UPDATE NOTIFICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
});

// ======================================================
// DELETE NOTIFICATION
// ======================================================

router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Valid notification ID is required.",
      });
    }

    const [result] = await db.query(
      `
      DELETE FROM updates
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
});

module.exports = router;