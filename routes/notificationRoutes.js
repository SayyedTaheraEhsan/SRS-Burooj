const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const nodemailer = require("nodemailer");

const router = express.Router();
const db = require("../db");

// ======================================================
// EMAIL TRANSPORTER
// Uses existing SRS Burooj Gmail SMTP configuration
// ======================================================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// HELPERS
// ======================================================

function validNumber(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function normalizeChannel(channel) {
  const allowed = [
    "Website",
    "Email",
    "WhatsApp",
    "All",
  ];

  return allowed.includes(channel)
    ? channel
    : "Website";
}

function normalizeRecipientType(type) {
  return type === "Inquiry"
    ? "Inquiry"
    : "Customer";
}

function sendEmail(recipient, title, message) {
  return new Promise((resolve) => {
    if (!recipient || !recipient.trim()) {
      return resolve({
        success: false,
        status: "Not Available",
        error: "Recipient email is not available.",
      });
    }

    transporter.sendMail(
      {
        from: `"SRS Burooj" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: title,
        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 650px;
            margin: 0 auto;
            padding: 25px;
            background: #f7f3eb;
          ">
            <div style="
              background: #10233f;
              color: white;
              padding: 18px;
              border-radius: 10px 10px 0 0;
            ">
              <h2 style="margin:0;">
                SRS Burooj
              </h2>
            </div>

            <div style="
              background: white;
              padding: 25px;
              border-radius: 0 0 10px 10px;
            ">
              <h2 style="color:#10233f;">
                ${escapeHtml(title)}
              </h2>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.7;
                white-space:pre-line;
              ">
                ${escapeHtml(message)}
              </p>

              <hr style="
                border:none;
                border-top:1px solid #ddd;
                margin:25px 0;
              ">

              <p style="
                color:#8a92a0;
                font-size:13px;
              ">
                This notification was sent by SRS Burooj.
              </p>
            </div>
          </div>
        `,
      },
      (error) => {
        if (error) {
          return resolve({
            success: false,
            status: "Failed",
            error: error.message,
          });
        }

        resolve({
          success: true,
          status: "Sent",
        });
      }
    );
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// GET ALL NOTIFICATIONS
// ======================================================

router.get("/", authenticateAdmin, (req, res) => {
  const sql = `
    SELECT
      n.*,
      COUNT(nr.id) AS recipient_count,
      GROUP_CONCAT(
        DISTINCT nr.recipient_name
        ORDER BY nr.id
        SEPARATOR ', '
      ) AS recipient_names,
      GROUP_CONCAT(
        DISTINCT nr.recipient_email
        ORDER BY nr.id
        SEPARATOR ', '
      ) AS recipient_emails
    FROM notifications n
    LEFT JOIN notification_recipients nr
      ON nr.notification_id = n.id
    GROUP BY n.id
    ORDER BY n.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(
        "GET NOTIFICATIONS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch notifications.",
        error: err.message,
      });
    }

    res.json({
      success: true,
      notifications: results,
    });
  });
});

// ======================================================
// GET CUSTOMER NOTIFICATIONS
// ======================================================

router.get(
  "/customer/:customerId",
  authenticateAdmin,
  (req, res) => {
    const customerId = Number(
      req.params.customerId
    );

    if (!validNumber(customerId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid customer ID is required.",
      });
    }

    const sql = `
      SELECT *
      FROM notifications
      WHERE customer_id = ?
        AND recipient_type = 'Customer'
      ORDER BY id DESC
    `;

    db.query(
      sql,
      [customerId],
      (err, results) => {
        if (err) {
          console.error(
            "GET CUSTOMER NOTIFICATIONS ERROR:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to fetch customer notifications.",
            error: err.message,
          });
        }

        res.json({
          success: true,
          notifications: results,
        });
      }
    );
  }
);

// ======================================================
// GET INQUIRY NOTIFICATIONS
// ======================================================

router.get(
  "/inquiry/:inquiryId",
  (req, res) => {
    const inquiryId = Number(
      req.params.inquiryId
    );

    if (!validNumber(inquiryId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid inquiry ID is required.",
      });
    }

    const sql = `
      SELECT *
      FROM notifications
      WHERE inquiry_id = ?
        AND recipient_type = 'Inquiry'
      ORDER BY id DESC
    `;

    db.query(
      sql,
      [inquiryId],
      (err, results) => {
        if (err) {
          console.error(
            "GET INQUIRY NOTIFICATIONS ERROR:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to fetch inquiry notifications.",
            error: err.message,
          });
        }

        res.json({
          success: true,
          notifications: results,
        });
      }
    );
  }
);

// ======================================================
// GET SINGLE NOTIFICATION
// ======================================================

router.get("/:id", (req, res) => {
  const notificationId = Number(
    req.params.id
  );

  if (!validNumber(notificationId)) {
    return res.status(400).json({
      success: false,
      message:
        "Valid notification ID is required.",
    });
  }

  const notificationSql = `
    SELECT *
    FROM notifications
    WHERE id = ?
    LIMIT 1
  `;

  db.query(
    notificationSql,
    [notificationId],
    (err, notificationRows) => {
      if (err) {
        console.error(
          "GET SINGLE NOTIFICATION ERROR:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to fetch notification.",
          error: err.message,
        });
      }

      if (notificationRows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      const recipientSql = `
        SELECT *
        FROM notification_recipients
        WHERE notification_id = ?
        ORDER BY id ASC
      `;

      db.query(
        recipientSql,
        [notificationId],
        (recipientErr, recipientRows) => {
          if (recipientErr) {
            console.error(
              "GET NOTIFICATION RECIPIENTS ERROR:",
              recipientErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Failed to fetch notification recipients.",
              error: recipientErr.message,
            });
          }

          res.json({
            success: true,
            notification:
              notificationRows[0],
            recipients: recipientRows,
          });
        }
      );
    }
  );
});

// ======================================================
// CREATE NOTIFICATION
// ======================================================
// This creates a notification and one recipient.
// Useful for automatic scheduler and individual sending.

router.post("/", authenticateAdmin, (req, res) => {
  const {
    customer_id,
    recipient_type,
    inquiry_id,
    notification_type,
    category,
    title,
    message,
    channel,
    related_id,
    related_type,
    due_date,
    days_offset,
    is_automatic,
    notification_key,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification title is required.",
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification message is required.",
    });
  }

  const finalRecipientType =
    normalizeRecipientType(
      recipient_type
    );

  const finalChannel =
    normalizeChannel(channel);

  const finalType =
    notification_type || "General";

  const finalCategory =
    category || "General";

  const automaticValue =
    is_automatic === undefined
      ? 0
      : is_automatic
      ? 1
      : 0;

  const notificationSql = `
    INSERT INTO notifications
    (
      notification_key,
      customer_id,
      recipient_type,
      inquiry_id,
      notification_type,
      category,
      title,
      message,
      channel,
      related_id,
      related_type,
      due_date,
      days_offset,
      is_automatic
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    notification_key || null,
    customer_id || null,
    finalRecipientType,
    inquiry_id || null,
    finalType,
    finalCategory,
    title.trim(),
    message.trim(),
    finalChannel,
    related_id || null,
    related_type || null,
    due_date || null,
    days_offset ?? null,
    automaticValue,
  ];

  db.query(
    notificationSql,
    values,
    (err, result) => {
      if (err) {
        console.error(
          "CREATE NOTIFICATION ERROR:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to create notification.",
          error: err.message,
        });
      }

      const notificationId =
        result.insertId;

      createRecipientForSingle(
        finalRecipientType,
        customer_id,
        inquiry_id,
        notificationId,
        (recipientErr) => {
          if (recipientErr) {
            return res.status(500).json({
              success: false,
              message:
                "Notification created but recipient could not be saved.",
              notificationId,
              error:
                recipientErr.message,
            });
          }

          res.status(201).json({
            success: true,
            message:
              "Notification created successfully.",
            notificationId,
          });
        }
      );
    }
  );
});

// ======================================================
// MANUAL SEND NOTIFICATION
// ======================================================
// Supports:
// Customer + selected customers
// All customers
// Inquiry + all inquiries
// Customers + inquiries
//
// Request example:
// {
//   recipient_mode: "all_customers",
//   customer_ids: [],
//   inquiry_ids: [],
//   recipient_type: "Customer",
//   title: "...",
//   message: "...",
//   category: "Payment",
//   notification_type: "General",
//   channel: "All"
// }

router.post("/send", authenticateAdmin, (req, res) => {
  const {
    recipient_mode,
    customer_ids,
    inquiry_ids,
    title,
    message,
    category,
    notification_type,
    channel,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification title is required.",
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification message is required.",
    });
  }

  const finalChannel =
    normalizeChannel(channel);

  const finalCategory =
    category || "General";

  const finalType =
    notification_type || "General";

  const mode =
    recipient_mode || "individual_customer";

  let customerSql = null;
  let inquirySql = null;
  let customerParams = [];
  let inquiryParams = [];

  // ----------------------------------------------------
  // CUSTOMER RECIPIENTS
  // ----------------------------------------------------

  if (
    mode === "individual_customer" ||
    mode === "selected_customers"
  ) {
    if (
      !Array.isArray(customer_ids) ||
      customer_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please select at least one customer.",
      });
    }

    const ids = customer_ids
      .map(Number)
      .filter((id) => id > 0);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Valid customer IDs are required.",
      });
    }

    const placeholders =
      ids.map(() => "?").join(",");

    customerSql = `
      SELECT
        cp.id AS customer_id,
        u.name,
        u.email,
        cp.phone
      FROM customer_profiles cp
      JOIN users u
        ON u.id = cp.user_id
      WHERE cp.id IN (${placeholders})
    `;

    customerParams = ids;
  }

  if (mode === "all_customers") {
    customerSql = `
      SELECT
        cp.id AS customer_id,
        u.name,
        u.email,
        cp.phone
      FROM customer_profiles cp
      JOIN users u
        ON u.id = cp.user_id
      ORDER BY cp.id ASC
    `;
  }

  // ----------------------------------------------------
  // INQUIRY RECIPIENTS
  // ----------------------------------------------------

  if (mode === "individual_inquiry") {
    if (
      !Array.isArray(inquiry_ids) ||
      inquiry_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please select at least one inquiry.",
      });
    }

    const ids = inquiry_ids
      .map(Number)
      .filter((id) => id > 0);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Valid inquiry IDs are required.",
      });
    }

    const placeholders =
      ids.map(() => "?").join(",");

    inquirySql = `
      SELECT
        id,
        name,
        email,
        phone
      FROM inquiries
      WHERE id IN (${placeholders})
    `;

    inquiryParams = ids;
  }

  if (mode === "all_inquiries") {
    inquirySql = `
      SELECT
        id,
        name,
        email,
        phone
      FROM inquiries
      ORDER BY id ASC
    `;
  }

  // ----------------------------------------------------
  // BOTH CUSTOMERS + INQUIRIES
  // ----------------------------------------------------

  if (mode === "customers_and_inquiries") {
    customerSql = `
      SELECT
        cp.id AS customer_id,
        u.name,
        u.email,
        cp.phone
      FROM customer_profiles cp
      JOIN users u
        ON u.id = cp.user_id
      ORDER BY cp.id ASC
    `;

    inquirySql = `
      SELECT
        id,
        name,
        email,
        phone
      FROM inquiries
      ORDER BY id ASC
    `;
  }

  if (!customerSql && !inquirySql) {
    return res.status(400).json({
      success: false,
      message:
        "Please select valid notification recipients.",
    });
  }

  const loadCustomers = (callback) => {
    if (!customerSql) {
      return callback(null, []);
    }

    db.query(
      customerSql,
      customerParams,
      (err, rows) => {
        if (err) {
          return callback(err);
        }

        callback(null, rows);
      }
    );
  };

  const loadInquiries = (callback) => {
    if (!inquirySql) {
      return callback(null, []);
    }

    db.query(
      inquirySql,
      inquiryParams,
      (err, rows) => {
        if (err) {
          return callback(err);
        }

        callback(null, rows);
      }
    );
  };

  loadCustomers((customerErr, customers) => {
    if (customerErr) {
      console.error(
        "LOAD NOTIFICATION CUSTOMERS ERROR:",
        customerErr
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load customers.",
        error: customerErr.message,
      });
    }

    loadInquiries(
      (inquiryErr, inquiries) => {
        if (inquiryErr) {
          console.error(
            "LOAD NOTIFICATION INQUIRIES ERROR:",
            inquiryErr
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to load inquiries.",
            error: inquiryErr.message,
          });
        }

        if (
          customers.length === 0 &&
          inquiries.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "No recipients found.",
          });
        }

        createBulkNotification(
          {
            title: title.trim(),
            message: message.trim(),
            category: finalCategory,
            notificationType:
              finalType,
            channel: finalChannel,
          },
          customers,
          inquiries,
          (error, summary) => {
            if (error) {
              console.error(
                "SEND NOTIFICATION ERROR:",
                error
              );

              return res.status(500).json({
                success: false,
                message:
                  "Failed to send notification.",
                error: error.message,
              });
            }

            res.status(201).json({
              success: true,
              message:
                "Notification sent successfully.",
              ...summary,
            });
          }
        );
      }
    );
  });
});

// ======================================================
// CREATE BULK NOTIFICATION
// ======================================================

function createBulkNotification(
  notification,
  customers,
  inquiries,
  callback
) {
  const notificationSql = `
    INSERT INTO notifications
    (
      customer_id,
      recipient_type,
      inquiry_id,
      notification_type,
      category,
      title,
      message,
      channel,
      is_automatic
    )
    VALUES
    (
      NULL,
      'Customer',
      NULL,
      ?,
      ?,
      ?,
      ?,
      ?,
      0
    )
  `;

  db.query(
    notificationSql,
    [
      notification.notificationType,
      notification.category,
      notification.title,
      notification.message,
      notification.channel,
    ],
    async (err, result) => {
      if (err) {
        return callback(err);
      }

      const notificationId =
        result.insertId;

      const recipients = [];

      customers.forEach((customer) => {
        recipients.push({
          type: "Customer",
          customer_id:
            customer.customer_id,
          inquiry_id: null,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        });
      });

      inquiries.forEach((inquiry) => {
        recipients.push({
          type: "Inquiry",
          customer_id: null,
          inquiry_id: inquiry.id,
          name: inquiry.name,
          email: inquiry.email,
          phone: inquiry.phone,
        });
      });

      processRecipients(
        notificationId,
        notification,
        recipients,
        (recipientErr, summary) => {
          if (recipientErr) {
            return callback(recipientErr);
          }

          callback(null, {
            notificationId,
            recipientCount:
              recipients.length,
            ...summary,
          });
        }
      );
    }
  );
}

// ======================================================
// PROCESS RECIPIENTS
// ======================================================

function processRecipients(
  notificationId,
  notification,
  recipients,
  callback
) {
  let completed = 0;

  const summary = {
    emailSent: 0,
    emailFailed: 0,
    emailNotAvailable: 0,
    whatsappSent: 0,
    whatsappNotAvailable: 0,
  };

  if (recipients.length === 0) {
    return callback(null, summary);
  }

  recipients.forEach((recipient) => {
    let emailStatus = "Not Available";
    let whatsappStatus = "Not Available";

    const shouldSendEmail =
      notification.channel === "Email" ||
      notification.channel === "All";

    const shouldSendWhatsApp =
      notification.channel === "WhatsApp" ||
      notification.channel === "All";

    const finishRecipient = () => {
      const sql = `
        INSERT INTO notification_recipients
        (
          notification_id,
          recipient_type,
          customer_id,
          inquiry_id,
          recipient_name,
          recipient_email,
          recipient_phone,
          email_status,
          whatsapp_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [
          notificationId,
          recipient.type,
          recipient.customer_id,
          recipient.inquiry_id,
          recipient.name || null,
          recipient.email || null,
          recipient.phone || null,
          emailStatus,
          whatsappStatus,
        ],
        (err) => {
          if (err) {
            return callback(err);
          }

          completed++;

          if (
            completed === recipients.length
          ) {
            updateMainNotificationStatus(
              notificationId,
              notification.channel,
              summary,
              callback
            );
          }
        }
      );
    };

    if (
      shouldSendEmail &&
      recipient.email
    ) {
      sendEmail(
        recipient.email,
        notification.title,
        notification.message
      ).then((result) => {
        emailStatus = result.status;

        if (result.status === "Sent") {
          summary.emailSent++;
        } else if (
          result.status === "Failed"
        ) {
          summary.emailFailed++;
        } else {
          summary.emailNotAvailable++;
        }

        finishRecipient();
      });

      return;
    }

    if (shouldSendEmail) {
      emailStatus = "Not Available";
      summary.emailNotAvailable++;
    }

    // --------------------------------------------------
    // WhatsApp
    // --------------------------------------------------
    // No WhatsApp Business/API provider is currently
    // connected. Therefore we safely record the status
    // instead of pretending that a WhatsApp message was sent.

    if (shouldSendWhatsApp) {
      whatsappStatus = "Not Available";
      summary.whatsappNotAvailable++;
    }

    finishRecipient();
  });
}

// ======================================================
// UPDATE MAIN NOTIFICATION STATUS
// ======================================================

function updateMainNotificationStatus(
  notificationId,
  channel,
  summary,
  callback
) {
  const emailStatus =
    channel === "Website"
      ? "Not Available"
      : summary.emailSent > 0
      ? "Sent"
      : summary.emailFailed > 0
      ? "Failed"
      : "Not Available";

  const whatsappStatus =
    channel === "Email" ||
    channel === "Website"
      ? "Not Available"
      : "Not Available";

  const sql = `
    UPDATE notifications
    SET
      email_status = ?,
      whatsapp_status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      emailStatus,
      whatsappStatus,
      notificationId,
    ],
    (err) => {
      if (err) {
        return callback(err);
      }

      callback(null, summary);
    }
  );
}

// ======================================================
// CREATE SINGLE RECIPIENT
// ======================================================

function createRecipientForSingle(
  recipientType,
  customerId,
  inquiryId,
  notificationId,
  callback
) {
  if (recipientType === "Customer") {
    if (!validNumber(customerId)) {
      return callback(null);
    }

    const sql = `
      SELECT
        cp.id AS customer_id,
        u.name,
        u.email,
        cp.phone
      FROM customer_profiles cp
      JOIN users u
        ON u.id = cp.user_id
      WHERE cp.id = ?
      LIMIT 1
    `;

    db.query(
      sql,
      [customerId],
      (err, rows) => {
        if (err) {
          return callback(err);
        }

        if (rows.length === 0) {
          return callback(
            new Error(
              "Customer not found."
            )
          );
        }

        const customer =
          rows[0];

        const recipientSql = `
          INSERT INTO notification_recipients
          (
            notification_id,
            recipient_type,
            customer_id,
            inquiry_id,
            recipient_name,
            recipient_email,
            recipient_phone
          )
          VALUES (?, 'Customer', ?, NULL, ?, ?, ?)
        `;

        db.query(
          recipientSql,
          [
            notificationId,
            customer.customer_id,
            customer.name || null,
            customer.email || null,
            customer.phone || null,
          ],
          callback
        );
      }
    );

    return;
  }

  if (!validNumber(inquiryId)) {
    return callback(null);
  }

  const sql = `
    SELECT
      id,
      name,
      email,
      phone
    FROM inquiries
    WHERE id = ?
    LIMIT 1
  `;

  db.query(
    sql,
    [inquiryId],
    (err, rows) => {
      if (err) {
        return callback(err);
      }

      if (rows.length === 0) {
        return callback(
          new Error(
            "Inquiry not found."
          )
        );
      }

      const inquiry = rows[0];

      const recipientSql = `
        INSERT INTO notification_recipients
        (
          notification_id,
          recipient_type,
          customer_id,
          inquiry_id,
          recipient_name,
          recipient_email,
          recipient_phone
        )
        VALUES (?, 'Inquiry', NULL, ?, ?, ?, ?)
      `;

      db.query(
        recipientSql,
        [
          notificationId,
          inquiry.id,
          inquiry.name || null,
          inquiry.email || null,
          inquiry.phone || null,
        ],
        callback
      );
    }
  );
}

// ======================================================
// UPDATE NOTIFICATION
// ======================================================

router.put("/:id", authenticateAdmin, (req, res) => {
  const notificationId = Number(
    req.params.id
  );

  const {
    title,
    message,
    category,
    notification_type,
    channel,
  } = req.body;

  if (!validNumber(notificationId)) {
    return res.status(400).json({
      success: false,
      message:
        "Valid notification ID is required.",
    });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification title is required.",
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message:
        "Notification message is required.",
    });
  }

  const finalChannel =
    normalizeChannel(channel);

  const sql = `
    UPDATE notifications
    SET
      title = ?,
      message = ?,
      category = ?,
      notification_type = ?,
      channel = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      title.trim(),
      message.trim(),
      category || "General",
      notification_type || "General",
      finalChannel,
      notificationId,
    ],
    (err, result) => {
      if (err) {
        console.error(
          "UPDATE NOTIFICATION ERROR:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to update notification.",
          error: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      res.json({
        success: true,
        message:
          "Notification updated successfully.",
      });
    }
  );
});

// ======================================================
// MARK WEBSITE NOTIFICATION AS READ
// ======================================================

router.put("/:id/read", authenticateAdmin, (req, res) => {
  const notificationId = Number(
    req.params.id
  );

  if (!validNumber(notificationId)) {
    return res.status(400).json({
      success: false,
      message:
        "Valid notification ID is required.",
    });
  }

  const sql = `
    UPDATE notifications
    SET website_status = 'Read'
    WHERE id = ?
  `;

  db.query(
    sql,
    [notificationId],
    (err, result) => {
      if (err) {
        console.error(
          "MARK NOTIFICATION READ ERROR:",
          err
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to mark notification as read.",
          error: err.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      res.json({
        success: true,
        message:
          "Notification marked as read.",
      });
    }
  );
});

// ======================================================
// DELETE NOTIFICATION
// ======================================================

router.delete("/:id", authenticateAdmin, (req, res) => {
  const notificationId = Number(
    req.params.id
  );

  if (!validNumber(notificationId)) {
    return res.status(400).json({
      success: false,
      message:
        "Valid notification ID is required.",
    });
  }

  const recipientDeleteSql = `
    DELETE FROM notification_recipients
    WHERE notification_id = ?
  `;

  db.query(
    recipientDeleteSql,
    [notificationId],
    (recipientErr) => {
      if (recipientErr) {
        console.error(
          "DELETE NOTIFICATION RECIPIENTS ERROR:",
          recipientErr
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to delete notification recipients.",
          error: recipientErr.message,
        });
      }

      const sql = `
        DELETE FROM notifications
        WHERE id = ?
      `;

      db.query(
        sql,
        [notificationId],
        (err, result) => {
          if (err) {
            console.error(
              "DELETE NOTIFICATION ERROR:",
              err
            );

            return res.status(500).json({
              success: false,
              message:
                "Failed to delete notification.",
              error: err.message,
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message:
                "Notification not found.",
            });
          }

          res.json({
            success: true,
            message:
              "Notification deleted successfully.",
          });
        }
      );
    }
  );
});

module.exports = router;