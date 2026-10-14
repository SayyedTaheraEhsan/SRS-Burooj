
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "srs-burooj-secret-key";

const ALLOWED_STATUSES = ["Pending", "Published", "Hidden"];
const MAX_REVIEW_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;

/*
 * Create a separate table for public website guest reviews.
 * Existing customer_reviews records are not modified or deleted.
 */
db.query(
  `CREATE TABLE IF NOT EXISTS website_guest_reviews (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reviewer_name VARCHAR(100) NOT NULL,
    rating TINYINT NOT NULL,
    review_text VARCHAR(2000) NOT NULL,
    status ENUM('Pending', 'Published', 'Hidden')
      NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
  )`,
  (error) => {
    if (error) {
      console.error(
        "Could not create website_guest_reviews table:",
        error.message
      );
    } else {
      console.log("Website guest reviews table is ready.");
    }
  }
);

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error || !decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({
        message: "Invalid or expired authentication token.",
      });
    }

    req.user = decoded;
    next();
  });
}

function authenticateAdmin(req, res, next) {
  return authenticateToken(req, res, () => {
    if (String(req.user.role).toLowerCase() !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    next();
  });
}

function authenticateCustomer(req, res, next) {
  return authenticateToken(req, res, () => {
    if (String(req.user.role).toLowerCase() !== "customer") {
      return res.status(403).json({
        message: "Customer login is required.",
      });
    }

    next();
  });
}

function validateReview(body) {
  const rating = Number(body.rating);
  const reviewText = String(
    body.review_text ?? body.review ?? ""
  ).trim();

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return {
      error: "Rating must be between 1 and 5 stars.",
    };
  }

  if (!reviewText) {
    return {
      error: "Please enter your review.",
    };
  }

  if (reviewText.length > MAX_REVIEW_LENGTH) {
    return {
      error: `Review cannot exceed ${MAX_REVIEW_LENGTH} characters.`,
    };
  }

  return { rating, reviewText };
}

function findCustomerByUserId(userId, callback) {
  db.query(
    `SELECT
       cp.id AS customer_profile_id,
       cp.user_id,
       u.name AS customer_name,
       u.email AS customer_email
     FROM customer_profiles cp
     INNER JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = ?
     LIMIT 1`,
    [userId],
    (error, rows) => {
      if (error) return callback(error);
      callback(null, rows && rows[0] ? rows[0] : null);
    }
  );
}

function getOwnCustomer(req, res, callback) {
  findCustomerByUserId(req.user.id, (error, customer) => {
    if (error) {
      console.error("Customer lookup failed:", error.message);
      return res.status(500).json({
        message: "Could not load your customer profile.",
      });
    }

    if (!customer) {
      return res.status(404).json({
        message: "Registered customer profile was not found.",
      });
    }

    callback(customer);
  });
}

/* =========================================================
   REGISTERED CUSTOMER REVIEW ROUTES
   Existing customer-review URLs are preserved.
   ========================================================= */

/* Get reviews belonging to the authenticated customer. */
router.get(
  "/customer/:customerId",
  authenticateCustomer,
  (req, res) => {
    getOwnCustomer(req, res, (customer) => {
      const requestedId = String(req.params.customerId);

      if (
        requestedId !== String(customer.customer_profile_id) &&
        requestedId !== String(customer.user_id)
      ) {
        return res.status(403).json({
          message: "You can only view your own reviews.",
        });
      }

      db.query(
        `SELECT id, customer_id, rating, review_text,
                status, created_at, updated_at
         FROM customer_reviews
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [customer.customer_profile_id],
        (error, rows) => {
          if (error) {
            console.error("Customer reviews lookup:", error.message);
            return res.status(500).json({
              message: "Could not load customer reviews.",
            });
          }

          res.json({ success: true, reviews: rows || [] });
        }
      );
    });
  }
);

/* Submit a review as a registered customer. */
router.post("/", authenticateCustomer, (req, res) => {
  const validated = validateReview(req.body || {});

  if (validated.error) {
    return res.status(400).json({
      message: validated.error,
    });
  }

  getOwnCustomer(req, res, (customer) => {
    db.query(
      `INSERT INTO customer_reviews
         (customer_id, rating, review_text, status)
       VALUES (?, ?, ?, 'Pending')`,
      [
        customer.customer_profile_id,
        validated.rating,
        validated.reviewText,
      ],
      (error, result) => {
        if (error) {
          console.error("Customer review insert:", error.message);
          return res.status(500).json({
            message: "Could not submit your review.",
          });
        }

        res.status(201).json({
          success: true,
          message: "Review submitted and awaiting admin approval.",
          id: result.insertId,
          status: "Pending",
        });
      }
    );
  });
});

/* Edit an existing review owned by this customer. */
router.put("/:id", authenticateCustomer, (req, res) => {
  const validated = validateReview(req.body || {});

  if (validated.error) {
    return res.status(400).json({
      message: validated.error,
    });
  }

  getOwnCustomer(req, res, (customer) => {
    db.query(
      `UPDATE customer_reviews
       SET rating = ?, review_text = ?, status = 'Pending'
       WHERE id = ? AND customer_id = ?`,
      [
        validated.rating,
        validated.reviewText,
        req.params.id,
        customer.customer_profile_id,
      ],
      (error, result) => {
        if (error) {
          console.error("Customer review update:", error.message);
          return res.status(500).json({
            message: "Could not update your review.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Your review was not found.",
          });
        }

        res.json({
          success: true,
          message: "Review updated and sent for approval.",
        });
      }
    );
  });
});

/* Delete an existing review owned by this customer. */
router.delete("/:id", authenticateCustomer, (req, res) => {
  getOwnCustomer(req, res, (customer) => {
    db.query(
      `DELETE FROM customer_reviews
       WHERE id = ? AND customer_id = ?`,
      [req.params.id, customer.customer_profile_id],
      (error, result) => {
        if (error) {
          console.error("Customer review delete:", error.message);
          return res.status(500).json({
            message: "Could not delete your review.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Your review was not found.",
          });
        }

        res.json({ success: true, message: "Review deleted successfully." });
      }
    );
  });
});

/* =========================================================
   PUBLIC GUEST REVIEW ROUTES
   Guests do not need to log in to submit a review.
   New guest reviews always start as Pending.
   ========================================================= */

router.post("/guest", (req, res) => {
  const reviewerName = String(
    req.body?.reviewer_name ?? req.body?.name ?? ""
  ).trim();

  if (!reviewerName) {
    return res.status(400).json({
      message: "Please enter your name.",
    });
  }

  if (reviewerName.length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      message: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
    });
  }

  const validated = validateReview(req.body || {});

  if (validated.error) {
    return res.status(400).json({
      message: validated.error,
    });
  }

  db.query(
    `INSERT INTO website_guest_reviews
       (reviewer_name, rating, review_text, status)
     VALUES (?, ?, ?, 'Pending')`,
    [
      reviewerName,
      validated.rating,
      validated.reviewText,
    ],
    (error, result) => {
      if (error) {
        console.error("Guest review insert:", error.message);
        return res.status(500).json({
          message: "Could not submit your review.",
        });
      }

      res.status(201).json({
        success: true,
        message: "Thank you! Your review is awaiting approval.",
        id: result.insertId,
        status: "Pending",
      });
    }
  );
});

/* Public website: published guest reviews only. */
router.get("/guest/public", (req, res) => {
  db.query(
    `SELECT id, reviewer_name, rating, review_text,
            status, created_at, updated_at
     FROM website_guest_reviews
     WHERE status = 'Published'
     ORDER BY created_at DESC`,
    [],
    (error, rows) => {
      if (error) {
        console.error("Public guest reviews:", error.message);
        return res.status(500).json({
          message: "Could not load guest reviews.",
        });
      }

      res.json(rows || []);
    }
  );
});

/* =========================================================
   ADMIN REVIEW MANAGEMENT
   Guest and registered-customer data remain separate.
   ========================================================= */

/* Admin: list registered-customer reviews with login IDs. */
router.get("/admin/all", authenticateAdmin, (req, res) => {
  db.query(
    `SELECT
       cr.id,
       cr.customer_id,
       cr.rating,
       cr.review_text,
       cr.status,
       cr.created_at,
       cr.updated_at,
       u.name AS customer_name,
       u.email AS customer_email,
       CONCAT('SRS-CUST-', LPAD(u.id, 6, '0'))
         AS customer_login_id
     FROM customer_reviews cr
     LEFT JOIN customer_profiles cp
       ON cp.id = cr.customer_id
     LEFT JOIN users u
       ON u.id = cp.user_id
     ORDER BY cr.created_at DESC`,
    [],
    (error, rows) => {
      if (error) {
        console.error("Admin customer reviews:", error.message);
        return res.status(500).json({
          message: "Could not load customer reviews.",
        });
      }

      res.json({ success: true, reviews: rows || [] });
    }
  );
});

/* Admin: list website guest reviews. */
router.get(
  "/admin/guest/all",
  authenticateAdmin,
  (req, res) => {
    db.query(
      `SELECT id, reviewer_name, rating, review_text,
              status, created_at, updated_at
       FROM website_guest_reviews
       ORDER BY created_at DESC`,
      [],
      (error, rows) => {
        if (error) {
          console.error("Admin guest reviews:", error.message);
          return res.status(500).json({
            message: "Could not load guest reviews.",
          });
        }

        res.json({ success: true, reviews: rows || [] });
      }
    );
  }
);

function validateStatus(req, res, next) {
  const status = String(req.body?.status || "");

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "Status must be Pending, Published, or Hidden.",
    });
  }

  req.reviewStatus = status;
  next();
}

/* Admin: update registered-customer review status. */
router.put(
  "/admin/:id/status",
  authenticateAdmin,
  validateStatus,
  (req, res) => {
    db.query(
      `UPDATE customer_reviews SET status = ? WHERE id = ?`,
      [req.reviewStatus, req.params.id],
      (error, result) => {
        if (error) {
          console.error("Customer review status:", error.message);
          return res.status(500).json({
            message: "Could not update customer review status.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Customer review was not found.",
          });
        }

        res.json({
          success: true,
          message: "Customer review status updated.",
          status: req.reviewStatus,
        });
      }
    );
  }
);

/* Admin: update guest review status. */
router.put(
  "/admin/guest/:id/status",
  authenticateAdmin,
  validateStatus,
  (req, res) => {
    db.query(
      `UPDATE website_guest_reviews SET status = ? WHERE id = ?`,
      [req.reviewStatus, req.params.id],
      (error, result) => {
        if (error) {
          console.error("Guest review status:", error.message);
          return res.status(500).json({
            message: "Could not update guest review status.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Guest review was not found.",
          });
        }

        res.json({
          success: true,
          message: "Guest review status updated.",
          status: req.reviewStatus,
        });
      }
    );
  }
);

/* Admin: delete a registered-customer review. */
router.delete(
  "/admin/:id",
  authenticateAdmin,
  (req, res) => {
    db.query(
      `DELETE FROM customer_reviews WHERE id = ?`,
      [req.params.id],
      (error, result) => {
        if (error) {
          console.error("Admin customer review delete:", error.message);
          return res.status(500).json({
            message: "Could not delete customer review.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Customer review was not found.",
          });
        }

        res.json({ success: true, message: "Customer review deleted." });
      }
    );
  }
);

/* Admin: delete a guest review. */
router.delete(
  "/admin/guest/:id",
  authenticateAdmin,
  (req, res) => {
    db.query(
      `DELETE FROM website_guest_reviews WHERE id = ?`,
      [req.params.id],
      (error, result) => {
        if (error) {
          console.error("Admin guest review delete:", error.message);
          return res.status(500).json({
            message: "Could not delete guest review.",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: "Guest review was not found.",
          });
        }

        res.json({ success: true, message: "Guest review deleted." });
      }
    );
  }
);

/* Public website: all published reviews (guest + registered customer). */
router.get("/public", (req, res) => {
  const sql = `
    SELECT
      cr.id,
      cr.rating,
      cr.review_text,
      cr.status,
      cr.created_at,
      u.name AS customer_name,
      CONCAT('SRS-CUST-', LPAD(u.id, 6, '0')) AS customer_login_id,
      'customer' AS review_type
    FROM customer_reviews cr
    LEFT JOIN customer_profiles cp ON cp.id = cr.customer_id
    LEFT JOIN users u ON u.id = cp.user_id
    WHERE cr.status = 'Published'

    UNION ALL

    SELECT
      gr.id,
      gr.rating,
      gr.review_text,
      gr.status,
      gr.created_at,
      gr.reviewer_name AS customer_name,
      NULL AS customer_login_id,
      'guest' AS review_type
    FROM website_guest_reviews gr
    WHERE gr.status = 'Published'

    ORDER BY created_at DESC
  `;

  db.query(sql, [], (error, rows) => {
    if (error) {
      console.error("Public reviews:", error.message);
      return res.status(500).json({
        success: false,
        message: "Could not load published reviews.",
      });
    }

    res.json({ success: true, reviews: rows || [] });
  });
});

module.exports = router;