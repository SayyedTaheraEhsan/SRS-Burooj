import { useEffect, useState } from "react";

import AdminProjects from "./AdminProjects";
import AdminUnits from "./AdminUnits";
import AdminCustomers from "./AdminCustomers";
import AdminInquiries from "./AdminInquiries";
import AdminAdvertisements from "./AdminAdvertisements";
import AdminPayments from "./AdminPayments";
import AdminConstructionProgress from "./AdminConstructionProgress";
import AdminDocuments from "./AdminDocuments";
import AdminProfile from "./AdminProfile";
import AdminNotifications from "./AdminNotifications";
import AdminReports from "./AdminReports";
import AdminWebsiteSettings from "./AdminWebsiteSettings";
import AdminReviews from "./AdminReviews";

/* =========================================================
   SRS BUROOJ - API
   ========================================================= */

const API_BASE = "http://localhost:5000/api";

async function getApiData(endpoint) {
  const token =
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    "";

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  const result = await response.json();

  return result;
}

/* =========================================================
   FIND ARRAY INSIDE DIFFERENT API RESPONSE SHAPES
   ========================================================= */

function extractArray(result) {
  if (Array.isArray(result)) {
    return result;
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const possibleKeys = [
    "data",
    "items",
    "rows",
    "results",
    "projects",
    "units",
    "customers",
    "payments",
    "customerPayments",
    "records",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(result[key])) {
      return result[key];
    }
  }

  return [];
}

/* =========================================================
   PAYMENT AMOUNT HELPER
   ========================================================= */

function getPaymentAmount(payment) {
  if (!payment || typeof payment !== "object") {
    return 0;
  }

  const possibleValues = [
    payment.amount,
    payment.payment_amount,
    payment.paymentAmount,
    payment.paid_amount,
    payment.paidAmount,
    payment.installment_amount,
    payment.installmentAmount,
    payment.received_amount,
    payment.receivedAmount,
    payment.total_amount,
    payment.totalAmount,
    payment.value,
  ];

  for (const value of possibleValues) {
    const number = Number(
      String(value ?? "").replace(/,/g, "")
    );

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}

/* =========================================================
   CURRENCY
   ========================================================= */

function formatCurrency(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}

/* =========================================================
   ICONS
   ========================================================= */

function MenuIcon({ type }) {
  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    projects: (
      <>
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M3 21h18" />
        <path d="M8 21v-7h8v7" />
        <path d="M8 9h8" />
      </>
    ),

    units: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M8 7h3M13 7h3M8 11h3M13 11h3M8 15h3M13 15h3" />
        <path d="M10 21v-3h4v3" />
      </>
    ),

    customers: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
      </>
    ),

    payments: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),

    construction: (
      <>
        <path d="M3 21h18" />
        <path d="M5 21V10l7-5 7 5v11" />
        <path d="M8 21v-7h8v7" />
        <path d="M12 5V2" />
        <path d="M9 2h6" />
      </>
    ),

    documents: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h4" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),

    advertisements: (
      <>
        <path d="M4 9v6h4l8 4V5L8 9H4z" />
        <path d="M8 15l2 5" />
        <path d="M20 9c1 1.2 1 4.8 0 6" />
      </>
    ),

    inquiries: (
      <>
        <path d="M4 5h16v12H8l-4 4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),

    notifications: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    reports: (
      <>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </>
    ),

    websiteSettings: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 9h16" />
        <path d="M8 5v4" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),

    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 2-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7v.2h-2.8v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-2-2 .1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 6.5 14h-.2v-2.8h.2A1.8 1.8 0 0 0 8.2 10a1.8 1.8 0 0 0-.4-2l-.1-.1 2-2 .1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 13 4.1v-.2h2.8v.2a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 2 2-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.2v2.8h-.2a1.8 1.8 0 0 0-1.7 1.7z" />
      </>
    ),

    status: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l2.5 2.5L16 9" />
      </>
    ),

    activity: (
      <>
        <path d="M3 12h4l2-7 5 14 2-7h5" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M13 4h5v16h-5" />
      </>
    ),

    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),

    company: (
      <>
        <path d="M4 21V5l8-3 8 3v16" />
        <path d="M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4" />
      </>
    ),

    security: (
      <>
        <path d="M12 3l8 3v6c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      className="menu-svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[type] || icons.dashboard}
    </svg>
  );
}

/* =========================================================
   DASHBOARD HOME
   ========================================================= */

function DashboardHome({
  setActiveSection,
  dashboardData,
}) {
  const managementCards = [
    {
      id: "projects",
      title: "Projects",
      description: "Manage real estate projects",
    },
    {
      id: "units",
      title: "Units",
      description: "Manage flats, shops and units",
    },
    {
      id: "customers",
      title: "Customers",
      description: "Manage customer records",
    },
    {
      id: "payments",
      title: "Payments",
      description: "Track customer payments",
    },
    {
      id: "construction",
      title: "Construction",
      description: "Track project progress",
    },
    {
      id: "documents",
      title: "Documents",
      description: "Manage customer documents",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Send customer notifications",
    },
    {
      id: "advertisements",
      title: "Advertisements",
      description: "Manage project advertisements",
    },
    {
      id: "inquiries",
      title: "Inquiries",
      description: "Review customer inquiries",
    },
  ];

  const statCards = [
    {
      id: "projects",
      title: "Projects",
      value: dashboardData.loading
        ? "Loading..."
        : dashboardData.projects,
    },
    {
      id: "units",
      title: "Units",
      value: dashboardData.loading
        ? "Loading..."
        : dashboardData.units,
    },
    {
      id: "customers",
      title: "Customers",
      value: dashboardData.loading
        ? "Loading..."
        : dashboardData.customers,
    },
    {
      id: "payments",
      title: "Payments",
      value: dashboardData.loading
        ? "Loading..."
        : formatCurrency(dashboardData.paymentAmount),
      subValue: dashboardData.loading
        ? ""
        : `${dashboardData.payments} payment record${
            dashboardData.payments === 1 ? "" : "s"
          }`,
    },
  ];

  return (
    <div className="dashboard-home">

      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome to SRS Burooj Real Estate Management System
          </p>
        </div>

        <button
          type="button"
          className="refresh-dashboard-button"
          onClick={() =>
            window.dispatchEvent(
              new Event("srs-refresh-dashboard")
            )
          }
        >
          ↻ Refresh
        </button>
      </div>

      {dashboardData.warning && (
        <div className="dashboard-warning" role="status">
          <div className="dashboard-warning-icon">
            <MenuIcon type="notifications" />
          </div>

          <div>
            <strong>Dashboard data notice</strong>
            <p>{dashboardData.warning}</p>
          </div>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((stat) => (
          <button
            type="button"
            className="stat-card"
            key={stat.id}
            onClick={() =>
              setActiveSection(stat.id)
            }
          >
            <div className="stat-icon">
              <MenuIcon type={stat.id} />
            </div>

            <div className="stat-content">
              <span>{stat.title}</span>

              <strong>{stat.value}</strong>

              {stat.subValue && (
                <small>{stat.subValue}</small>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="section-title">
        <h2>Management</h2>
        <p>
          Quick access to all major modules
        </p>
      </div>

      <div className="management-grid">
        {managementCards.map((card) => (
          <button
            type="button"
            className="management-card"
            key={card.id}
            onClick={() =>
              setActiveSection(card.id)
            }
          >
            <div className="management-icon">
              <MenuIcon type={card.id} />
            </div>

            <div className="management-content">
              <h3>{card.title}</h3>

              <p>{card.description}</p>

              <span className="management-link">
                Manage {card.title} →
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="welcome-panel">
        <div className="welcome-icon">
          <MenuIcon type="dashboard" />
        </div>

        <div>
          <h2>
            SRS Burooj Management Portal
          </h2>

          <p>
            Use the sidebar or management cards
            to manage projects, units, customers,
            payments, construction progress,
            documents, advertisements and
            inquiries.
          </p>
        </div>
      </div>

    </div>
  );
}

/* =========================================================
   SETTINGS PAGE
   ========================================================= */

function SettingsPage({
  setActiveSection,
}) {
  const settingItems = [
    {
      id: "profile",
      icon: "profile",
      title: "Administrator Profile",
      description:
        "Manage administrator account information.",
    },
    {
      id: "company",
      icon: "company",
      title: "Company Information",
      description:
        "SRS Burooj company information and contact details.",
    },
    {
      id: "security",
      icon: "security",
      title: "Security",
      description:
        "Account security and login preferences.",
    },
    {
      id: "payments",
      icon: "payments",
      title: "Payment Settings",
      description:
        "Payment records, installments and payment documents.",
    },
    {
      id: "documents",
      icon: "documents",
      title: "Document Settings",
      description:
        "Customer documents and purchase document management.",
    },
    {
      id: "notifications",
      icon: "notifications",
      title: "Notification Settings",
      description:
        "Customer notification and communication management.",
    },
    {
      id: "status",
      icon: "status",
      title: "System Status",
      description:
        "View SRS Burooj portal service status.",
    },
  ];

  return (
    <div className="settings-page">

      <div className="settings-page-heading">
        <div>
          <h1>Settings</h1>

          <p>
            Manage SRS Burooj administrator,
            company, payment, document and
            system preferences.
          </p>
        </div>

        <div className="settings-heading-icon">
          <MenuIcon type="settings" />
        </div>
      </div>

      <div className="settings-grid">
        {settingItems.map((item) => (
          <button
            type="button"
            className="setting-item"
            key={item.id}
            onClick={() =>
              setActiveSection(item.id)
            }
          >
            <div className="setting-icon">
              <MenuIcon type={item.icon} />
            </div>

            <div className="setting-text">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>

            <span className="setting-arrow">
              →
            </span>
          </button>
        ))}
      </div>

      <div className="settings-info-panel">
        <div className="settings-info-icon">
          <MenuIcon type="company" />
        </div>

        <div>
          <h2>SRS Burooj</h2>

          <p>
            Real Estate Management System
          </p>

          <span>
            Administrator control panel
          </span>
        </div>
      </div>

    </div>
  );
}

/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function SystemStatusPage() {
  return (
    <div className="status-page">

      <div className="status-page-heading">
        <div>
          <h1>System Status</h1>

          <p>
            Current SRS Burooj portal status.
          </p>
        </div>

        <div className="status-main-icon">
          <MenuIcon type="status" />
        </div>
      </div>

      <div className="status-grid">

        <div className="status-service-card">
          <div className="status-service-icon">
            <MenuIcon type="status" />
          </div>

          <div>
            <h3>Admin Portal</h3>
            <p>Admin interface is running.</p>
          </div>

          <span className="status-badge">
            Online
          </span>
        </div>

        <div className="status-service-card">
          <div className="status-service-icon">
            <MenuIcon type="database" />
          </div>

          <div>
            <h3>Database</h3>
            <p>
              Database connection is configured for the admin portal.
            </p>
          </div>

          <span className="status-badge">
            Configured
          </span>
        </div>

        <div className="status-service-card">
          <div className="status-service-icon">
            <MenuIcon type="status" />
          </div>

          <div>
            <h3>Backend Server</h3>
            <p>
              SRS Burooj API server.
            </p>
          </div>

          <span className="status-badge">
            Online
          </span>
        </div>

      </div>

      <div className="status-note">
        <strong>SRS Burooj System</strong>

        <span>
          Live service health can be verified
          from the backend server logs.
        </span>
      </div>

    </div>
  );
}

/* =========================================================
   MAIN ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard() {
  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [dashboardData, setDashboardData] =
    useState({
      projects: 0,
      units: 0,
      customers: 0,
      payments: 0,
      paymentAmount: 0,
      loading: true,
      warning: "",
    });

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
    },
    {
      id: "projects",
      label: "Projects",
    },
    {
      id: "units",
      label: "Units",
    },
    {
      id: "customers",
      label: "Customers",
    },
    {
      id: "payments",
      label: "Payments",
    },
    {
      id: "advertisements",
      label: "Advertisements",
    },
    {
      id: "inquiries",
      label: "Inquiries",
    },
    {
      id: "construction",
      label: "Construction Progress",
    },
    {
      id: "documents",
      label: "Documents",
    },
    {
      id: "notifications",
      label: "Notifications",
    },
    {
      id: "reports",
      label: "Reports",
    },
    {
      id: "customer-reviews",
      label: "Customer Reviews",
    },
    {
      id: "website-settings",
      label: "Website Settings",
    },
  ];

  /* =======================================================
     LOAD DASHBOARD DATA
     ======================================================= */

  const loadDashboardData = async () => {
    setDashboardData((previous) => ({
      ...previous,
      loading: true,
    }));

    try {
      const results = await Promise.allSettled([
        getApiData("/projects"),
        getApiData("/units"),
        getApiData("/customers"),
        getApiData("/payments"),
      ]);

      const projectsResult = results[0];
      const unitsResult = results[1];
      const customersResult = results[2];
      const paymentsResult = results[3];

      const projects =
        projectsResult.status === "fulfilled"
          ? extractArray(projectsResult.value)
          : [];

      const units =
        unitsResult.status === "fulfilled"
          ? extractArray(unitsResult.value)
          : [];

      const customers =
        customersResult.status === "fulfilled"
          ? extractArray(customersResult.value)
          : [];

      const payments =
        paymentsResult.status === "fulfilled"
          ? extractArray(paymentsResult.value)
          : [];

      const failedSources = [];

      if (projectsResult.status === "rejected") {
        failedSources.push("projects");
      }

      if (unitsResult.status === "rejected") {
        failedSources.push("units");
      }

      if (customersResult.status === "rejected") {
        failedSources.push("customers");
      }

      if (paymentsResult.status === "rejected") {
        failedSources.push("payments");
      }

      const paymentAmount = payments.reduce(
        (total, payment) =>
          total + getPaymentAmount(payment),
        0
      );

      const warning = failedSources.length
        ? "Some dashboard information could not be loaded. Please refresh the dashboard or check the backend connection."
        : "";

      setDashboardData({
        projects: projects.length,
        units: units.length,
        customers: customers.length,
        payments: payments.length,
        paymentAmount,
        loading: false,
        warning,
      });

      console.log(
        "SRS Burooj Dashboard Data:",
        {
          projects: projects.length,
          units: units.length,
          customers: customers.length,
          payments: payments.length,
          paymentAmount,
        }
      );

    } catch (error) {
      console.error(
        "Dashboard data loading error:",
        error
      );

      setDashboardData({
        projects: 0,
        units: 0,
        customers: 0,
        payments: 0,
        paymentAmount: 0,
        loading: false,
        warning:
          "Dashboard information is temporarily unavailable. Please refresh the dashboard or check the backend connection.",
      });
    }
  };

  useEffect(() => {
    loadDashboardData();

    const refreshHandler = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "srs-refresh-dashboard",
      refreshHandler
    );

    return () => {
      window.removeEventListener(
        "srs-refresh-dashboard",
        refreshHandler
      );
    };
  }, []);

  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  /* =======================================================
     RENDER SECTION
     ======================================================= */

  const renderSection = () => {
    switch (activeSection) {

      case "projects":
        return <AdminProjects />;

      case "units":
        return <AdminUnits />;

      case "customers":
        return <AdminCustomers />;

      case "advertisements":
        return <AdminAdvertisements />;

      case "inquiries":
        return <AdminInquiries />;

      case "payments":
        return <AdminPayments />;

      case "construction":
        return <AdminConstructionProgress />;

      case "documents":
        return <AdminDocuments />;

      case "notifications":
        return <AdminNotifications />;

      case "reports":
        return <AdminReports />;

      case "customer-reviews":
        return <AdminReviews />;

      case "website-settings":
        return <AdminWebsiteSettings />;

      case "profile":
        return <AdminProfile />;

      case "settings":
        return (
          <SettingsPage
            setActiveSection={
              setActiveSection
            }
          />
        );

      case "company":
        return (
          <div className="special-page">
            <div className="special-icon">
              <MenuIcon type="company" />
            </div>

            <h2>
              Company Information
            </h2>

            <p>
              SRS Burooj company information
              can be managed from the profile
              and company modules.
            </p>

            <button
              type="button"
              className="special-action-button"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              Open Profile
            </button>
          </div>
        );

      case "security":
        return (
          <div className="special-page">
            <div className="special-icon">
              <MenuIcon type="security" />
            </div>

            <h2>Security</h2>

            <p>
              Administrator security and
              login preferences.
            </p>

            <button
              type="button"
              className="special-action-button"
              onClick={() =>
                setActiveSection("profile")
              }
            >
              Open Profile
            </button>
          </div>
        );

      case "status":
        return <SystemStatusPage />;

      default:
        return (
          <DashboardHome
            setActiveSection={
              setActiveSection
            }
            dashboardData={
              dashboardData
            }
          />
        );
    }
  };

  const currentLabel =
    activeSection === "profile"
      ? "Profile"
      : activeSection === "settings"
      ? "Settings"
      : activeSection === "company"
      ? "Company Information"
      : activeSection === "security"
      ? "Security"
      : activeSection === "status"
      ? "System Status"
      : activeSection === "website-settings"
      ? "Website Settings"
      : menuItems.find(
          (item) =>
            item.id === activeSection
        )?.label || "Dashboard";

  return (
    <>
      <div className="admin-layout">

        {/* =================================================
            SIDEBAR
            ================================================= */}

        <aside
  className={`admin-sidebar ${
    mobileMenuOpen ? "mobile-menu-open" : ""
  }`}
>

          <div className="logo-area">

            <div className="logo-frame">

              <img
                className="logo-image"
                src="/srs-burooj-logo.png"
                alt="SRS Burooj"
                onError={(event) => {
                  event.currentTarget.style.display = "none";

                  const fallback =
                    event.currentTarget.parentElement?.querySelector(
                      ".fallback-logo"
                    );

                  if (fallback) {
                    fallback.style.display = "flex";
                  }
                }}
              />

              <div className="fallback-logo">
                <strong>SRS</strong>
                <span>BUROOJ</span>
              </div>

            </div>

          </div>

          <div className="sidebar-divider"></div>

          <nav className="sidebar-menu">

            {menuItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`menu-item ${
                  activeSection === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
  setActiveSection(item.id);
  setMobileMenuOpen(false);
}}
                title={item.label}
                aria-label={item.label}
              >
                <span className="menu-icon">
                  <MenuIcon
                    type={
                      item.id ===
                      "website-settings"
                        ? "websiteSettings"
                        : item.id
                    }
                  />
                </span>

                <span className="menu-label">
                  {item.label}
                </span>
              </button>
            ))}

          </nav>

          {/* BOTTOM MENU */}

          <div className="sidebar-bottom">

            <button
              type="button"
              className={`menu-item ${
                activeSection === "profile"
                  ? "active"
                  : ""
              }`}
              onClick={() => {
  setActiveSection("profile");
  setMobileMenuOpen(false);
}}
            >
              <span className="menu-icon">
                <MenuIcon type="profile" />
              </span>

              <span className="menu-label">
                Profile
              </span>
            </button>

            <button
              type="button"
              className={`menu-item ${
                activeSection === "settings"
                  ? "active"
                  : ""
              }`}
             onClick={() => {
  setActiveSection("settings");
  setMobileMenuOpen(false);
}}
            >
              <span className="menu-icon">
                <MenuIcon type="settings" />
              </span>

              <span className="menu-label">
                Settings
              </span>
            </button>

            <button
              type="button"
              className={`menu-item ${
                activeSection === "status"
                  ? "active"
                  : ""
              }`}
             onClick={() => {
  setActiveSection("status");
  setMobileMenuOpen(false);
}}
            >
              <span className="menu-icon">
                <MenuIcon type="status" />
              </span>

              <span className="menu-label">
                System Status
              </span>
            </button>

            <div className="sidebar-user">

              <div className="user-avatar">
                <MenuIcon type="profile" />
              </div>

              <div className="user-details">
                <strong>
                  Administrator
                </strong>

                <span>
                  System Admin
                </span>
              </div>

            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              <MenuIcon type="logout" />

              <span>
                Logout
              </span>
            </button>

          </div>

        </aside>

        {/* =================================================
            MAIN
            ================================================= */}

        <main className="admin-main">

          <header className="top-header">

            <div className="header-left">
              <button
  type="button"
  className="mobile-menu-button"
  onClick={() => setMobileMenuOpen((previous) => !previous)}
  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
  aria-expanded={mobileMenuOpen}
>
  <MenuIcon type="menu" />
</button>

              <div className="mobile-brand">
                <span className="mobile-brand-main">
                  SRS
                </span>

                <span className="mobile-brand-sub">
                  BUROOJ
                </span>
              </div>

              <div className="breadcrumb">
                <span>Admin</span>

                <span className="breadcrumb-arrow">
                  ›
                </span>

                <strong>
                  {currentLabel}
                </strong>
              </div>

            </div>

            <div className="header-right">

              <button
                type="button"
                className="header-icon-button"
                title="Notifications"
                onClick={() =>
                  setActiveSection(
                    "notifications"
                  )
                }
              >
                <MenuIcon
                  type="notifications"
                />
              </button>

              <button
                type="button"
                className="header-profile"
                onClick={() =>
                  setActiveSection(
                    "profile"
                  )
                }
              >
                <div className="header-avatar">
                  <MenuIcon
                    type="profile"
                  />
                </div>

                <div className="header-profile-text">
                  <strong>
                    Administrator
                  </strong>

                  <span>
                    System Admin
                  </span>
                </div>
              </button>

            </div>

          </header>

          <div className="content-area">
            {renderSection()}
          </div>

        </main>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;

          background: #f3f7fc;
          color: #1e293b;
        }

        button {
          font-family: inherit;
        }

        .admin-layout {
          min-height: 100vh;
          display: flex;
          background: #f3f7fc;
        }

        .admin-sidebar {
          width: 260px;
          min-width: 260px;
          min-height: 100vh;
        

          background:
            linear-gradient(
              180deg,
              #071a35 0%,
              #0b2850 48%,
              #06162d 100%
            );

          color: #ffffff;

          display: flex;
          flex-direction: column;

          position: sticky;
          top: 0;

          height: 100vh;

          overflow-y: auto;

          border-right:
            1px solid
            rgba(83, 159, 255, 0.2);

          box-shadow:
            5px 0 25px
            rgba(8, 32, 65, 0.12);
        }

        .logo-area {
          min-height: 105px;
          padding: 18px 20px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-frame {
          width: 190px;
          height: 72px;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;
          position: relative;
        }

        .logo-image {
          display: block;

          max-width: 100%;
          max-height: 100%;

          width: auto;
          height: auto;

          object-fit: contain;
        }

        .fallback-logo {
          display: none;

          flex-direction: column;
          align-items: center;
          justify-content: center;

          line-height: 1;
        }

        .fallback-logo strong {
          color: #ffffff;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .fallback-logo span {
          margin-top: 5px;

          color: #6db6ff;

          font-size: 9px;
          font-weight: 700;
          letter-spacing: 3px;
        }

        .sidebar-divider {
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(86, 170, 255, 0.6),
              transparent
            );

          margin: 0 18px 16px;
        }

        .sidebar-menu {
          padding: 0 13px;

          display: flex;
          flex-direction: column;

          gap: 5px;
        }

        .menu-item {
          width: 100%;
          min-height: 46px;

          padding: 10px 13px;

          border: 0;
          border-radius: 9px;

          background: transparent;

          color: #b9c9dc;

          display: flex;
          align-items: center;

          gap: 13px;

          cursor: pointer;

          text-align: left;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .menu-item:hover {
          background:
            rgba(74, 144, 226, 0.14);

          color: #ffffff;
        }

        .menu-item.active {
          background:
            linear-gradient(
              90deg,
              rgba(55, 145, 240, 0.28),
              rgba(55, 145, 240, 0.09)
            );

          color: #ffffff;

          box-shadow:
            inset 3px 0 0 #4ea1ff,
            0 5px 18px
            rgba(0, 0, 0, 0.13);
        }

        .menu-icon {
          width: 24px;
          height: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;
        }

        .menu-svg-icon {
          width: 20px;
          height: 20px;

          display: block;
          flex-shrink: 0;
        }

        .menu-label {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.2;
          white-space: nowrap;
        }

        .sidebar-bottom {
          margin-top: auto;

          padding: 12px 13px 16px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .sidebar-user {
          margin: 10px 4px;

          padding: 12px 9px;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.055);

          display: flex;
          align-items: center;

          gap: 10px;
        }

        .user-avatar,
        .header-avatar {
          width: 38px;
          height: 38px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            rgba(78, 161, 255, 0.15);

          color: #69b0ff;

          flex-shrink: 0;
        }

        .user-details {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .user-details strong {
          color: #ffffff;

          font-size: 12px;
          font-weight: 600;
        }

        .user-details span {
          color: #8da4c0;
          font-size: 11px;
        }

        .logout-button {
          width: 100%;
          min-height: 44px;

          margin-top: 3px;

          padding: 10px 13px;

          border: 0;
          border-radius: 9px;

          background: transparent;

          color: #aebed2;

          display: flex;
          align-items: center;

          gap: 13px;

          cursor: pointer;

          text-align: left;
        }

        .logout-button:hover {
          background:
            rgba(239, 68, 68, 0.12);

          color: #ff8c8c;
        }

        .admin-main {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;
        }
          .mobile-menu-button {
  display: none;
}

        .top-header {
          min-height: 76px;

          padding: 0 28px;

          background: #ffffff;

          border-bottom:
            1px solid #e3eaf2;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          position: sticky;
          top: 0;

          z-index: 20;
        }

        .header-left,
        .header-right {
          display: flex;
          align-items: center;
        }

        .header-left {
          min-width: 0;
        }

        .breadcrumb {
          display: flex;
          align-items: center;

          gap: 9px;

          color: #8b9aad;

          font-size: 13px;
        }

        .breadcrumb strong {
          color: #24364d;
          font-weight: 600;
        }

        .breadcrumb-arrow {
          color: #aab6c5;

          font-size: 18px;
          line-height: 1;
        }

        .mobile-brand {
          display: none;
        }

        .header-right {
          gap: 14px;
        }

        .header-icon-button {
          width: 40px;
          height: 40px;

          border:
            1px solid #e2e9f1;

          background: #ffffff;

          color: #61758c;

          border-radius: 9px;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;
        }

        .header-icon-button:hover {
          color: #1671c9;

          border-color:
            rgba(45, 135, 218, 0.4);

          background: #f2f8ff;
        }

        .header-profile {
          border: 0;

          background: transparent;

          padding: 3px;

          display: flex;
          align-items: center;

          gap: 9px;

          cursor: pointer;

          text-align: left;
        }

        .header-avatar {
          width: 40px;
          height: 40px;

          border:
            1px solid
            rgba(54, 143, 224, 0.25);

          background: #edf7ff;
        }

        .header-profile-text {
          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .header-profile-text strong {
          font-size: 12px;
          color: #27384d;
        }

        .header-profile-text span {
          font-size: 10px;
          color: #8b9aad;
        }

        .content-area {
          flex: 1;
          padding: 30px;
        }

        .dashboard-home {
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          margin-bottom: 25px;
        }

        .page-heading h1,
        .settings-page-heading h1,
        .status-page-heading h1 {
          margin: 0;

          color: #172a40;

          font-size: 29px;

          line-height: 1.15;

          font-weight: 700;

          letter-spacing: -0.5px;
        }

        .page-heading p,
        .settings-page-heading p,
        .status-page-heading p {
          margin: 8px 0 0;

          color: #7c8da1;

          font-size: 14px;
        }

        .refresh-dashboard-button {
          border: 1px solid #d8e5f1;

          background: #ffffff;

          color: #116fbe;

          border-radius: 9px;

          padding: 10px 15px;

          font-size: 12px;

          font-weight: 650;

          cursor: pointer;
        }

        .refresh-dashboard-button:hover {
          background: #eef7ff;
        }

        .dashboard-warning {
          margin: -8px 0 22px;

          padding: 13px 15px;

          border: 1px solid #f0d99b;

          border-radius: 11px;

          background: #fffaf0;

          color: #6b4e12;

          display: flex;

          align-items: flex-start;

          gap: 11px;
        }

        .dashboard-warning-icon {
          width: 34px;
          height: 34px;

          min-width: 34px;

          border-radius: 9px;

          background: #fff0c7;

          color: #9a6a00;

          display: flex;

          align-items: center;

          justify-content: center;
        }

        .dashboard-warning-icon .menu-svg-icon {
          width: 18px;
          height: 18px;
        }

        .dashboard-warning strong {
          display: block;

          margin-bottom: 3px;

          font-size: 12px;

          font-weight: 700;
        }

        .dashboard-warning p {
          margin: 0;

          color: #80652a;

          font-size: 11px;

          line-height: 1.5;
        }

        .stats-grid {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 17px;

          margin-bottom: 34px;
        }

        .stat-card {
          min-height: 118px;

          padding: 20px;

          background: #ffffff;

          border:
            1px solid #e1e9f2;

          border-radius: 13px;

          display: flex;
          align-items: center;

          gap: 16px;

          box-shadow:
            0 4px 18px
            rgba(30, 73, 112, 0.045);

          cursor: pointer;

          text-align: left;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);

          border-color:
            rgba(45, 135, 218, 0.35);
        }

        .stat-icon {
          width: 52px;
          height: 52px;

          flex-shrink: 0;

          border-radius: 12px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #edf7ff;

          color: #1675c9;
        }

        .stat-icon .menu-svg-icon {
          width: 25px;
          height: 25px;
        }

        .stat-content {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 5px;
        }

        .stat-content span {
          color: #8292a5;

          font-size: 12px;

          font-weight: 500;
        }

        .stat-content strong {
          color: #1d3047;

          font-size: 22px;

          font-weight: 700;

          white-space: nowrap;
        }

        .stat-content small {
          color: #1671c1;

          font-size: 10px;

          font-weight: 600;
        }

        .section-title {
          margin-bottom: 16px;
        }

        .section-title h2 {
          margin: 0;

          color: #20334a;

          font-size: 19px;

          font-weight: 700;
        }

        .section-title p {
          margin: 5px 0 0;

          color: #8797aa;

          font-size: 12px;
        }

        .management-grid {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 17px;
        }

        .management-card {
          min-height: 170px;

          padding: 20px;

          border:
            1px solid #e1e9f2;

          border-radius: 13px;

          background: #ffffff;

          text-align: left;

          cursor: pointer;

          display: flex;
          align-items: flex-start;

          gap: 15px;

          box-shadow:
            0 4px 16px
            rgba(30, 73, 112, 0.03);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .management-card:hover {
          transform: translateY(-2px);

          border-color:
            rgba(45, 135, 218, 0.4);

          box-shadow:
            0 9px 25px
            rgba(30, 73, 112, 0.09);
        }

        .management-icon {
          width: 50px;
          height: 50px;

          min-width: 50px;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #0b4f91,
              #1976c9
            );

          color: #ffffff;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .management-icon .menu-svg-icon {
          width: 24px;
          height: 24px;
        }

        .management-content {
          min-width: 0;

          display: flex;
          flex-direction: column;

          align-items: flex-start;
        }

        .management-content h3 {
          margin: 1px 0 6px;

          color: #20334a;

          font-size: 15px;

          font-weight: 700;
        }

        .management-content p {
          margin: 0;

          color: #8494a7;

          font-size: 12px;

          line-height: 1.5;
        }

        .management-link {
          margin-top: 15px;

          color: #1471c1;

          font-size: 12px;

          font-weight: 600;
        }

        .welcome-panel {
          margin-top: 22px;

          padding: 22px;

          border-radius: 13px;

          background:
            linear-gradient(
              120deg,
              #08254a 0%,
              #0c4178 65%,
              #092d55 100%
            );

          color: #ffffff;

          display: flex;
          align-items: flex-start;

          gap: 16px;
        }

        .welcome-icon {
          width: 50px;
          height: 50px;

          flex-shrink: 0;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.09);

          color: #78bdff;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .welcome-panel h2 {
          margin: 2px 0 6px;

          font-size: 16px;
        }

        .welcome-panel p {
          max-width: 850px;

          margin: 0;

          color: #c5d8ec;

          font-size: 12px;

          line-height: 1.7;
        }

        .settings-page,
        .status-page {
          max-width: 1500px;

          margin: 0 auto;
        }

        .settings-page-heading,
        .status-page-heading {
          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          margin-bottom: 25px;
        }

        .settings-heading-icon,
        .status-main-icon {
          width: 56px;
          height: 56px;

          border-radius: 14px;

          background: #eaf5ff;

          color: #126fbd;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-heading-icon .menu-svg-icon,
        .status-main-icon .menu-svg-icon {
          width: 28px;
          height: 28px;
        }

        .settings-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 16px;
        }

        .setting-item {
          min-height: 108px;

          padding: 20px;

          border:
            1px solid #e0e8f1;

          background: #ffffff;

          border-radius: 13px;

          display: flex;
          align-items: center;

          gap: 15px;

          text-align: left;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .setting-item:hover {
          transform: translateY(-2px);

          border-color:
            rgba(35, 126, 204, 0.4);

          box-shadow:
            0 8px 22px
            rgba(30, 73, 112, 0.08);
        }

        .setting-icon {
          width: 48px;
          height: 48px;

          min-width: 48px;

          border-radius: 12px;

          background: #edf7ff;

          color: #116fbe;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .setting-icon .menu-svg-icon {
          width: 23px;
          height: 23px;
        }

        .setting-text {
          min-width: 0;
          flex: 1;
        }

        .setting-text h3 {
          margin: 0 0 5px;

          color: #1d344e;

          font-size: 14px;
        }

        .setting-text p {
          margin: 0;

          color: #8191a4;

          font-size: 11px;

          line-height: 1.5;
        }

        .setting-arrow {
          color: #1471c1;

          font-size: 20px;

          font-weight: 600;
        }

        .settings-info-panel {
          margin-top: 20px;

          padding: 22px;

          border-radius: 14px;

          background:
            linear-gradient(
              120deg,
              #09284e,
              #0d4e88
            );

          color: #ffffff;

          display: flex;
          align-items: center;

          gap: 15px;
        }

        .settings-info-icon {
          width: 50px;
          height: 50px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.1);

          color: #77bdff;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-info-panel h2 {
          margin: 0 0 3px;

          font-size: 17px;
        }

        .settings-info-panel p {
          margin: 0 0 3px;

          color: #d3e4f4;

          font-size: 12px;
        }

        .settings-info-panel span {
          color: #a9c6df;

          font-size: 10px;
        }

        .status-grid {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 16px;
        }

        .status-service-card {
          min-height: 145px;

          padding: 20px;

          border:
            1px solid #e0e8f1;

          background: #ffffff;

          border-radius: 13px;

          display: flex;
          flex-direction: column;

          align-items: flex-start;

          gap: 12px;

          box-shadow:
            0 4px 18px
            rgba(30, 73, 112, 0.035);
        }

        .status-service-icon {
          width: 45px;
          height: 45px;

          border-radius: 11px;

          background: #ebfaf3;

          color: #159563;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-service-icon .menu-svg-icon {
          width: 22px;
          height: 22px;
        }

        .status-service-card h3 {
          margin: 0 0 4px;

          color: #20344c;

          font-size: 14px;
        }

        .status-service-card p {
          margin: 0;

          color: #8494a7;

          font-size: 11px;
        }

        .status-badge {
          color: #138657;

          background: #e9fbf3;

          border-radius: 20px;

          padding: 5px 10px;

          font-size: 10px;

          font-weight: 700;
        }

        .status-note {
          margin-top: 18px;

          padding: 18px 20px;

          border:
            1px solid #dce8f3;

          border-radius: 12px;

          background: #f7fbff;

          display: flex;
          flex-direction: column;

          gap: 5px;
        }

        .status-note strong {
          color: #263c55;

          font-size: 13px;
        }

        .status-note span {
          color: #8293a6;

          font-size: 11px;
        }

        .special-page {
          min-height: 420px;

          border:
            1px solid #e1e9f2;

          border-radius: 14px;

          background: #ffffff;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;

          padding: 40px;
        }

        .special-icon {
          width: 70px;
          height: 70px;

          margin-bottom: 17px;

          border-radius: 18px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #edf7ff;

          color: #1675c9;
        }

        .special-icon .menu-svg-icon {
          width: 32px;
          height: 32px;
        }

        .special-page h2 {
          margin: 0 0 7px;

          color: #20334a;

          font-size: 22px;
        }

        .special-page > p {
          margin: 0;

          color: #8494a7;

          font-size: 13px;

          max-width: 600px;
        }

        .special-action-button {
          margin-top: 20px;

          border: 0;

          border-radius: 9px;

          padding: 10px 17px;

          background: #116fbe;

          color: #ffffff;

          font-size: 12px;

          font-weight: 650;

          cursor: pointer;
        }

        @media (max-width: 1200px) {

          .admin-sidebar {
            width: 235px;
            min-width: 235px;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .management-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .status-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {

          .admin-sidebar {
            width: 72px;
            min-width: 72px;
          }

          .logo-area {
            padding: 14px 8px;
          }

          .logo-frame {
            width: 54px;
            height: 55px;
          }

          .logo-image {
            max-width: 52px;
          }

          .sidebar-divider {
            margin-left: 10px;
            margin-right: 10px;
          }

          .sidebar-menu,
          .sidebar-bottom {
            padding-left: 8px;
            padding-right: 8px;
          }

          .menu-item {
            justify-content: center;

            padding-left: 8px;
            padding-right: 8px;
          }

          .menu-label,
          .sidebar-user,
          .logout-button span {
            display: none;
          }

          .logout-button {
            justify-content: center;
          }

          .content-area {
            padding: 22px;
          }

          .top-header {
            padding-left: 20px;
            padding-right: 20px;
          }

          .header-profile-text {
            display: none;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          
                    .admin-layout {
            display: block;
            width: 100%;
            min-width: 0;
          }

          .admin-main {
            width: 100%;
            min-width: 0;
          }

          .mobile-menu-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            flex-shrink: 0;
            border: 1px solid #dce6f2;
            border-radius: 10px;
            background: #ffffff;
            color: #10243c;
            cursor: pointer;
          }

          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 260px;
            min-width: 260px;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .admin-sidebar.mobile-menu-open {
            transform: translateX(0);
          }
                      .sidebar-menu,
          .sidebar-bottom {
            padding-left: 12px;
            padding-right: 12px;
          }

          .menu-item {
            justify-content: flex-start;
            padding-left: 12px;
            padding-right: 12px;
          }

          .menu-label {
            display: block;
          }

          .sidebar-user {
            display: flex;
          }

          .logout-button {
            justify-content: flex-start;
          }

          .logout-button span {
            display: inline;
          }

          .top-header {
            min-height: 68px;
          }

          .breadcrumb {
            display: none;
          }

          .mobile-brand {
            display: flex;

            align-items: baseline;

            gap: 6px;
          }

          .mobile-brand-main {
            color: #10243c;

            font-size: 18px;

            font-weight: 800;

            letter-spacing: 1px;
          }

          .mobile-brand-sub {
            color: #1471c1;

            font-size: 10px;

            font-weight: 700;

            letter-spacing: 1.5px;
          }

          .content-area {
            padding: 17px;
          }

          .page-heading h1,
          .settings-page-heading h1,
          .status-page-heading h1 {
            font-size: 24px;
          }

          .page-heading p,
          .settings-page-heading p,
          .status-page-heading p {
            font-size: 12px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .management-grid {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .management-card {
            min-height: 145px;
          }

          .management-content p,
          .welcome-panel p,
          .setting-text p,
          .status-service-card p {
            font-size: 12px;
          }

          .header-icon-button {
            width: 36px;
            height: 36px;
          }

          .header-avatar {
            width: 36px;
            height: 36px;
          }

          .page-heading {
            flex-direction: column;

            gap: 12px;
          }

          .refresh-dashboard-button {
            align-self: flex-start;
          }
        }

        @media (max-width: 430px) {


          .logo-frame {
            width: 48px;
            height: 48px;
          }

          .logo-image {
            max-width: 45px;
          }

          .menu-svg-icon {
            width: 18px;
            height: 18px;
          }

          .menu-icon {
            width: 22px;
            height: 22px;
          }

          .content-area {
            padding: 13px;
          }

          .stat-card {
            padding: 16px;
          }

          .welcome-panel {
            padding: 17px;
          }

          .settings-page-heading,
          .status-page-heading {
            gap: 12px;
          }

          .settings-heading-icon,
          .status-main-icon {
            width: 46px;
            height: 46px;
          }
        }

      `}</style>
    </>
  );
}

export default AdminDashboard;