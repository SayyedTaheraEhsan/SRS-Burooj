const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

/* =========================================================
   HELPERS
========================================================= */

function parseJson(value, fallback = []) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getTypeName(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item.trim();
  }

  return String(
    item.property_type ||
      item.type ||
      item.name ||
      item.label ||
      item.unit_type ||
      ""
  ).trim();
}

function getTypeCount(item) {
  if (typeof item === "number") {
    return Number(item);
  }

  if (typeof item === "string") {
    const number = Number(item);
    return Number.isNaN(number) ? 0 : number;
  }

  if (!item || typeof item !== "object") {
    return 0;
  }

  return Number(
    item.count ??
      item.total_units ??
      item.units ??
      item.quantity ??
      item.unit_count ??
      0
  ) || 0;
}

/*
  Project ke property_types / structure_rows se
  auto unit counts nikalne ke liye.
*/
function buildUnitTypes(propertyTypes, structureRows) {
  const result = [];

  const addType = (name, count) => {
    const cleanName = String(name || "").trim();
    const cleanCount = Number(count) || 0;

    if (!cleanName || cleanCount <= 0) return;

    const existing = result.find(
      (item) => item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      existing.count += cleanCount;
    } else {
      result.push({
        name: cleanName,
        count: cleanCount,
      });
    }
  };

  /* ---------------------------------------------
     First preference: structure_rows
  --------------------------------------------- */

  if (Array.isArray(structureRows)) {
    structureRows.forEach((row) => {
      if (!row) return;

      const name = getTypeName(row);
      const count = getTypeCount(row);

      addType(name, count);
    });
  }

  /* ---------------------------------------------
     property_types fallback
  --------------------------------------------- */

  if (result.length === 0) {
    if (Array.isArray(propertyTypes)) {
      propertyTypes.forEach((item) => {
        if (typeof item === "string") {
          addType(item, 1);
        } else {
          addType(getTypeName(item), getTypeCount(item));
        }
      });
    } else if (propertyTypes && typeof propertyTypes === "object") {
      Object.entries(propertyTypes).forEach(([name, value]) => {
        addType(name, getTypeCount(value));
      });
    }
  }

  return result;
}

function getPrefix(typeName) {
  const name = String(typeName || "").toLowerCase();

  if (name.includes("row")) return "RH";
  if (name.includes("villa")) return "VL";
  if (name.includes("flat")) return "FL";
  if (name.includes("apartment")) return "FL";
  if (name.includes("shop")) return "SH";
  if (name.includes("office")) return "OF";
  if (name.includes("plot")) return "PL";
  if (name.includes("bungalow")) return "BG";
  if (name.includes("penthouse")) return "PH";

  const letters = String(typeName || "")
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 2)
    .toUpperCase();

  return letters || "UN";
}

/* =========================================================
   GET ALL PROJECTS
========================================================= */

router.get("/", (req, res) => {
  const sql = `
    SELECT *
    FROM projects
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching projects:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch projects",
        error: err.message,
      });
    }

    res.json({
      success: true,
      projects: results,
    });
  });
});

/* =========================================================
   GET SINGLE PROJECT
========================================================= */

router.get("/:id", (req, res) => {
  const sql = `
    SELECT *
    FROM projects
    WHERE id = ?
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("Error fetching project:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch project",
        error: err.message,
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      project: results[0],
    });
  });
});

/* =========================================================
   ADD PROJECT
   PROJECT CREATE HOTE HI UNITS AUTO CREATE
========================================================= */

router.post("/", authenticateAdmin, (req, res) => {
  const {
    project_name,
    location,
    description,
    status,
    total_units,
    total_wings,
    total_floors,
    property_types,
    structure_rows,
    facilities,
  } = req.body;

  if (!project_name || !String(project_name).trim()) {
    return res.status(400).json({
      success: false,
      message: "Project name is required.",
    });
  }

  const propertyTypesJson = parseJson(property_types, []);
  const structureRowsJson = parseJson(structure_rows, []);
  const facilitiesJson = parseJson(facilities, []);

  const sql = `
    INSERT INTO projects
    (
      project_name,
      location,
      description,
      status,
      total_units,
      total_wings,
      total_floors,
      property_types,
      structure_rows,
      facilities
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    String(project_name).trim(),
    location || null,
    description || null,
    status || "Upcoming",
    Number(total_units) || 0,
    Number(total_wings) || 0,
    Number(total_floors) || 0,
    JSON.stringify(propertyTypesJson),
    JSON.stringify(structureRowsJson),
    JSON.stringify(facilitiesJson),
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error adding project:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to add project",
        error: err.message,
      });
    }

    const projectId = result.insertId;

    /* ---------------------------------------------
       AUTO CREATE UNITS
    --------------------------------------------- */

    const unitTypes = buildUnitTypes(
      propertyTypesJson,
      structureRowsJson
    );

    if (unitTypes.length === 0) {
      return res.status(201).json({
        success: true,
        message: "Project added successfully.",
        projectId,
        unitsCreated: 0,
      });
    }

    const unitValues = [];

    unitTypes.forEach((type) => {
      const prefix = getPrefix(type.name);

      for (let i = 1; i <= type.count; i++) {
        const unitNumber =
          `${prefix}-${String(i).padStart(3, "0")}`;

        unitValues.push([
          projectId,
          unitNumber,
          type.name,
          type.name,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "Available",
          null,
        ]);
      }
    });

    const unitSql = `
      INSERT INTO units
      (
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
        description
      )
      VALUES ?
    `;

    db.query(unitSql, [unitValues], (unitErr, unitResult) => {
      if (unitErr) {
        console.error(
          "Project created but auto units failed:",
          unitErr
        );

        return res.status(201).json({
          success: true,
          message:
            "Project added, but automatic units could not be created.",
          projectId,
          unitsCreated: 0,
          warning: unitErr.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "Project and units added successfully.",
        projectId,
        unitsCreated: unitResult.affectedRows,
      });
    });
  });
});

/* =========================================================
   UPDATE PROJECT

   IMPORTANT:
   Existing units ko duplicate nahi karega.
========================================================= */

router.put("/:id", authenticateAdmin, (req, res) => {
  const {
    project_name,
    location,
    description,
    status,
    total_units,
    total_wings,
    total_floors,
    property_types,
    structure_rows,
    facilities,
  } = req.body;

  if (!project_name || !String(project_name).trim()) {
    return res.status(400).json({
      success: false,
      message: "Project name is required.",
    });
  }

  const propertyTypesJson = parseJson(property_types, []);
  const structureRowsJson = parseJson(structure_rows, []);
  const facilitiesJson = parseJson(facilities, []);

  const sql = `
    UPDATE projects
    SET
      project_name = ?,
      location = ?,
      description = ?,
      status = ?,
      total_units = ?,
      total_wings = ?,
      total_floors = ?,
      property_types = ?,
      structure_rows = ?,
      facilities = ?
    WHERE id = ?
  `;

  const values = [
    String(project_name).trim(),
    location || null,
    description || null,
    status || "Upcoming",
    Number(total_units) || 0,
    Number(total_wings) || 0,
    Number(total_floors) || 0,
    JSON.stringify(propertyTypesJson),
    JSON.stringify(structureRowsJson),
    JSON.stringify(facilitiesJson),
    req.params.id,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating project:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to update project",
        error: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      message: "Project updated successfully.",
    });
  });
});

/* =========================================================
   DELETE PROJECT

   Pehle units delete honge, phir project.
========================================================= */

router.delete("/:id", authenticateAdmin, (req, res) => {
  const projectId = req.params.id;

  db.query(
    "DELETE FROM units WHERE project_id = ?",
    [projectId],
    (unitErr) => {
      if (unitErr) {
        console.error("Error deleting project units:", unitErr);

        return res.status(500).json({
          success: false,
          message: "Failed to delete project units",
          error: unitErr.message,
        });
      }

      db.query(
        "DELETE FROM projects WHERE id = ?",
        [projectId],
        (err, result) => {
          if (err) {
            console.error("Error deleting project:", err);

            return res.status(500).json({
              success: false,
              message: "Failed to delete project",
              error: err.message,
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message: "Project not found",
            });
          }

          res.json({
            success: true,
            message: "Project and its units deleted successfully.",
          });
        }
      );
    }
  );
});

module.exports = router;