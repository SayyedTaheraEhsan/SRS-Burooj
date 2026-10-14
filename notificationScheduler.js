const db = require("./db");
const nodemailer = require("nodemailer");

// ======================================================
// AUTOMATIC INSTALLMENT NOTIFICATION SCHEDULER
// ======================================================

// ======================================================
// EMAIL TRANSPORTER
// Reuses the same Gmail SMTP configuration already used
// by the SRS Burooj customer email system.
// ======================================================

const installmentEmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// DATE HELPERS
// IMPORTANT:
// MySQL DATE values must stay as YYYY-MM-DD.
// Do NOT convert them through toISOString(), because that
// can shift the date depending on timezone.
// ======================================================

function normalizeDateString(dateValue) {
  if (!dateValue) {
    return null;
  }

  // MySQL DATE normally arrives as YYYY-MM-DD string.
  if (typeof dateValue === "string") {
    const trimmed = dateValue.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }

  // If mysql2 returns a Date object, use local date parts.
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return null;
}

function getTodayDateString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateStringToUtcDayNumber(dateString) {
  if (!dateString) {
    return null;
  }

  const parts = String(dateString).slice(0, 10).split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return Math.floor(
    Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24)
  );
}

function getDaysDifference(dueDate) {
  const dueDateString = normalizeDateString(dueDate);
  const todayString = getTodayDateString();

  const dueDay = dateStringToUtcDayNumber(dueDateString);
  const todayDay = dateStringToUtcDayNumber(todayString);

  if (dueDay === null || todayDay === null) {
    return null;
  }

  return dueDay - todayDay;
}

function formatDate(dateValue) {
  const dateString = normalizeDateString(dateValue);

  if (!dateString) {
    return "";
  }

  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatINR(amount) {
  return Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ======================================================
// HTML HELPER
// ======================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// WHATSAPP CONFIGURATION
//
// These values are intentionally read from .env.
//
// Required for actual WhatsApp sending:
//
// WHATSAPP_ACCESS_TOKEN
// WHATSAPP_PHONE_NUMBER_ID
// WHATSAPP_API_VERSION
// WHATSAPP_TEMPLATE_NAME
// WHATSAPP_TEMPLATE_LANGUAGE
//
// IMPORTANT:
// WhatsApp proactive notifications normally require an
// approved WhatsApp message template.
// ======================================================

function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_API_VERSION &&
      process.env.WHATSAPP_TEMPLATE_NAME &&
      process.env.WHATSAPP_TEMPLATE_LANGUAGE
  );
}

// ======================================================
// NORMALIZE INDIAN PHONE NUMBER FOR WHATSAPP
// ======================================================

function normalizeWhatsAppPhone(phone) {
  if (!phone) {
    return null;
  }

  let cleaned = String(phone).replace(/\D/g, "");

  if (!cleaned) {
    return null;
  }

  // Example:
  // 09146974321 -> 919146974321
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = `91${cleaned.slice(1)}`;
  }

  // Example:
  // 9146974321 -> 919146974321
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }

  // Already has Indian country code.
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned;
  }

  return cleaned;
}

// ======================================================
// CHECK INSTALLMENTS
// ======================================================

function checkInstallmentNotifications() {
  const sql = `
    SELECT
      ci.id AS installment_id,
      ci.installment_number,
      ci.installment_amount,
      ci.due_date,
      ci.status,

      cp.id AS customer_property_id,
      cp.customer_id,
      cp.project_name,
      cp.unit_number,

      u.name AS customer_name,
      u.email AS customer_email,
      cprof.phone AS customer_phone

    FROM customer_installments ci

    JOIN customer_properties cp
      ON cp.id = ci.customer_property_id

    JOIN customer_profiles cprof
      ON cprof.id = cp.customer_id

    JOIN users u
      ON u.id = cprof.user_id

    WHERE ci.status IN ('Pending', 'Overdue')
      AND ci.due_date IS NOT NULL
  `;

  db.query(sql, (err, installments) => {
    if (err) {
      console.error(
        "INSTALLMENT NOTIFICATION CHECK ERROR:",
        err
      );

      return;
    }

    if (!installments.length) {
      console.log(
        "Automatic installment check: no pending/overdue installments."
      );

      return;
    }

    console.log(
      `Automatic installment check: ${installments.length} installment(s) found.`
    );

    installments.forEach((installment) => {
      const normalizedDueDate = normalizeDateString(
        installment.due_date
      );

      const daysDifference = getDaysDifference(
        normalizedDueDate
      );

      console.log(
        `Installment ${installment.installment_id}: due=${normalizedDueDate}, daysDifference=${daysDifference}`
      );

      processInstallmentReminder(
        {
          ...installment,
          normalized_due_date: normalizedDueDate,
        },
        daysDifference
      );
    });
  });
}

// ======================================================
// PROCESS ONE INSTALLMENT
// ======================================================

function processInstallmentReminder(
  installment,
  daysDifference
) {
  let reminderType = null;
  let daysOffset = null;
  let title = "";
  let message = "";

  // ----------------------------------------------------
  // 5 DAYS BEFORE
  // ----------------------------------------------------

  if (daysDifference === 5) {
    reminderType = "InstallmentDue5Days";
    daysOffset = -5;

    title = "Installment Due in 5 Days";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} for ` +
      `${installment.project_name || "your property"} ` +
      `(${installment.unit_number || "Unit"}) is due on ` +
      `${formatDate(installment.normalized_due_date)}. ` +
      `This is a reminder 5 days before the due date.`;
  }

  // ----------------------------------------------------
  // 3 DAYS BEFORE
  // ----------------------------------------------------

  else if (daysDifference === 3) {
    reminderType = "InstallmentDue3Days";
    daysOffset = -3;

    title = "Installment Due in 3 Days";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} is due in ` +
      `3 days on ${formatDate(installment.normalized_due_date)}. ` +
      `Please arrange the payment before the due date.`;
  }

  // ----------------------------------------------------
  // 1 DAY BEFORE
  // ----------------------------------------------------

  else if (daysDifference === 1) {
    reminderType = "InstallmentDue1Day";
    daysOffset = -1;

    title = "Installment Due Tomorrow";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} is due tomorrow, ` +
      `${formatDate(installment.normalized_due_date)}. ` +
      `Please complete the payment on time.`;
  }

  // ----------------------------------------------------
  // DUE DATE
  // ----------------------------------------------------

  else if (daysDifference === 0) {
    reminderType = "InstallmentDueToday";
    daysOffset = 0;

    title = "Installment Due Today";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} is due today, ` +
      `${formatDate(installment.normalized_due_date)}. ` +
      `Please complete the payment today to avoid overdue status.`;
  }

  // ----------------------------------------------------
  // 1 DAY OVERDUE
  // ----------------------------------------------------

  else if (daysDifference === -1) {
    reminderType = "InstallmentOverdue1Day";
    daysOffset = 1;

    title = "Installment Payment Overdue";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} was due on ` +
      `${formatDate(installment.normalized_due_date)} and remains unpaid. ` +
      `Please complete the payment at the earliest.`;
  }

  // ----------------------------------------------------
  // 3 DAYS OVERDUE
  // ----------------------------------------------------

  else if (daysDifference === -3) {
    reminderType = "InstallmentOverdue3Days";
    daysOffset = 3;

    title = "Important: Installment 3 Days Overdue";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} is now ` +
      `3 days overdue. Please arrange the outstanding payment immediately.`;
  }

  // ----------------------------------------------------
  // 5 DAYS OVERDUE
  // ----------------------------------------------------

  else if (daysDifference === -5) {
    reminderType = "InstallmentOverdue5Days";
    daysOffset = 5;

    title = "Urgent: Installment 5 Days Overdue";

    message =
      `Dear ${installment.customer_name || "Customer"}, your installment ` +
      `of ₹${formatINR(installment.installment_amount)} has remained unpaid ` +
      `for 5 days after the due date. Please clear the outstanding amount ` +
      `immediately and contact SRS Burooj if you require assistance.`;
  }

  if (!reminderType) {
    return;
  }

  // ----------------------------------------------------
  // WEBSITE
  // ----------------------------------------------------

  createWebsiteNotification(
    installment,
    reminderType,
    daysOffset,
    title,
    message
  );

  // ----------------------------------------------------
  // EMAIL
  // ----------------------------------------------------

  createEmailNotification(
    installment,
    reminderType,
    daysOffset,
    title,
    message
  );

  // ----------------------------------------------------
  // WHATSAPP
  // ----------------------------------------------------

  createWhatsAppNotification(
    installment,
    reminderType,
    daysOffset,
    title,
    message
  );
}

// ======================================================
// CREATE WEBSITE NOTIFICATION
// ======================================================

function createWebsiteNotification(
  installment,
  reminderType,
  daysOffset,
  title,
  message
) {
  const notificationKey =
    `installment:${installment.installment_id}:${reminderType}`;

  const checkSql = `
    SELECT id
    FROM notifications
    WHERE notification_key = ?
    LIMIT 1
  `;

  db.query(
    checkSql,
    [notificationKey],
    (checkErr, existingRows) => {
      if (checkErr) {
        console.error(
          "WEBSITE NOTIFICATION DUPLICATE CHECK ERROR:",
          checkErr
        );

        return;
      }

      if (existingRows.length > 0) {
        return;
      }

      insertNotification(
        notificationKey,
        installment,
        reminderType,
        daysOffset,
        title,
        message,
        "Website",
        (notificationId) => {
          if (!notificationId) {
            return;
          }

          console.log(
            `🔔 Website installment notification created: ${reminderType} | Notification ID: ${notificationId}`
          );
        }
      );
    }
  );
}

// ======================================================
// CREATE EMAIL NOTIFICATION
//
// IMPORTANT:
// If an Email notification already exists:
//
// Sent    -> do not send again.
// Pending -> try again.
// Failed  -> retry.
//
// This fixes the previous problem where a failed email
// could remain permanently blocked by the notification key.
// ======================================================

function createEmailNotification(
  installment,
  reminderType,
  daysOffset,
  title,
  message
) {
  if (!installment.customer_email) {
    console.warn(
      `EMAIL SKIPPED: customer ${installment.customer_id} has no email address.`
    );

    return;
  }

  const emailNotificationKey =
    `installment:${installment.installment_id}:${reminderType}:email`;

  const checkSql = `
    SELECT
      n.id AS notification_id,
      nr.id AS recipient_id,
      nr.email_status
    FROM notifications n
    LEFT JOIN notification_recipients nr
      ON nr.notification_id = n.id
    WHERE n.notification_key = ?
    LIMIT 1
  `;

  db.query(
    checkSql,
    [emailNotificationKey],
    (checkErr, existingRows) => {
      if (checkErr) {
        console.error(
          "EMAIL NOTIFICATION DUPLICATE CHECK ERROR:",
          checkErr
        );

        return;
      }

      if (existingRows.length > 0) {
        const existing = existingRows[0];

        if (existing.email_status === "Sent") {
          return;
        }

        if (!existing.recipient_id) {
          console.warn(
            `EMAIL RECIPIENT MISSING: Notification ID ${existing.notification_id}`
          );

          return;
        }

        // Existing Pending/Failed email should be attempted again.
        sendInstallmentEmail(
          existing.notification_id,
          existing.recipient_id,
          installment,
          reminderType,
          title,
          message
        );

        return;
      }

      insertNotification(
        emailNotificationKey,
        installment,
        reminderType,
        daysOffset,
        title,
        message,
        "Email",
        (notificationId, recipientId) => {
          if (!notificationId || !recipientId) {
            return;
          }

          sendInstallmentEmail(
            notificationId,
            recipientId,
            installment,
            reminderType,
            title,
            message
          );
        }
      );
    }
  );
}

// ======================================================
// SEND INSTALLMENT EMAIL
// ======================================================

async function sendInstallmentEmail(
  notificationId,
  recipientId,
  installment,
  reminderType,
  title,
  message
) {
  try {
    console.log(
      `📧 INSTALLMENT EMAIL ATTEMPT: ${reminderType} | ` +
      `Notification ID: ${notificationId} | ` +
      `To: ${installment.customer_email}`
    );

    const info =
      await installmentEmailTransporter.sendMail({
        from:
          `"SRS Burooj" <${process.env.EMAIL_USER}>`,

        to: installment.customer_email,

        subject:
          `SRS Burooj - ${title}`,

        text: message,

        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:650px;
            margin:auto;
            padding:30px;
            border:1px solid #d9e2f0;
            border-radius:14px;
            background:#ffffff;
          ">

            <div style="
              background:#0b5ed7;
              color:#ffffff;
              padding:18px 22px;
              border-radius:10px;
              margin-bottom:24px;
            ">
              <h2 style="
                margin:0;
                font-size:24px;
              ">
                SRS Burooj
              </h2>

              <p style="
                margin:6px 0 0;
                font-size:14px;
              ">
                Real Estate Management System
              </p>
            </div>

            <h3 style="
              color:#17365d;
              margin-bottom:18px;
            ">
              ${escapeHtml(title)}
            </h3>

            <p style="
              font-size:16px;
              line-height:1.7;
              color:#333333;
            ">
              Dear <strong>
                ${escapeHtml(installment.customer_name || "Customer")}
              </strong>,
            </p>

            <p style="
              font-size:16px;
              line-height:1.7;
              color:#333333;
            ">
              ${escapeHtml(message)}
            </p>

            <div style="
              margin:22px 0;
              padding:18px;
              background:#f3f7ff;
              border-left:4px solid #0b5ed7;
              border-radius:8px;
            ">

              <p style="margin:6px 0;">
                <strong>Project:</strong>
                ${escapeHtml(installment.project_name || "N/A")}
              </p>

              <p style="margin:6px 0;">
                <strong>Unit:</strong>
                ${escapeHtml(installment.unit_number || "N/A")}
              </p>

              <p style="margin:6px 0;">
                <strong>Installment:</strong>
                #${escapeHtml(installment.installment_number || "N/A")}
              </p>

              <p style="margin:6px 0;">
                <strong>Amount:</strong>
                ₹${formatINR(installment.installment_amount)}
              </p>

              <p style="margin:6px 0;">
                <strong>Due Date:</strong>
                ${formatDate(installment.normalized_due_date)}
              </p>

            </div>

            <p style="
              font-size:15px;
              line-height:1.6;
              color:#555555;
            ">
              If you have already completed this payment,
              please ignore this reminder.
            </p>

            <p style="
              margin-top:28px;
              font-size:15px;
              color:#333333;
            ">
              Regards,<br />
              <strong>SRS Burooj</strong>
            </p>

          </div>
        `,
      });

    // Update email delivery status.
    updateEmailStatus(
      recipientId,
      "Sent"
    );

    console.log(
      `📧 INSTALLMENT EMAIL SENT: ${reminderType} | ` +
      `Notification ID: ${notificationId} | ` +
      `To: ${installment.customer_email} | ` +
      `Message ID: ${info.messageId || "N/A"}`
    );
  } catch (mailError) {
    // Mark failed so next scheduler run can retry.
    updateEmailStatus(
      recipientId,
      "Failed"
    );

    console.error(
      `❌ INSTALLMENT EMAIL FAILED: ${reminderType} | ` +
      `Notification ID: ${notificationId} | ` +
      `To: ${installment.customer_email}`,
      mailError
    );
  }
}

// ======================================================
// UPDATE EMAIL STATUS
// ======================================================

function updateEmailStatus(
  recipientId,
  status
) {
  const sql = `
    UPDATE notification_recipients
    SET email_status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [status, recipientId],
    (err) => {
      if (err) {
        console.error(
          "UPDATE EMAIL STATUS ERROR:",
          err
        );
      }
    }
  );
}

// ======================================================
// CREATE WHATSAPP NOTIFICATION
//
// If WhatsApp is not configured, we DO NOT pretend that
// the message was sent.
//
// Once real Meta WhatsApp Cloud API credentials and an
// approved template are placed in .env, this will create
// and send the WhatsApp reminder automatically.
// ======================================================

function createWhatsAppNotification(
  installment,
  reminderType,
  daysOffset,
  title,
  message
) {
  if (!installment.customer_phone) {
    console.warn(
      `WHATSAPP SKIPPED: customer ${installment.customer_id} has no phone number.`
    );

    return;
  }

  if (!isWhatsAppConfigured()) {
    console.log(
      `📱 WHATSAPP NOT CONFIGURED: ${reminderType} | ` +
      `Customer: ${installment.customer_name || installment.customer_id}`
    );

    return;
  }

  const whatsappPhone =
    normalizeWhatsAppPhone(
      installment.customer_phone
    );

  if (!whatsappPhone) {
    console.warn(
      `WHATSAPP SKIPPED: invalid phone number for customer ${installment.customer_id}.`
    );

    return;
  }

  const whatsappNotificationKey =
    `installment:${installment.installment_id}:${reminderType}:whatsapp`;

  const checkSql = `
    SELECT
      n.id AS notification_id,
      nr.id AS recipient_id,
      nr.whatsapp_status
    FROM notifications n
    LEFT JOIN notification_recipients nr
      ON nr.notification_id = n.id
    WHERE n.notification_key = ?
    LIMIT 1
  `;

  db.query(
    checkSql,
    [whatsappNotificationKey],
    (checkErr, existingRows) => {
      if (checkErr) {
        console.error(
          "WHATSAPP NOTIFICATION DUPLICATE CHECK ERROR:",
          checkErr
        );

        return;
      }

      if (existingRows.length > 0) {
        const existing = existingRows[0];

        if (existing.whatsapp_status === "Sent") {
          return;
        }

        if (!existing.recipient_id) {
          console.warn(
            `WHATSAPP RECIPIENT MISSING: Notification ID ${existing.notification_id}`
          );

          return;
        }

        sendInstallmentWhatsApp(
          existing.notification_id,
          existing.recipient_id,
          installment,
          reminderType
        );

        return;
      }

      insertNotification(
        whatsappNotificationKey,
        installment,
        reminderType,
        daysOffset,
        title,
        message,
        "WhatsApp",
        (notificationId, recipientId) => {
          if (!notificationId || !recipientId) {
            return;
          }

          sendInstallmentWhatsApp(
            notificationId,
            recipientId,
            installment,
            reminderType
          );
        }
      );
    }
  );
}

// ======================================================
// SEND WHATSAPP INSTALLMENT MESSAGE
//
// Uses Meta WhatsApp Cloud API template messaging.
//
// The approved template should have 5 body variables:
//
// {{1}} Customer Name
// {{2}} Installment Amount
// {{3}} Project Name
// {{4}} Unit Number
// {{5}} Due Date
// ======================================================

async function sendInstallmentWhatsApp(
  notificationId,
  recipientId,
  installment,
  reminderType
) {
  const whatsappPhone =
    normalizeWhatsAppPhone(
      installment.customer_phone
    );

  if (!whatsappPhone) {
    updateWhatsAppStatus(
      recipientId,
      "Failed"
    );

    return;
  }

  const apiVersion =
    process.env.WHATSAPP_API_VERSION;

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;

  const templateName =
    process.env.WHATSAPP_TEMPLATE_NAME;

  const templateLanguage =
    process.env.WHATSAPP_TEMPLATE_LANGUAGE;

  const apiUrl =
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const requestBody = {
    messaging_product: "whatsapp",

    to: whatsappPhone,

    type: "template",

    template: {
      name: templateName,

      language: {
        code: templateLanguage,
      },

      components: [
        {
          type: "body",

          parameters: [
            {
              type: "text",
              text:
                String(
                  installment.customer_name ||
                    "Customer"
                ),
            },

            {
              type: "text",
              text:
                `₹${formatINR(
                  installment.installment_amount
                )}`,
            },

            {
              type: "text",
              text:
                String(
                  installment.project_name ||
                    "SRS Burooj"
                ),
            },

            {
              type: "text",
              text:
                String(
                  installment.unit_number ||
                    "Unit"
                ),
            },

            {
              type: "text",
              text:
                formatDate(
                  installment.normalized_due_date
                ),
            },
          ],
        },
      ],
    },
  };

  try {
    console.log(
      `📱 WHATSAPP ATTEMPT: ${reminderType} | ` +
      `Notification ID: ${notificationId} | ` +
      `To: +${whatsappPhone}`
    );

    const response = await fetch(
      apiUrl,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          requestBody
        ),
      }
    );

    const responseText =
      await response.text();

    let responseData = null;

    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData = {
        raw: responseText,
      };
    }

    if (!response.ok) {
      updateWhatsAppStatus(
        recipientId,
        "Failed"
      );

      console.error(
        `❌ WHATSAPP FAILED: ${reminderType} | ` +
        `HTTP ${response.status}`,
        responseData
      );

      return;
    }

    updateWhatsAppStatus(
      recipientId,
      "Sent"
    );

    const messageId =
      responseData?.messages?.[0]?.id ||
      "N/A";

    console.log(
      `📱 WHATSAPP SENT: ${reminderType} | ` +
      `Notification ID: ${notificationId} | ` +
      `To: +${whatsappPhone} | ` +
      `Message ID: ${messageId}`
    );
  } catch (whatsappError) {
    updateWhatsAppStatus(
      recipientId,
      "Failed"
    );

    console.error(
      `❌ WHATSAPP ERROR: ${reminderType} | ` +
      `Notification ID: ${notificationId}`,
      whatsappError
    );
  }
}

// ======================================================
// UPDATE WHATSAPP STATUS
// ======================================================

function updateWhatsAppStatus(
  recipientId,
  status
) {
  const sql = `
    UPDATE notification_recipients
    SET whatsapp_status = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [status, recipientId],
    (err) => {
      if (err) {
        console.error(
          "UPDATE WHATSAPP STATUS ERROR:",
          err
        );
      }
    }
  );
}

// ======================================================
// INSERT NOTIFICATION + RECIPIENT
// ======================================================

function insertNotification(
  notificationKey,
  installment,
  reminderType,
  daysOffset,
  title,
  message,
  channel,
  callback
) {
  const notificationSql = `
    INSERT INTO notifications
    (
      notification_key,
      customer_id,
      recipient_type,
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
    VALUES
    (
      ?,
      ?,
      'Customer',
      ?,
      'Payment',
      ?,
      ?,
      ?,
      ?,
      'customer_installment',
      ?,
      ?,
      1
    )
  `;

  const notificationValues = [
    notificationKey,
    installment.customer_id,
    reminderType,
    title,
    message,
    channel,
    installment.installment_id,
    installment.normalized_due_date,
    daysOffset,
  ];

  db.query(
    notificationSql,
    notificationValues,
    (insertErr, result) => {
      if (insertErr) {
        console.error(
          `CREATE ${channel.toUpperCase()} NOTIFICATION ERROR:`,
          insertErr
        );

        return;
      }

      const notificationId =
        result.insertId;

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
        VALUES
        (
          ?,
          'Customer',
          ?,
          NULL,
          ?,
          ?,
          ?
        )
      `;

      const recipientValues = [
        notificationId,
        installment.customer_id,
        installment.customer_name || null,
        installment.customer_email || null,
        installment.customer_phone || null,
      ];

      db.query(
        recipientSql,
        recipientValues,
        (recipientErr, recipientResult) => {
          if (recipientErr) {
            console.error(
              `CREATE ${channel.toUpperCase()} RECIPIENT ERROR:`,
              recipientErr
            );

            return;
          }

          const recipientId =
            recipientResult.insertId;

          callback(
            notificationId,
            recipientId
          );
        }
      );
    }
  );
}

// ======================================================
// START SCHEDULER
// ======================================================

function startNotificationScheduler() {
  console.log(
    "🔔 SRS Burooj notification scheduler started."
  );

  // Check immediately when server starts.
  checkInstallmentNotifications();

  // Check every hour.
  setInterval(
    checkInstallmentNotifications,
    60 * 60 * 1000
  );
}

module.exports = {
  startNotificationScheduler,
  checkInstallmentNotifications,
};