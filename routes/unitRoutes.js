const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

/*
===========================================================
SRS BUROOJ - UNIT ROUTES
===========================================================

Important:
- Units are MANUALLY created.
- No automatic unit generation.
- unit_count = total units in this unit/group
- sold_count = sold units
- available_count = automatically calculated
- available_count = unit_count - sold_count
===========================================================
*/


// ---------------------------------------------------------
// Helper: safely convert number
// ---------------------------------------------------------
function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}


// ---------------------------------------------------------
// Helper: calculate unit counts
// ---------------------------------------------------------
function calculateCounts(unitCount, soldCount) {
  const total = Math.max(
    1,
    Math.floor(toNumber(unitCount, 1))
  );

  const sold = Math.min(
    total,
    Math.max(
      0,
      Math.floor(toNumber(soldCount, 0))
    )
  );

  const available = Math.max(
    0,
    total - sold
  );

  return {
    unit_count: total,
    sold_count: sold,
    available_count: available,
  };
}


// ---------------------------------------------------------
// GET ALL UNITS
// ---------------------------------------------------------
router.get("/", (req, res) => {
  const sql = `
    SELECT
      u.*,
      p.project_name
    FROM units u
    LEFT JOIN projects p
      ON p.id = u.project_id
    ORDER BY u.id DESC
  `;

  db.query(sql, (error, rows) => {
    if (error) {
      console.error("GET /api/units error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load units.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      units: rows,
    });
  });
});


// ---------------------------------------------------------
// GET UNITS BY PROJECT
// ---------------------------------------------------------
router.get("/project/:projectId", (req, res) => {
  const projectId = Number(req.params.projectId);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID.",
    });
  }

  const sql = `
    SELECT
      u.*,
      p.project_name
    FROM units u
    LEFT JOIN projects p
      ON p.id = u.project_id
    WHERE u.project_id = ?
    ORDER BY u.id DESC
  `;

  db.query(sql, [projectId], (error, rows) => {
    if (error) {
      console.error(
        "GET /api/units/project error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load project units.",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      units: rows,
    });
  });
});


// ---------------------------------------------------------
// GET SINGLE UNIT
// ---------------------------------------------------------
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid unit ID.",
    });
  }

  const sql = `
    SELECT
      u.*,
      p.project_name
    FROM units u
    LEFT JOIN projects p
      ON p.id = u.project_id
    WHERE u.id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (error, rows) => {
    if (error) {
      console.error(
        "GET /api/units/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load unit.",
        error: error.message,
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found.",
      });
    }

    return res.json({
      success: true,
      unit: rows[0],
    });
  });
});


// ---------------------------------------------------------
// CREATE UNIT
// ---------------------------------------------------------
router.post("/", authenticateAdmin, (req, res) => {
  const {
    project_id,
    unit_number,
    unit_type,
    property_type,
    floor,
    facing,
    parking,
    carpet_area,
    built_up_area,
    rate_per_sqft,
    base_price,
    status,
    description,
    unit_photo,
  } = req.body;

  const projectId = Number(project_id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please select a valid project.",
    });
  }

  if (!String(unit_number || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Unit number/group name is required.",
    });
  }

  if (!String(property_type || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Property type is required.",
    });
  }

  if (!String(unit_type || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Unit type is required.",
    });
  }


  /*
    New quantity system.

    Example:
      unit_count = 20
      sold_count = 5

    Backend calculates:
      available_count = 15
  */

  const counts = calculateCounts(
    req.body.unit_count,
    req.body.sold_count
  );


  // Determine status from quantity
  let finalStatus = status || "Available";

  if (counts.sold_count >= counts.unit_count) {
    finalStatus = "Sold";
  } else if (finalStatus === "Sold") {
    finalStatus = "Available";
  }

  if (!["Available", "Booked", "Sold"].includes(finalStatus)) {
    finalStatus = "Available";
  }


  const sql = `
    INSERT INTO units (
      project_id,
      unit_number,
      unit_type,
      unit_count,
      sold_count,
      available_count,
      property_type,
      floor,
      facing,
      parking,
      carpet_area,
      built_up_area,
      rate_per_sqft,
      base_price,
      status,
      description,
      unit_photo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    projectId,
    String(unit_number).trim(),
    String(unit_type).trim(),
    counts.unit_count,
    counts.sold_count,
    counts.available_count,
    String(property_type).trim(),
    floor || null,
    facing || null,
    parking || null,
    toNumber(carpet_area),
    toNumber(built_up_area),
    toNumber(rate_per_sqft),
    toNumber(base_price),
    finalStatus,
    description || null,
    unit_photo || null,
  ];

  db.query(sql, values, (error, result) => {
    if (error) {
      console.error(
        "POST /api/units error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create unit.",
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Unit created successfully.",
      unit: {
        id: result.insertId,
        project_id: projectId,
        unit_number: String(unit_number).trim(),
        unit_type: String(unit_type).trim(),
        unit_count: counts.unit_count,
        sold_count: counts.sold_count,
        available_count: counts.available_count,
        property_type: String(property_type).trim(),
        status: finalStatus,
      },
    });
  });
});


// ---------------------------------------------------------
// UPDATE UNIT
// ---------------------------------------------------------
router.put("/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid unit ID.",
    });
  }

  const {
    project_id,
    unit_number,
    unit_type,
    property_type,
    floor,
    facing,
    parking,
    carpet_area,
    built_up_area,
    rate_per_sqft,
    base_price,
    status,
    description,
    unit_photo,
  } = req.body;

  const projectId = Number(project_id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please select a valid project.",
    });
  }

  if (!String(unit_number || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Unit number/group name is required.",
    });
  }

  if (!String(property_type || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Property type is required.",
    });
  }

  if (!String(unit_type || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "Unit type is required.",
    });
  }


  const counts = calculateCounts(
    req.body.unit_count,
    req.body.sold_count
  );


  let finalStatus = status || "Available";

  if (counts.sold_count >= counts.unit_count) {
    finalStatus = "Sold";
  } else if (finalStatus === "Sold") {
    finalStatus = "Available";
  }

  if (!["Available", "Booked", "Sold"].includes(finalStatus)) {
    finalStatus = "Available";
  }


  /*
    When editing:

    If unit_photo is empty, keep the existing photo.
    This prevents an edit from accidentally deleting the photo.
  */

  let sql;
  let values;

  if (unit_photo) {
    sql = `
      UPDATE units
      SET
        project_id = ?,
        unit_number = ?,
        unit_type = ?,
        unit_count = ?,
        sold_count = ?,
        available_count = ?,
        property_type = ?,
        floor = ?,
        facing = ?,
        parking = ?,
        carpet_area = ?,
        built_up_area = ?,
        rate_per_sqft = ?,
        base_price = ?,
        status = ?,
        description = ?,
        unit_photo = ?
      WHERE id = ?
    `;

    values = [
      projectId,
      String(unit_number).trim(),
      String(unit_type).trim(),
      counts.unit_count,
      counts.sold_count,
      counts.available_count,
      String(property_type).trim(),
      floor || null,
      facing || null,
      parking || null,
      toNumber(carpet_area),
      toNumber(built_up_area),
      toNumber(rate_per_sqft),
      toNumber(base_price),
      finalStatus,
      description || null,
      unit_photo,
      id,
    ];
  } else {
    sql = `
      UPDATE units
      SET
        project_id = ?,
        unit_number = ?,
        unit_type = ?,
        unit_count = ?,
        sold_count = ?,
        available_count = ?,
        property_type = ?,
        floor = ?,
        facing = ?,
        parking = ?,
        carpet_area = ?,
        built_up_area = ?,
        rate_per_sqft = ?,
        base_price = ?,
        status = ?,
        description = ?
      WHERE id = ?
    `;

    values = [
      projectId,
      String(unit_number).trim(),
      String(unit_type).trim(),
      counts.unit_count,
      counts.sold_count,
      counts.available_count,
      String(property_type).trim(),
      floor || null,
      facing || null,
      parking || null,
      toNumber(carpet_area),
      toNumber(built_up_area),
      toNumber(rate_per_sqft),
      toNumber(base_price),
      finalStatus,
      description || null,
      id,
    ];
  }


  db.query(sql, values, (error, result) => {
    if (error) {
      console.error(
        "PUT /api/units/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update unit.",
        error: error.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found.",
      });
    }

    return res.json({
      success: true,
      message: "Unit updated successfully.",
      unit: {
        id,
        project_id: projectId,
        unit_number: String(unit_number).trim(),
        unit_type: String(unit_type).trim(),
        unit_count: counts.unit_count,
        sold_count: counts.sold_count,
        available_count: counts.available_count,
        property_type: String(property_type).trim(),
        status: finalStatus,
      },
    });
  });
});


// ---------------------------------------------------------
// DELETE UNIT
// ---------------------------------------------------------
router.delete("/:id", authenticateAdmin, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid unit ID.",
    });
  }

  db.query(
    "DELETE FROM units WHERE id = ?",
    [id],
    (error, result) => {
      if (error) {
        console.error(
          "DELETE /api/units/:id error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Failed to delete unit.",
          error: error.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Unit not found.",
        });
      }

      return res.json({
        success: true,
        message: "Unit deleted successfully.",
      });
    }
  );
});


module.exports = router;