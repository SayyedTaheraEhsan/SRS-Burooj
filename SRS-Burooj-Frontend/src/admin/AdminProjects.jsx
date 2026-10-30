import { adminFetch } from "./adminApi";

import { useEffect, useMemo, useState } from "react";

import API_BASE_URL from "../apiBase";

const API_BASE = API_BASE_URL;
const UNITS_API = `${API_BASE}/api/units`;

const PROPERTY_TYPES = [
  "Flat / Apartment",
  "Row House",
  "Villa",
  "Plot",
  "Shop",
  "Office",
  "Other",
];

const FACILITY_OPTIONS = [
  "Parking",
  "Lift",
  "Garden",
  "Gym",
  "Club House",
  "Swimming Pool",
  "Children's Play Area",
  "Security",
  "CCTV",
  "Power Backup",
  "Water Supply",
  "Community Hall",
];

const EMPTY_STRUCTURE_ROW = {
  property_type: "Flat / Apartment",
  quantity: "",
};

const emptyForm = {
  project_name: "",
  location: "",
  description: "",
  status: "Upcoming",
  total_units: "",
  total_wings: "",
  total_floors: "",
  property_types: [],
  structure_rows: [{ ...EMPTY_STRUCTURE_ROW }],
  facilities: [],
};

function safeJsonParse(value, fallback = []) {
  if (Array.isArray(value)) return value;

  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeProject(project) {
  const propertyTypes = safeJsonParse(project.property_types, []);
  const structureRows = safeJsonParse(project.structure_rows, []);
  const facilities = safeJsonParse(project.facilities, []);

  return {
    ...project,

    property_types: Array.isArray(propertyTypes)
      ? propertyTypes
      : [],

    structure_rows:
      Array.isArray(structureRows) && structureRows.length > 0
        ? structureRows.map((row) => ({
            property_type:
              row?.property_type || "Flat / Apartment",
            quantity:
              row?.quantity === null ||
              row?.quantity === undefined
                ? ""
                : row.quantity,
          }))
        : [{ ...EMPTY_STRUCTURE_ROW }],

    facilities: Array.isArray(facilities)
      ? facilities
      : [],

    total_units:
      project.total_units === null ||
      project.total_units === undefined
        ? ""
        : project.total_units,

    total_wings:
      project.total_wings === null ||
      project.total_wings === undefined
        ? ""
        : project.total_wings,

    total_floors:
      project.total_floors === null ||
      project.total_floors === undefined
        ? ""
        : project.total_floors,
  };
}

function LargeDropdown({
  value,
  options,
  onChange,
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function closeDropdown(event) {
      if (!event.target.closest("[data-large-dropdown]")) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeDropdown);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
    };
  }, []);

  return (
    <div data-large-dropdown style={styles.dropdownWrapper}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={styles.dropdownButton}
      >
        <span>{value || placeholder}</span>

        <span style={styles.dropdownArrow}>
          {open ? "â–²" : "â–¼"}
        </span>
      </button>

      {open && (
        <div style={styles.dropdownMenu}>
          {options.map((option) => {
            const selected =
              String(option) === String(value);

            return (
              <button
                type="button"
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  ...styles.dropdownOption,
                  ...(selected
                    ? styles.dropdownOptionSelected
                    : {}),
                }}
              >
                {option}

                {selected && (
                  <span style={styles.dropdownCheck}>
                    âœ“
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [projectUnits, setProjectUnits] = useState({});
  const [unitsLoading, setUnitsLoading] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMedia, setProjectMedia] = useState([]);

  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);

  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [customFacility, setCustomFacility] = useState("");

  const totalStructureUnits = useMemo(() => {
    return form.structure_rows.reduce(
      (total, row) =>
        total + (Number(row.quantity) || 0),
      0
    );
  }, [form.structure_rows]);

  useEffect(() => {
    loadProjects();
    loadProjectUnits();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);

      const response = await adminFetch(
        `${API_BASE}/api/projects`
      );

      if (!response.ok) {
        throw new Error("Projects load failed");
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.projects)
        ? data.projects
        : [];

      setProjects(list.map(normalizeProject));
    } catch (error) {
      console.error("Load projects error:", error);
      alert("Projects load nahi ho rahe.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectUnits(showError = true) {
    try {
      setUnitsLoading(true);

      const response = await adminFetch(UNITS_API);

      if (!response.ok) {
        throw new Error("Units load failed");
      }

      const data = await response.json();

      const units = Array.isArray(data)
        ? data
        : Array.isArray(data.units)
        ? data.units
        : [];

      const grouped = {};

      units.forEach((unit) => {
        if (!unit.project_id) return;

        const key = String(unit.project_id);

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(unit);
      });

      setProjectUnits(grouped);
    } catch (error) {
      console.error(
        "Load project units error:",
        error
      );

      setProjectUnits({});

      if (showError) {
        alert("Added units fetch nahi ho rahe.");
      }
    } finally {
      setUnitsLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([
      loadProjects(),
      loadProjectUnits(false),
    ]);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      structure_rows: [
        { ...EMPTY_STRUCTURE_ROW },
      ],
    });

    setEditingId(null);
    setPhotoFiles([]);
    setVideoFile(null);
    setSelectedProject(null);
    setProjectMedia([]);
    setCustomFacility("");
  }

  function togglePropertyType(type) {
    setForm((prev) => {
      const exists =
        prev.property_types.includes(type);

      return {
        ...prev,
        property_types: exists
          ? prev.property_types.filter(
              (item) => item !== type
            )
          : [...prev.property_types, type],
      };
    });
  }

  function toggleFacility(facility) {
    setForm((prev) => {
      const exists =
        prev.facilities.includes(facility);

      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter(
              (item) => item !== facility
            )
          : [...prev.facilities, facility],
      };
    });
  }

  function addCustomFacility() {
    const facilityName =
      customFacility.trim();

    if (!facilityName) {
      alert(
        "Pehle custom facility ka naam likhein."
      );
      return;
    }

    const alreadyExists =
      form.facilities.some(
        (facility) =>
          String(facility).toLowerCase() ===
          facilityName.toLowerCase()
      );

    if (alreadyExists) {
      alert("Ye facility already added hai.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      facilities: [
        ...prev.facilities,
        facilityName,
      ],
    }));

    setCustomFacility("");
  }

  function removeFacility(facility) {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.filter(
        (item) => item !== facility
      ),
    }));
  }

  function addStructureRow() {
    setForm((prev) => ({
      ...prev,
      structure_rows: [
        ...prev.structure_rows,
        { ...EMPTY_STRUCTURE_ROW },
      ],
    }));
  }

  function removeStructureRow(index) {
    setForm((prev) => {
      if (prev.structure_rows.length === 1) {
        return prev;
      }

      return {
        ...prev,
        structure_rows:
          prev.structure_rows.filter(
            (_, rowIndex) =>
              rowIndex !== index
          ),
      };
    });
  }

  function updateStructureRow(
    index,
    field,
    value
  ) {
    setForm((prev) => ({
      ...prev,
      structure_rows:
        prev.structure_rows.map(
          (row, rowIndex) =>
            rowIndex === index
              ? {
                  ...row,
                  [field]: value,
                }
              : row
        ),
    }));
  }

  async function saveProject(event) {
    event.preventDefault();

    if (!form.project_name.trim()) {
      alert("Project name required hai.");
      return;
    }

    if (!form.location.trim()) {
      alert("Location required hai.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        project_name:
          form.project_name.trim(),

        location:
          form.location.trim(),

        description:
          form.description.trim(),

        status: form.status,

        total_units:
          form.total_units === ""
            ? null
            : Number(form.total_units),

        total_wings:
          form.total_wings === ""
            ? null
            : Number(form.total_wings),

        total_floors:
          form.total_floors === ""
            ? null
            : Number(form.total_floors),

        property_types:
          form.property_types,

        structure_rows:
          form.structure_rows.map((row) => ({
            property_type:
              row.property_type,

            quantity:
              row.quantity === ""
                ? 0
                : Number(row.quantity),
          })),

        facilities:
          form.facilities,
      };

      const url = editingId
        ? `${API_BASE}/api/projects/${editingId}`
        : `${API_BASE}/api/projects`;

      const response = await adminFetch(url, {
        method: editingId ? "PUT" : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Project save failed"
        );
      }

      alert(
        editingId
          ? "Project successfully updated."
          : "Project successfully created."
      );

      await refreshAll();

      resetForm();
    } catch (error) {
      console.error(
        "Save project error:",
        error
      );

      alert(
        error.message ||
          "Project save nahi ho raha."
      );
    } finally {
      setSaving(false);
    }
  }

  function editProject(project) {
    const normalized =
      normalizeProject(project);

    setForm({
      project_name:
        normalized.project_name || "",

      location:
        normalized.location || "",

      description:
        normalized.description || "",

      status:
        normalized.status || "Upcoming",

      total_units:
        normalized.total_units ?? "",

      total_wings:
        normalized.total_wings ?? "",

      total_floors:
        normalized.total_floors ?? "",

      property_types:
        normalized.property_types || [],

      structure_rows:
        normalized.structure_rows?.length
          ? normalized.structure_rows
          : [
              {
                ...EMPTY_STRUCTURE_ROW,
              },
            ],

      facilities:
        normalized.facilities || [],
    });

    setCustomFacility("");
    setEditingId(project.id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteProject(projectId) {
    const confirmDelete =
      window.confirm(
        "Kya aap is project ko delete karna chahte hain?"
      );

    if (!confirmDelete) return;

    try {
      const response = await adminFetch(
        `${API_BASE}/api/projects/${projectId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Project delete failed"
        );
      }

      alert("Project delete ho gaya.");

      if (
        selectedProject &&
        Number(selectedProject.id) ===
          Number(projectId)
      ) {
        setSelectedProject(null);
        setProjectMedia([]);
      }

      await refreshAll();
    } catch (error) {
      console.error(
        "Delete project error:",
        error
      );

      alert(
        error.message ||
          "Project delete nahi ho raha."
      );
    }
  }

  async function openMedia(project) {
    try {
      setSelectedProject(project);
      setMediaLoading(true);

      const response = await adminFetch(
        `${API_BASE}/api/project-media/${project.id}`
      );

      if (!response.ok) {
        throw new Error(
          "Media load failed"
        );
      }

      const data = await response.json();

      const media = Array.isArray(data)
        ? data
        : Array.isArray(data.media)
        ? data.media
        : [];

      setProjectMedia(media);
    } catch (error) {
      console.error(
        "Media load error:",
        error
      );

      setProjectMedia([]);

      alert(
        "Project media load nahi ho raha."
      );
    } finally {
      setMediaLoading(false);
    }
  }

  async function uploadPhotos() {
    if (!selectedProject) {
      alert("Pehle project select karein.");
      return;
    }

    if (!photoFiles.length) {
      alert("Pehle photos select karein.");
      return;
    }

    try {
      setUploadingPhotos(true);

      const formData =
        new FormData();

      photoFiles.forEach((file) => {
        formData.append(
          "photos",
          file
        );
      });

      const response = await adminFetch(
        `${API_BASE}/api/project-media/${selectedProject.id}/photos`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Photo upload failed"
        );
      }

      alert(
        "Project photos upload ho gayi."
      );

      setPhotoFiles([]);

      await openMedia(
        selectedProject
      );
    } catch (error) {
      console.error(
        "Photo upload error:",
        error
      );

      alert(
        error.message ||
          "Photos upload nahi ho rahi."
      );
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function uploadVideo() {
    if (!selectedProject) {
      alert("Pehle project select karein.");
      return;
    }

    if (!videoFile) {
      alert("Pehle video select karein.");
      return;
    }

    try {
      setUploadingVideo(true);

      const formData =
        new FormData();

      formData.append(
        "video",
        videoFile
      );

      const response = await adminFetch(
        `${API_BASE}/api/project-media/${selectedProject.id}/video`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Video upload failed"
        );
      }

      alert(
        "Project video successfully upload/replaced."
      );

      setVideoFile(null);

      await openMedia(
        selectedProject
      );
    } catch (error) {
      console.error(
        "Video upload error:",
        error
      );

      alert(
        error.message ||
          "Video upload nahi ho raha."
      );
    } finally {
      setUploadingVideo(false);
    }
  }

  async function deleteMedia(mediaId) {
    const confirmDelete =
      window.confirm(
        "Kya aap is media ko delete karna chahte hain?"
      );

    if (!confirmDelete) return;

    try {
      const response = await adminFetch(
        `${API_BASE}/api/project-media/${mediaId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Media delete failed"
        );
      }

      alert("Media delete ho gaya.");

      if (selectedProject) {
        await openMedia(
          selectedProject
        );
      }
    } catch (error) {
      console.error(
        "Delete media error:",
        error
      );

      alert(
        error.message ||
          "Media delete nahi ho raha."
      );
    }
  }

  function getMediaUrl(media) {
    if (!media) return "";

    const path =
      media.file_url ||
      media.media_url ||
      media.url ||
      media.file_path ||
      media.path ||
      "";

    if (!path) return "";

    if (
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      return path;
    }

    return `${API_BASE}${
      path.startsWith("/")
        ? ""
        : "/"
    }${path}`;
  }

  function isVideo(media) {
    const type = String(
      media?.media_type ||
        media?.type ||
        ""
    ).toLowerCase();

    const url =
      getMediaUrl(
        media
      ).toLowerCase();

    return (
      type.includes("video") ||
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".mov") ||
      url.endsWith(".m4v")
    );
  }

  function getUnitPrice(unit) {
    return (
      unit?.price ??
      unit?.base_price ??
      unit?.unit_price ??
      null
    );
  }

  function getUnitStatus(unit) {
    return (
      unit?.booking_status ??
      unit?.status ??
      "Available"
    );
  }

  function formatPrice(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "â€”";
    }

    const number =
      Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return `â‚¹${number.toLocaleString(
      "en-IN"
    )}`;
  }

  function getActualTypeCounts(units) {
    return units.reduce(
      (result, unit) => {
        const type =
          unit.property_type ||
          unit.unit_type ||
          "Other";

        result[type] =
          (result[type] || 0) + 1;

        return result;
      },
      {}
    );
  }

  function getStatusCounts(units) {
    return units.reduce(
      (result, unit) => {
        const status =
          String(
            getUnitStatus(unit)
          ).toLowerCase();

        if (
          status.includes("book") ||
          status.includes("reserve")
        ) {
          result.booked += 1;
        } else if (
          status.includes("sold") ||
          status.includes("sale")
        ) {
          result.sold += 1;
        } else {
          result.available += 1;
        }

        return result;
      },
      {
        available: 0,
        booked: 0,
        sold: 0,
      }
    );
  }

  return (
    <div className="admin-projects-page" style={styles.page}>
          {/* MOBILE RESPONSIVE CSS */}
          <style>{`
          .admin-projects-page {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      .admin-projects-page *,
      .admin-projects-page *::before,
      .admin-projects-page *::after {
        box-sizing: border-box;
      }

      @media (max-width: 768px) {
        .admin-projects-page {
          padding: 14px !important;
        }

        .admin-projects-page h1 {
          font-size: 25px !important;
          overflow-wrap: anywhere;
        }

        .admin-projects-page input,
        .admin-projects-page textarea,
        .admin-projects-page select {
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .admin-projects-page button {
          max-width: 100%;
          white-space: normal;
        }

        .admin-projects-page [style*="grid-template-columns"] {
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .admin-projects-page img,
        .admin-projects-page video {
          max-width: 100%;
        }
      }

      @media (max-width: 480px) {
        .admin-projects-page {
          padding: 10px !important;
        }

        .admin-projects-page h1 {
          font-size: 22px !important;
        }
      }
              `}</style>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Project Management
          </h1>

          <p style={styles.subtitle}>
            Create projects, define basic
            structure, upload photos, video
            and manage project units.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={refreshAll}
            style={
              styles.refreshButton
            }
            disabled={
              unitsLoading ||
              loading
            }
          >
            {unitsLoading
              ? "Refreshing..."
              : "â†» Refresh Projects & Units"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={
                styles.secondaryButton
              }
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={saveProject}
        style={styles.formCard}
      >
        <div
          style={
            styles.formMainHeader
          }
        >
          <div>
            <div
              style={
                styles.formHeaderEyebrow
              }
            >
              SRS BUROOJ â€¢ PROJECT SETUP
            </div>

            <h2
              style={
                styles.formMainTitle
              }
            >
              {editingId
                ? "Edit Project"
                : "Create New Project"}
            </h2>

            <p
              style={
                styles.formHeaderText
              }
            >
              Project ki basic information,
              structure aur facilities yahan
              manage karein.
            </p>
          </div>
        </div>

        <div
          style={{
            ...styles.formSection,
            ...styles.basicSection,
          }}
        >
          <div
            style={
              styles.sectionAccent
            }
          >
            <span
              style={
                styles.sectionNumberBadge
              }
            >
              1
            </span>

            <div>
              <h3
                style={
                  styles.formSectionTitle
                }
              >
                Basic Project Information
              </h3>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Project ka naam, location,
                status aur description.
              </p>
            </div>
          </div>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Project Name *
              </label>

              <input
                name="project_name"
                value={
                  form.project_name
                }
                onChange={
                  handleChange
                }
                placeholder="Enter project name"
                style={
                  styles.input
                }
                required
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Location *
              </label>

              <input
                name="location"
                value={
                  form.location
                }
                onChange={
                  handleChange
                }
                placeholder="Enter project location"
                style={
                  styles.input
                }
                required
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Project Status
              </label>

              <LargeDropdown
                value={
                  form.status
                }
                options={[
                  "Upcoming",
                  "Ongoing",
                  "Completed",
                  "On Hold",
                ]}
                onChange={(value) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      status: value,
                    })
                  )
                }
              />
            </div>
          </div>

          <div style={styles.field}>
            <label
              style={styles.label}
            >
              Project Description
            </label>

            <textarea
              name="description"
              value={
                form.description
              }
              onChange={
                handleChange
              }
              placeholder="Enter project description"
              rows={5}
              style={{
                ...styles.input,
                resize: "vertical",
                minHeight:
                  "130px",
              }}
            />
          </div>
        </div>

        <div
          style={{
            ...styles.formSection,
            ...styles.structureSection,
          }}
        >
          <div
            style={
              styles.sectionAccent
            }
          >
            <span
              style={
                styles.sectionNumberBadge
              }
            >
              2
            </span>

            <div>
              <h3
                style={
                  styles.formSectionTitle
                }
              >
                Property Structure â€”
                Basic Details
              </h3>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Project ka overall structure
                aur planned unit distribution.
              </p>
            </div>
          </div>

          <p
            style={
              styles.helpText
            }
          >
            Yahan project ka basic
            structure enter karein.
            Individual unit details Units
            section mein add ki jayengi.
          </p>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Total Units
              </label>

              <input
                type="number"
                min="0"
                name="total_units"
                value={
                  form.total_units
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. 120"
                style={
                  styles.input
                }
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Total Wings
              </label>

              <input
                type="number"
                min="0"
                name="total_wings"
                value={
                  form.total_wings
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. 4"
                style={
                  styles.input
                }
              />
            </div>

            <div style={styles.field}>
              <label
                style={styles.label}
              >
                Total Floors
              </label>

              <input
                type="number"
                min="0"
                name="total_floors"
                value={
                  form.total_floors
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. 12"
                style={
                  styles.input
                }
              />
            </div>
          </div>

          <div style={styles.field}>
            <label
              style={styles.label}
            >
              Property Types
            </label>

            <div
              style={
                styles.checkboxGrid
              }
            >
              {PROPERTY_TYPES.map(
                (type) => (
                  <label
                    key={type}
                    style={
                      styles.checkboxCard
                    }
                  >
                    <input
                      type="checkbox"
                      checked={form.property_types.includes(
                        type
                      )}
                      onChange={() =>
                        togglePropertyType(
                          type
                        )
                      }
                      style={
                        styles.checkbox
                      }
                    />

                    <span>
                      {type}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>

          <div
            style={
              styles.structureHeader
            }
          >
            <div>
              <label
                style={styles.label}
              >
                Type-wise Basic Unit
                Count
              </label>

              <p
                style={
                  styles.smallText
                }
              >
                Example: Flat /
                Apartment = 80, Shop =
                10, Villa = 5
              </p>
            </div>

            <button
              type="button"
              onClick={
                addStructureRow
              }
              style={
                styles.addButton
              }
            >
              + Add Type
            </button>
          </div>

          <div
            style={
              styles.structureBox
            }
          >
            {form.structure_rows.map(
              (row, index) => (
                <div
                  key={index}
                  style={
                    styles.structureRow
                  }
                >
                  <div
                    style={
                      styles.structureNumber
                    }
                  >
                    {index + 1}
                  </div>

                  <LargeDropdown
                    value={
                      row.property_type
                    }
                    options={
                      PROPERTY_TYPES
                    }
                    onChange={(
                      value
                    ) =>
                      updateStructureRow(
                        index,
                        "property_type",
                        value
                      )
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    value={
                      row.quantity
                    }
                    onChange={(
                      event
                    ) =>
                      updateStructureRow(
                        index,
                        "quantity",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Quantity"
                    style={
                      styles.input
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeStructureRow(
                        index
                      )
                    }
                    style={
                      styles.removeButton
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}

            <div
              style={
                styles.structureTotal
              }
            >
              <strong>
                Planned units from type
                counts:
              </strong>

              <span>
                {totalStructureUnits}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.formSection,
            ...styles.facilitySection,
          }}
        >
          <div
            style={
              styles.sectionAccent
            }
          >
            <span
              style={
                styles.sectionNumberBadge
              }
            >
              3
            </span>

            <div>
              <h3
                style={
                  styles.formSectionTitle
                }
              >
                Project Facilities /
                Amenities
              </h3>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Project mein available
                facilities aur special
                amenities select karein.
              </p>
            </div>
          </div>

          <p
            style={
              styles.helpText
            }
          >
            Available facilities select
            karein. Custom facility bhi
            add kar sakte hain.
          </p>

          <div
            style={
              styles.checkboxGrid
            }
          >
            {FACILITY_OPTIONS.map(
              (facility) => (
                <label
                  key={facility}
                  style={
                    styles.checkboxCard
                  }
                >
                  <input
                    type="checkbox"
                    checked={form.facilities.includes(
                      facility
                    )}
                    onChange={() =>
                      toggleFacility(
                        facility
                      )
                    }
                    style={
                      styles.checkbox
                    }
                  />

                  <span>
                    {facility}
                  </span>
                </label>
              )
            )}
          </div>

          <div
            style={
              styles.customFacilityBox
            }
          >
            <label
              style={styles.label}
            >
              Other / Custom Facility
            </label>

            <p
              style={
                styles.smallText
              }
            >
              Jaise: EV Charging,
              Temple, Jogging Track,
              Solar System, etc.
            </p>

            <div
              style={
                styles.customFacilityRow
              }
            >
              <input
                type="text"
                value={
                  customFacility
                }
                onChange={(
                  event
                ) =>
                  setCustomFacility(
                    event.target.value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    addCustomFacility();
                  }
                }}
                placeholder="Enter facility name"
                style={
                  styles.input
                }
              />

              <button
                type="button"
                onClick={
                  addCustomFacility
                }
                style={
                  styles.addCustomButton
                }
              >
                + Add Facility
              </button>
            </div>
          </div>

          <div
            style={
              styles.selectedFacilitiesBox
            }
          >
            <div
              style={
                styles.selectedFacilitiesTitle
              }
            >
              Selected Facilities
            </div>

            {form.facilities.length ===
            0 ? (
              <span
                style={
                  styles.mutedText
                }
              >
                No facilities selected.
              </span>
            ) : (
              <div
                style={
                  styles.selectedFacilitiesWrap
                }
              >
                {form.facilities.map(
                  (facility) => (
                    <div
                      key={facility}
                      style={
                        styles.selectedFacilityTag
                      }
                    >
                      <span>
                        {facility}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeFacility(
                            facility
                          )
                        }
                        style={
                          styles.removeFacilityButton
                        }
                      >
                        Ã—
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={
            styles.actionRow
          }
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              ...styles.primaryButton,
              opacity: saving
                ? 0.7
                : 1,
            }}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Project"
              : "Create Project"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={
                styles.secondaryButton
              }
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div
        style={
          styles.listSection
        }
      >
        <div
          style={
            styles.projectListHeader
          }
        >
          <div>
            <h2
              style={
                styles.listTitle
              }
            >
              All Projects
            </h2>

            <p
              style={
                styles.subtitle
              }
            >
              Added Units automatically
              project ke andar fetch ho
              rahe hain.
            </p>
          </div>
        </div>

        {loading ? (
          <div
            style={
              styles.emptyBox
            }
          >
            Loading projects...
          </div>
        ) : projects.length ===
          0 ? (
          <div
            style={
              styles.emptyBox
            }
          >
            No projects available.
          </div>
        ) : (
          <div
            style={
              styles.projectGrid
            }
          >
            {projects.map(
              (project) => {
                const normalized =
                  normalizeProject(
                    project
                  );

                const actualUnits =
                  projectUnits[
                    String(
                      project.id
                    )
                  ] || [];

                const structureTotal =
                  normalized.structure_rows.reduce(
                    (
                      sum,
                      row
                    ) =>
                      sum +
                      (Number(
                        row.quantity
                      ) || 0),
                    0
                  );

                const plannedUnits =
                  Number(
                    normalized.total_units
                  ) ||
                  structureTotal ||
                  0;

                const statusCounts =
                  getStatusCounts(
                    actualUnits
                  );

                const typeCounts =
                  getActualTypeCounts(
                    actualUnits
                  );

                return (
                  <div
                    key={
                      project.id
                    }
                    style={
                      styles.projectCard
                    }
                  >
                    <div
                      style={
                        styles.projectCardHeader
                      }
                    >
                      <div>
                        <h3
                          style={
                            styles.projectCardTitle
                          }
                        >
                          {
                            project.project_name
                          }
                        </h3>

                        <p
                          style={
                            styles.locationText
                          }
                        >
                          ðŸ“{" "}
                          {project.location ||
                            "â€”"}
                        </p>
                      </div>

                      <span
                        style={
                          styles.statusBadge
                        }
                      >
                        {project.status ||
                          "Upcoming"}
                      </span>
                    </div>

                    <p
                      style={
                        styles.descriptionText
                      }
                    >
                      {project.description ||
                        "No description added."}
                    </p>

                    <div
                      style={
                        styles.projectStatsGrid
                      }
                    >
                      <div
                        style={
                          styles.statCard
                        }
                      >
                        <span>
                          Planned Units
                        </span>

                        <strong>
                          {
                            plannedUnits
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          styles.statCardBlue
                        }
                      >
                        <span>
                          Actual Units
                        </span>

                        <strong>
                          {
                            actualUnits.length
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          styles.statCard
                        }
                      >
                        <span>
                          Wings
                        </span>

                        <strong>
                          {
                            normalized.total_wings ||
                            0
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          styles.statCard
                        }
                      >
                        <span>
                          Floors
                        </span>

                        <strong>
                          {
                            normalized.total_floors ||
                            0
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          styles.statCardGreen
                        }
                      >
                        <span>
                          Available
                        </span>

                        <strong>
                          {
                            statusCounts.available
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          styles.statCardOrange
                        }
                      >
                        <span>
                          Booked / Sold
                        </span>

                        <strong>
                          {
                            statusCounts.booked +
                            statusCounts.sold
                          }
                        </strong>
                      </div>
                    </div>

                    <div
                      style={
                        styles.unitsBlock
                      }
                    >
                      <div
                        style={
                          styles.unitsHeader
                        }
                      >
                        <div>
                          <strong
                            style={
                              styles.unitsTitle
                            }
                          >
                            Added Units
                          </strong>

                          <p
                            style={
                              styles.unitsSubtitle
                            }
                          >
                            {
                              actualUnits.length
                            }{" "}
                            unit(s)
                            database se
                            fetched
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            loadProjectUnits(
                              false
                            )
                          }
                          style={
                            styles.smallRefreshButton
                          }
                          disabled={
                            unitsLoading
                          }
                        >
                          â†» Refresh
                        </button>
                      </div>

                      {unitsLoading ? (
                        <div
                          style={
                            styles.unitsLoading
                          }
                        >
                          Units loading...
                        </div>
                      ) : actualUnits.length ===
                        0 ? (
                        <div
                          style={
                            styles.noUnitsBox
                          }
                        >
                          <strong>
                            Abhi koi unit
                            add nahi hui.
                          </strong>

                          <span>
                            Admin Units
                            section mein
                            unit add
                            karne ke baad
                            yahan
                            automatically
                            show hogi.
                          </span>
                        </div>
                      ) : (
                        <>
                          <div
                            style={
                              styles.actualTypeWrap
                            }
                          >
                            {Object.entries(
                              typeCounts
                            ).map(
                              ([
                                type,
                                count,
                              ]) => (
                                <span
                                  key={
                                    type
                                  }
                                  style={
                                    styles.actualTypeTag
                                  }
                                >
                                  {type}:{" "}
                                  {count}
                                </span>
                              )
                            )}
                          </div>

                          <div
                            style={
                              styles.unitsList
                            }
                          >
                            {actualUnits.map(
                              (
                                unit
                              ) => {
                                const unitPrice =
                                  getUnitPrice(
                                    unit
                                  );

                                const unitStatus =
                                  getUnitStatus(
                                    unit
                                  );

                                return (
                                  <div
                                    key={
                                      unit.id
                                    }
                                    style={
                                      styles.unitRow
                                    }
                                  >
                                    <div
                                      style={
                                        styles.unitMain
                                      }
                                    >
                                      <strong
                                        style={
                                          styles.unitNumber
                                        }
                                      >
                                        {unit.unit_number ||
                                          `Unit #${unit.id}`}
                                      </strong>

                                      <span>
                                        {unit.property_type ||
                                          "â€”"}
                                      </span>

                                      <span>
                                        {unit.unit_type ||
                                          "â€”"}
                                      </span>
                                    </div>

                                    <div
                                      style={
                                        styles.unitDetails
                                      }
                                    >
                                      <span>
                                        Floor:{" "}
                                        <strong>
                                          {unit.floor ||
                                            "â€”"}
                                        </strong>
                                      </span>

                                      <span>
                                        Area:{" "}
                                        <strong>
                                          {unit.carpet_area ||
                                            unit.built_up_area ||
                                            "â€”"}
                                          {unit.carpet_area ||
                                          unit.built_up_area
                                            ? " sq.ft."
                                            : ""}
                                        </strong>
                                      </span>

                                      <span>
                                        Price:{" "}
                                        <strong>
                                          {formatPrice(
                                            unitPrice
                                          )}
                                        </strong>
                                      </span>

                                      <span
                                        style={{
                                          ...styles.unitStatus,
                                          ...(String(
                                            unitStatus
                                          )
                                            .toLowerCase()
                                            .includes(
                                              "sold"
                                            )
                                            ? styles.soldStatus
                                            : String(
                                                unitStatus
                                              )
                                                .toLowerCase()
                                                .includes(
                                                  "book"
                                                )
                                            ? styles.bookedStatus
                                            : styles.availableStatus),
                                        }}
                                      >
                                        {
                                          unitStatus
                                        }
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      style={
                        styles.infoBlock
                      }
                    >
                      <strong>
                        Property Types
                      </strong>

                      <div
                        style={
                          styles.tagWrap
                        }
                      >
                        {normalized
                          .property_types
                          .length >
                        0 ? (
                          normalized.property_types.map(
                            (type) => (
                              <span
                                key={
                                  type
                                }
                                style={
                                  styles.typeTag
                                }
                              >
                                {type}
                              </span>
                            )
                          )
                        ) : (
                          <span
                            style={
                              styles.mutedText
                            }
                          >
                            Not added
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        styles.infoBlock
                      }
                    >
                      <strong>
                        Basic Type Counts
                      </strong>

                      <div
                        style={
                          styles.structureSummary
                        }
                      >
                        {normalized.structure_rows
                          .filter(
                            (
                              row
                            ) =>
                              Number(
                                row.quantity
                              ) > 0
                          )
                          .map(
                            (
                              row,
                              index
                            ) => (
                              <div
                                key={`${row.property_type}-${index}`}
                                style={
                                  styles.summaryRow
                                }
                              >
                                <span>
                                  {
                                    row.property_type
                                  }
                                </span>

                                <strong>
                                  {
                                    row.quantity
                                  }
                                </strong>
                              </div>
                            )
                          )}

                        {normalized.structure_rows.filter(
                          (
                            row
                          ) =>
                            Number(
                              row.quantity
                            ) > 0
                        ).length ===
                          0 && (
                          <span
                            style={
                              styles.mutedText
                            }
                          >
                            No type counts
                            added
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        styles.infoBlock
                      }
                    >
                      <strong>
                        Facilities
                      </strong>

                      <div
                        style={
                          styles.tagWrap
                        }
                      >
                        {normalized
                          .facilities
                          .length >
                        0 ? (
                          normalized.facilities.map(
                            (
                              facility
                            ) => (
                              <span
                                key={
                                  facility
                                }
                                style={
                                  styles.facilityTag
                                }
                              >
                                {
                                  facility
                                }
                              </span>
                            )
                          )
                        ) : (
                          <span
                            style={
                              styles.mutedText
                            }
                          >
                            No facilities
                            added
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={
                        styles.cardActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          editProject(
                            project
                          )
                        }
                        style={
                          styles.editButton
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openMedia(
                            project
                          )
                        }
                        style={
                          styles.mediaButton
                        }
                      >
                        Photos / Video
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProject(
                            project.id
                          )
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {selectedProject && (
        <div
          style={
            styles.mediaPanel
          }
        >
          <div
            style={
              styles.mediaPanelHeader
            }
          >
            <div>
              <h2
                style={
                  styles.listTitle
                }
              >
                Project Media
              </h2>

              <p
                style={
                  styles.subtitle
                }
              >
                {
                  selectedProject.project_name
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedProject(
                  null
                );
                setProjectMedia([]);
              }}
              style={
                styles.secondaryButton
              }
            >
              Close
            </button>
          </div>

          <div
            style={
              styles.mediaSection
            }
          >
            <h3
              style={
                styles.formSectionTitle
              }
            >
              Project Photos
            </h3>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setPhotoFiles(
                  Array.from(
                    event.target
                      .files || []
                  )
                )
              }
              style={
                styles.fileInput
              }
            />

            {photoFiles.length >
              0 && (
              <p
                style={
                  styles.smallText
                }
              >
                {
                  photoFiles.length
                }{" "}
                photo(s) selected
              </p>
            )}

            <button
              type="button"
              onClick={
                uploadPhotos
              }
              disabled={
                uploadingPhotos ||
                photoFiles.length ===
                  0
              }
              style={{
                ...styles.primaryButton,
                marginTop:
                  "14px",
              }}
            >
              {uploadingPhotos
                ? "Uploading..."
                : "Upload Photos"}
            </button>
          </div>

          <div
            style={
              styles.mediaSection
            }
          >
            <h3
              style={
                styles.formSectionTitle
              }
            >
              Project Video
            </h3>

            <p
              style={
                styles.helpText
              }
            >
              Ek project ke liye ek
              video rakha jayega.
              New video upload karne
              par existing video
              replace ho sakta hai.
            </p>

            <input
              type="file"
              accept="video/*"
              onChange={(event) =>
                setVideoFile(
                  event.target.files?.[0] ||
                    null
                )
              }
              style={
                styles.fileInput
              }
            />

            {videoFile && (
              <p
                style={
                  styles.smallText
                }
              >
                Selected:{" "}
                {videoFile.name}
              </p>
            )}

            <button
              type="button"
              onClick={
                uploadVideo
              }
              disabled={
                uploadingVideo ||
                !videoFile
              }
              style={{
                ...styles.primaryButton,
                marginTop:
                  "14px",
              }}
            >
              {uploadingVideo
                ? "Uploading..."
                : "Upload / Replace Video"}
            </button>
          </div>

          <div
            style={
              styles.mediaSection
            }
          >
            <h3
              style={
                styles.formSectionTitle
              }
            >
              Existing Media
            </h3>

            {mediaLoading ? (
              <div
                style={
                  styles.emptyBox
                }
              >
                Loading media...
              </div>
            ) : projectMedia.length ===
              0 ? (
              <div
                style={
                  styles.emptyBox
                }
              >
                No project media
                uploaded.
              </div>
            ) : (
              <div
                style={
                  styles.mediaGrid
                }
              >
                {projectMedia.map(
                  (media) => {
                    const url =
                      getMediaUrl(
                        media
                      );

                    return (
                      <div
                        key={
                          media.id
                        }
                        style={
                          styles.mediaCard
                        }
                      >
                        {isVideo(
                          media
                        ) ? (
                          <video
                            src={
                              url
                            }
                            controls
                            style={
                              styles.mediaPreview
                            }
                          />
                        ) : (
                          <img
                            src={
                              url
                            }
                            alt={
                              media.title ||
                              "Project"
                            }
                            style={
                              styles.mediaPreview
                            }
                          />
                        )}

                        <div
                          style={
                            styles.mediaCardFooter
                          }
                        >
                          <span
                            style={
                              styles.mediaType
                            }
                          >
                            {isVideo(
                              media
                            )
                              ? "VIDEO"
                              : "PHOTO"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              deleteMedia(
                                media.id
                              )
                            }
                            style={
                              styles.deleteButton
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "32px",
    boxSizing: "border-box",
    color: "#1f2937",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    fontWeight: "800",
    color: "#123b66",
  },

  subtitle: {
    margin: "9px 0 0",
    fontSize: "17px",
    lineHeight: "1.6",
    color: "#64748b",
  },

  formCard: {
    background: "#f4f8fc",
    border:
      "1px solid #c8d9ea",
    borderRadius: "22px",
    padding: "30px",
    boxShadow:
      "0 12px 35px rgba(20, 70, 110, 0.10)",
    marginBottom: "34px",
  },

  formMainHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    padding:
      "22px 24px",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, #0d477a 0%, #1769a8 55%, #2388c9 100%)",
    border:
      "1px solid #6ca9d8",
    boxShadow:
      "0 8px 22px rgba(21, 88, 137, 0.20)",
    marginBottom: "24px",
  },

  formHeaderEyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing:
      "2px",
    color: "#dff2ff",
    marginBottom: "7px",
  },

  formMainTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
  },

  formHeaderText: {
    margin:
      "8px 0 0",
    color: "#e5f3ff",
    fontSize: "15px",
    lineHeight: "1.5",
  },

  sectionAccent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    marginBottom: "22px",
  },

  sectionNumberBadge: {
    flexShrink: 0,
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    background:
      "#1769a8",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "800",
    boxShadow:
      "0 4px 10px rgba(23, 105, 168, 0.25)",
  },

  sectionDescription: {
    margin:
      "5px 0 0",
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.5",
  },

  formSection: {
    border:
      "1px solid #cbd8e5",
    borderRadius: "17px",
    padding: "27px",
    marginTop: "24px",
    boxShadow:
      "0 4px 15px rgba(30, 80, 120, 0.05)",
  },

  basicSection: {
    background:
      "linear-gradient(135deg, #edf6ff 0%, #ffffff 100%)",
    borderColor:
      "#b8d3ea",
  },

  structureSection: {
    background:
      "linear-gradient(135deg, #f2f8ff 0%, #ffffff 100%)",
    borderColor:
      "#bfd8ec",
  },

  facilitySection: {
    background:
      "linear-gradient(135deg, #eef8ff 0%, #ffffff 100%)",
    borderColor:
      "#c2dceb",
  },

  formSectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "800",
    color: "#163f63",
  },

  helpText: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "#64748b",
    margin:
      "0 0 20px",
  },

  smallText: {
    fontSize: "15px",
    lineHeight: "1.5",
    color: "#64748b",
    margin:
      "6px 0",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(270px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },

  field: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    fontSize: "17px",
    fontWeight: "700",
    marginBottom: "9px",
    color: "#20364a",
  },

  input: {
    width: "100%",
    minHeight: "52px",
    boxSizing: "border-box",
    border:
      "1px solid #b9cddd",
    borderRadius: "10px",
    padding:
      "14px 16px",
    fontSize: "17px",
    lineHeight: "1.4",
    outline: "none",
    background: "#fff",
    color: "#1f2937",
  },

  dropdownWrapper: {
    position: "relative",
    width: "100%",
    zIndex: 20,
  },

  dropdownButton: {
    width: "100%",
    minHeight: "52px",
    boxSizing: "border-box",
    border:
      "1px solid #b9cddd",
    borderRadius: "10px",
    padding:
      "14px 16px",
    fontSize: "17px",
    background: "#fff",
    color: "#1f2937",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    textAlign: "left",
  },

  dropdownArrow: {
    fontSize: "13px",
    color: "#1769a8",
  },

  dropdownMenu: {
    position: "absolute",
    top:
      "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: "#fff",
    border:
      "1px solid #9fc0da",
    borderRadius: "12px",
    boxShadow:
      "0 12px 30px rgba(15, 72, 112, 0.18)",
    padding: "7px",
    zIndex: 9999,
    maxHeight: "320px",
    overflowY: "auto",
  },

  dropdownOption: {
    width: "100%",
    minHeight: "52px",
    border: "none",
    borderRadius: "8px",
    padding:
      "13px 15px",
    background: "#fff",
    color: "#1f2937",
    fontSize: "17px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    textAlign: "left",
  },

  dropdownOptionSelected: {
    background: "#e6f2fc",
    color: "#125789",
    fontWeight: "800",
  },

  dropdownCheck: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#1769a8",
  },

  checkboxGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "12px",
  },

  checkboxCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "52px",
    border:
      "1px solid #c7d7e5",
    borderRadius: "10px",
    padding:
      "13px 15px",
    fontSize: "16px",
    fontWeight: "600",
    background:
      "rgba(255,255,255,0.90)",
    cursor: "pointer",
    transition:
      "all 0.2s ease",
  },

  checkbox: {
    width: "21px",
    height: "21px",
    cursor: "pointer",
    accentColor: "#1769a8",
  },

  structureHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    marginTop: "24px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  structureBox: {
    border:
      "1px solid #c4d9ea",
    borderRadius: "14px",
    padding: "18px",
    background:
      "rgba(255,255,255,0.82)",
  },

  structureRow: {
    display: "grid",
    gridTemplateColumns:
      "46px minmax(220px,1fr) minmax(140px,190px) 110px",
    gap: "12px",
    alignItems: "center",
    marginBottom: "14px",
  },

  structureNumber: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    borderRadius: "50%",
    background:
      "#1769a8",
    color: "#fff",
    fontWeight: "700",
  },

  structureTotal: {
    display: "flex",
    justifyContent:
      "space-between",
    borderTop:
      "1px solid #d6e2ec",
    paddingTop: "16px",
    marginTop: "10px",
    fontSize: "17px",
    color: "#29455d",
  },

  customFacilityBox: {
    marginTop: "24px",
    padding: "20px",
    border:
      "1px solid #bfd8ea",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.82)",
  },

  customFacilityRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(250px,1fr) auto",
    gap: "12px",
    alignItems: "center",
    marginTop: "12px",
  },

  selectedFacilitiesBox: {
    marginTop: "20px",
    padding: "18px",
    border:
      "1px solid #bfd8ea",
    borderRadius: "12px",
    background:
      "rgba(255,255,255,0.78)",
  },

  selectedFacilitiesTitle: {
    fontSize: "17px",
    fontWeight: "800",
    marginBottom: "12px",
    color: "#174a72",
  },

  selectedFacilitiesWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  selectedFacilityTag: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#e8f4fc",
    border:
      "1px solid #b9d8ec",
    borderRadius: "22px",
    padding:
      "8px 10px 8px 14px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#18547f",
  },

  removeFacilityButton: {
    width: "25px",
    height: "25px",
    border: "none",
    borderRadius: "50%",
    background: "#d5e9f6",
    color: "#18547f",
    fontSize: "20px",
    cursor: "pointer",
  },

  actionRow: {
    display: "flex",
    gap: "14px",
    marginTop: "30px",
    padding:
      "20px 4px 4px",
    borderTop:
      "1px solid #cbd9e5",
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: "50px",
    border: "none",
    borderRadius: "10px",
    padding:
      "13px 22px",
    background:
      "linear-gradient(135deg, #0d477a 0%, #1769a8 100%)",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "800",
    cursor: "pointer",
    border:
      "1px solid #0b5d96",
    boxShadow:
      "0 5px 14px rgba(23,105,168,0.22)",
  },

  secondaryButton: {
    minHeight: "50px",
    border:
      "1px solid #a9bfd2",
    borderRadius: "10px",
    padding:
      "12px 20px",
    background: "#fff",
    color: "#174a72",
    fontSize: "17px",
    fontWeight: "700",
    cursor: "pointer",
  },

  refreshButton: {
    minHeight: "50px",
    border:
      "1px solid #1769a8",
    borderRadius: "10px",
    padding:
      "12px 18px",
    background: "#1769a8",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  addButton: {
    minHeight: "46px",
    border:
      "1px solid #4d91c4",
    borderRadius: "9px",
    padding:
      "10px 17px",
    background: "#eaf5fc",
    color: "#1769a8",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  addCustomButton: {
    minHeight: "52px",
    border: "none",
    borderRadius: "10px",
    padding:
      "13px 20px",
    background:
      "#1769a8",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  removeButton: {
    minHeight: "48px",
    border:
      "1px solid #d33",
    borderRadius: "9px",
    padding:
      "10px 12px",
    background: "#fff",
    color: "#c22",
    fontWeight: "700",
    cursor: "pointer",
  },

  listSection: {
    marginBottom: "34px",
  },

  projectListHeader: {
    background:
      "linear-gradient(135deg, #0d477a 0%, #1769a8 55%, #2388c9 100%)",
    border:
      "1px solid #6ca9d8",
    borderRadius: "16px",
    padding:
      "20px 24px",
    marginBottom: "20px",
    boxShadow:
      "0 7px 20px rgba(23,105,168,0.15)",
  },

  listTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "800",
    color: "#ffffff",
  },

  projectGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(430px,1fr))",
    gap: "22px",
  },

  projectCard: {
    border:
      "1px solid #cbd8e5",
    borderRadius: "16px",
    background: "#fff",
    padding: "24px",
    boxShadow:
      "0 7px 20px rgba(30,80,120,0.08)",
  },

  projectCardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap: "14px",
  },

  projectCardTitle: {
    margin: 0,
    fontSize: "23px",
    fontWeight: "800",
    color: "#123b66",
  },

  locationText: {
    margin:
      "8px 0 0",
    fontSize: "16px",
    color: "#64748b",
  },

  statusBadge: {
    background: "#e8f4fc",
    color: "#145883",
    border:
      "1px solid #a9cce5",
    padding:
      "8px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "700",
    whiteSpace:
      "nowrap",
  },

  descriptionText: {
    fontSize: "16px",
    lineHeight: "1.65",
    color: "#52677a",
    margin:
      "18px 0",
  },

  projectStatsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: "12px",
    marginBottom: "20px",
  },

  statCard: {
    border:
      "1px solid #e0e8ef",
    borderRadius: "10px",
    padding: "14px",
    background: "#f7fafc",
    color: "#31506a",
  },

  statCardBlue: {
    border:
      "1px solid #b7d8ed",
    borderRadius: "10px",
    padding: "14px",
    background: "#edf7fd",
    color: "#145883",
  },

  statCardGreen: {
    border:
      "1px solid #c7e2d0",
    borderRadius: "10px",
    padding: "14px",
    background: "#f0faf3",
    color: "#287344",
  },

  statCardOrange: {
    border:
      "1px solid #ecd9b3",
    borderRadius: "10px",
    padding: "14px",
    background: "#fff9ed",
    color: "#8b641c",
  },

  infoBlock: {
    borderTop:
      "1px solid #e5ebf0",
    paddingTop: "16px",
    marginTop: "16px",
    fontSize: "16px",
    color: "#304b61",
  },

  tagWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },

  typeTag: {
    background: "#edf5fb",
    border:
      "1px solid #c8ddea",
    color: "#285878",
    borderRadius: "20px",
    padding:
      "7px 11px",
    fontSize: "14px",
    fontWeight: "600",
  },

  facilityTag: {
    background: "#eaf5fc",
    border:
      "1px solid #c5dfef",
    borderRadius: "20px",
    padding:
      "7px 11px",
    fontSize: "14px",
    color: "#245b80",
  },

  mutedText: {
    color: "#8898a8",
    fontSize: "15px",
  },

  structureSummary: {
    marginTop: "9px",
  },

  summaryRow: {
    display: "flex",
    justifyContent:
      "space-between",
    padding:
      "8px 0",
    borderBottom:
      "1px solid #edf1f4",
    fontSize: "15px",
  },

  unitsBlock: {
    marginTop: "20px",
    border:
      "1px solid #bfd9eb",
    borderRadius: "14px",
    background: "#f5faff",
    padding: "16px",
  },

  unitsHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },

  unitsTitle: {
    fontSize: "19px",
    color: "#123f63",
  },

  unitsSubtitle: {
    margin:
      "4px 0 0",
    color: "#6b7f90",
    fontSize: "14px",
  },

  smallRefreshButton: {
    border:
      "1px solid #8fb4d0",
    borderRadius: "8px",
    background: "#fff",
    color: "#1769a8",
    padding:
      "8px 12px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  unitsLoading: {
    padding: "20px",
    textAlign: "center",
    color: "#667b8d",
  },

  noUnitsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "18px",
    background: "#fff",
    border:
      "1px dashed #9fb8ca",
    borderRadius: "10px",
    color: "#526b7d",
  },

  actualTypeWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginBottom: "12px",
  },

  actualTypeTag: {
    background: "#e7f3fc",
    border:
      "1px solid #bed9eb",
    color: "#245b80",
    padding:
      "6px 10px",
    borderRadius: "18px",
    fontSize: "13px",
    fontWeight: "700",
  },

  unitsList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    maxHeight: "480px",
    overflowY: "auto",
  },

  unitRow: {
    background: "#fff",
    border:
      "1px solid #d6e1e9",
    borderRadius: "10px",
    padding: "12px",
  },

  unitMain: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "9px",
    fontSize: "14px",
    color: "#5b7081",
  },

  unitNumber: {
    fontSize: "17px",
    color: "#123f63",
  },

  unitDetails: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    fontSize: "13px",
    color: "#5b7081",
  },

  unitStatus: {
    padding: "5px 9px",
    borderRadius: "15px",
    fontWeight: "700",
  },

  availableStatus: {
    background: "#e9f8ed",
    color: "#23733a",
  },

  bookedStatus: {
    background: "#fff4d9",
    color: "#946800",
  },

  soldStatus: {
    background: "#ffe6e6",
    color: "#a02020",
  },

  cardActions: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    marginTop: "22px",
  },

  editButton: {
    minHeight: "45px",
    border:
      "1px solid #4d91c4",
    borderRadius: "9px",
    padding:
      "10px 16px",
    background: "#eaf5fc",
    color: "#1769a8",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  mediaButton: {
    minHeight: "45px",
    border: "none",
    borderRadius: "9px",
    padding:
      "10px 16px",
    background: "#1769a8",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  deleteButton: {
    minHeight: "45px",
    border:
      "1px solid #d33",
    borderRadius: "9px",
    padding:
      "10px 16px",
    background: "#fff",
    color: "#c22",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  emptyBox: {
    border:
      "1px dashed #b8c9d6",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
    fontSize: "17px",
    color: "#718596",
    background: "#f7fafc",
  },

  mediaPanel: {
    border:
      "1px solid #cbd8e5",
    borderRadius: "18px",
    background: "#fff",
    padding: "30px",
    boxShadow:
      "0 8px 25px rgba(30,80,120,0.08)",
  },

  mediaPanelHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "28px",
    padding:
      "18px 20px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg,#0d477a,#1769a8,#2388c9)",
    border:
      "1px solid #6ca9d8",
  },

  mediaSection: {
    borderTop:
      "1px solid #e4ebf1",
    paddingTop: "24px",
    marginTop: "24px",
  },

  fileInput: {
    width: "100%",
    boxSizing: "border-box",
    fontSize: "16px",
    padding:
      "12px 0",
  },

  mediaGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(270px,1fr))",
    gap: "20px",
  },

  mediaCard: {
    border:
      "1px solid #d3dfe8",
    borderRadius: "13px",
    overflow: "hidden",
    background: "#f7fafc",
  },

  mediaPreview: {
    width: "100%",
    height: "230px",
    objectFit: "cover",
    display: "block",
    background: "#eaf1f6",
  },

  mediaCardFooter: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding: "14px",
  },

  mediaType: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#3d617b",
  },
};

export default AdminProjects;


