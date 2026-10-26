const express = require("express");

const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const db = require("../db");
const sharedAuthenticateAdmin = require("../middleware/adminAuth");


const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the environment configuration.");
}


console.log("LOGIN DB:", process.env.DB_NAME);

// =====================================================
// SMTP DEBUG
// =====================================================

const DEBUG_FILE = path.join(__dirname, "..", "smtp-debug.txt");

function writeDebug() {
  // Detailed authentication and SMTP debug logging is disabled.
}
function maskEmail(email) {
  if (!email) return "(MISSING)";

  const parts = String(email).trim().split("@");

  if (parts.length !== 2) {
    return "(INVALID EMAIL FORMAT)";
  }

  const local = parts[0];
  const domain = parts[1];

  if (local.length <= 4) {
    return `***@${domain}`;
  }

  return (
    local.substring(0, 2) +
    "***" +
    local.substring(local.length - 2) +
    "@" +
    domain
  );
}

writeDebug("=====================================================");
writeDebug("SRS BUROOJ AUTH ROUTES STARTED");
writeDebug("=====================================================");

writeDebug("EMAIL ENV CHECK", {
  emailUser: maskEmail(process.env.EMAIL_USER),
  emailUserLength: process.env.EMAIL_USER
    ? process.env.EMAIL_USER.length
    : 0,
  emailPassExists: !!process.env.EMAIL_PASS,
  emailPassLength: process.env.EMAIL_PASS
    ? process.env.EMAIL_PASS.length
    : 0,
  emailPassHasSpaces: /\s/.test(process.env.EMAIL_PASS || ""),
  emailPassHasQuotes: /^["']|["']$/.test(
    process.env.EMAIL_PASS || ""
  ),
  smtpHost: "smtp.gmail.com",
  smtpPort: 465,
  smtpSecure: true,
});

// =====================================================
// RESEND EMAIL API
// =====================================================

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing from the environment configuration.");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is missing. Set it to a sender address verified in Resend.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      result.message ||
      result.name ||
      `Resend API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return result;
}

// =====================================================
// FRONTEND URL HELPER
// =====================================================

function getFrontendOrigin(req) {
  const origin = req.headers.origin;

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }

  return "http://localhost:5173";
}

// =====================================================
// ADMIN AUTH HELPER
// Shared middleware is used by all protected admin endpoints.
// =====================================================

// =====================================================
// ADMIN LOGIN
// =====================================================

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const sql =
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = 'admin' LIMIT 1";

  db.query(sql, [email.trim()], async (err, results) => {
    if (err) {
      console.error("Login error:", err);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = results[0];

    try {
      const passwordMatch = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        {
          expiresIn: "8h",
        }
      );

      return res.json({
        success: true,
        message: "Admin login successful",
        token,
        admin: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
        },
      });
    } catch (error) {
      console.error(
        "Admin password verification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Login verification failed",
      });
    }
  });
});

// =====================================================
// ADMIN FORGOT PASSWORD
// =====================================================

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  writeDebug("ADMIN FORGOT PASSWORD REQUEST RECEIVED");

  if (!email || !String(email).trim()) {
    return res.status(400).json({
      success: false,
      message: "Registered admin email is required",
    });
  }

  const adminEmail = String(email)
    .trim()
    .toLowerCase();

  const sql = `
    SELECT id, name, email
    FROM users
    WHERE LOWER(email) = ?
      AND role = 'admin'
    LIMIT 1
  `;

  db.query(sql, [adminEmail], (err, results) => {
    if (err) {
      console.error(
        "Admin forgot password search error:",
        err
      );

      writeDebug(
        "ADMIN DATABASE ERROR DURING FORGOT PASSWORD",
        {
          code: err.code,
          message: err.message,
        }
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (results.length === 0) {
      return res.json({
        success: true,
        message:
          "If this email is registered, a password reset link has been sent.",
      });
    }

    const admin = results[0];

    const deleteOldSql = `
      DELETE FROM admin_password_resets
      WHERE user_id = ?
        AND used = 0
    `;

    db.query(deleteOldSql, [admin.id], () => {
      const resetToken = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      );

      const insertSql = `
        INSERT INTO admin_password_resets
        (user_id, reset_token, expires_at)
        VALUES (?, ?, ?)
      `;

      db.query(
        insertSql,
        [admin.id, resetToken, expiresAt],
        async (insertErr) => {
          if (insertErr) {
            console.error(
              "Admin reset token insert error:",
              insertErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Could not create password reset request",
            });
          }

          const frontendOrigin =
            getFrontendOrigin(req);

          const resetLink =
            `${frontendOrigin}/admin-reset-password?token=${encodeURIComponent(
              resetToken
            )}`;

          try {
            await sendEmail({
              to: admin.email,
              subject:
                "SRS Burooj - Reset Your Admin Password",

              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;border:1px solid #ddd;border-radius:10px;">

                  <h2 style="color:#b8860b;">
                    SRS Burooj
                  </h2>

                  <p>
                    Hello ${admin.name || "Administrator"},
                  </p>

                  <p>
                    We received a request to reset your
                    SRS Burooj administrator password.
                  </p>

                  <p>
                    Click the button below to create a new password.
                  </p>

                  <p style="margin:30px 0;">
                    <a
                      href="${resetLink}"
                      style="background:#b8860b;color:white;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;"
                    >
                      Reset Admin Password
                    </a>
                  </p>

                  <p>
                    This link will expire in
                    <strong>30 minutes</strong>.
                  </p>

                  <p>
                    If you did not request this password reset,
                    you can safely ignore this email.
                  </p>

                </div>
              `,
            });

            writeDebug("ADMIN RESET EMAIL SENT", {
              to: maskEmail(admin.email),
              origin: frontendOrigin,
            });

            return res.json({
              success: true,
              message:
                "If this email is registered, a password reset link has been sent.",
            });
          } catch (mailError) {
            console.error(
              "Admin password reset email error:",
              mailError
            );

            writeDebug("ADMIN RESET EMAIL FAILED", {
              code: mailError.code,
              responseCode: mailError.responseCode,
              message: mailError.message,
            });

            return res.status(500).json({
              success: false,
              message:
                "Password reset email could not be sent",
            });
          }
        }
      );
    });
  });
});

// =====================================================
// ADMIN RESET PASSWORD
// =====================================================

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message:
        "Reset token and new password are required",
    });
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < 6
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Password must be at least 6 characters long",
    });
  }

  const cleanToken = String(token).trim();

  const sql = `
    SELECT id, user_id, expires_at, used
    FROM admin_password_resets
    WHERE BINARY reset_token = BINARY ?
    LIMIT 1
  `;

  db.query(sql, [cleanToken], async (err, results) => {
    if (err) {
      console.error(
        "Admin reset token verification error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (!results.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    const resetRequest = results[0];

    if (Number(resetRequest.used) === 1) {
      return res.status(400).json({
        success: false,
        message:
          "This reset link has already been used",
      });
    }

    if (
      new Date(resetRequest.expires_at).getTime() <
      Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "This reset link has expired",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(
        newPassword,
        10
      );

      const updateSql = `
        UPDATE users
        SET password = ?
        WHERE id = ?
          AND role = 'admin'
      `;

      db.query(
        updateSql,
        [hashedPassword, resetRequest.user_id],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error(
              "Admin password update error:",
              updateErr
            );

            return res.status(500).json({
              success: false,
              message: "Could not update password",
            });
          }

          if (updateResult.affectedRows === 0) {
            return res.status(404).json({
              success: false,
              message:
                "Administrator account not found",
            });
          }

          db.query(
            `
              UPDATE admin_password_resets
              SET used = 1
              WHERE id = ?
            `,
            [resetRequest.id],
            () => {
              return res.json({
                success: true,
                message:
                  "Admin password reset successful. You can now login with your new password.",
              });
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "Admin password hashing error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Could not reset password",
      });
    }
  });
});

// =====================================================
// CUSTOMER LOGIN
// =====================================================

router.post("/customer-login", (req, res) => {
  const { customerLoginId, password } = req.body;

  if (!customerLoginId || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Customer Login ID and password are required",
    });
  }

  const sql = `
    SELECT
      u.id,
      u.name,
      u.email,
      cp.phone,
      u.password,
      u.role,
      cp.id AS customer_profile_id,
      cpr.id AS customer_property_id,
      cpr.customer_login_id,
      cpr.project_name,
      cpr.unit_number,
      cpr.unit_type,
      cpr.purchase_date,
      cpr.project_progress
    FROM users u
    INNER JOIN customer_profiles cp
      ON u.id = cp.user_id
    LEFT JOIN customer_properties cpr
      ON cp.id = cpr.customer_id
    WHERE cpr.customer_login_id = ?
      AND u.role = 'customer'
    LIMIT 1
  `;

  db.query(
    sql,
    [customerLoginId.trim()],
    async (err, results) => {
      if (err) {
        console.error("Customer login error:", err);

        return res.status(500).json({
          success: false,
          message: "Server error",
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Customer Login ID or password",
        });
      }

      const customer = results[0];

      try {
        const passwordMatch = await bcrypt.compare(
          password,
          customer.password
        );

        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message:
              "Invalid Customer Login ID or password",
          });
        }

        const token = jwt.sign(
          {
            id: customer.id,
            customerPropertyId:
              customer.customer_property_id,
            customerLoginId:
              customer.customer_login_id,
            role: customer.role,
          },
          JWT_SECRET,
          {
            expiresIn: "8h",
          }
        );

        return res.json({
          success: true,
          message: "Customer login successful",
          token,

          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            role: customer.role,

            customerLoginId:
              customer.customer_login_id,

            customerPropertyId:
              customer.customer_property_id,

            projectName:
              customer.project_name,

            unitNumber:
              customer.unit_number,

            unitType:
              customer.unit_type,

            purchaseDate:
              customer.purchase_date,

            projectProgress:
              customer.project_progress,
          },
        });
      } catch (error) {
        console.error(
          "Customer password verification error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "Login verification failed",
        });
      }
    }
  );
});

// =====================================================
// CUSTOMER FORGOT PASSWORD
// =====================================================

router.post("/customer-forgot-password", (req, res) => {
  const { email } = req.body;

  writeDebug(
    "CUSTOMER FORGOT PASSWORD REQUEST RECEIVED"
  );

  if (!email || !String(email).trim()) {
    writeDebug(
      "CUSTOMER FORGOT PASSWORD FAILED - EMAIL MISSING"
    );

    return res.status(400).json({
      success: false,
      message: "Registered email is required",
    });
  }

  const customerEmail = String(email)
    .trim()
    .toLowerCase();

  const sql = `
    SELECT id, name, email
    FROM users
    WHERE LOWER(email) = ?
      AND role = 'customer'
    LIMIT 1
  `;

  db.query(sql, [customerEmail], (err, results) => {
    if (err) {
      console.error(
        "Forgot password user search error:",
        err
      );

      writeDebug(
        "DATABASE ERROR DURING CUSTOMER FORGOT PASSWORD",
        {
          code: err.code,
          message: err.message,
        }
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    if (results.length === 0) {
      return res.json({
        success: true,
        message:
          "If this email is registered, a password reset link has been sent.",
      });
    }

    const user = results[0];

    const deleteOldSql = `
      DELETE FROM customer_password_resets
      WHERE user_id = ?
        AND used = 0
    `;

    db.query(deleteOldSql, [user.id], () => {
      const resetToken = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      );

      const insertSql = `
        INSERT INTO customer_password_resets
        (user_id, reset_token, expires_at)
        VALUES (?, ?, ?)
      `;

      db.query(
        insertSql,
        [user.id, resetToken, expiresAt],
        async (insertErr) => {
          if (insertErr) {
            console.error(
              "Customer reset token insert error:",
              insertErr
            );

            return res.status(500).json({
              success: false,
              message:
                "Could not create password reset request",
            });
          }

          const frontendOrigin =
            getFrontendOrigin(req);

          const resetLink =
            `${frontendOrigin}/customer-reset-password?token=${encodeURIComponent(
              resetToken
            )}`;

          writeDebug(
            "CUSTOMER RESET TOKEN CREATED",
            {
              userId: user.id,
              tokenLength: resetToken.length,
              expiresAt: expiresAt.toISOString(),
              frontendOrigin,
            }
          );

          try {
            await sendEmail({
              to: user.email,
              subject:
                "SRS Burooj - Reset Your Customer Password",

              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;border:1px solid #ddd;border-radius:10px;">

                  <h2 style="color:#b8860b;">
                    SRS Burooj
                  </h2>

                  <p>
                    Hello ${user.name || "Customer"},
                  </p>

                  <p>
                    We received a request to reset your
                    SRS Burooj customer account password.
                  </p>

                  <p>
                    Click the button below to create a new password.
                  </p>

                  <p style="margin:30px 0;">
                    <a
                      href="${resetLink}"
                      style="background:#1f2937;color:white;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;"
                    >
                      Reset Customer Password
                    </a>
                  </p>

                  <p>
                    This link will expire in
                    <strong>30 minutes</strong>.
                  </p>

                  <p>
                    Your Customer Login ID will remain unchanged.
                  </p>

                </div>
              `,
            });

            writeDebug(
              "CUSTOMER RESET EMAIL SENT",
              {
                to: maskEmail(user.email),
                origin: frontendOrigin,
              }
            );

            return res.json({
              success: true,
              message:
                "If this email is registered, a password reset link has been sent.",
            });
          } catch (mailError) {
            console.error(
              "Customer password reset email error:",
              mailError
            );

            writeDebug(
              "CUSTOMER RESET EMAIL FAILED",
              {
                code: mailError.code,
                responseCode: mailError.responseCode,
                message: mailError.message,
              }
            );

            return res.status(500).json({
              success: false,
              message:
                "Password reset email could not be sent",
            });
          }
        }
      );
    });
  });
});

// =====================================================
// CUSTOMER RESET PASSWORD
// =====================================================

router.post(
  "/customer-reset-password",
  async (req, res) => {
    try {
      const rawToken = req.body?.token;
      const newPassword = req.body?.newPassword;

      const token = String(rawToken || "").trim();

      console.log(
        "=============================================="
      );
      console.log(
        "CUSTOMER PASSWORD RESET REQUEST"
      );
      console.log(
        "Token received:",
        token ? "YES" : "NO"
      );
      console.log(
        "Token length:",
        token.length
      );
      console.log(
        "=============================================="
      );

      writeDebug(
        "CUSTOMER PASSWORD RESET REQUEST RECEIVED",
        {
          tokenReceived: !!token,
          tokenLength: token.length,
        }
      );

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            "Reset token and new password are required",
        });
      }

      if (
        typeof newPassword !== "string" ||
        newPassword.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters long",
        });
      }

      const sql = `
        SELECT
          id,
          user_id,
          reset_token,
          expires_at,
          used
        FROM customer_password_resets
        WHERE BINARY reset_token = BINARY ?
        LIMIT 1
      `;

      db.query(
        sql,
        [token],
        async (err, results) => {
          if (err) {
            console.error(
              "Customer reset token verification error:",
              err
            );

            writeDebug(
              "CUSTOMER RESET DATABASE ERROR",
              {
                code: err.code,
                message: err.message,
              }
            );

            return res.status(500).json({
              success: false,
              message:
                "Server error while verifying reset link",
            });
          }

          console.log(
            "Customer reset token database matches:",
            results.length
          );

          writeDebug(
            "CUSTOMER RESET TOKEN DATABASE MATCH",
            {
              matches: results.length,
            }
          );

          if (!results.length) {
            return res.status(400).json({
              success: false,
              message:
                "This reset token is not valid. Please request a new reset link.",
            });
          }

          const resetRequest = results[0];

          if (Number(resetRequest.used) === 1) {
            return res.status(400).json({
              success: false,
              message:
                "This reset link has already been used.",
            });
          }

          const expiresAt = new Date(
            resetRequest.expires_at
          ).getTime();

          if (
            Number.isNaN(expiresAt) ||
            expiresAt < Date.now()
          ) {
            return res.status(400).json({
              success: false,
              message:
                "This reset link has expired.",
            });
          }

          const hashedPassword =
            await bcrypt.hash(
              newPassword,
              10
            );

          const updatePasswordSql = `
            UPDATE users
            SET password = ?
            WHERE id = ?
              AND role = 'customer'
          `;

          db.query(
            updatePasswordSql,
            [
              hashedPassword,
              resetRequest.user_id,
            ],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error(
                  "Customer password update error:",
                  updateErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Could not update customer password",
                });
              }

              if (
                updateResult.affectedRows === 0
              ) {
                return res.status(404).json({
                  success: false,
                  message:
                    "Customer account not found",
                });
              }

              const markUsedSql = `
                UPDATE customer_password_resets
                SET used = 1
                WHERE id = ?
              `;

              db.query(
                markUsedSql,
                [resetRequest.id],
                (usedErr) => {
                  if (usedErr) {
                    console.error(
                      "Customer reset token update error:",
                      usedErr
                    );

                    writeDebug(
                      "CUSTOMER RESET TOKEN MARK USED ERROR",
                      {
                        code: usedErr.code,
                        message: usedErr.message,
                      }
                    );
                  }

                  writeDebug(
                    "CUSTOMER PASSWORD RESET SUCCESS",
                    {
                      userId:
                        resetRequest.user_id,
                      resetId:
                        resetRequest.id,
                    }
                  );

                  return res.json({
                    success: true,
                    message:
                      "Password reset successful. You can now login with your new password.",
                  });
                }
              );
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "Customer password reset unexpected error:",
        error
      );

      writeDebug(
        "CUSTOMER PASSWORD RESET UNEXPECTED ERROR",
        {
          message: error.message,
        }
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not reset customer password",
      });
    }
  }
);

// =====================================================
// CUSTOMER INITIAL PASSWORD SETUP
// =====================================================

router.post(
  "/customer-set-password",
  async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password setup token and new password are required",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenSql = `
      SELECT
        id,
        user_id,
        token_hash,
        expires_at,
        used_at
      FROM customer_password_setup_tokens
      WHERE token_hash = ?
      LIMIT 1
    `;

    db.query(
      tokenSql,
      [tokenHash],
      async (tokenErr, tokenResults) => {
        if (tokenErr) {
          console.error(
            "Customer password setup token error:",
            tokenErr
          );

          return res.status(500).json({
            success: false,
            message:
              "Server error while verifying password setup link",
          });
        }

        if (!tokenResults.length) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid or expired password setup link",
          });
        }

        const setupToken =
          tokenResults[0];

        if (setupToken.used_at) {
          return res.status(400).json({
            success: false,
            message:
              "This password setup link has already been used",
          });
        }

        const expiresAt = new Date(
          setupToken.expires_at
        ).getTime();

        if (
          Number.isNaN(expiresAt) ||
          expiresAt < Date.now()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "This password setup link has expired",
          });
        }

        try {
          const hashedPassword =
            await bcrypt.hash(
              newPassword,
              10
            );

          const updatePasswordSql = `
            UPDATE users
            SET password = ?
            WHERE id = ?
              AND role = 'customer'
          `;

          db.query(
            updatePasswordSql,
            [
              hashedPassword,
              setupToken.user_id,
            ],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error(
                  "Customer password setup update error:",
                  updateErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Could not set customer password",
                });
              }

              if (
                updateResult.affectedRows === 0
              ) {
                return res.status(404).json({
                  success: false,
                  message:
                    "Customer account not found",
                });
              }

              db.query(
                `
                  UPDATE customer_password_setup_tokens
                  SET used_at = NOW()
                  WHERE id = ?
                    AND used_at IS NULL
                `,
                [setupToken.id],
                () => {
                  return res.json({
                    success: true,
                    message:
                      "Password created successfully. You can now login with your Customer Login ID.",
                  });
                }
              );
            }
          );
        } catch (error) {
          console.error(
            "Customer password hashing error:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Could not create customer password",
          });
        }
      }
    );
  }
);

// =====================================================
// ADMIN PROFILE
// =====================================================

router.get(
  "/admin-profile",
  sharedAuthenticateAdmin,
  (req, res) => {
    const sql = `
      SELECT id, name, email
      FROM users
      WHERE id = ?
        AND role = 'admin'
      LIMIT 1
    `;

    db.query(
      sql,
      [req.user.id],
      (err, results) => {
        if (err) {
          console.error(
            "Admin profile fetch error:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to load admin profile",
          });
        }

        if (!results.length) {
          return res.status(404).json({
            success: false,
            message:
              "Administrator account not found",
          });
        }

        return res.json({
          success: true,

          admin: {
            id: results[0].id,
            name: results[0].name,
            email: results[0].email,
            phone: "",
          },
        });
      }
    );
  }
);

// =====================================================
// ADMIN PROFILE UPDATE
// =====================================================

router.put(
  "/admin-profile",
  sharedAuthenticateAdmin,
  (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message:
          "Admin name and email are required",
      });
    }

    const newName = String(name).trim();

    const newEmail = String(email)
      .trim()
      .toLowerCase();

    if (!newName || !newEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Admin name and email are required",
      });
    }

    const duplicateSql = `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(?)
        AND id <> ?
      LIMIT 1
    `;

    db.query(
      duplicateSql,
      [newEmail, req.user.id],
      (
        duplicateErr,
        duplicateResults
      ) => {
        if (duplicateErr) {
          console.error(
            "Admin email duplicate check error:",
            duplicateErr
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to check admin email",
          });
        }

        if (duplicateResults.length) {
          return res.status(409).json({
            success: false,
            message:
              "This email is already being used",
          });
        }

        const updateSql = `
          UPDATE users
          SET name = ?, email = ?
          WHERE id = ?
            AND role = 'admin'
        `;

        db.query(
          updateSql,
          [
            newName,
            newEmail,
            req.user.id,
          ],
          (err, result) => {
            if (err) {
              console.error(
                "Admin profile update error:",
                err
              );

              if (
                err.code ===
                "ER_DUP_ENTRY"
              ) {
                return res.status(409).json({
                  success: false,
                  message:
                    "This email is already being used",
                });
              }

              return res.status(500).json({
                success: false,
                message:
                  "Failed to update admin profile",
              });
            }

            if (
              result.affectedRows === 0
            ) {
              return res.status(404).json({
                success: false,
                message:
                  "Administrator account not found",
              });
            }

            const newToken =
              jwt.sign(
                {
                  id: req.user.id,
                  email: newEmail,
                  role: "admin",
                },
                JWT_SECRET,
                {
                  expiresIn: "8h",
                }
              );

            return res.json({
              success: true,
              message:
                "Admin profile updated successfully",
              token: newToken,

              admin: {
                id: req.user.id,
                name: newName,
                email: newEmail,
                phone: "",
              },
            });
          }
        );
      }
    );
  }
);

// =====================================================
// ADMIN CHANGE PASSWORD
// =====================================================

router.put(
  "/admin-change-password",
  sharedAuthenticateAdmin,
  async (req, res) => {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 6 characters",
      });
    }

    const sql = `
      SELECT id, password
      FROM users
      WHERE id = ?
        AND role = 'admin'
      LIMIT 1
    `;

    db.query(
      sql,
      [req.user.id],
      async (err, results) => {
        if (err) {
          console.error(
            "Admin password lookup error:",
            err
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to change password",
          });
        }

        if (!results.length) {
          return res.status(404).json({
            success: false,
            message:
              "Administrator account not found",
          });
        }

        try {
          const admin = results[0];

          const passwordMatch =
            await bcrypt.compare(
              currentPassword,
              admin.password
            );

          if (!passwordMatch) {
            return res.status(401).json({
              success: false,
              message:
                "Current password is incorrect",
            });
          }

          const hashedPassword =
            await bcrypt.hash(
              newPassword,
              10
            );

          db.query(
            `
              UPDATE users
              SET password = ?
              WHERE id = ?
                AND role = 'admin'
            `,
            [
              hashedPassword,
              admin.id,
            ],
            (
              updateErr,
              updateResult
            ) => {
              if (updateErr) {
                console.error(
                  "Admin password update error:",
                  updateErr
                );

                return res.status(500).json({
                  success: false,
                  message:
                    "Failed to update password",
                });
              }

              if (
                updateResult.affectedRows ===
                0
              ) {
                return res.status(404).json({
                  success: false,
                  message:
                    "Administrator account not found",
                });
              }

              return res.json({
                success: true,
                message:
                  "Password changed successfully",
              });
            }
          );
        } catch (error) {
          console.error(
            "Admin password change error:",
            error
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to change password",
          });
        }
      }
    );
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;