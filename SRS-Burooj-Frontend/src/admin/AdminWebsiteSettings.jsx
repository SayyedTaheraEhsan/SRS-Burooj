import { adminFetch } from "./adminApi";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000";

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

  // Separate Home Page media
  homeMedia: [],
};

function AdminWebsiteSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("srsWebsiteSettings");

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        setSettings({
          ...defaultSettings,
          ...parsedSettings,
          homeMedia: Array.isArray(parsedSettings.homeMedia)
            ? parsedSettings.homeMedia
            : [],
        });
      }
    } catch (error) {
      console.error("Website settings load error:", error);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const uploadDataUrl = async (item) => {
    const blob = await (await adminFetch(item.src)).blob();
    const formData = new FormData();
    formData.append("media", blob, item.name || `home-media-${Date.now()}`);
    const response = await adminFetch(`${API_BASE}/api/website-media/upload`, {
      method: "POST", body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.url) {
      throw new Error(result.message || `Upload failed for ${item.name || "media"}.`);
    }
    return { ...item, src: result.url };
  };

  const handleSave = async () => {
    setUploading(true);
    setMessage("");
    try {
      const homeMedia = [];
      for (const item of settings.homeMedia || []) {
        homeMedia.push(item.src?.startsWith("data:") ? await uploadDataUrl(item) : item);
      }
      const updatedSettings = { ...settings, homeMedia };
      localStorage.setItem("srsWebsiteSettings", JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
      window.dispatchEvent(new Event("srs-website-settings-updated"));
      window.dispatchEvent(new Event("srsWebsiteSettingsUpdated"));
      setMessage("Website settings and Home Page media saved successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch (error) {
      console.error("Website settings save/upload error:", error);
      setMessage(error.message || "Unable to save settings. Check that the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------
  // HOME MEDIA
  // ---------------------------------------------------------

  const getMediaType = (file) => {
    if (!file) return "";

    if (file.type.startsWith("video/")) {
      return "video";
    }

    if (file.type.startsWith("image/")) {
      return "image";
    }

    return "";
  };

  const isAllowedMedia = (file) => {
    if (!file) return false;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    return allowedTypes.includes(file.type);
  };

  const handleHomeMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const slots = 3 - settings.homeMedia.length;
    if (slots <= 0) {
      alert("Maximum 3 Home Page media items are allowed.");
      event.target.value = "";
      return;
    }
    const selected = files.slice(0, slots);
    if (files.length > slots) alert(`Only ${slots} media item${slots > 1 ? "s" : ""} can be added. Maximum is 3.`);
    setUploading(true);
    setMessage("");
    try {
      const uploaded = [];
      for (const file of selected) {
        if (!isAllowedMedia(file)) {
          alert(`${file.name} is not supported.\n\nPlease select JPG, PNG, WEBP, MP4, WEBM or MOV.`);
          continue;
        }
        const formData = new FormData();
        formData.append("media", file, file.name);
        const response = await adminFetch(`${API_BASE}/api/website-media/upload`, { method: "POST", body: formData });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !result.url) throw new Error(result.message || `Unable to upload ${file.name}.`);
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: getMediaType(file), name: file.name, title: "", src: result.url,
        });
      }
      if (uploaded.length) {
        setSettings(previous => ({ ...previous, homeMedia: [...previous.homeMedia, ...uploaded].slice(0, 3) }));
        setMessage(`${uploaded.length} media item${uploaded.length > 1 ? "s" : ""} uploaded to server. Click Save Website Settings to save all settings.`);
      }
    } catch (error) {
      console.error("Home media upload error:", error);
      setMessage(error.message || "Media upload failed. Check that the backend is running.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleHomeMediaTitleChange = (id, value) => {
    setSettings((previous) => ({
      ...previous,
      homeMedia: previous.homeMedia.map((item) =>
        item.id === id
          ? {
              ...item,
              title: value,
            }
          : item
      ),
    }));
  };

  const removeHomeMedia = (id) => {
    setSettings((previous) => ({
      ...previous,
      homeMedia: previous.homeMedia.filter(
        (item) => item.id !== id
      ),
    }));
  };

  const moveHomeMedia = (index, direction) => {
    setSettings((previous) => {
      const updatedMedia = [...previous.homeMedia];

      const newIndex = index + direction;

      if (
        newIndex < 0 ||
        newIndex >= updatedMedia.length
      ) {
        return previous;
      }

      const currentItem = updatedMedia[index];

      updatedMedia[index] = updatedMedia[newIndex];
      updatedMedia[newIndex] = currentItem;

      return {
        ...previous,
        homeMedia: updatedMedia,
      };
    });
  };

  // ---------------------------------------------------------
  // STANDARD TEXT / INPUT STYLES
  // ---------------------------------------------------------

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    border: "1px solid #cbd8ea",
    borderRadius: "9px",
    fontSize: "16px",
    lineHeight: "1.5",
    color: "#10233f",
    background: "#ffffff",
    outline: "none",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "120px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "15px",
    lineHeight: "1.4",
    fontWeight: "700",
    color: "#10233f",
  };

  const sectionStyle = {
    background: "#ffffff",
    border: "1px solid #d8e3f2",
    borderRadius: "14px",
    padding: "25px",
    marginBottom: "22px",
    boxShadow: "0 5px 18px rgba(11, 31, 58, 0.05)",
  };

  const sectionHeadingStyle = {
    margin: "0 0 20px",
    color: "#0b1f3a",
    fontSize: "22px",
    lineHeight: "1.3",
    fontWeight: "800",
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#f7faff",
        padding: "28px",
        color: "#10233f",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* PAGE HEADER */}
        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              margin: "0 0 9px",
              color: "#0b1f3a",
              fontSize: "32px",
              lineHeight: "1.25",
              fontWeight: "800",
            }}
          >
            Website Settings
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "15px",
              lineHeight: "1.6",
            }}
          >
            Manage your public SRS Burooj website information.
          </p>
        </div>

        {/* SUCCESS / ERROR MESSAGE */}
        {message && (
          <div
            style={{
              background: "#eaf7ee",
              border: "1px solid #b7e4c7",
              color: "#18794e",
              padding: "13px 16px",
              borderRadius: "9px",
              marginBottom: "22px",
              fontSize: "15px",
              lineHeight: "1.5",
              fontWeight: "600",
            }}
          >
            {message}
          </div>
        )}

        {/* BRANDING */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Branding
          </h2>

          <div>
            <label style={labelStyle}>
              Logo Path
            </label>

            <input
              type="text"
              name="logo"
              value={settings.logo}
              onChange={handleChange}
              style={inputStyle}
              placeholder="/srs-burooj-logo.png"
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>
              Hero Image URL
            </label>

            <input
              type="text"
              name="heroImage"
              value={settings.heroImage}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Optional image URL"
            />
          </div>
        </section>

        {/* =====================================================
            HOME PAGE MEDIA
        ====================================================== */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  ...sectionHeadingStyle,
                  marginBottom: "0",
                }}
              >
                Home Page Media
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#667085",
                  fontSize: "14px",
                  lineHeight: "1.7",
                }}
              >
                Add up to 3 photos or videos that will be displayed
                automatically on the Home Page.
              </p>
            </div>

            <div
              style={{
                background: "#eaf2ff",
                color: "#155eef",
                padding: "9px 14px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "700",
                whiteSpace: "nowrap",
              }}
            >
              {settings.homeMedia.length} / 3 Added
            </div>
          </div>

          <div
            style={{
              background: "#f7faff",
              border: "1px solid #d8e3f2",
              borderRadius: "10px",
              padding: "15px",
              marginTop: "20px",
              marginBottom: "22px",
              color: "#52637a",
              fontSize: "14px",
              lineHeight: "1.7",
            }}
          >
            <strong style={{ color: "#10233f" }}>
              Supported:
            </strong>{" "}
            JPG, PNG, WEBP, MP4, WEBM and MOV.
            <br />
            Videos will be shown on the Home Page as muted autoplay
            media.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "13px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "13px 21px",
                background:
                  settings.homeMedia.length >= 3
                    ? "#aab4c3"
                    : "#155eef",
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "15px",
                cursor:
                  settings.homeMedia.length >= 3
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  settings.homeMedia.length >= 3
                    ? "none"
                    : "0 5px 15px rgba(21, 94, 239, 0.2)",
              }}
            >
              {uploading ? "Uploading..." : "+ Add Home Photo / Video"}

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={handleHomeMediaUpload}
                disabled={settings.homeMedia.length >= 3 || uploading}
                style={{
                  display: "none",
                }}
              />
            </label>

            <span
              style={{
                color: "#667085",
                fontSize: "14px",
              }}
            >
              Maximum 3 items
            </span>
          </div>

          {settings.homeMedia.length === 0 && (
            <div
              style={{
                border: "2px dashed #cbd8ea",
                borderRadius: "12px",
                padding: "48px 20px",
                textAlign: "center",
                color: "#667085",
                background: "#fbfdff",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "12px",
                }}
              >
                🖼️
              </div>

              <div
                style={{
                  fontWeight: "700",
                  fontSize: "16px",
                  color: "#344054",
                  marginBottom: "7px",
                }}
              >
                No Home Page media added
              </div>

              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                Add 2–3 photos or videos using the button above.
              </div>
            </div>
          )}

          {settings.homeMedia.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              {settings.homeMedia.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #d8e3f2",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "190px",
                      background: "#071a33",
                      overflow: "hidden",
                    }}
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.src}
                        muted
                        controls
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <img
                        src={item.src}
                        alt={item.title || item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}

                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "#155eef",
                        color: "#ffffff",
                        padding: "7px 11px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "700",
                      }}
                    >
                      {index + 1}.{" "}
                      {item.type === "video"
                        ? "VIDEO"
                        : "PHOTO"}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        color: "#344054",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        marginBottom: "9px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </div>

                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(event) =>
                        handleHomeMediaTitleChange(
                          item.id,
                          event.target.value
                        )
                      }
                      placeholder="Optional media title"
                      style={{
                        ...inputStyle,
                        marginBottom: "13px",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          moveHomeMedia(index, -1)
                        }
                        disabled={index === 0}
                        style={{
                          border: "1px solid #d8e3f2",
                          background:
                            index === 0
                              ? "#f2f4f7"
                              : "#ffffff",
                          color:
                            index === 0
                              ? "#98a2b3"
                              : "#155eef",
                          padding: "8px 11px",
                          borderRadius: "6px",
                          cursor:
                            index === 0
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "700",
                          fontSize: "16px",
                        }}
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveHomeMedia(index, 1)
                        }
                        disabled={
                          index ===
                          settings.homeMedia.length - 1
                        }
                        style={{
                          border: "1px solid #d8e3f2",
                          background:
                            index ===
                            settings.homeMedia.length - 1
                              ? "#f2f4f7"
                              : "#ffffff",
                          color:
                            index ===
                            settings.homeMedia.length - 1
                              ? "#98a2b3"
                              : "#155eef",
                          padding: "8px 11px",
                          borderRadius: "6px",
                          cursor:
                            index ===
                            settings.homeMedia.length - 1
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "700",
                          fontSize: "16px",
                        }}
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeHomeMedia(item.id)
                        }
                        style={{
                          border: "none",
                          background: "#fff1f0",
                          color: "#d92d20",
                          padding: "8px 13px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "14px",
                          marginLeft: "auto",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* HERO */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Home Page Hero
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Hero Title
            </label>

            <input
              type="text"
              name="heroTitle"
              value={settings.heroTitle}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Hero Description
            </label>

            <textarea
              name="heroDescription"
              value={settings.heroDescription}
              onChange={handleChange}
              style={textareaStyle}
            />
          </div>
        </section>

        {/* ABOUT */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            About Section
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              About Title
            </label>

            <input
              type="text"
              name="aboutTitle"
              value={settings.aboutTitle}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              About Text
            </label>

            <textarea
              name="aboutText"
              value={settings.aboutText}
              onChange={handleChange}
              style={textareaStyle}
            />
          </div>
        </section>

        {/* CONTACT */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Contact Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Phone
              </label>

              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Phone number"
              />
            </div>

            <div>
              <label style={labelStyle}>
                WhatsApp
              </label>

              <input
                type="text"
                name="whatsapp"
                value={settings.whatsapp}
                onChange={handleChange}
                style={inputStyle}
                placeholder="WhatsApp number"
              />
            </div>

            <div>
              <label style={labelStyle}>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Email address"
              />
            </div>

            <div>
              <label style={labelStyle}>
                Office Timing
              </label>

              <input
                type="text"
                name="officeTiming"
                value={settings.officeTiming}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Example: Mon-Sat, 10 AM - 7 PM"
              />
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>
              Address
            </label>

            <textarea
              name="address"
              value={settings.address}
              onChange={handleChange}
              style={textareaStyle}
              placeholder="Office address"
            />
          </div>
        </section>

        {/* SOCIAL MEDIA */}
        <section style={sectionStyle}>
          <h2
            style={{
              ...sectionHeadingStyle,
              marginBottom: "8px",
            }}
          >
            Social Media
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#667085",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Enter public profile links or handles. Do not enter
            social-media passwords here.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Instagram
              </label>

              <input
                type="text"
                name="instagram"
                value={settings.instagram}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Instagram profile URL"
              />
            </div>

            <div>
              <label style={labelStyle}>
                Facebook
              </label>

              <input
                type="text"
                name="facebook"
                value={settings.facebook}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Facebook profile URL"
              />
            </div>

            <div>
              <label style={labelStyle}>
                YouTube
              </label>

              <input
                type="text"
                name="youtube"
                value={settings.youtube}
                onChange={handleChange}
                style={inputStyle}
                placeholder="YouTube channel URL"
              />
            </div>
          </div>
        </section>

        {/* VISIBILITY */}
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>
            Website Sections
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "15px",
                background: "#f7faff",
                border: "1px solid #d8e3f2",
                borderRadius: "9px",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              <input
                type="checkbox"
                name="showProjects"
                checked={settings.showProjects}
                onChange={handleChange}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />

              <span
                style={{
                  fontWeight: "600",
                  color: "#10233f",
                }}
              >
                Show Projects
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "15px",
                background: "#f7faff",
                border: "1px solid #d8e3f2",
                borderRadius: "9px",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              <input
                type="checkbox"
                name="showAbout"
                checked={settings.showAbout}
                onChange={handleChange}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />

              <span
                style={{
                  fontWeight: "600",
                  color: "#10233f",
                }}
              >
                Show About
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "15px",
                background: "#f7faff",
                border: "1px solid #d8e3f2",
                borderRadius: "9px",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              <input
                type="checkbox"
                name="showInquiry"
                checked={settings.showInquiry}
                onChange={handleChange}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                }}
              />

              <span
                style={{
                  fontWeight: "600",
                  color: "#10233f",
                }}
              >
                Show Inquiry
              </span>
            </label>
          </div>
        </section>

        {/* SAVE */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingBottom: "30px",
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={uploading}
            style={{
              border: "none",
              background: "#155eef",
              color: "#ffffff",
              padding: "14px 30px",
              borderRadius: "9px",
              fontSize: "16px",
              lineHeight: "1.4",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow:
                "0 5px 15px rgba(21, 94, 239, 0.2)",
            }}
          >
            {uploading ? "Please wait..." : "Save Website Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminWebsiteSettings;