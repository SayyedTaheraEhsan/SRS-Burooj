const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ======================================================
// CUSTOMER EMAIL TRANSPORTER
// ======================================================

const customerEmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// CUSTOMER LOGIN ID
// IMPORTANT: DO NOT CHANGE THIS
// ======================================================

function generateCustomerLoginId(userId) {
  return "SRS-CUST-" + String(userId).padStart(6, "0");
}

// ======================================================
// NUMBER HELPERS
// ======================================================

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ======================================================
// AUTOMATIC CUSTOMER COST CALCULATION
//
// Base Value = Carpet Area × Rate / Sq.ft
//
// Agreement Value =
// Base Value + Parking + Floor Premium + Club + Other
//
// Estimated Total =
// Agreement Value + GST + Stamp Duty + Registration
// + Maintenance + Sinking Fund + Corpus Fund
//
// Property Value = Estimated Total
//
// Remaining = Property Value - Paid Amount
// ======================================================

function calculateCustomerTotals(data) {
  const carpetArea = numberValue(data.carpet_area);
  const ratePerSqft = numberValue(data.rate_per_sqft);

  const parking = numberValue(data.parking_charges);
  const floorPremium = numberValue(data.floor_premium);
  const club = numberValue(data.club_charges);
  const other = numberValue(data.other_charges);

  const gst = numberValue(data.gst);
  const stampDuty = numberValue(data.stamp_duty);
  const registration = numberValue(data.registration_charges);
  const maintenance = numberValue(data.maintenance_charges);
  const sinking = numberValue(data.sinking_fund);
  const corpus = numberValue(data.corpus_fund);

  const paidAmount = Math.max(
    numberValue(data.paid_amount),
    0
  );

  // AUTOMATIC
  const baseValue = carpetArea * ratePerSqft;

  const agreementValue =
    baseValue +
    parking +
    floorPremium +
    club +
    other;

  const estimatedTotal =
    agreementValue +
    gst +
    stampDuty +
    registration +
    maintenance +
    sinking +
    corpus;

  const propertyValue = estimatedTotal;

  const remainingAmount = Math.max(
    propertyValue - paidAmount,
    0
  );

  return {
    base_value: Number(baseValue.toFixed(2)),
    agreement_value: Number(agreementValue.toFixed(2)),
    estimated_total: Number(estimatedTotal.toFixed(2)),
    property_value: Number(propertyValue.toFixed(2)),
    paid_amount: Number(paidAmount.toFixed(2)),
    remaining_amount: Number(remainingAmount.toFixed(2)),
  };
}

// ======================================================
// GET ALL CUSTOMERS
// ======================================================

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.role,

      cp.id AS profile_id,
      cp.phone,
      cp.alternate_phone,
      cp.address,
      cp.city,
      cp.state,
      cp.pincode,
      cp.priority_customer,
      cp.customer_status,
      cp.notes,
      cp.created_at,

      cpr.id AS customer_property_id,
      cpr.purchase_date,
      cpr.customer_login_id,
      cpr.project_name,
      cpr.unit_number,
      cpr.unit_type,
      cpr.carpet_area,
      cpr.rate_per_sqft,
      cpr.base_value,
      cpr.parking_charges,
      cpr.floor_premium,
      cpr.club_charges,
      cpr.other_charges,
      cpr.agreement_value,
      cpr.gst,
      cpr.stamp_duty,
      cpr.registration_charges,
      cpr.maintenance_charges,
      cpr.sinking_fund,
      cpr.corpus_fund,
      cpr.estimated_total,
      cpr.property_value,
      cpr.paid_amount,
      cpr.remaining_amount,
      cpr.created_at AS property_created_at

    FROM users u

    INNER JOIN customer_profiles cp
      ON u.id = cp.user_id

    LEFT JOIN customer_properties cpr
      ON cp.id = cpr.customer_id

    WHERE u.role = 'customer'

    ORDER BY cp.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching customers:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch customers",
      });
    }

    return res.json({
      success: true,
      customers: results,
    });
  });
});

// ======================================================
// GET CUSTOMER DASHBOARD BY LOGIN ID
// IMPORTANT: KEEP BEFORE /:id
// ======================================================

router.get("/dashboard/:customerLoginId", (req, res) => {
  const customerLoginId = req.params.customerLoginId;

  const sql = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.role,

      cp.id AS profile_id,
      cp.phone,
      cp.alternate_phone,
      cp.address,
      cp.city,
      cp.state,
      cp.pincode,
      cp.priority_customer,
      cp.customer_status,
      cp.notes,

      cpr.id AS customer_property_id,
      cpr.purchase_date,
      cpr.customer_login_id,
      cpr.project_name,
      cpr.unit_number,
      cpr.unit_type,
      cpr.carpet_area,
      cpr.rate_per_sqft,
      cpr.base_value,
      cpr.parking_charges,
      cpr.floor_premium,
      cpr.club_charges,
      cpr.other_charges,
      cpr.agreement_value,
      cpr.gst,
      cpr.stamp_duty,
      cpr.registration_charges,
      cpr.maintenance_charges,
      cpr.sinking_fund,
      cpr.corpus_fund,
      cpr.estimated_total,
      cpr.property_value,
      cpr.paid_amount,
      cpr.remaining_amount

    FROM users u

    INNER JOIN customer_profiles cp
      ON u.id = cp.user_id

    INNER JOIN customer_properties cpr
      ON cp.id = cpr.customer_id

    WHERE cpr.customer_login_id = ?
      AND u.role = 'customer'

    LIMIT 1
  `;

  db.query(
    sql,
    [customerLoginId],
    (err, results) => {
      if (err) {
        console.error(
          "Customer dashboard fetch error:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to fetch customer dashboard data",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Customer dashboard data not found",
        });
      }

      return res.json({
        success: true,
        customer: results[0],
      });
    }
  );
});

// ======================================================
// GET SINGLE CUSTOMER
// ======================================================

router.get("/:id", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.role,

      cp.id AS profile_id,
      cp.phone,
      cp.alternate_phone,
      cp.address,
      cp.city,
      cp.state,
      cp.pincode,
      cp.priority_customer,
      cp.customer_status,
      cp.notes,
      cp.created_at,

      cpr.id AS customer_property_id,
      cpr.purchase_date,
      cpr.customer_login_id,
      cpr.project_name,
      cpr.unit_number,
      cpr.unit_type,
      cpr.carpet_area,
      cpr.rate_per_sqft,
      cpr.base_value,
      cpr.parking_charges,
      cpr.floor_premium,
      cpr.club_charges,
      cpr.other_charges,
      cpr.agreement_value,
      cpr.gst,
      cpr.stamp_duty,
      cpr.registration_charges,
      cpr.maintenance_charges,
      cpr.sinking_fund,
      cpr.corpus_fund,
      cpr.estimated_total,
      cpr.property_value,
      cpr.paid_amount,
      cpr.remaining_amount,
      cpr.created_at AS property_created_at

    FROM users u

    INNER JOIN customer_profiles cp
      ON u.id = cp.user_id

    LEFT JOIN customer_properties cpr
      ON cp.id = cpr.customer_id

    WHERE u.id = ?
      AND u.role = 'customer'
  `;

  db.query(
    sql,
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error(
          "Error fetching customer:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Failed to fetch customer",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      return res.json({
        success: true,
        customer: results[0],
      });
    }
  );
});

// ======================================================
// ADD CUSTOMER
// ======================================================

router.post("/", authenticateAdmin, (req, res) => {
  const {
    name,
    email,
    phone,
    alternate_phone,
    address,
    city,
    state,
    pincode,
    customer_status,
    notes,
    priority_customer,

    purchase_date,
    project_name,
    unit_number,
    interested_unit_type,
    unit_type,
    carpet_area,
    rate_per_sqft,

    parking_charges,
    floor_premium,
    club_charges,
    other_charges,
    gst,
    stamp_duty,
    registration_charges,
    maintenance_charges,
    sinking_fund,
    corpus_fund,

    paid_amount,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({
      success: false,
      message: "Customer name is required",
    });
  }

  if (!phone || !String(phone).trim()) {
    return res.status(400).json({
      success: false,
      message: "Customer phone is required",
    });
  }

  // AUTOMATIC TOTALS
  const totals = calculateCustomerTotals({
    carpet_area,
    rate_per_sqft,
    parking_charges,
    floor_premium,
    club_charges,
    other_charges,
    gst,
    stamp_duty,
    registration_charges,
    maintenance_charges,
    sinking_fund,
    corpus_fund,
    paid_amount,
  });

  // ====================================================
  // CREATE USER
  // ====================================================

  const userSql = `
    INSERT INTO users
    (name, email, password, role)
    VALUES (?, ?, ?, 'customer')
  `;

  const temporaryPassword =
    "SRS@" +
    crypto
      .randomBytes(6)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8);
  const hashedTemporaryPassword = bcrypt.hashSync(temporaryPassword, 10);

  db.query(
    userSql,
    [
      name,
      email || null,
      hashedTemporaryPassword,
    ],
    (err, userResult) => {
      if (err) {
        console.error(
          "Error creating customer user:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Failed to create customer",
        });
      }

      const userId = userResult.insertId;

      // ==================================================
      // AUTO CUSTOMER LOGIN ID
      // DO NOT CHANGE
      // ==================================================

      const customerLoginId =
        generateCustomerLoginId(userId);

      // ==================================================
      // CREATE CUSTOMER PROFILE
      // ==================================================

      const profileSql = `
        INSERT INTO customer_profiles
        (
          user_id,
          phone,
          alternate_phone,
          address,
          city,
          state,
          pincode,
          priority_customer,
          customer_status,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        profileSql,
        [
          userId,
          phone,
          alternate_phone || null,
          address || null,
          city || null,
          state || null,
          pincode || null,
          priority_customer ? 1 : 0,
          customer_status || "Active",
          notes || null,
        ],
        (
          profileErr,
          profileResult
        ) => {
          if (profileErr) {
            console.error(
              "Error creating customer profile:",
              profileErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Customer profile could not be created",
            });
          }

          const profileId =
            profileResult.insertId;

          // ==================================================
          // CREATE CUSTOMER PROPERTY
          // ==================================================

          const propertySql = `
            INSERT INTO customer_properties
            (
              customer_id,
              purchase_date,
              customer_login_id,
              project_name,
              unit_number,
              unit_type,
              carpet_area,
              rate_per_sqft,
              base_value,
              parking_charges,
              floor_premium,
              club_charges,
              other_charges,
              agreement_value,
              gst,
              stamp_duty,
              registration_charges,
              maintenance_charges,
              sinking_fund,
              corpus_fund,
              estimated_total,
              property_value,
              paid_amount,
              remaining_amount
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(
            propertySql,
            [
              profileId,
              purchase_date || null,
              customerLoginId,
              project_name || null,
              unit_number || null,
              unit_type ||
                interested_unit_type ||
                null,

              numberValue(carpet_area),
              numberValue(rate_per_sqft),

              totals.base_value,

              numberValue(parking_charges),
              numberValue(floor_premium),
              numberValue(club_charges),
              numberValue(other_charges),

              totals.agreement_value,

              numberValue(gst),
              numberValue(stamp_duty),
              numberValue(registration_charges),
              numberValue(maintenance_charges),
              numberValue(sinking_fund),
              numberValue(corpus_fund),

              totals.estimated_total,
              totals.property_value,
              totals.paid_amount,
              totals.remaining_amount,
            ],
            async (
              propertyErr,
              propertyResult
            ) => {
              if (propertyErr) {
                console.error(
                  "Error adding customer property:",
                  propertyErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Customer created but property could not be added",
                });
              }

              // ==================================================
              // SEND CUSTOMER LOGIN EMAIL
              // ==================================================

              if (email) {
                try {
                  const frontendUrl =
                    process.env.FRONTEND_URL ||
                    "http://localhost:5173";

                  await customerEmailTransporter.sendMail({
                    from:
                      `"SRS Burooj" <${process.env.EMAIL_USER}>`,

                    to: email,

                    subject:
                      "SRS Burooj - Your Customer Login Details",

                    html: `
                      <div style="
                        font-family:Arial,sans-serif;
                        max-width:600px;
                        margin:auto;
                        padding:30px;
                        border:1px solid #ddd;
                        border-radius:12px;
                        background:#ffffff;
                      ">

                        <h2 style="color:#1e5aa8;">
                          SRS Burooj
                        </h2>

                        <p>
                          Hello <strong>${name}</strong>,
                        </p>

                        <p>
                          Your SRS Burooj customer account
                          has been created successfully.
                        </p>

                        <div style="
                          background:#eef5ff;
                          padding:20px;
                          border-radius:8px;
                          margin:20px 0;
                        ">

                          <p>
                            <strong>Customer Login ID:</strong><br>
                            ${customerLoginId}
                          </p>

                          <p>
                            <strong>Temporary Password:</strong><br>
                            ${temporaryPassword}
                          </p>

                        </div>

                        <p>
                          Login to your customer dashboard:
                        </p>

                        <p style="margin:25px 0;">

                          <a
                            href="${frontendUrl}/customer-login"
                            style="
                              background:#1e5aa8;
                              color:white;
                              padding:12px 22px;
                              text-decoration:none;
                              border-radius:6px;
                              display:inline-block;
                            "
                          >
                            Customer Login
                          </a>

                        </p>

                        <p>
                          For security, please change your
                          password after your first login.
                        </p>

                      </div>
                    `,
                  });

                  console.log(
                    "Customer login email sent successfully to:",
                    email
                  );
                } catch (emailError) {
                  console.error(
                    "Customer created but login email could not be sent:",
                    emailError
                  );
                }
              }

              // ==================================================
              // SUCCESS
              // ==================================================

              return res.status(201).json({
                success: true,

                message: email
                  ? "Customer added successfully and login details emailed"
                  : "Customer added successfully. No email address was provided",

                customerId: userId,

                customerLoginId:
                  customerLoginId,

                profileId: profileId,

                customerPropertyId:
                  propertyResult.insertId,

                totals,
              });
            }
          );
        }
      );
    }
  );
});

// ======================================================
// UPDATE CUSTOMER
// ======================================================

router.put("/:id", authenticateAdmin, (req, res) => {
  const customerId = req.params.id;

  const {
    name,
    email,
    phone,
    alternate_phone,
    address,
    city,
    state,
    pincode,
    customer_status,
    notes,
    priority_customer,

    purchase_date,
    project_name,
    unit_number,
    interested_unit_type,
    unit_type,
    carpet_area,
    rate_per_sqft,

    parking_charges,
    floor_premium,
    club_charges,
    other_charges,
    gst,
    stamp_duty,
    registration_charges,
    maintenance_charges,
    sinking_fund,
    corpus_fund,

    paid_amount,
  } = req.body;

  // AUTOMATIC TOTALS
  const totals = calculateCustomerTotals({
    carpet_area,
    rate_per_sqft,
    parking_charges,
    floor_premium,
    club_charges,
    other_charges,
    gst,
    stamp_duty,
    registration_charges,
    maintenance_charges,
    sinking_fund,
    corpus_fund,
    paid_amount,
  });

  // ====================================================
  // UPDATE USER
  // ====================================================

  const userSql = `
    UPDATE users
    SET
      name = ?,
      email = ?
    WHERE id = ?
      AND role = 'customer'
  `;

  db.query(
    userSql,
    [
      name,
      email || null,
      customerId,
    ],
    (
      err,
      userResult
    ) => {
      if (err) {
        console.error(
          "Error updating customer user:",
          err
        );

        return res.status(500).json({
          success: false,
          message: "Failed to update customer",
        });
      }

      if (
        userResult.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // ==================================================
      // UPDATE CUSTOMER PROFILE
      // ==================================================

      const profileSql = `
        UPDATE customer_profiles
        SET
          phone = ?,
          alternate_phone = ?,
          address = ?,
          city = ?,
          state = ?,
          pincode = ?,
          priority_customer = ?,
          customer_status = ?,
          notes = ?
        WHERE user_id = ?
      `;

      db.query(
        profileSql,
        [
          phone,
          alternate_phone || null,
          address || null,
          city || null,
          state || null,
          pincode || null,
          priority_customer ? 1 : 0,
          customer_status || "Active",
          notes || null,
          customerId,
        ],
        (profileErr) => {
          if (profileErr) {
            console.error(
              "Error updating customer profile:",
              profileErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Failed to update customer profile",
            });
          }

          // ==================================================
          // FIND PROFILE
          // ==================================================

          const profileIdSql = `
            SELECT id
            FROM customer_profiles
            WHERE user_id = ?
            LIMIT 1
          `;

          db.query(
            profileIdSql,
            [customerId],
            (
              profileIdErr,
              profileResults
            ) => {
              if (profileIdErr) {
                console.error(
                  "Error finding customer profile:",
                  profileIdErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to find customer profile",
                });
              }

              if (
                profileResults.length === 0
              ) {
                return res.status(404).json({
                  success: false,
                  message:
                    "Customer profile not found",
                });
              }

              const profileId =
                profileResults[0].id;

              // ==================================================
              // CHECK PROPERTY
              // ==================================================

              const propertyCheckSql = `
                SELECT id, customer_login_id
                FROM customer_properties
                WHERE customer_id = ?
                LIMIT 1
              `;

              db.query(
                propertyCheckSql,
                [profileId],
                (
                  propertyCheckErr,
                  propertyResults
                ) => {
                  if (propertyCheckErr) {
                    console.error(
                      "Error checking customer property:",
                      propertyCheckErr
                    );

                    return res.status(500).json({
                      success: false,
                      message:
                        "Failed to check customer property",
                    });
                  }

                  // ==================================================
                  // UPDATE EXISTING PROPERTY
                  // ==================================================

                  if (
                    propertyResults.length > 0
                  ) {
                    const propertyId =
                      propertyResults[0].id;

                    const propertyUpdateSql = `
                      UPDATE customer_properties
                      SET
                        purchase_date = ?,
                        project_name = ?,
                        unit_number = ?,
                        unit_type = ?,
                        carpet_area = ?,
                        rate_per_sqft = ?,
                        base_value = ?,
                        parking_charges = ?,
                        floor_premium = ?,
                        club_charges = ?,
                        other_charges = ?,
                        agreement_value = ?,
                        gst = ?,
                        stamp_duty = ?,
                        registration_charges = ?,
                        maintenance_charges = ?,
                        sinking_fund = ?,
                        corpus_fund = ?,
                        estimated_total = ?,
                        property_value = ?,
                        paid_amount = ?,
                        remaining_amount = ?
                      WHERE id = ?
                    `;

                    db.query(
                      propertyUpdateSql,
                      [
                        purchase_date || null,
                        project_name || null,
                        unit_number || null,

                        unit_type ||
                          interested_unit_type ||
                          null,

                        numberValue(carpet_area),
                        numberValue(rate_per_sqft),

                        totals.base_value,

                        numberValue(
                          parking_charges
                        ),
                        numberValue(
                          floor_premium
                        ),
                        numberValue(
                          club_charges
                        ),
                        numberValue(
                          other_charges
                        ),

                        totals.agreement_value,

                        numberValue(gst),
                        numberValue(stamp_duty),
                        numberValue(
                          registration_charges
                        ),
                        numberValue(
                          maintenance_charges
                        ),
                        numberValue(
                          sinking_fund
                        ),
                        numberValue(
                          corpus_fund
                        ),

                        totals.estimated_total,
                        totals.property_value,
                        totals.paid_amount,
                        totals.remaining_amount,

                        propertyId,
                      ],
                      (propertyErr) => {
                        if (propertyErr) {
                          console.error(
                            "Error updating customer property:",
                            propertyErr
                          );

                          return res.status(500).json({
                            success: false,
                            message:
                              "Failed to update customer property",
                          });
                        }

                        return res.json({
                          success: true,
                          message:
                            "Customer updated successfully",
                          customerPropertyId:
                            propertyId,
                          customerLoginId:
                            propertyResults[0]
                              .customer_login_id,
                          totals,
                        });
                      }
                    );

                    return;
                  }

                  // ==================================================
                  // CREATE PROPERTY IF NOT EXISTS
                  // ==================================================

                  const newCustomerLoginId =
                    generateCustomerLoginId(
                      customerId
                    );

                  const propertyInsertSql = `
                    INSERT INTO customer_properties
                    (
                      customer_id,
                      purchase_date,
                      customer_login_id,
                      project_name,
                      unit_number,
                      unit_type,
                      carpet_area,
                      rate_per_sqft,
                      base_value,
                      parking_charges,
                      floor_premium,
                      club_charges,
                      other_charges,
                      agreement_value,
                      gst,
                      stamp_duty,
                      registration_charges,
                      maintenance_charges,
                      sinking_fund,
                      corpus_fund,
                      estimated_total,
                      property_value,
                      paid_amount,
                      remaining_amount
                    )
                    VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `;

                  db.query(
                    propertyInsertSql,
                    [
                      profileId,
                      purchase_date || null,

                      newCustomerLoginId,

                      project_name || null,
                      unit_number || null,

                      unit_type ||
                        interested_unit_type ||
                        null,

                      numberValue(carpet_area),
                      numberValue(rate_per_sqft),

                      totals.base_value,

                      numberValue(
                        parking_charges
                      ),
                      numberValue(
                        floor_premium
                      ),
                      numberValue(
                        club_charges
                      ),
                      numberValue(
                        other_charges
                      ),

                      totals.agreement_value,

                      numberValue(gst),
                      numberValue(stamp_duty),
                      numberValue(
                        registration_charges
                      ),
                      numberValue(
                        maintenance_charges
                      ),
                      numberValue(
                        sinking_fund
                      ),
                      numberValue(
                        corpus_fund
                      ),

                      totals.estimated_total,
                      totals.property_value,
                      totals.paid_amount,
                      totals.remaining_amount,
                    ],
                    (
                      propertyErr,
                      propertyResult
                    ) => {
                      if (propertyErr) {
                        console.error(
                          "Error creating customer property:",
                          propertyErr
                        );

                        return res.status(500).json({
                          success: false,
                          message:
                            "Failed to create customer property",
                        });
                      }

                      return res.json({
                        success: true,
                        message:
                          "Customer updated successfully",
                        customerPropertyId:
                          propertyResult.insertId,
                        customerLoginId:
                          newCustomerLoginId,
                        totals,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// ======================================================
// DELETE CUSTOMER
// ======================================================

router.delete("/:id", authenticateAdmin, (req, res) => {
  const customerId = req.params.id;

  const getProfileSql = `
    SELECT id
    FROM customer_profiles
    WHERE user_id = ?
  `;

  db.query(
    getProfileSql,
    [customerId],
    (err, results) => {
      if (err) {
        console.error(
          "Error finding customer profile:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to delete customer",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const profileId = results[0].id;

      // ==================================================
      // DELETE PROPERTIES
      // ==================================================

      const deletePropertySql = `
        DELETE FROM customer_properties
        WHERE customer_id = ?
      `;

      db.query(
        deletePropertySql,
        [profileId],
        (propertyErr) => {
          if (propertyErr) {
            console.error(
              "Error deleting customer properties:",
              propertyErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Failed to delete customer properties",
            });
          }

          // ==================================================
          // DELETE PROFILE
          // ==================================================

          const deleteProfileSql = `
            DELETE FROM customer_profiles
            WHERE id = ?
          `;

          db.query(
            deleteProfileSql,
            [profileId],
            (profileErr) => {
              if (profileErr) {
                console.error(
                  "Error deleting customer profile:",
                  profileErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to delete customer profile",
                });
              }

              // ==================================================
              // DELETE USER
              // ==================================================

              const deleteUserSql = `
                DELETE FROM users
                WHERE id = ?
                  AND role = 'customer'
              `;

              db.query(
                deleteUserSql,
                [customerId],
                (userErr) => {
                  if (userErr) {
                    console.error(
                      "Error deleting customer user:",
                      userErr
                    );

                    return res.status(500).json({
                      success: false,
                      message:
                        "Failed to delete customer",
                    });
                  }

                  return res.json({
                    success: true,
                    message:
                      "Customer deleted successfully",
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// ======================================================
// EXPORT
// ======================================================

module.exports = router;