import { useEffect, useMemo, useState } from "react";
import WebsiteReviews from "./components/WebsiteReviews";

import API_BASE_URL from "./apiBase";
const API_BASE = API_BASE_URL;

const defaultSettings = {
  logo: "/srs-burooj-logo.png",
  heroImage: "",
  heroTitle: "Build Your Future With SRS Burooj",
  heroDescription:
    "Discover thoughtfully planned properties, quality construction, and a trusted real-estate experience with SRS Burooj.",
  aboutTitle: "About SRS Burooj",
  aboutText:
    "SRS Burooj is focused on delivering a reliable and transparent real-estate experience.",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  officeTiming: "",
  instagram: "",
  facebook: "",
  youtube: "",
  showProjects: true,
  showAbout: true,
  showInquiry: true,
  homeMedia: [],
};

function Home() {
  const [settings, setSettings] = useState(defaultSettings);

  const [projects, setProjects] = useState([]);
  const [projectMediaById, setProjectMediaById] = useState({});
  const [units, setUnits] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingAdvertisements, setLoadingAdvertisements] =
    useState(true);

  const [projectError, setProjectError] = useState("");
  const [unitError, setUnitError] = useState("");
  const [advertisementError, setAdvertisementError] =
    useState("");

  const [homeMediaIndex, setHomeMediaIndex] = useState(0);

  // =========================================================
  // WEBSITE SETTINGS
  // =========================================================

  const loadWebsiteSettings = async () => {
    let parsed = null;

    // Load the latest saved settings from the server first.
    try {
      const response = await fetch(`${API_BASE}/api/website-settings`);

      if (response.ok) {
        const result = await response.json();

        if (
          result?.success &&
          result.settings &&
          typeof result.settings === "object" &&
          !Array.isArray(result.settings)
        ) {
          parsed = result.settings;
        }
      }
    } catch (error) {
      console.warn("Could not load website settings from server:", error);
    }

    // Fall back to local settings if the server has no saved settings.
    if (!parsed) {
      try {
        const saved = localStorage.getItem("srsWebsiteSettings");

        if (saved) {
          const localSettings = JSON.parse(saved);

          if (
            localSettings &&
            typeof localSettings === "object" &&
            !Array.isArray(localSettings)
          ) {
            parsed = localSettings;
          }
        }
      } catch (error) {
        console.error("Local website settings error:", error);
      }
    }

    setSettings({
      ...defaultSettings,
      ...(parsed || {}),
      homeMedia: Array.isArray(parsed?.homeMedia) ? parsed.homeMedia : [],
    });

    setHomeMediaIndex(0);
  };
  // =========================================================
  // PROJECTS
  // =========================================================

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      setProjectError("");

      const response = await fetch(
        `${API_BASE}/api/projects`
      );

      if (!response.ok) {
        throw new Error("Projects API failed");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setProjects(data);
      } else if (Array.isArray(data.projects)) {
        setProjects(data.projects);
      } else if (Array.isArray(data.data)) {
        setProjects(data.data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Projects error:", error);
      setProjectError(
        "Projects are currently unavailable."
      );
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // =========================================================
  // UNITS
  // =========================================================

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);
      setUnitError("");

      const response = await fetch(
        `${API_BASE}/api/units`
      );

      if (!response.ok) {
        throw new Error("Units API failed");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setUnits(data);
      } else if (Array.isArray(data.units)) {
        setUnits(data.units);
      } else if (Array.isArray(data.data)) {
        setUnits(data.data);
      } else {
        setUnits([]);
      }
    } catch (error) {
      console.error("Units error:", error);
      setUnitError(
        "Units are currently unavailable."
      );
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  // =========================================================
  // ADVERTISEMENTS
  // =========================================================

  const loadAdvertisements = async () => {
    try {
      setLoadingAdvertisements(true);
      setAdvertisementError("");

      const response = await fetch(
        `${API_BASE}/api/advertisements`
      );

      if (!response.ok) {
        throw new Error(
          "Advertisement API failed"
        );
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setAdvertisements(data);
      } else if (
        Array.isArray(data.advertisements)
      ) {
        setAdvertisements(data.advertisements);
      } else if (Array.isArray(data.data)) {
        setAdvertisements(data.data);
      } else {
        setAdvertisements([]);
      }
    } catch (error) {
      console.error(
        "Advertisement error:",
        error
      );

      setAdvertisementError(
        "Advertisements are currently unavailable."
      );

      setAdvertisements([]);
    } finally {
      setLoadingAdvertisements(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadWebsiteSettings();
    loadProjects();
    loadUnits();
    loadAdvertisements();

    const refreshSettings =
      () => loadWebsiteSettings();

    const refreshAds =
      () => loadAdvertisements();

    const refreshUnits =
      () => loadUnits();

    // The browser storage event fires when another tab changes settings.
    // Read the saved value directly so an older API response cannot overwrite it.
    const refreshFromStorage = (event) => {
      if (
        event.key !== "srsWebsiteSettings" &&
        event.key !== null
      ) {
        return;
      }

      try {
        const saved = localStorage.getItem("srsWebsiteSettings");
        if (!saved) {
          setSettings({ ...defaultSettings });
          setHomeMediaIndex(0);
          return;
        }

        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return;
        }

        const nextSettings = {
          ...defaultSettings,
          ...parsed,
          homeMedia: Array.isArray(parsed.homeMedia)
            ? parsed.homeMedia.map((item) => ({
                ...item,
                src:
                  item?.src && item.src.startsWith("/uploads/")
                    ? `${API_BASE}${item.src}`
                    : item?.src,
              }))
            : [],
        };

        setSettings(nextSettings);
        setHomeMediaIndex(0);
      } catch (error) {
        console.error("Website settings storage refresh error:", error);
      }
    };

    window.addEventListener("storage", refreshFromStorage);

    window.addEventListener(
      "srs-website-settings-updated",
      refreshSettings
    );

    window.addEventListener(
      "srsWebsiteSettingsUpdated",
      refreshSettings
    );

    window.addEventListener(
      "srs-advertisements-updated",
      refreshAds
    );

    window.addEventListener(
      "srsAdvertisementsUpdated",
      refreshAds
    );

    window.addEventListener(
      "srs-units-updated",
      refreshUnits
    );

    window.addEventListener(
      "srsUnitsUpdated",
      refreshUnits
    );

    return () => {
      window.removeEventListener("storage", refreshFromStorage);

      window.removeEventListener(
        "srs-website-settings-updated",
        refreshSettings
      );

      window.removeEventListener(
        "srsWebsiteSettingsUpdated",
        refreshSettings
      );

      window.removeEventListener(
        "srs-advertisements-updated",
        refreshAds
      );

      window.removeEventListener(
        "srsAdvertisementsUpdated",
        refreshAds
      );

      window.removeEventListener(
        "srs-units-updated",
        refreshUnits
      );

      window.removeEventListener(
        "srsUnitsUpdated",
        refreshUnits
      );
    };
  }, []);

  // Load each project's uploaded photos from the existing project-media API.
  useEffect(() => {
    let cancelled = false;

    async function loadProjectMedia() {
      if (!Array.isArray(projects) || projects.length === 0) {
        setProjectMediaById({});
        return;
      }

      const entries = await Promise.all(
        projects.map(async (project) => {
          const id = project?.id || project?._id || project?.project_id;
          if (!id) return [null, []];

          try {
            const response = await fetch(`${API_BASE}/api/project-media/${id}`);
            if (!response.ok) return [String(id), []];

            const data = await response.json();
            const media = Array.isArray(data)
              ? data
              : Array.isArray(data?.media)
              ? data.media
              : [];

            const photos = media.filter((item) => {
              const type = String(item?.media_type || item?.type || "").toLowerCase();
              const url = item?.media_url || item?.url || item?.image_url || item?.photo_url || "";
              return url && (!type || type.includes("photo") || type.includes("image"));
            });

            return [String(id), photos];
          } catch (error) {
            console.error("Project photos load error:", id, error);
            return [String(id), []];
          }
        })
      );

      if (!cancelled) {
        setProjectMediaById(Object.fromEntries(entries.filter(([id]) => id)));
      }
    }

    loadProjectMedia();

    return () => {
      cancelled = true;
    };
  }, [projects]);

  const getProjectImage = (project) => {
    const id = project?.id || project?._id || project?.project_id;
    const media = projectMediaById[String(id)] || [];
    const firstMedia = media[0];
    const source =
      firstMedia?.media_url ||
      firstMedia?.url ||
      firstMedia?.image_url ||
      firstMedia?.photo_url ||
      project?.image_url ||
      project?.imageUrl ||
      project?.image ||
      project?.photo_url ||
      project?.photo ||
      "";

    if (!source) return "";
    if (/^(data:|https?:|blob:)/i.test(source)) return source;
    return source.startsWith("/") ? `${API_BASE}${source}` : `${API_BASE}/${source}`;
  };

  // =========================================================
  // HOME PHOTOS / VIDEOS
  // =========================================================

  const homeMedia = useMemo(() => {
    if (!Array.isArray(settings.homeMedia)) {
      return [];
    }

    return settings.homeMedia.filter(
      (item) =>
        item &&
        (item.src ||
          item.url ||
          item.path ||
          item.media ||
          item.image ||
          item.video)
    );
  }, [settings.homeMedia]);

  const getMediaSource = (item) => {
    if (!item) return "";

    const source =
      item.src ||
      item.url ||
      item.path ||
      item.media ||
      item.image ||
      item.video ||
      "";

    if (
      source.startsWith("data:") ||
      source.startsWith("http://") ||
      source.startsWith("https://") ||
      source.startsWith("blob:")
    ) {
      return source;
    }

    if (source.startsWith("/")) {
      return `${API_BASE}${source}`;
    }

    return `${API_BASE}/${source}`;
  };

  const isVideo = (item) => {
    const type = String(
      item?.type ||
        item?.media_type ||
        item?.mediaType ||
        ""
    ).toLowerCase();

    if (type.includes("video")) return true;

    const source =
      getMediaSource(item).toLowerCase();

    return (
      source.includes(".mp4") ||
      source.includes(".webm") ||
      source.includes(".mov") ||
      source.startsWith("data:video/")
    );
  };

  const nextMedia = () => {
    if (homeMedia.length <= 1) return;

    setHomeMediaIndex((current) =>
      current >= homeMedia.length - 1
        ? 0
        : current + 1
    );
  };

  useEffect(() => {
    if (homeMedia.length <= 1) return;

    const current =
      homeMedia[homeMediaIndex];

    if (!current || isVideo(current)) {
      return;
    }

    const timer = setTimeout(
      nextMedia,
      5000
    );

    return () => clearTimeout(timer);
  }, [homeMedia, homeMediaIndex]);

  // =========================================================
  // ADVERTISEMENT IMAGE
  // =========================================================

  const getAdvertisementImage = (item) => {
    const image =
      item?.image ||
      item?.image_url ||
      item?.imageUrl ||
      item?.photo ||
      item?.photo_url ||
      "";

    if (!image) return "";

    if (
      image.startsWith("data:") ||
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_BASE}${image}`;
    }

    return `${API_BASE}/${image}`;
  };

  const visibleAdvertisements = useMemo(() => {
    const active = advertisements.filter(
      (item) => {
        const status = String(
          item?.status || ""
        ).toLowerCase();

        return (
          !status ||
          status === "active" ||
          status === "published" ||
          status === "live"
        );
      }
    );

    return [...active].sort((a, b) => {
      const aFeatured =
        a?.featured === true ||
        a?.featured === 1 ||
        String(a?.featured).toLowerCase() ===
          "true";

      const bFeatured =
        b?.featured === true ||
        b?.featured === 1 ||
        String(b?.featured).toLowerCase() ===
          "true";

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

      return 0;
    });
  }, [advertisements]);

  // =========================================================
  // UNIT HELPERS
  // =========================================================

  const unitPhoto = (unit) => {
    const image =
      unit?.photo ||
      unit?.image ||
      unit?.unit_photo ||
      unit?.unit_image ||
      unit?.photo_url ||
      "";

    if (!image) return "";

    if (
      image.startsWith("data:") ||
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_BASE}${image}`;
    }

    return `${API_BASE}/${image}`;
  };

  const unitNumber = (unit) =>
    unit?.unit_number ||
    unit?.unitNumber ||
    unit?.unit_no ||
    unit?.unitNo ||
    unit?.number ||
    "Unit";

  const unitBhk = (unit) =>
    unit?.bhk ||
    unit?.unit_type ||
    unit?.unitType ||
    "";

  const unitArea = (unit) =>
    unit?.carpet_area ||
    unit?.carpetArea ||
    unit?.area ||
    unit?.area_sqft ||
    unit?.sqft ||
    "";

  const unitFloor = (unit) =>
    unit?.floor ||
    unit?.floor_number ||
    unit?.floorNumber ||
    "";

  const unitPrice = (unit) =>
    unit?.price ||
    unit?.total_price ||
    unit?.sale_price ||
    unit?.amount ||
    "";

  const unitStatus = (unit) =>
    unit?.status ||
    unit?.availability ||
    unit?.unit_status ||
    "Available";

  const unitProject = (unit) =>
    unit?.project_name ||
    unit?.projectName ||
    unit?.project ||
    unit?.project_id ||
    "";

  const getStatusStyle = (status) => {
    const value =
      String(status).toLowerCase();

    if (
      value.includes("sold") ||
      value.includes("booked") ||
      value.includes("unavailable")
    ) {
      return {
        background: "#fff0f0",
        color: "#c62828",
      };
    }

    if (
      value.includes("hold") ||
      value.includes("reserved")
    ) {
      return {
        background: "#fff7e6",
        color: "#b76e00",
      };
    }

    return {
      background: "#eaf8ef",
      color: "#18864b",
    };
  };

  // =========================================================
  // CONTACT
  // =========================================================

  const phoneLink = settings.phone
    ? `tel:${String(
        settings.phone
      ).replace(/\s+/g, "")}`
    : "";

  const emailSubject = "Property Inquiry - SRS Burooj";
  const emailBody = "Dear SRS Burooj Team,\n\nI am interested in your property projects. Kindly share the available projects, unit details, pricing, payment plans, and booking process.\n\nThank you.\n\nRegards";

  const emailLink = settings.email
    ? `mailto:${settings.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : "";

  const whatsappNumber = String(
    settings.whatsapp || ""
  ).replace(/\D/g, "");

  const whatsappMessage = "Hello SRS Burooj Team, I am interested in your property projects. Please share the available projects, unit details, pricing, and booking information. Thank you.";

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : "";
  const socialLinks = [
    {
      name: "Instagram",
      url: settings.instagram,
      icon: "◎",
    },
    {
      name: "Facebook",
      url: settings.facebook,
      icon: "f",
    },
    {
      name: "YouTube",
      url: settings.youtube,
      icon: "▶",
    },
  ].filter((item) => item.url);

  // =========================================================
  // LOGO
  // =========================================================

  const logoSource =
    settings.logo ||
    "/srs-burooj-logo.png";

  const heroImageSource = (() => {
    const image = settings.heroImage;
    if (!image || typeof image !== "string") return "";

    if (
      image.startsWith("data:") ||
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    if (image.startsWith("/uploads/")) {
      return `${API_BASE}${image}`;
    }

    if (image.startsWith("/")) {
      return image;
    }

    return `${API_BASE}/${image}`;
  })();

  const heroSectionStyle = heroImageSource
    ? {
        ...heroStyle,
        backgroundImage: `linear-gradient(135deg, rgba(7, 29, 58, 0.86), rgba(13, 59, 115, 0.78), rgba(21, 94, 239, 0.72)), url("${heroImageSource}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : heroStyle;

  return (
    <div style={pageStyle}>
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header style={headerStyle}>
        <div style={headerContainerStyle}>
          <a href="/" style={brandStyle}>
            <img
              src={logoSource}
              alt="SRS Burooj"
              style={logoStyle}
            />

            <div>
              <div style={brandNameStyle}>
                SRS BUROOJ
              </div>

              <div style={brandSubStyle}>
                REAL ESTATE
              </div>
            </div>
          </a>

          <nav style={navStyle}>
            <a
              href="/"
              style={navLinkStyle}
            >
              Home
            </a>

            <a
              href="#projects"
              style={navLinkStyle}
            >
              Projects
            </a>

            <a
              href="#units"
              style={navLinkStyle}
            >
              Units
            </a>

            <a
              href="#advertisements"
              style={navLinkStyle}
            >
              Offers
            </a>

            <a
              href="#reviews"
              style={navLinkStyle}
            >
              Reviews
            </a>

            <a
              href="#contact"
              style={navLinkStyle}
            >
              Contact
            </a>

            <a
              href="/customer-login"
              style={{
                ...navLinkStyle,
                color: "#123b75",
                background: "#ffffff",
                fontWeight: "800",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "2px solid #ffffff",
                boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                display: "inline-block",
              }}
            >
              Customer Login
            </a>
          </nav>
        </div>
      </header>

      {/* =====================================================
          HOME PHOTOS / VIDEOS
      ===================================================== */}

      {homeMedia.length > 0 && (
        <section
          style={{
            background: "#06152b",
            padding: "18px 0 22px",
          }}
        >
          <div style={containerStyle}>
            <div style={mediaBoxStyle}>
              {isVideo(
                homeMedia[homeMediaIndex]
              ) ? (
                <video
                  key={homeMediaIndex}
                  src={getMediaSource(
                    homeMedia[homeMediaIndex]
                  )}
                  autoPlay
                  muted
                  playsInline
                  onEnded={nextMedia}
                  style={mediaImageStyle}
                />
              ) : (
                <img
                  key={homeMediaIndex}
                  src={getMediaSource(
                    homeMedia[homeMediaIndex]
                  )}
                  alt="SRS Burooj"
                  style={mediaImageStyle}
                />
              )}

              <img
                src={logoSource}
                alt="SRS Burooj"
                style={mediaLogoStyle}
              />

              {homeMedia.length > 1 && (
                <div style={mediaDotsStyle}>
                  {homeMedia.map(
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Show media ${
                          index + 1
                        }`}
                        onClick={() =>
                          setHomeMediaIndex(
                            index
                          )
                        }
                        style={{
                          width:
                            index ===
                            homeMediaIndex
                              ? "25px"
                              : "9px",
                          height: "9px",
                          border: "none",
                          borderRadius:
                            "20px",
                          background:
                            index ===
                            homeMediaIndex
                              ? "#ffffff"
                              : "rgba(255,255,255,.5)",
                          cursor:
                            "pointer",
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          HERO
      ===================================================== */}

      <section style={heroSectionStyle}>
        <div style={containerStyle}>
          <div
            style={{
              maxWidth: "760px",
            }}
          >
            <div style={heroBadgeStyle}>
              TRUSTED REAL ESTATE
            </div>

            <h1 style={heroTitleStyle}>
              {settings.heroTitle}
            </h1>

            <p style={heroTextStyle}>
              {settings.heroDescription}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTACT ICONS
      ===================================================== */}

      {(phoneLink || whatsappLink || emailLink || socialLinks.length > 0) && (
        <section style={quickContactSection}>
          <div style={quickContactContainer}>
            {phoneLink && (
              <a href={phoneLink} style={quickContactStyle} aria-label="Call Us">
                <span style={iconCircleStyle}>☎</span>
                Call Us
              </a>
            )}

            {whatsappLink && (
              <a href={whatsappLink} style={quickContactStyle} aria-label="WhatsApp Us" target="_blank" rel="noreferrer">
                <span style={iconCircleStyle}>☏</span>
                WhatsApp
              </a>
            )}

            {emailLink && (
              <a href={emailLink} style={quickContactStyle} aria-label="Email Us">
                <span style={iconCircleStyle}>✉</span>
                Email Us
              </a>
            )}

            {socialLinks.length > 0 && (
              <details style={{ position: "relative" }}>
                <summary
                  style={{
                    ...quickContactStyle,
                    listStyle: "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  aria-label="Open social media links"
                >
                <span style={iconCircleStyle}>🔗</span>
                  Social Media
                  <span aria-hidden="true">⌄</span>
                </summary>

                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    zIndex: 1100,
                    minWidth: "180px",
                    padding: "8px",
                    display: "grid",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid #dbe5f2",
                    borderRadius: "12px",
                    boxShadow: "0 10px 28px rgba(11,31,58,.18)",
                  }}
                >
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        color: "#123b75",
                        background: "#f5f8ff",
                        textDecoration: "none",
                        fontSize: "14px",
                        fontWeight: "700",
                      }}
                    >
                <span style={iconCircleStyle}>{social.icon}</span>
                      {social.name}
                    </a>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      )}
{/* =====================================================
          PROJECTS
      ===================================================== */}

      {settings.showProjects && (
        <section
          id="projects"
          style={sectionStyle}
        >
          <div style={containerStyle}>
            <div
              style={sectionHeadingStyle}
            >
              <div style={smallBlueText}>
                OUR DEVELOPMENTS
              </div>

              <h2
                style={sectionTitleStyle}
              >
                Projects
              </h2>
            </div>

            {loadingProjects ? (
              <div
                style={emptyBoxStyle}
              >
                Loading projects...
              </div>
            ) : projectError ? (
              <div
                style={emptyBoxStyle}
              >
                {projectError}
              </div>
            ) : projects.length === 0 ? (
              <div
                style={emptyBoxStyle}
              >
                No projects available.
              </div>
            ) : (
              <div style={gridStyle}>
                {projects.map(
                  (project, index) => {
                    const projectId =
                      project.id ||
                      project._id ||
                      project.project_id;

                    const projectName =
                      project.project_name ||
                      project.name ||
                      "SRS Burooj Project";

                    return (
                      <article
                        key={
                          projectId ||
                          index
                        }
                        style={{
                          ...cardStyle,
                          padding: 0,
                          overflow: "hidden",
                        }}
                      >
                        {getProjectImage(project) ? (
                          <img
                            src={getProjectImage(project)}
                            alt={projectName}
                            style={{
                              width: "100%",
                              height: "220px",
                              objectFit: "cover",
                              display: "block",
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              ...projectIconStyle,
                              margin: "22px 22px 16px",
                            }}
                          >
                            🏢
                          </div>
                        )}
                        <div style={{ padding: "0 24px 24px" }}>

                        <h3
                          style={
                            cardTitleStyle
                          }
                        >
                          {projectName}
                        </h3>

                        {project.location && (
                          <div
                            style={
                              locationStyle
                            }
                          >
                            {project.location}
                          </div>
                        )}

                        {project.description && (
                          <p
                            style={
                              descriptionStyle
                            }
                          >
                            {
                              project.description
                            }
                          </p>
                        )}

                        {project.status && (
                          <span
                            style={
                              statusBadgeStyle
                            }
                          >
                            {project.status}
                          </span>
                        )}
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          UNITS
      ===================================================== */}

      <section
        id="units"
        style={{
          ...sectionStyle,
          background: "#ffffff",
        }}
      >
        <div style={containerStyle}>
          <div
            style={sectionHeadingStyle}
          >
            <div style={smallBlueText}>
              AVAILABLE PROPERTIES
            </div>

            <h2
              style={sectionTitleStyle}
            >
              Project Units
            </h2>

            <p
              style={{
                margin: "10px auto 0",
                color: "#667085",
                maxWidth: "680px",
                lineHeight: 1.6,
                fontSize: "16px",
              }}
            >
              Explore units added by SRS
              Burooj. Unit availability
              and details are displayed
              directly from the system.
            </p>
          </div>

          {loadingUnits ? (
            <div
              style={emptyBoxStyle}
            >
              Loading units...
            </div>
          ) : unitError ? (
            <div
              style={emptyBoxStyle}
            >
              {unitError}
            </div>
          ) : units.length === 0 ? (
            <div
              style={emptyBoxStyle}
            >
              No units available.
            </div>
          ) : (
            <div style={unitGridStyle}>
              {units.map(
                (unit, index) => {
                  const image =
                    unitPhoto(unit);

                  const status =
                    unitStatus(unit);

                  const statusStyle =
                    getStatusStyle(
                      status
                    );

                  return (
                    <article
                      key={
                        unit.id ||
                        unit._id ||
                        index
                      }
                      style={
                        unitCardStyle
                      }
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={unitNumber(
                            unit
                          )}
                          style={
                            unitImageStyle
                          }
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div
                          style={
                            unitImagePlaceholder
                          }
                        >
                          <span
                            style={{
                              fontSize:
                                "38px",
                            }}
                          >
                            {"🏢"}
                          </span>

                          <span
                            style={{
                              fontSize:
                                "14px",
                            }}
                          >
                            SRS BUROOJ
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          padding:
                            "19px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                            marginBottom:
                              "10px",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color:
                                "#0b1f3a",
                              fontSize:
                                "21px",
                            }}
                          >
                            {unitNumber(
                              unit
                            )}
                          </h3>

                          <span
                            style={{
                              ...unitStatusStyle,
                              ...statusStyle,
                            }}
                          >
                            {status}
                          </span>
                        </div>

                        {unitProject(
                          unit
                        ) && (
                          <div
                            style={{
                              color:
                                "#155eef",
                              fontWeight:
                                "800",
                              fontSize:
                                "14px",
                              marginBottom:
                                "13px",
                            }}
                          >
                            {unitProject(
                              unit
                            )}
                          </div>
                        )}

                        <div
                          style={
                            unitDetailsGridStyle
                          }
                        >
                          {unitBhk(
                            unit
                          ) && (
                            <div>
                              <small
                                style={
                                  detailLabelStyle
                                }
                              >
                                Type
                              </small>

                              <strong
                                style={
                                  detailValueStyle
                                }
                              >
                                {unitBhk(
                                  unit
                                )}
                              </strong>
                            </div>
                          )}

                          {unitArea(
                            unit
                          ) && (
                            <div>
                              <small
                                style={
                                  detailLabelStyle
                                }
                              >
                                Area
                              </small>

                              <strong
                                style={
                                  detailValueStyle
                                }
                              >
                                {unitArea(
                                  unit
                                )}{" "}
                                sq.ft
                              </strong>
                            </div>
                          )}

                          {unitFloor(
                            unit
                          ) && (
                            <div>
                              <small
                                style={
                                  detailLabelStyle
                                }
                              >
                                Floor
                              </small>

                              <strong
                                style={
                                  detailValueStyle
                                }
                              >
                                {unitFloor(
                                  unit
                                )}
                              </strong>
                            </div>
                          )}

                          {unitPrice(
                            unit
                          ) && (
                            <div>
                              <small
                                style={
                                  detailLabelStyle
                                }
                              >
                                Price
                              </small>

                              <strong
                                style={{
                                  ...detailValueStyle,
                                  color:
                                    "#155eef",
                                }}
                              >
                                ₹{" "}
                                {formatAmount(
                                  unitPrice(
                                    unit
                                  )
                                )}
                              </strong>
                            </div>
                          )}
                        </div>

                        <a
                          href="/contact"
                          style={{
                            display:
                              "block",
                            textAlign:
                              "center",
                            marginTop:
                              "17px",
                            padding:
                              "11px",
                            borderRadius:
                              "8px",
                            background:
                              "#155eef",
                            color:
                              "#ffffff",
                            textDecoration:
                              "none",
                            fontWeight:
                              "800",
                            fontSize:
                              "14px",
                          }}
                        >
                          Enquire About
                          This Unit
                        </a>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          ADVERTISEMENTS
      ===================================================== */}

      <section
        id="advertisements"
        style={sectionStyle}
      >
        <div style={containerStyle}>
          <div
            style={sectionHeadingStyle}
          >
            <div style={smallBlueText}>
              SPECIAL OFFERS
            </div>

            <h2
              style={sectionTitleStyle}
            >
              Latest Advertisements
            </h2>
          </div>

          {loadingAdvertisements ? (
            <div
              style={emptyBoxStyle}
            >
              Loading advertisements...
            </div>
          ) : advertisementError ? (
            <div
              style={emptyBoxStyle}
            >
              {advertisementError}
            </div>
          ) : visibleAdvertisements.length ===
            0 ? (
            <div
              style={emptyBoxStyle}
            >
              No advertisements available.
            </div>
          ) : (
            <div style={gridStyle}>
              {visibleAdvertisements.map(
                (
                  advertisement,
                  index
                ) => {
                  const image =
                    getAdvertisementImage(
                      advertisement
                    );

                  const featured =
                    advertisement?.featured ===
                      true ||
                    advertisement?.featured ===
                      1 ||
                    String(
                      advertisement?.featured
                    ).toLowerCase() ===
                      "true";

                  return (
                    <article
                      key={
                        advertisement.id ||
                        advertisement._id ||
                        index
                      }
                      style={{
                        ...cardStyle,
                        padding: 0,
                        overflow:
                          "hidden",
                        position:
                          "relative",
                      }}
                    >
                      {featured && (
                        <div
                          style={
                            featuredBadgeStyle
                          }
                        >
                          FEATURED
                        </div>
                      )}

                      {image ? (
                        <img
                          src={image}
                          alt={
                            advertisement.title ||
                            "SRS Burooj Advertisement"
                          }
                          style={{
                            width: "100%",
                            height:
                              "245px",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height:
                              "245px",
                            background:
                              "#eaf2ff",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            color:
                              "#155eef",
                            fontWeight:
                              "800",
                            fontSize:
                              "15px",
                          }}
                        >
                          SRS BUROOJ
                        </div>
                      )}

                      <div
                        style={{
                          padding:
                            "20px",
                        }}
                      >
                        <h3
                          style={{
                            margin:
                              "0 0 9px",
                            color:
                              "#0b1f3a",
                            fontSize:
                              "20px",
                          }}
                        >
                          {advertisement.title ||
                            advertisement.offer_title ||
                            advertisement.name ||
                            "Special Offer"}
                        </h3>

                        {advertisement.description && (
                          <p
                            style={
                              descriptionStyle
                            }
                          >
                            {
                              advertisement.description
                            }
                          </p>
                        )}

                        {advertisement.offer_details && (
                          <p
                            style={
                              descriptionStyle
                            }
                          >
                            {
                              advertisement.offer_details
                            }
                          </p>
                        )}

                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: "7px",
                            marginTop:
                              "12px",
                          }}
                        >
                          {advertisement.project_name && (
                            <span
                              style={
                                tagStyle
                              }
                            >
                              {
                                advertisement.project_name
                              }
                            </span>
                          )}

                          {advertisement.location && (
                            <span
                              style={
                                tagStyle
                              }
                            >
                              {
                                advertisement.location
                              }
                            </span>
                          )}

                          {advertisement.bhk && (
                            <span
                              style={
                                tagStyle
                              }
                            >
                              {
                                advertisement.bhk
                              }
                            </span>
                          )}
                        </div>

                        {advertisement.price && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                              color:
                                "#155eef",
                              fontSize:
                                "19px",
                              fontWeight:
                                "900",
                            }}
                          >
                            {
                              advertisement.price
                            }
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          ABOUT
      ===================================================== */}

      {settings.showAbout && (
        <section
          style={{
            ...sectionStyle,
            background:
              "#ffffff",
          }}
        >
          <div style={containerStyle}>
            <div
              style={{
                maxWidth:
                  "820px",
                margin:
                  "0 auto",
                textAlign:
                  "center",
              }}
            >
              <div
                style={smallBlueText}
              >
                ABOUT US
              </div>

              <h2
                style={
                  sectionTitleStyle
                }
              >
                {settings.aboutTitle}
              </h2>

              <p
                style={{
                  color:
                    "#667085",
                  lineHeight:
                    1.8,
                  fontSize:
                    "16px",
                }}
              >
                {settings.aboutText}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          CUSTOMER REVIEWS
          PUBLIC WEBSITE
      ===================================================== */}

      <section
        id="reviews"
        style={{
          background:
            "#f7faff",
        }}
      >
        <WebsiteReviews />
      </section>

      {/* =====================================================
          CONTACT
      ===================================================== */}

      {settings.showInquiry && (
        <section
          id="contact"
          style={{
            padding:
              "70px 0",
            background:
              "linear-gradient(135deg,#071d3a,#155eef)",
            color:
              "#ffffff",
          }}
        >
          <div
            style={{
              ...containerStyle,
              textAlign:
                "center",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 12px",
                fontSize:
                  "32px",
              }}
            >
              Ready to Build Your
              Future?
            </h2>

            <p
              style={{
                margin:
                  "0 auto 25px",
                maxWidth:
                  "650px",
                color:
                  "rgba(255,255,255,.85)",
                lineHeight:
                  1.7,
                fontSize:
                  "16px",
              }}
            >
              Connect with SRS Burooj
              for property information
              and enquiries.
            </p>

            <a
              href="/contact"
              style={{
                display:
                  "inline-block",
                background:
                  "#ffffff",
                color:
                  "#155eef",
                padding:
                  "13px 25px",
                borderRadius:
                  "8px",
                textDecoration:
                  "none",
                fontWeight:
                  "800",
                fontSize:
                  "15px",
              }}
            >
              Send an Enquiry
            </a>
          </div>
        </section>
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        style={{
          background:
            "#06152b",
          color:
            "#ffffff",
          padding:
            "35px 0 22px",
        }}
      >
        <div style={containerStyle}>
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: "30px",
              paddingBottom:
                "25px",
            }}
          >
            <div>
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                }}
              >
                <img
                  src={logoSource}
                  alt="SRS Burooj"
                  style={{
                    width:
                      "45px",
                    height:
                      "45px",
                    objectFit:
                      "contain",
                  }}
                />

                <strong
                  style={{
                    fontSize:
                      "16px",
                  }}
                >
                  SRS BUROOJ
                </strong>
              </div>
            </div>

            <div>
              <h4
                style={{
                  fontSize:
                    "17px",
                  marginTop: 0,
                }}
              >
                Contact
              </h4>

              {settings.phone && (
                <div
                  style={
                    footerTextStyle
                  }
                >
                  {settings.phone}
                </div>
              )}

              {settings.email && (
                <div
                  style={
                    footerTextStyle
                  }
                >
                  {settings.email}
                </div>
              )}

              {settings.address && (
                <div
                  style={
                    footerTextStyle
                  }
                >
                  {settings.address}
                </div>
              )}

              {settings.officeTiming && (
                <div
                  style={
                    footerTextStyle
                  }
                >
                  {
                    settings.officeTiming
                  }
                </div>
              )}
            </div>

            <div>
              <h4
                style={{
                  fontSize:
                    "17px",
                  marginTop: 0,
                }}
              >
                Follow Us
              </h4>

              <div
                style={{
                  display:
                    "flex",
                  gap: "8px",
                }}
              >
                {socialLinks.map(
                  (social) => (
                    <a
                      key={
                        social.name
                      }
                      href={
                        social.url
                      }
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        width:
                          "38px",
                        height:
                          "38px",
                        borderRadius:
                          "50%",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "rgba(255,255,255,.1)",
                        color:
                          "#ffffff",
                        textDecoration:
                          "none",
                        fontWeight:
                          "800",
                        fontSize:
                          "15px",
                      }}
                    >
                      {
                        social.icon
                      }
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop:
                "1px solid rgba(255,255,255,.1)",
              paddingTop:
                "17px",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              flexWrap:
                "wrap",
              gap: "15px",
            }}
          >
            <span
              style={{
                color:
                  "rgba(255,255,255,.5)",
                fontSize:
                  "12px",
              }}
            >
              ©{" "}
              {new Date().getFullYear()}{" "}
              SRS Burooj. All rights
              reserved.
            </span>

            <a
              href="/login"
              style={{
                color:
                  "rgba(255,255,255,.25)",
                textDecoration:
                  "none",
                fontSize:
                  "11px",
              }}
            >
              Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// =========================================================
// HELPERS
// =========================================================

function formatAmount(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numeric = Number(
    String(value).replace(
      /[₹,\s]/g,
      ""
    )
  );

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  ).format(numeric);
}

// =========================================================
// STYLES
// =========================================================

const pageStyle = {
  minHeight: "100vh",
  background: "#f7faff",
  color: "#10233f",
  fontFamily:
    "Inter,Arial,Helvetica,sans-serif",
};

const containerStyle = {
  width:
    "min(1180px,calc(100% - 36px))",
  margin: "0 auto",
};

const headerContainerStyle = {
  ...containerStyle,
  minHeight: "64px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
};

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1000,
  background: "linear-gradient(135deg, #0b1f3a, #155eef)",
  borderBottom: "1px solid #1e40af",
  boxShadow: "0 4px 16px rgba(11,31,58,.18)",
};

const brandStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textDecoration: "none",
  color: "#ffffff",
};

const logoStyle = {
  width: "48px",
  height: "48px",
  objectFit: "contain",
};

const brandNameStyle = {
  fontSize: "18px",
  fontWeight: "900",
};

const brandSubStyle = {
  fontSize: "10px",
  color: "#dbeafe",
  letterSpacing: "1.2px",
};

const navStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "16px",
  flexWrap: "wrap",
};

const navLinkStyle = {
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "700",
};

const mediaBoxStyle = {
  position: "relative",
  width: "100%",
  height: "min(68vh,650px)",
  minHeight: "350px",
  borderRadius: "18px",
  overflow: "hidden",
  background: "#020a16",
};

const mediaImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const mediaLogoStyle = {
  position: "absolute",
  top: "18px",
  left: "18px",
  width: "48px",
  height: "48px",
  objectFit: "contain",
  background: "#ffffff",
  borderRadius: "10px",
  padding: "5px",
};

const mediaDotsStyle = {
  position: "absolute",
  bottom: "18px",
  left: "50%",
  transform:
    "translateX(-50%)",
  display: "flex",
  gap: "7px",
  padding: "7px 11px",
  borderRadius: "30px",
  background:
    "rgba(0,0,0,.48)",
};

const heroStyle = {
  background:
    "linear-gradient(135deg,#071d3a 0%,#0d3b73 55%,#155eef 100%)",
  color: "#ffffff",
  padding: "80px 0",
};

const heroBadgeStyle = {
  display: "inline-block",
  padding: "7px 13px",
  borderRadius: "30px",
  background:
    "rgba(255,255,255,.12)",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "1px",
  marginBottom: "18px",
};

const heroTitleStyle = {
  margin: "0 0 18px",
  fontSize:
    "clamp(36px,5vw,62px)",
  lineHeight: 1.08,
  fontWeight: "900",
};

const heroTextStyle = {
  margin: 0,
  maxWidth: "680px",
  color:
    "rgba(255,255,255,.88)",
  fontSize: "17px",
  lineHeight: 1.7,
};

const quickContactSection = {
  background: "linear-gradient(135deg, #0b1f3a, #155eef)",
  borderBottom: "1px solid #c9d9f5",
};

const quickContactContainer = {
  width: "min(1180px,calc(100% - 36px))",
  margin: "0 auto",
  padding: "9px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const quickContactStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "7px 12px",
  borderRadius: "25px",
  background: "#ffffff",
  border: "1px solid rgba(255,255,255,.8)",
  color: "#123b75",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
};

const iconCircleStyle = {
  width: "28px",
  height: "28px",
  flexShrink: 0,
  borderRadius: "50%",
  background: "#155eef",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  fontWeight: "800",
};

const sectionStyle = {
  padding: "70px 0",
};

const sectionHeadingStyle = {
  textAlign: "center",
  marginBottom: "35px",
};

const smallBlueText = {
  color: "#155eef",
  fontSize: "13px",
  fontWeight: "800",
  letterSpacing: "1.5px",
  marginBottom: "8px",
};

const sectionTitleStyle = {
  margin: 0,
  color: "#0b1f3a",
  fontSize: "30px",
  fontWeight: "800",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: "24px",
};

const unitGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(300px,1fr))",
  gap: "25px",
};

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #dce6f2",
  borderRadius: "16px",
  padding: "24px",
  boxShadow:
    "0 7px 22px rgba(11,31,58,.06)",
};

const unitCardStyle = {
  background: "#ffffff",
  border:
    "1px solid #dce6f2",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow:
    "0 8px 25px rgba(11,31,58,.08)",
};

const projectIconStyle = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  background: "#eaf2ff",
  color: "#155eef",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  marginBottom: "16px",
};

const cardTitleStyle = {
  margin: "0 0 9px",
  color: "#0b1f3a",
  fontSize: "20px",
};

const locationStyle = {
  color: "#155eef",
  fontSize: "14px",
  fontWeight: "700",
  marginBottom: "9px",
};

const descriptionStyle = {
  margin: "0 0 12px",
  color: "#667085",
  lineHeight: 1.6,
  fontSize: "15px",
};

const statusBadgeStyle = {
  display: "inline-block",
  marginTop: "15px",
  padding: "6px 10px",
  borderRadius: "20px",
  background: "#edf4ff",
  color: "#155eef",
  fontSize: "13px",
  fontWeight: "800",
};

const emptyBoxStyle = {
  background: "#ffffff",
  border:
    "1px solid #dce6f2",
  borderRadius: "14px",
  padding: "35px 20px",
  textAlign: "center",
  color: "#667085",
  fontSize: "16px",
};

const unitImageStyle = {
  width: "100%",
  height: "210px",
  objectFit: "cover",
  display: "block",
};

const unitImagePlaceholder = {
  width: "100%",
  height: "210px",
  background:
    "linear-gradient(135deg,#eaf2ff,#d8e8ff)",
  color: "#155eef",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontWeight: "800",
};

const unitStatusStyle = {
  padding: "5px 9px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const unitDetailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "12px",
};

const detailLabelStyle = {
  display: "block",
  color: "#667085",
  fontSize: "13px",
  marginBottom: "4px",
};

const detailValueStyle = {
  display: "block",
  color: "#10233f",
  fontSize: "15px",
  fontWeight: "800",
};

const featuredBadgeStyle = {
  position: "absolute",
  top: "14px",
  left: "14px",
  zIndex: 2,
  background: "#155eef",
  color: "#ffffff",
  padding: "6px 11px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "800",
};

const tagStyle = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "20px",
  background: "#edf4ff",
  color: "#155eef",
  fontSize: "12px",
  fontWeight: "700",
};

const footerTextStyle = {
  color:
    "rgba(255,255,255,.65)",
  fontSize: "14px",
  lineHeight: 1.7,
  marginBottom: "5px",
};

export default Home;
