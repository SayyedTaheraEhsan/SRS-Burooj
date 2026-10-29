const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./db");

const projectRoutes = require("./routes/projectRoutes");
const customerReviewRoutes = require("./routes/customerReviewRoutes");
const authRoutes = require("./routes/authRoutes");
const { startNotificationScheduler } = require("./notificationScheduler");
const unitRoutes = require("./routes/unitRoutes");
const constructionRoutes = require("./routes/constructionRoutes");
const constructionProgressRoutes = require("./routes/constructionProgressRoutes");
const customerRoutes = require("./routes/customerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const customerDocumentRoutes = require("./routes/customerDocumentRoutes");
const updateRoutes = require("./routes/updateRoutes");

const advertisementRoutes = require("./routes/advertisementRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");

const customerPaymentRoutes = require("./routes/customerPaymentRoutes");
const customerPaymentHistoryRoutes = require("./routes/customerPaymentHistoryRoutes");
const customerInstallmentRoutes = require("./routes/customerInstallmentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");


const projectMediaRoutes = require("./routes/projectMediaRoutes");
const unitMediaRoutes = require("./routes/unitMediaRoutes");
const websiteMediaRoutes = require("./routes/websiteMediaRoutes");
const websiteSettingsRoutes = require("./routes/websiteSettingsRoutes");

const PORT = process.env.PORT || 5000;

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

// ======================================================
// UPLOADS
// ======================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);
// ======================================================
// API ROUTES
// ======================================================

app.use("/api/projects", projectRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/units", unitRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/customer-reviews", customerReviewRoutes);

app.use("/api/customer-documents", customerDocumentRoutes);

app.use("/api/notifications", updateRoutes);

app.use("/api/notification-system", notificationRoutes);

app.use("/api/advertisements", advertisementRoutes);

app.use("/api/inquiries", inquiryRoutes);

app.use("/api/construction", constructionRoutes);

app.use("/api/construction-progress", constructionProgressRoutes);

app.use("/api/unit-media", unitMediaRoutes);

app.use("/api/project-media", projectMediaRoutes);
app.use("/api/website-media", websiteMediaRoutes);
app.use("/api/website-settings", websiteSettingsRoutes);

// ======================================================
// CUSTOMER PAYMENTS
// ======================================================

app.use("/api/customer-payments", customerPaymentRoutes);

app.use(
  "/api/customer-payment-history",
  customerPaymentHistoryRoutes
);

app.use(
  "/api/customer-installments",
  customerInstallmentRoutes
);

// ======================================================
// MAIN PAYMENTS
// ======================================================

app.use("/api/payments", paymentRoutes);

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SRS Burooj Server is running successfully",
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(
    `SRS Burooj Server running on http://localhost:${PORT}`
  );
});

startNotificationScheduler();
