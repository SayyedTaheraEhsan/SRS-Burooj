import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api";

function UnitDetails() {
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unitId = window.location.pathname.split("/")[2];

  useEffect(() => {
    const loadUnit = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE}/units/${unitId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unit not found");
        }

        setUnit(data.unit);
      } catch (err) {
        console.error("Unit loading error:", err);
        setError(err.message || "Failed to load unit");
      } finally {
        setLoading(false);
      }
    };

    if (unitId) {
      loadUnit();
    } else {
      setLoading(false);
      setError("Invalid unit.");
    }
  }, [unitId]);

  const formatPrice = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Price on request";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return value;
    }

    return `₹${number.toLocaleString("en-IN")}`;
  };

  const getStatusStyle = (status) => {
    const value = String(status || "Available").toLowerCase();

    if (value.includes("sold")) {
      return {
        background: "#ffe5e5",
        color: "#b42318",
      };
    }

    if (value.includes("book")) {
      return {
        background: "#fff4db",
        color: "#a15c00",
      };
    }

    if (value.includes("hold")) {
      return {
        background: "#e8edff",
        color: "#4054b2",
      };
    }

    return {
      background: "#e8f7ee",
      color: "#16803c",
    };
  };

  const goBack = () => {
    if (unit?.project_id) {
      window.location.href = `/project/${unit.project_id}`;
    } else {
      window.location.href = "/";
    }
  };

  const goHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loader}></div>

        <p style={styles.loadingText}>
          Loading unit details...
        </p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>

          <h2 style={styles.errorTitle}>
            Unit Not Found
          </h2>

          <p style={styles.errorText}>
            {error ||
              "The requested unit could not be found."}
          </p>

          <button
            style={styles.primaryButton}
            onClick={goHome}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(unit.status);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div
            style={styles.brand}
            onClick={goHome}
          >
            <img
              src="/srs-burooj-logo.png"
              alt="SRS Burooj"
              style={styles.logo}
            />

            <div>
              <div style={styles.brandName}>
                SRS BUROOJ
              </div>

              <div style={styles.brandSub}>
                REAL ESTATE
              </div>
            </div>
          </div>

          <button
            style={styles.homeButton}
            onClick={goBack}
          >
            ← Back
          </button>
        </div>
      </header>

      <main>
        <section style={styles.hero}>
          <div style={styles.container}>
            <div style={styles.breadcrumb}>
              <span>Home</span>

              <span style={styles.breadcrumbArrow}>
                ›
              </span>

              <span>
                {unit.project_name || "Project"}
              </span>

              <span style={styles.breadcrumbArrow}>
                ›
              </span>

              <span>
                {unit.unit_number || "Unit"}
              </span>
            </div>

            <div style={styles.heroContent}>
              <div style={styles.heroText}>
                <span style={styles.smallLabel}>
                  UNIT DETAILS
                </span>

                <h1 style={styles.heroTitle}>
                  {unit.unit_number || "Unit"}
                </h1>

                <p style={styles.heroProject}>
                  {unit.project_name ||
                    "SRS Burooj Project"}
                </p>
              </div>

              <div
                style={{
                  ...styles.statusBadge,
                  background: statusStyle.background,
                  color: statusStyle.color,
                }}
              >
                {unit.status || "Available"}
              </div>
            </div>
          </div>
        </section>

        <section style={styles.contentSection}>
          <div style={styles.container}>
            <div style={styles.mainGrid}>
              <div>
                <div style={styles.card}>
                  <span style={styles.sectionLabel}>
                    PROPERTY INFORMATION
                  </span>

                  <h2 style={styles.sectionTitle}>
                    {unit.unit_number || "Unit"} Details
                  </h2>

                  <div style={styles.detailsGrid}>
                    <Detail
                      label="Unit Number"
                      value={unit.unit_number}
                    />

                    <Detail
                      label="Unit Type"
                      value={unit.unit_type}
                    />

                    <Detail
                      label="Property Type"
                      value={unit.property_type}
                    />

                    <Detail
                      label="Floor"
                      value={unit.floor}
                    />

                    <Detail
                      label="Facing"
                      value={unit.facing}
                    />

                    <Detail
                      label="Parking"
                      value={unit.parking}
                    />

                    <Detail
                      label="Carpet Area"
                      value={
                        unit.carpet_area
                          ? `${unit.carpet_area} sq ft`
                          : null
                      }
                    />

                    <Detail
                      label="Built-up Area"
                      value={
                        unit.built_up_area
                          ? `${unit.built_up_area} sq ft`
                          : null
                      }
                    />

                    <Detail
                      label="Rate / Sq Ft"
                      value={
                        unit.rate_per_sqft
                          ? `₹${Number(
                              unit.rate_per_sqft
                            ).toLocaleString("en-IN")}`
                          : null
                      }
                    />
                  </div>
                </div>

                <div style={styles.card}>
                  <span style={styles.sectionLabel}>
                    DESCRIPTION
                  </span>

                  <h2 style={styles.sectionTitle}>
                    About This Unit
                  </h2>

                  <p style={styles.description}>
                    {unit.description ||
                      "No additional description has been provided for this unit."}
                  </p>
                </div>
              </div>

              <aside>
                <div style={styles.priceCard}>
                  <span style={styles.priceLabel}>
                    PROPERTY PRICE
                  </span>

                  <div style={styles.price}>
                    {formatPrice(
                      unit.base_price ?? unit.price
                    )}
                  </div>

                  {unit.rate_per_sqft && (
                    <div style={styles.rateText}>
                      ₹
                      {Number(
                        unit.rate_per_sqft
                      ).toLocaleString("en-IN")}{" "}
                      / sq ft
                    </div>
                  )}

                  <div style={styles.priceDivider}></div>

                  <div style={styles.priceInfo}>
                    <span>Project</span>

                    <strong>
                      {unit.project_name || "—"}
                    </strong>
                  </div>

                  <div style={styles.priceInfo}>
                    <span>Status</span>

                    <strong>
                      {unit.status || "Available"}
                    </strong>
                  </div>

                  <button
                    style={styles.enquireButton}
                    onClick={() => {
                      window.location.href =
                        "/contact";
                    }}
                  >
                    Enquire About This Unit
                  </button>
                </div>

                <div style={styles.contactCard}>
                  <div style={styles.contactIcon}>
                    ☎
                  </div>

                  <h3 style={styles.contactTitle}>
                    Need more information?
                  </h3>

                  <p style={styles.contactText}>
                    Contact SRS Burooj for availability,
                    booking and pricing information.
                  </p>

                  <button
                    style={styles.contactButton}
                    onClick={() => {
                      window.location.href =
                        "/contact";
                    }}
                  >
                    Contact Us
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerInner}>
            <div style={styles.footerBrand}>
              <strong>SRS BUROOJ</strong>

              <span>
                {" "}
                • Real Estate Management
              </span>
            </div>

            <div style={styles.footerCopyright}>
              © {new Date().getFullYear()} SRS Burooj
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailBox}>
      <span style={styles.detailLabel}>
        {label}
      </span>

      <strong style={styles.detailValue}>
        {value !== null &&
        value !== undefined &&
        value !== ""
          ? value
          : "—"}
      </strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f8ff",
    color: "#10233f",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    fontSize: "16px",
  },

  container: {
    width: "min(1180px, calc(100% - 40px))",
    margin: "0 auto",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #dce7f5",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },

  headerInner: {
    width: "min(1180px, calc(100% - 40px))",
    margin: "0 auto",
    minHeight: "82px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    minWidth: 0,
  },

  logo: {
    width: "58px",
    height: "58px",
    objectFit: "contain",
    flexShrink: 0,
  },

  brandName: {
    fontSize: "20px",
    fontWeight: 900,
    color: "#0b1f3a",
    letterSpacing: "1px",
  },

  brandSub: {
    fontSize: "11px",
    color: "#155eef",
    fontWeight: 800,
    letterSpacing: "2px",
    marginTop: "3px",
  },

  homeButton: {
    border: "1px solid #b9cbea",
    background: "#ffffff",
    color: "#155eef",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "15px",
    minHeight: "44px",
    whiteSpace: "nowrap",
  },

  hero: {
    background:
      "linear-gradient(135deg, #09203f 0%, #155eef 100%)",
    padding: "70px 0",
  },

  breadcrumb: {
    color: "#d9e8ff",
    fontSize: "15px",
    lineHeight: 1.6,
    marginBottom: "32px",
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    fontWeight: 600,
  },

  breadcrumbArrow: {
    color: "#ffffff",
    fontWeight: 900,
    padding: "0 3px",
  },

  heroContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
  },

  heroText: {
    minWidth: 0,
  },

  smallLabel: {
    color: "#9fc2ff",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "2px",
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: "clamp(42px, 7vw, 72px)",
    margin: "12px 0 7px",
    lineHeight: 1.05,
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  heroProject: {
    color: "#dce9ff",
    fontSize: "19px",
    lineHeight: 1.5,
    margin: 0,
    overflowWrap: "anywhere",
  },

  statusBadge: {
    padding: "11px 18px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "14px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  contentSection: {
    padding: "70px 0",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.5fr) minmax(320px, 0.75fr)",
    gap: "32px",
    alignItems: "start",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #dce7f5",
    borderRadius: "18px",
    padding: "30px",
    marginBottom: "26px",
    boxShadow:
      "0 8px 30px rgba(21,94,239,0.05)",
  },

  sectionLabel: {
    color: "#155eef",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1.7px",
    lineHeight: 1.5,
  },

  sectionTitle: {
    color: "#0b1f3a",
    fontSize: "30px",
    lineHeight: 1.25,
    margin: "11px 0 26px",
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },

  detailBox: {
    background: "#f7faff",
    border: "1px solid #e3ebf6",
    borderRadius: "12px",
    padding: "17px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
  },

  detailLabel: {
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.45,
    fontWeight: 600,
  },

  detailValue: {
    color: "#0b1f3a",
    fontSize: "17px",
    lineHeight: 1.45,
    fontWeight: 800,
    overflowWrap: "anywhere",
  },

  description: {
    color: "#52627a",
    lineHeight: 1.85,
    fontSize: "17px",
    whiteSpace: "pre-line",
    margin: 0,
  },

  priceCard: {
    background:
      "linear-gradient(145deg, #0b1f3a, #155eef)",
    borderRadius: "20px",
    padding: "30px",
    color: "#ffffff",
    boxShadow:
      "0 15px 40px rgba(21,94,239,0.2)",
    position: "sticky",
    top: "100px",
  },

  priceLabel: {
    color: "#bcd4ff",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "1.5px",
  },

  price: {
    fontSize: "36px",
    lineHeight: 1.2,
    fontWeight: 900,
    marginTop: "9px",
    overflowWrap: "anywhere",
  },

  rateText: {
    color: "#dce9ff",
    marginTop: "7px",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  priceDivider: {
    height: "1px",
    background: "rgba(255,255,255,0.18)",
    margin: "24px 0",
  },

  priceInfo: {
    display: "grid",
    gridTemplateColumns: "75px minmax(0, 1fr)",
    gap: "15px",
    padding: "10px 0",
    color: "#cbdcff",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  enquireButton: {
    width: "100%",
    marginTop: "22px",
    border: "none",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#155eef",
    padding: "14px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "15px",
    minHeight: "48px",
  },

  contactCard: {
    marginTop: "22px",
    background: "#ffffff",
    border: "1px solid #dce7f5",
    borderRadius: "18px",
    padding: "28px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(21,94,239,0.05)",
  },

  contactIcon: {
    width: "48px",
    height: "48px",
    margin: "0 auto 14px",
    borderRadius: "50%",
    background: "#eaf2ff",
    color: "#155eef",
    display: "grid",
    placeItems: "center",
    fontSize: "21px",
  },

  contactTitle: {
    color: "#0b1f3a",
    fontSize: "20px",
    lineHeight: 1.3,
    margin: "0 0 10px",
  },

  contactText: {
    color: "#667085",
    lineHeight: 1.7,
    fontSize: "15px",
    margin: "0 0 18px",
  },

  contactButton: {
    border: "1px solid #155eef",
    background: "#ffffff",
    color: "#155eef",
    borderRadius: "9px",
    padding: "11px 19px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "14px",
    minHeight: "44px",
  },

  footer: {
    background: "#07172c",
    color: "#b9c8dd",
    padding: "28px 0",
  },

  footerInner: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  footerBrand: {
    overflowWrap: "anywhere",
  },

  footerCopyright: {
    whiteSpace: "nowrap",
  },

  centerPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f8ff",
    padding: "30px",
  },

  loader: {
    width: "40px",
    height: "40px",
    border: "4px solid #dce7f5",
    borderTop: "4px solid #155eef",
    borderRadius: "50%",
    animation:
      "srsSpin 0.8s linear infinite",
  },

  loadingText: {
    color: "#52627a",
    marginTop: "17px",
    fontSize: "16px",
    fontWeight: 600,
  },

  errorCard: {
    width: "min(500px, 100%)",
    background: "#ffffff",
    border: "1px solid #dce7f5",
    borderRadius: "20px",
    padding: "42px",
    textAlign: "center",
    boxShadow:
      "0 15px 45px rgba(21,94,239,0.08)",
  },

  errorIcon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 17px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#ffe5e5",
    color: "#b42318",
    fontSize: "27px",
    fontWeight: 900,
  },

  errorTitle: {
    color: "#0b1f3a",
    fontSize: "26px",
    lineHeight: 1.3,
    margin: "0 0 10px",
  },

  errorText: {
    color: "#667085",
    fontSize: "16px",
    lineHeight: 1.7,
    margin: 0,
  },

  primaryButton: {
    marginTop: "22px",
    background: "#155eef",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "13px 22px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "15px",
    minHeight: "46px",
  },
};

export default UnitDetails;