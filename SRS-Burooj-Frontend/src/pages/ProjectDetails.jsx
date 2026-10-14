import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api";

function ProjectDetails() {
  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [error, setError] = useState("");

  const projectId = window.location.pathname.split("/")[2];

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/projects/${projectId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Project not found");
        }

        setProject(data.project);
      } catch (err) {
        console.error("Project loading error:", err);
        setError(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        setUnitsLoading(true);

        const response = await fetch(
          `${API_BASE}/units/project/${projectId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load units");
        }

        setUnits(data.units || []);
      } catch (err) {
        console.error("Units loading error:", err);
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };

    if (projectId) {
      loadUnits();
    }
  }, [projectId]);

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Price on request";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return value;
    }

    return `₹${number.toLocaleString("en-IN")}`;
  };

  const getStatusClass = (status) => {
    const value = String(status || "Available").toLowerCase();

    if (value.includes("book")) {
      return "booked";
    }

    if (value.includes("sold")) {
      return "sold";
    }

    if (value.includes("hold")) {
      return "hold";
    }

    return "available";
  };

  const openUnit = (unitId) => {
    window.location.href = `/unit/${unitId}`;
  };

  const goHome = () => {
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loader}></div>
        <p style={styles.loadingText}>Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>

          <h2 style={styles.errorTitle}>Project Not Found</h2>

          <p style={styles.errorText}>
            {error || "The requested project could not be found."}
          </p>

          <button style={styles.primaryButton} onClick={goHome}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand} onClick={goHome}>
            <img
              src="/srs-burooj-logo.png"
              alt="SRS Burooj"
              style={styles.logo}
            />

            <div>
              <div style={styles.brandName}>SRS BUROOJ</div>
              <div style={styles.brandSub}>REAL ESTATE</div>
            </div>
          </div>

          <button style={styles.homeButton} onClick={goHome}>
            ← Home
          </button>
        </div>
      </header>

      <main>
        <section style={styles.projectHero}>
          <div style={styles.heroOverlay}>
            <div style={styles.container}>
              <div style={styles.breadcrumb}>
                Home <span style={styles.breadcrumbArrow}>›</span>{" "}
                Projects{" "}
                <span style={styles.breadcrumbArrow}>›</span>{" "}
                {project.project_name}
              </div>

              <h1 style={styles.heroTitle}>
                {project.project_name}
              </h1>

              {project.location && (
                <div style={styles.location}>
                  📍 {project.location}
                </div>
              )}

              {project.status && (
                <span style={styles.projectStatus}>
                  {project.status}
                </span>
              )}
            </div>
          </div>
        </section>

        <section style={styles.projectInfoSection}>
          <div style={styles.container}>
            <div style={styles.infoGrid}>
              <div style={styles.descriptionCard}>
                <span style={styles.sectionLabel}>
                  PROJECT OVERVIEW
                </span>

                <h2 style={styles.sectionTitle}>
                  About {project.project_name}
                </h2>

                <p style={styles.description}>
                  {project.description ||
                    "Explore this project and discover the available units."}
                </p>
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryTitle}>
                  Project Information
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Project</span>

                  <strong style={styles.summaryValue}>
                    {project.project_name}
                  </strong>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Location</span>

                  <strong style={styles.summaryValue}>
                    {project.location || "Not specified"}
                  </strong>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Status</span>

                  <strong style={styles.summaryValue}>
                    {project.status || "Upcoming"}
                  </strong>
                </div>

                <div
                  style={{
                    ...styles.summaryRow,
                    borderBottom: "none",
                  }}
                >
                  <span style={styles.summaryLabel}>
                    Total Units
                  </span>

                  <strong style={styles.summaryValue}>
                    {units.length}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.unitsSection}>
          <div style={styles.container}>
            <div style={styles.unitsHeader}>
              <div style={styles.unitsHeaderText}>
                <span style={styles.sectionLabel}>
                  AVAILABLE INVENTORY
                </span>

                <h2 style={styles.sectionTitle}>
                  Units in {project.project_name}
                </h2>

                <p style={styles.unitsSubtitle}>
                  Explore all units associated with this project.
                </p>
              </div>

              <div style={styles.unitCount}>
                {units.length}{" "}
                {units.length === 1 ? "Unit" : "Units"}
              </div>
            </div>

            {unitsLoading ? (
              <div style={styles.unitsLoading}>
                <div style={styles.loader}></div>
                <p style={styles.unitsLoadingText}>
                  Loading units...
                </p>
              </div>
            ) : units.length === 0 ? (
              <div style={styles.emptyCard}>
                <div style={styles.emptyIcon}>🏢</div>

                <h3 style={styles.emptyTitle}>
                  No Units Available
                </h3>

                <p style={styles.emptyText}>
                  There are currently no units listed for this
                  project.
                </p>
              </div>
            ) : (
              <div style={styles.unitsGrid}>
                {units.map((unit) => {
                  const status = unit.status || "Available";

                  return (
                    <article
                      key={unit.id}
                      style={styles.unitCard}
                      onClick={() => openUnit(unit.id)}
                    >
                      <div style={styles.unitTop}>
                        <div style={styles.unitHeading}>
                          <div style={styles.unitNumber}>
                            {unit.unit_number || "Unit"}
                          </div>

                          <div style={styles.unitType}>
                            {unit.unit_type ||
                              unit.property_type ||
                              "Residential Unit"}
                          </div>
                        </div>

                        <span
                          className={`unit-status ${getStatusClass(
                            status
                          )}`}
                          style={{
                            ...styles.status,
                            ...(getStatusClass(status) === "booked"
                              ? styles.booked
                              : {}),
                            ...(getStatusClass(status) === "sold"
                              ? styles.sold
                              : {}),
                            ...(getStatusClass(status) === "hold"
                              ? styles.hold
                              : {}),
                          }}
                        >
                          {status}
                        </span>
                      </div>

                      <div style={styles.unitDetails}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>
                            Floor
                          </span>

                          <strong style={styles.detailValue}>
                            {unit.floor || "—"}
                          </strong>
                        </div>

                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>
                            Facing
                          </span>

                          <strong style={styles.detailValue}>
                            {unit.facing || "—"}
                          </strong>
                        </div>

                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>
                            Carpet Area
                          </span>

                          <strong style={styles.detailValue}>
                            {unit.carpet_area
                              ? `${unit.carpet_area} sq ft`
                              : "—"}
                          </strong>
                        </div>

                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>
                            Built-up Area
                          </span>

                          <strong style={styles.detailValue}>
                            {unit.built_up_area
                              ? `${unit.built_up_area} sq ft`
                              : "—"}
                          </strong>
                        </div>
                      </div>

                      <div style={styles.unitBottom}>
                        <div style={styles.priceBox}>
                          <span style={styles.priceLabel}>
                            Starting Price
                          </span>

                          <div style={styles.price}>
                            {formatPrice(
                              unit.base_price ?? unit.price
                            )}
                          </div>
                        </div>

                        <button
                          style={styles.viewButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openUnit(unit.id);
                          }}
                        >
                          View Details →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section style={styles.ctaSection}>
          <div style={styles.container}>
            <div style={styles.ctaCard}>
              <div style={styles.ctaContent}>
                <span style={styles.ctaSmall}>
                  SRS BUROOJ
                </span>

                <h2 style={styles.ctaTitle}>
                  Interested in a unit?
                </h2>

                <p style={styles.ctaText}>
                  Contact our team for availability, pricing and
                  booking information.
                </p>
              </div>

              <button
                style={styles.ctaButton}
                onClick={() => {
                  window.location.href = "/contact";
                }}
              >
                Enquire Now
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <div style={styles.container}>
          <div style={styles.footerInner}>
            <div style={styles.footerBrand}>
              <strong>SRS BUROOJ</strong>
              <span> • Real Estate Management</span>
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f8ff",
    color: "#10233f",
    fontFamily: "Inter, Arial, Helvetica, sans-serif",
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
  },

  logo: {
    width: "58px",
    height: "58px",
    objectFit: "contain",
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
  },

  projectHero: {
    minHeight: "350px",
    background:
      "linear-gradient(135deg, #09203f 0%, #155eef 100%)",
    display: "flex",
    alignItems: "center",
  },

  heroOverlay: {
    width: "100%",
    padding: "75px 0",
  },

  breadcrumb: {
    color: "#d9e8ff",
    fontSize: "15px",
    lineHeight: 1.6,
    marginBottom: "24px",
    fontWeight: 600,
    overflowWrap: "anywhere",
  },

  breadcrumbArrow: {
    padding: "0 6px",
    color: "#ffffff",
    fontWeight: 900,
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: "clamp(38px, 6vw, 62px)",
    lineHeight: 1.08,
    margin: 0,
    maxWidth: "850px",
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  location: {
    color: "#eaf2ff",
    fontSize: "18px",
    lineHeight: 1.6,
    marginTop: "20px",
    overflowWrap: "anywhere",
  },

  projectStatus: {
    display: "inline-block",
    marginTop: "22px",
    padding: "9px 17px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 800,
  },

  projectInfoSection: {
    padding: "70px 0",
    background: "#ffffff",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.6fr) minmax(320px, 0.8fr)",
    gap: "35px",
    alignItems: "start",
  },

  descriptionCard: {
    padding: "10px 0",
  },

  sectionLabel: {
    color: "#155eef",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1.8px",
    lineHeight: 1.5,
  },

  sectionTitle: {
    margin: "11px 0 16px",
    fontSize: "34px",
    lineHeight: 1.2,
    color: "#0b1f3a",
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  description: {
    color: "#52627a",
    fontSize: "17px",
    lineHeight: 1.85,
    maxWidth: "720px",
    whiteSpace: "pre-line",
    margin: 0,
  },

  summaryCard: {
    background: "#f5f8ff",
    border: "1px solid #dce7f5",
    borderRadius: "18px",
    padding: "26px",
    boxShadow: "0 8px 25px rgba(21,94,239,0.06)",
  },

  summaryTitle: {
    color: "#0b1f3a",
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "12px",
  },

  summaryRow: {
    display: "grid",
    gridTemplateColumns: "110px minmax(0, 1fr)",
    alignItems: "start",
    gap: "15px",
    padding: "15px 0",
    borderBottom: "1px solid #dce7f5",
    fontSize: "15px",
    lineHeight: 1.5,
  },

  summaryLabel: {
    color: "#667085",
    fontWeight: 600,
  },

  summaryValue: {
    color: "#0b1f3a",
    fontSize: "15px",
    fontWeight: 800,
    textAlign: "right",
    overflowWrap: "anywhere",
  },

  unitsSection: {
    padding: "75px 0",
    background: "#f5f8ff",
  },

  unitsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: "25px",
    marginBottom: "35px",
  },

  unitsHeaderText: {
    minWidth: 0,
  },

  unitsSubtitle: {
    color: "#52627a",
    margin: 0,
    lineHeight: 1.7,
    fontSize: "16px",
  },

  unitCount: {
    background: "#155eef",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "999px",
    fontWeight: 900,
    fontSize: "15px",
    whiteSpace: "nowrap",
  },

  unitsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(310px, 1fr))",
    gap: "24px",
  },

  unitCard: {
    background: "#ffffff",
    border: "1px solid #dce7f5",
    borderRadius: "18px",
    padding: "24px",
    cursor: "pointer",
    boxShadow: "0 8px 30px rgba(21,94,239,0.07)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    minWidth: 0,
  },

  unitTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    paddingBottom: "20px",
    borderBottom: "1px solid #edf2f8",
  },

  unitHeading: {
    minWidth: 0,
  },

  unitNumber: {
    fontSize: "25px",
    lineHeight: 1.25,
    fontWeight: 900,
    color: "#0b1f3a",
    overflowWrap: "anywhere",
  },

  unitType: {
    marginTop: "7px",
    color: "#667085",
    fontSize: "15px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  status: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#e8f7ee",
    color: "#16803c",
    fontSize: "13px",
    fontWeight: 900,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  booked: {
    background: "#fff4db",
    color: "#a15c00",
  },

  sold: {
    background: "#ffe5e5",
    color: "#b42318",
  },

  hold: {
    background: "#e8edff",
    color: "#4054b2",
  },

  unitDetails: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
    padding: "22px 0",
  },

  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },

  detailLabel: {
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.4,
    fontWeight: 600,
  },

  detailValue: {
    color: "#0b1f3a",
    fontSize: "16px",
    lineHeight: 1.4,
    fontWeight: 800,
    overflowWrap: "anywhere",
  },

  priceLabel: {
    color: "#667085",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    fontWeight: 700,
  },

  price: {
    color: "#155eef",
    fontSize: "21px",
    lineHeight: 1.3,
    fontWeight: 900,
    marginTop: "5px",
    overflowWrap: "anywhere",
  },

  unitBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "18px",
    borderTop: "1px solid #edf2f8",
    paddingTop: "20px",
  },

  priceBox: {
    minWidth: 0,
  },

  viewButton: {
    border: "none",
    background: "#155eef",
    color: "#ffffff",
    padding: "12px 15px",
    borderRadius: "9px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: "14px",
    minHeight: "44px",
  },

  emptyCard: {
    background: "#ffffff",
    border: "1px dashed #b8c9df",
    borderRadius: "18px",
    padding: "60px 25px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "44px",
    marginBottom: "12px",
  },

  emptyTitle: {
    color: "#0b1f3a",
    fontSize: "22px",
    margin: "8px 0",
  },

  emptyText: {
    color: "#667085",
    fontSize: "16px",
    lineHeight: 1.6,
    margin: 0,
  },

  unitsLoading: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "55px",
    textAlign: "center",
    color: "#667085",
  },

  unitsLoadingText: {
    fontSize: "16px",
    marginTop: "16px",
  },

  ctaSection: {
    padding: "65px 0",
    background: "#ffffff",
  },

  ctaCard: {
    background:
      "linear-gradient(135deg, #0b1f3a 0%, #155eef 100%)",
    borderRadius: "22px",
    padding: "42px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
  },

  ctaContent: {
    minWidth: 0,
  },

  ctaSmall: {
    color: "#9fc2ff",
    fontWeight: 900,
    fontSize: "13px",
    letterSpacing: "2px",
  },

  ctaTitle: {
    color: "#ffffff",
    margin: "9px 0",
    fontSize: "32px",
    lineHeight: 1.2,
  },

  ctaText: {
    color: "#dce9ff",
    margin: 0,
    lineHeight: 1.7,
    fontSize: "16px",
  },

  ctaButton: {
    background: "#ffffff",
    color: "#155eef",
    border: "none",
    borderRadius: "10px",
    padding: "14px 23px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: "15px",
    minHeight: "48px",
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
    color: "#10233f",
    padding: "30px",
  },

  loader: {
    width: "40px",
    height: "40px",
    border: "4px solid #dce7f5",
    borderTop: "4px solid #155eef",
    borderRadius: "50%",
    animation: "srsSpin 0.8s linear infinite",
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
    boxShadow: "0 15px 45px rgba(21,94,239,0.08)",
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
    fontSize: "25px",
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

export default ProjectDetails;