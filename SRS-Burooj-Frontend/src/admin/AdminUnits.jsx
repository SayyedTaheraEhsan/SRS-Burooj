import { adminFetch } from "./adminApi";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000";

const PROPERTY_TYPES = [
  "Flat / Apartment",
  "Row House",
  "Villa",
  "Plot",
  "Shop",
  "Office",
  "Other",
];

const UNIT_TYPES = [
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "Penthouse",
  "Studio",
  "Shop",
  "Office",
  "Plot",
  "Other",
];

const FACING_OPTIONS = [
  "East",
  "West",
  "North",
  "South",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];

const STATUS_OPTIONS = [
  "Available",
  "Booked",
  "Sold",
];

const EMPTY_FORM = {
  project_id: "",
  unit_number: "",
  unit_type: "",
  unit_count: "1",
  sold_count: "0",
  property_type: "",
  floor: "",
  facing: "",
  parking: "",
  carpet_area: "",
  built_up_area: "",
  rate_per_sqft: "",
  base_price: "",
  status: "Available",
  description: "",
  unit_photo: "",
};


// =========================================================
// HELPERS
// =========================================================

function extractArray(data, key) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.[key])) {
    return data.data[key];
  }

  return [];
}


function normalizeProjects(data) {
  return extractArray(data, "projects")
    .filter(
      (project) =>
        project &&
        project.id !== undefined &&
        project.id !== null
    )
    .map((project) => ({
      ...project,
      id: project.id,
      project_name:
        project.project_name ||
        project.name ||
        project.title ||
        `Project #${project.id}`,
    }));
}


function getProjectName(project) {
  if (!project) return "Unknown Project";

  return (
    project.project_name ||
    project.name ||
    project.title ||
    `Project #${project.id}`
  );
}


function formatAmount(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return `₹${number.toLocaleString("en-IN")}`;
}


function formatArea(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 sq ft";
  }

  return `${number.toLocaleString("en-IN")} sq ft`;
}


function getStatusClass(status) {
  if (status === "Sold") return "status-sold";
  if (status === "Booked") return "status-booked";

  return "status-available";
}


// =========================================================
// CUSTOM DROPDOWN
// Defined OUTSIDE AdminUnits so it does not remount
// every time the parent component renders.
// =========================================================

function CustomDropdown({
  label,
  required = false,
  options = [],
  value,
  placeholder = "Select",
  optionValue,
  optionLabel,
  onChange,
  disabled = false,
  open,
  onToggle,
}) {
  const selectedOption = options.find(
    (option) =>
      String(
        optionValue(option)
      ) === String(value)
  );

  const selectedLabel = selectedOption
    ? optionLabel(selectedOption)
    : "";

  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {required && (
          <span className="required-star">*</span>
        )}
      </label>

      <div className="custom-dropdown">
        <button
          type="button"
          className={`dropdown-button ${
            open ? "dropdown-open" : ""
          }`}
          onClick={onToggle}
          disabled={disabled}
        >
          <span
            className={
              selectedLabel
                ? "dropdown-selected"
                : "dropdown-placeholder"
            }
          >
            {selectedLabel || placeholder}
          </span>

          <span className="dropdown-arrow">
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div className="dropdown-menu">
            {options.length === 0 ? (
              <div className="dropdown-empty">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const optionVal =
                  optionValue(option);

                const isSelected =
                  String(optionVal) ===
                  String(value);

                return (
                  <button
                    type="button"
                    key={String(optionVal)}
                    className={`dropdown-option ${
                      isSelected
                        ? "dropdown-option-selected"
                        : ""
                    }`}
                    onClick={() =>
                      onChange(optionVal)
                    }
                  >
                    {optionLabel(option)}

                    {isSelected && (
                      <span>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// =========================================================
// MAIN COMPONENT
// =========================================================

function AdminUnits() {
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);

  const [loadingProjects, setLoadingProjects] =
    useState(true);

  const [loadingUnits, setLoadingUnits] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingUnit, setEditingUnit] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [search, setSearch] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [openDropdown, setOpenDropdown] =
    useState(null);


  // =======================================================
  // LOAD PROJECTS
  // =======================================================

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      setErrorMessage("");

      const response = await adminFetch(
        `${API_BASE}/api/projects`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load projects."
        );
      }

      const projectList =
        normalizeProjects(data);

      setProjects(projectList);
    } catch (error) {
      console.error(
        "Project loading error:",
        error
      );

      setProjects([]);

      setErrorMessage(
        "Projects load nahi ho rahe."
      );
    } finally {
      setLoadingProjects(false);
    }
  };


  // =======================================================
  // LOAD UNITS
  // =======================================================

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);

      const response = await adminFetch(
        `${API_BASE}/api/units`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load units."
        );
      }

      const unitList =
        extractArray(data, "units");

      setUnits(unitList);
    } catch (error) {
      console.error(
        "Unit loading error:",
        error
      );

      setUnits([]);

      setErrorMessage(
        "Units load nahi ho rahe."
      );
    } finally {
      setLoadingUnits(false);
    }
  };


  useEffect(() => {
    loadProjects();
    loadUnits();
  }, []);


  // =======================================================
  // BASE PRICE = CARPET AREA × RATE
  // =======================================================

  useEffect(() => {
    const carpet =
      Number(form.carpet_area);

    const rate =
      Number(form.rate_per_sqft);

    if (
      form.carpet_area !== "" &&
      form.rate_per_sqft !== "" &&
      Number.isFinite(carpet) &&
      Number.isFinite(rate)
    ) {
      const calculated =
        carpet * rate;

      setForm((previous) => ({
        ...previous,
        base_price: calculated,
      }));
    } else if (
      form.carpet_area === "" ||
      form.rate_per_sqft === ""
    ) {
      setForm((previous) => ({
        ...previous,
        base_price: "",
      }));
    }
  }, [
    form.carpet_area,
    form.rate_per_sqft,
  ]);


  // =======================================================
  // CALCULATED COUNTS
  // =======================================================

  const totalUnits = Math.max(
    1,
    Math.floor(
      Number(form.unit_count) || 1
    )
  );

  const soldUnits = Math.min(
    totalUnits,
    Math.max(
      0,
      Math.floor(
        Number(form.sold_count) || 0
      )
    )
  );

  const remainingUnits = Math.max(
    0,
    totalUnits - soldUnits
  );


  // =======================================================
  // FORM CHANGE
  // =======================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };


  // =======================================================
  // DROPDOWN
  // =======================================================

  const selectDropdownValue = (
    name,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setOpenDropdown(null);

    setErrorMessage("");
    setSuccessMessage("");
  };


  // =======================================================
  // PHOTO
  // =======================================================

  const handlePhotoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select an image file."
      );
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage(
        "Image size 5MB se kam honi chahiye."
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      setForm((previous) => ({
        ...previous,
        unit_photo: result,
      }));

      setPhotoPreview(result);
      setErrorMessage("");
    };

    reader.onerror = () => {
      setErrorMessage(
        "Image read nahi ho saki."
      );
    };

    reader.readAsDataURL(file);
  };


  // =======================================================
  // ADD FORM
  // =======================================================

  const openAddForm = () => {
    setEditingUnit(null);
    setForm({
      ...EMPTY_FORM,
      unit_count: "1",
      sold_count: "0",
    });
    setPhotoPreview("");
    setErrorMessage("");
    setSuccessMessage("");
    setOpenDropdown(null);
    setShowForm(true);
  };


  // =======================================================
  // EDIT FORM
  // =======================================================

  const openEditForm = (unit) => {
    setEditingUnit(unit);

    const unitCount =
      Number(unit.unit_count) || 1;

    const soldCount = Math.min(
      unitCount,
      Math.max(
        0,
        Number(unit.sold_count) || 0
      )
    );

    setForm({
      project_id:
        unit.project_id ?? "",

      unit_number:
        unit.unit_number ?? "",

      unit_type:
        unit.unit_type ?? "",

      unit_count:
        String(unitCount),

      sold_count:
        String(soldCount),

      property_type:
        unit.property_type ?? "",

      floor:
        unit.floor ?? "",

      facing:
        unit.facing ?? "",

      parking:
        unit.parking ?? "",

      carpet_area:
        unit.carpet_area ?? "",

      built_up_area:
        unit.built_up_area ?? "",

      rate_per_sqft:
        unit.rate_per_sqft ?? "",

      base_price:
        unit.base_price ?? "",

      status:
        unit.status || "Available",

      description:
        unit.description ?? "",

      unit_photo:
        unit.unit_photo ?? "",
    });

    setPhotoPreview(
      unit.unit_photo || ""
    );

    setErrorMessage("");
    setSuccessMessage("");
    setOpenDropdown(null);
    setShowForm(true);
  };


  // =======================================================
  // CLOSE FORM
  // =======================================================

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingUnit(null);
    setForm(EMPTY_FORM);
    setPhotoPreview("");
    setOpenDropdown(null);
  };


  // =======================================================
  // SAVE UNIT
  // =======================================================

  const saveUnit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");


    if (!form.project_id) {
      setErrorMessage(
        "Please select a project."
      );
      return;
    }

    if (
      !String(
        form.unit_number || ""
      ).trim()
    ) {
      setErrorMessage(
        "Unit number / group name enter karein."
      );
      return;
    }

    if (!form.property_type) {
      setErrorMessage(
        "Please select Property Type."
      );
      return;
    }

    if (!form.unit_type) {
      setErrorMessage(
        "Please select Unit Type."
      );
      return;
    }


    const unitCountValue = Math.max(
      1,
      Math.floor(
        Number(form.unit_count) || 0
      )
    );

    const soldCountValue = Math.min(
      unitCountValue,
      Math.max(
        0,
        Math.floor(
          Number(form.sold_count) || 0
        )
      )
    );

    const availableCountValue =
      Math.max(
        0,
        unitCountValue -
          soldCountValue
      );


    let finalStatus =
      form.status || "Available";

    if (
      soldCountValue >=
      unitCountValue
    ) {
      finalStatus = "Sold";
    } else if (
      finalStatus === "Sold"
    ) {
      finalStatus = "Available";
    }


    const calculatedBasePrice =
      form.carpet_area !== "" &&
      form.rate_per_sqft !== ""
        ? Number(form.carpet_area) *
          Number(form.rate_per_sqft)
        : form.base_price === ""
        ? null
        : Number(form.base_price);


    const payload = {
      project_id:
        Number(form.project_id),

      unit_number:
        String(
          form.unit_number
        ).trim(),

      unit_type:
        form.unit_type,

      unit_count:
        unitCountValue,

      sold_count:
        soldCountValue,

      available_count:
        availableCountValue,

      property_type:
        form.property_type,

      floor:
        form.floor || null,

      facing:
        form.facing || null,

      parking:
        form.parking || null,

      carpet_area:
        form.carpet_area === ""
          ? null
          : Number(
              form.carpet_area
            ),

      built_up_area:
        form.built_up_area === ""
          ? null
          : Number(
              form.built_up_area
            ),

      rate_per_sqft:
        form.rate_per_sqft === ""
          ? null
          : Number(
              form.rate_per_sqft
            ),

      base_price:
        calculatedBasePrice,

      status:
        finalStatus,

      description:
        form.description || null,

      unit_photo:
        form.unit_photo || null,
    };


    try {
      setSaving(true);

      const isEditing =
        Boolean(editingUnit);

      const url = isEditing
        ? `${API_BASE}/api/units/${editingUnit.id}`
        : `${API_BASE}/api/units`;

      const response =
        await adminFetch(url, {
          method: isEditing
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(payload),
        });

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
            "Unit save nahi hui."
        );
      }


      setSuccessMessage(
        isEditing
          ? "Unit updated successfully."
          : "Unit created successfully."
      );

      setShowForm(false);
      setEditingUnit(null);
      setForm(EMPTY_FORM);
      setPhotoPreview("");
      setOpenDropdown(null);

      await loadUnits();
    } catch (error) {
      console.error(
        "Save unit error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unit save nahi ho saki."
      );
    } finally {
      setSaving(false);
    }
  };


  // =======================================================
  // DELETE
  // =======================================================

  const deleteUnit = async (
    unit
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${unit.unit_number}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(unit.id);
      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await adminFetch(
          `${API_BASE}/api/units/${unit.id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.message ||
            "Unit delete nahi hui."
        );
      }

      setSuccessMessage(
        "Unit deleted successfully."
      );

      await loadUnits();
    } catch (error) {
      console.error(
        "Delete unit error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unit delete nahi ho saki."
      );
    } finally {
      setDeletingId(null);
    }
  };


  // =======================================================
  // FILTER
  // =======================================================

  const filteredUnits =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return units;
      }

      return units.filter(
        (unit) => {
          const projectName =
            getProjectName({
              id: unit.project_id,
              project_name:
                unit.project_name,
            });

          return (
            String(
              unit.unit_number || ""
            )
              .toLowerCase()
              .includes(query) ||

            String(
              unit.unit_type || ""
            )
              .toLowerCase()
              .includes(query) ||

            String(
              unit.property_type ||
                ""
            )
              .toLowerCase()
              .includes(query) ||

            String(
              projectName || ""
            )
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [units, search]);


  // =======================================================
  // REFRESH
  // =======================================================

  const refreshData = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    await Promise.all([
      loadProjects(),
      loadUnits(),
    ]);
  };


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div
      className="admin-units-page"
      onClick={(event) => {
        if (
          !event.target.closest(
            ".custom-dropdown"
          )
        ) {
          setOpenDropdown(null);
        }
      }}
    >
      <style>{`
        .admin-units-page {
          min-height: 100%;
          background: #f5f8fb;
          color: #183247;
          padding: 28px;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }

        .units-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .units-title {
          margin: 0;
          color: #0b2a43;
          font-size: 30px;
          font-weight: 800;
        }

        .units-subtitle {
          margin: 7px 0 0;
          color: #71808e;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .primary-button,
        .secondary-button,
        .danger-button {
          border-radius: 9px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        .primary-button {
          border: 1px solid #0b2a43;
          background: #0b2a43;
          color: white;
        }

        .primary-button:hover {
          background: #123f60;
        }

        .secondary-button {
          border: 1px solid #b9cbd8;
          background: white;
          color: #0b2a43;
        }

        .secondary-button:hover {
          background: #eef5fa;
        }

        .danger-button {
          border: 1px solid #e2b6b6;
          background: #fff6f6;
          color: #a53b3b;
        }

        .message {
          border-radius: 9px;
          padding: 12px 15px;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .error-message {
          background: #fff0f0;
          color: #a83232;
          border: 1px solid #efc2c2;
        }

        .success-message {
          background: #effaf3;
          color: #267443;
          border: 1px solid #bfe4ca;
        }

        .toolbar {
          background: white;
          border: 1px solid #dce5eb;
          border-radius: 13px;
          padding: 15px;
          margin-bottom: 18px;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 260px;
          border: 1px solid #cbd8e1;
          border-radius: 9px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          color: #183247;
        }

        .search-input:focus {
          border-color: #3978a5;
          box-shadow: 0 0 0 3px rgba(57, 120, 165, 0.10);
        }

        .count-label {
          color: #71808e;
          font-size: 13px;
          font-weight: 700;
        }

        .table-card {
          background: white;
          border: 1px solid #dce5eb;
          border-radius: 13px;
          overflow: hidden;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .units-table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
        }

        .units-table th {
          background: #eaf2f7;
          color: #0b2a43;
          padding: 13px 12px;
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .units-table td {
          padding: 13px 12px;
          border-top: 1px solid #edf1f4;
          color: #304657;
          font-size: 13px;
          vertical-align: middle;
        }

        .units-table tbody tr:hover {
          background: #f8fbfd;
        }

        .unit-photo-small {
          width: 52px;
          height: 40px;
          object-fit: cover;
          border-radius: 7px;
          border: 1px solid #d7e1e7;
          display: block;
        }

        .photo-placeholder-small {
          width: 52px;
          height: 40px;
          border-radius: 7px;
          background: #edf3f7;
          color: #71808e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .project-cell {
          color: #0b2a43;
          font-weight: 700;
        }

        .unit-number-cell {
          color: #0b2a43;
          font-weight: 800;
        }

        .quantity-main {
          font-weight: 800;
          color: #0b2a43;
        }

        .quantity-sub {
          margin-top: 3px;
          font-size: 11px;
          color: #71808e;
        }

        .remaining-value {
          font-weight: 800;
          color: #267443;
        }

        .status-badge {
          display: inline-block;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-available {
          background: #eaf7ef;
          color: #267443;
        }

        .status-booked {
          background: #fff5dd;
          color: #966b13;
        }

        .status-sold {
          background: #fdecec;
          color: #a83a3a;
        }

        .action-group {
          display: flex;
          gap: 7px;
        }

        .action-button {
          border-radius: 7px;
          padding: 7px 11px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .edit-action {
          border: 1px solid #b9cbd8;
          background: #f4f8fa;
          color: #0b2a43;
        }

        .delete-action {
          border: 1px solid #e3b9b9;
          background: #fff5f5;
          color: #a33b3b;
        }

        .empty-state {
          padding: 55px 20px;
          text-align: center;
          color: #71808e;
        }

        .empty-state-icon {
          width: 55px;
          height: 55px;
          border-radius: 50%;
          margin: 0 auto 12px;
          background: #eaf0f4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          color: #0b2a43;
        }

        .empty-state h3 {
          margin: 0 0 6px;
          color: #0b2a43;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(9, 27, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .modal {
          width: min(980px, 100%);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          position: sticky;
          top: 0;
          z-index: 4;
          background: white;
          border-bottom: 1px solid #e2e9ee;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .modal-title {
          margin: 0;
          color: #0b2a43;
          font-size: 21px;
          font-weight: 800;
        }

        .modal-close {
          border: none;
          background: #edf3f7;
          color: #0b2a43;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          font-weight: 700;
        }

        .form-body {
          padding: 24px;
        }

        .form-section {
          margin-bottom: 27px;
        }

        .form-section-title {
          margin: 0 0 15px;
          padding-bottom: 9px;
          border-bottom: 1px solid #e1e8ed;
          color: #0b2a43;
          font-size: 16px;
          font-weight: 800;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .field-group {
          position: relative;
          min-width: 0;
        }

        .field-label {
          display: block;
          margin-bottom: 7px;
          color: #304657;
          font-size: 13px;
          font-weight: 800;
        }

        .required-star {
          color: #c23838;
          margin-left: 3px;
        }

        .field-input,
        .field-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd8e1;
          border-radius: 9px;
          padding: 12px 13px;
          background: white;
          color: #183247;
          font-size: 14px;
          outline: none;
        }

        .field-input:focus,
        .field-textarea:focus {
          border-color: #3978a5;
          box-shadow: 0 0 0 3px rgba(57, 120, 165, 0.10);
        }

        .field-textarea {
          min-height: 105px;
          resize: vertical;
        }

        .custom-dropdown {
          position: relative;
          width: 100%;
        }

        .dropdown-button {
          width: 100%;
          min-height: 45px;
          padding: 10px 13px;
          border: 1px solid #cbd8e1;
          border-radius: 9px;
          background: white;
          color: #183247;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
        }

        .dropdown-button:hover {
          border-color: #3978a5;
        }

        .dropdown-open {
          border-color: #3978a5;
          box-shadow: 0 0 0 3px rgba(57, 120, 165, 0.10);
        }

        .dropdown-placeholder {
          color: #8a99a5;
        }

        .dropdown-selected {
          color: #183247;
          font-weight: 600;
        }

        .dropdown-arrow {
          color: #527084;
          font-size: 10px;
          flex-shrink: 0;
        }

        .dropdown-menu {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 5px);
          background: white;
          border: 1px solid #cbd8e1;
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(11, 42, 67, 0.16);
          max-height: 270px;
          overflow-y: auto;
          z-index: 10000;
          padding: 5px;
        }

        .dropdown-option {
          width: 100%;
          border: none;
          background: white;
          color: #304657;
          padding: 13px 12px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .dropdown-option:hover {
          background: #eef5fa;
          color: #0b2a43;
        }

        .dropdown-option-selected {
          background: #e7f0f6;
          color: #0b2a43;
        }

        .dropdown-empty {
          padding: 14px 12px;
          color: #71808e;
          font-size: 13px;
        }

        .quantity-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .quantity-card {
          border: 1px solid #d9e4eb;
          background: #f8fbfd;
          border-radius: 11px;
          padding: 14px;
        }

        .quantity-card-label {
          color: #71808e;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .quantity-card-value {
          color: #0b2a43;
          font-size: 22px;
          font-weight: 900;
        }

        .quantity-card input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd8e1;
          border-radius: 8px;
          padding: 9px 10px;
          background: white;
          color: #0b2a43;
          font-size: 19px;
          font-weight: 800;
          outline: none;
        }

        .quantity-card input:focus {
          border-color: #3978a5;
        }

        .quantity-help {
          margin-top: 5px;
          color: #7b8995;
          font-size: 11px;
        }

        .calculated-price {
          background: #f0f7fb;
          border: 1px solid #cfe0eb;
          border-radius: 9px;
          padding: 12px 13px;
          color: #0b2a43;
          font-size: 16px;
          font-weight: 900;
          min-height: 45px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
        }

        .photo-upload-box {
          border: 1.5px dashed #b9cbd8;
          border-radius: 11px;
          padding: 17px;
          background: #f9fbfc;
        }

        .photo-input {
          width: 100%;
          font-size: 13px;
          color: #304657;
        }

        .photo-preview-wrap {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .photo-preview {
          width: 145px;
          height: 100px;
          object-fit: cover;
          border-radius: 9px;
          border: 1px solid #d3dfe7;
        }

        .photo-note {
          color: #71808e;
          font-size: 12px;
        }

        .form-footer {
          position: sticky;
          bottom: 0;
          background: white;
          border-top: 1px solid #e2e9ee;
          padding: 16px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .save-button {
          border: 1px solid #0b2a43;
          border-radius: 9px;
          background: #0b2a43;
          color: white;
          padding: 11px 19px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .cancel-button {
          border: 1px solid #b9cbd8;
          border-radius: 9px;
          background: white;
          color: #0b2a43;
          padding: 11px 19px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 760px) {
          .admin-units-page {
            padding: 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .quantity-grid {
            grid-template-columns: 1fr;
          }

          .modal-overlay {
            padding: 8px;
          }

          .form-body {
            padding: 17px;
          }

          .modal-header {
            padding: 16px;
          }

          .form-footer {
            padding: 14px 16px;
          }
        }
      `}</style>


      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="units-header">
        <div>
          <h1 className="units-title">
            Unit Management
          </h1>

          <p className="units-subtitle">
            Manually add and manage project units,
            quantities, pricing and availability.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={refreshData}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddForm}
          >
            + Add Unit
          </button>
        </div>
      </div>


      {/* ===================================================
          MESSAGES
      =================================================== */}

      {errorMessage && (
        <div className="message error-message">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="message success-message">
          {successMessage}
        </div>
      )}


      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <div className="toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search project, unit, property type or unit type..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <span className="count-label">
          {filteredUnits.length} unit record
          {filteredUnits.length === 1
            ? ""
            : "s"}
        </span>
      </div>


      {/* ===================================================
          TABLE
      =================================================== */}

      <div className="table-card">
        {loadingUnits ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              ⏳
            </div>

            <h3>
              Loading Units...
            </h3>

            <p>
              Please wait.
            </p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              🏢
            </div>

            <h3>
              No Units Added
            </h3>

            <p>
              Project mein units automatically
              generate nahi honge. Add Unit se
              manually create karein.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="units-table">
              <thead>
                <tr>
                  <th>
                    Photo
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    Unit / Group
                  </th>

                  <th>
                    Property Type
                  </th>

                  <th>
                    Unit Type
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Sold
                  </th>

                  <th>
                    Remaining
                  </th>

                  <th>
                    Carpet Area
                  </th>

                  <th>
                    Rate / Sq Ft
                  </th>

                  <th>
                    Base Price
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUnits.map(
                  (unit) => {
                    const total =
                      Number(
                        unit.unit_count
                      ) || 1;

                    const sold =
                      Math.min(
                        total,
                        Math.max(
                          0,
                          Number(
                            unit.sold_count
                          ) || 0
                        )
                      );

                    const remaining =
                      Math.max(
                        0,
                        total - sold
                      );

                    return (
                      <tr
                        key={unit.id}
                      >
                        <td>
                          {unit.unit_photo ? (
                            <img
                              src={
                                unit.unit_photo
                              }
                              alt={
                                unit.unit_number ||
                                "Unit"
                              }
                              className="unit-photo-small"
                            />
                          ) : (
                            <div className="photo-placeholder-small">
                              🏠
                            </div>
                          )}
                        </td>

                        <td className="project-cell">
                          {unit.project_name ||
                            getProjectName({
                              id:
                                unit.project_id,
                              project_name:
                                unit.project_name,
                            })}
                        </td>

                        <td className="unit-number-cell">
                          {unit.unit_number}
                        </td>

                        <td>
                          {unit.property_type ||
                            "-"}
                        </td>

                        <td>
                          {unit.unit_type ||
                            "-"}
                        </td>

                        <td>
                          <div className="quantity-main">
                            {total}
                          </div>

                          <div className="quantity-sub">
                            Total
                          </div>
                        </td>

                        <td>
                          <div className="quantity-main">
                            {sold}
                          </div>

                          <div className="quantity-sub">
                            Sold
                          </div>
                        </td>

                        <td>
                          <div className="remaining-value">
                            {remaining}
                          </div>

                          <div className="quantity-sub">
                            Available
                          </div>
                        </td>

                        <td>
                          {formatArea(
                            unit.carpet_area
                          )}
                        </td>

                        <td>
                          {formatAmount(
                            unit.rate_per_sqft
                          )}
                        </td>

                        <td>
                          {formatAmount(
                            unit.base_price
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              unit.status
                            )}`}
                          >
                            {unit.status ||
                              "Available"}
                          </span>
                        </td>

                        <td>
                          <div className="action-group">
                            <button
                              type="button"
                              className="action-button edit-action"
                              onClick={() =>
                                openEditForm(
                                  unit
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="action-button delete-action"
                              disabled={
                                deletingId ===
                                unit.id
                              }
                              onClick={() =>
                                deleteUnit(
                                  unit
                                )
                              }
                            >
                              {deletingId ===
                              unit.id
                                ? "..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingUnit
                    ? "Edit Unit"
                    : "Add Unit"}
                </h2>

                <p className="units-subtitle">
                  {editingUnit
                    ? "Update unit details, quantity and availability."
                    : "Manually add a unit/group to a project."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>


            <form
              onSubmit={saveUnit}
            >
              <div className="form-body">

                {/* =========================================
                    BASIC INFORMATION
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Basic Information
                  </h3>

                  <div className="form-grid">

                    <CustomDropdown
                      label="Project"
                      required
                      options={projects}
                      value={
                        form.project_id
                      }
                      placeholder={
                        loadingProjects
                          ? "Loading Projects..."
                          : projects.length
                          ? "Select Project"
                          : "No Projects Found"
                      }
                      optionValue={(
                        project
                      ) =>
                        project.id
                      }
                      optionLabel={(
                        project
                      ) =>
                        getProjectName(
                          project
                        )
                      }
                      onChange={(
                        value
                      ) =>
                        selectDropdownValue(
                          "project_id",
                          value
                        )
                      }
                      disabled={
                        loadingProjects
                      }
                      open={
                        openDropdown ===
                        "project_id"
                      }
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown ===
                            "project_id"
                            ? null
                            : "project_id"
                        )
                      }
                    />


                    <div className="field-group">
                      <label className="field-label">
                        Unit / Group Name
                        <span className="required-star">
                          *
                        </span>
                      </label>

                      <input
                        className="field-input"
                        type="text"
                        name="unit_number"
                        value={
                          form.unit_number
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: A-101 or 2 BHK Block"
                      />
                    </div>


                    <CustomDropdown
                      label="Property Type"
                      required
                      options={
                        PROPERTY_TYPES
                      }
                      value={
                        form.property_type
                      }
                      placeholder="Select Property Type"
                      optionValue={(
                        value
                      ) => value}
                      optionLabel={(
                        value
                      ) => value}
                      onChange={(
                        value
                      ) =>
                        selectDropdownValue(
                          "property_type",
                          value
                        )
                      }
                      open={
                        openDropdown ===
                        "property_type"
                      }
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown ===
                            "property_type"
                            ? null
                            : "property_type"
                        )
                      }
                    />


                    <CustomDropdown
                      label="Unit Type"
                      required
                      options={
                        UNIT_TYPES
                      }
                      value={
                        form.unit_type
                      }
                      placeholder="Select Unit Type"
                      optionValue={(
                        value
                      ) => value}
                      optionLabel={(
                        value
                      ) => value}
                      onChange={(
                        value
                      ) =>
                        selectDropdownValue(
                          "unit_type",
                          value
                        )
                      }
                      open={
                        openDropdown ===
                        "unit_type"
                      }
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown ===
                            "unit_type"
                            ? null
                            : "unit_type"
                        )
                      }
                    />


                    <div className="field-group">
                      <label className="field-label">
                        Floor
                      </label>

                      <input
                        className="field-input"
                        type="text"
                        name="floor"
                        value={
                          form.floor
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: 5th Floor"
                      />
                    </div>


                    <CustomDropdown
                      label="Facing"
                      options={
                        FACING_OPTIONS
                      }
                      value={
                        form.facing
                      }
                      placeholder="Select Facing"
                      optionValue={(
                        value
                      ) => value}
                      optionLabel={(
                        value
                      ) => value}
                      onChange={(
                        value
                      ) =>
                        selectDropdownValue(
                          "facing",
                          value
                        )
                      }
                      open={
                        openDropdown ===
                        "facing"
                      }
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown ===
                            "facing"
                            ? null
                            : "facing"
                        )
                      }
                    />

                  </div>
                </div>


                {/* =========================================
                    QUANTITY
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Unit Quantity
                  </h3>

                  <div className="quantity-grid">

                    <div className="quantity-card">
                      <div className="quantity-card-label">
                        Unit Count
                      </div>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        name="unit_count"
                        value={
                          form.unit_count
                        }
                        onChange={(
                          event
                        ) => {
                          const value =
                            Math.max(
                              1,
                              Math.floor(
                                Number(
                                  event
                                    .target
                                    .value
                                ) || 1
                              )
                            );

                          setForm(
                            (previous) => {
                              const newSold =
                                Math.min(
                                  value,
                                  Math.max(
                                    0,
                                    Number(
                                      previous.sold_count
                                    ) || 0
                                  )
                                );

                              return {
                                ...previous,
                                unit_count:
                                  String(
                                    value
                                  ),
                                sold_count:
                                  String(
                                    newSold
                                  ),
                              };
                            }
                          );
                        }}
                      />

                      <div className="quantity-help">
                        Total same-type units
                      </div>
                    </div>


                    <div className="quantity-card">
                      <div className="quantity-card-label">
                        Sold Units
                      </div>

                      <input
                        type="number"
                        min="0"
                        max={
                          totalUnits
                        }
                        step="1"
                        name="sold_count"
                        value={
                          form.sold_count
                        }
                        onChange={(
                          event
                        ) => {
                          const value =
                            Math.min(
                              totalUnits,
                              Math.max(
                                0,
                                Math.floor(
                                  Number(
                                    event
                                      .target
                                      .value
                                  ) || 0
                                )
                              )
                            );

                          setForm(
                            (previous) => ({
                              ...previous,
                              sold_count:
                                String(
                                  value
                                ),
                            })
                          );
                        }}
                      />

                      <div className="quantity-help">
                        Units already sold
                      </div>
                    </div>


                    <div className="quantity-card">
                      <div className="quantity-card-label">
                        Remaining Units
                      </div>

                      <div className="quantity-card-value">
                        {remainingUnits}
                      </div>

                      <div className="quantity-help">
                        Automatically calculated
                      </div>
                    </div>

                  </div>
                </div>


                {/* =========================================
                    AREA & PRICING
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Area & Pricing
                  </h3>

                  <div className="form-grid">

                    <div className="field-group">
                      <label className="field-label">
                        Carpet Area (sq ft)
                      </label>

                      <input
                        className="field-input"
                        type="number"
                        min="0"
                        step="0.01"
                        name="carpet_area"
                        value={
                          form.carpet_area
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: 850"
                      />
                    </div>


                    <div className="field-group">
                      <label className="field-label">
                        Built-up Area (sq ft)
                      </label>

                      <input
                        className="field-input"
                        type="number"
                        min="0"
                        step="0.01"
                        name="built_up_area"
                        value={
                          form.built_up_area
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: 1100"
                      />
                    </div>


                    <div className="field-group">
                      <label className="field-label">
                        Rate / Sq Ft (₹)
                      </label>

                      <input
                        className="field-input"
                        type="number"
                        min="0"
                        step="0.01"
                        name="rate_per_sqft"
                        value={
                          form.rate_per_sqft
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: 7500"
                      />
                    </div>


                    <div className="field-group">
                      <label className="field-label">
                        Base Price
                      </label>

                      <div className="calculated-price">
                        {formatAmount(
                          form.base_price
                        )}
                      </div>
                    </div>


                    <div className="field-group">
                      <label className="field-label">
                        Parking
                      </label>

                      <input
                        className="field-input"
                        type="text"
                        name="parking"
                        value={
                          form.parking
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Example: 1 Covered"
                      />
                    </div>

                  </div>
                </div>


                {/* =========================================
                    STATUS
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Status
                  </h3>

                  <div className="form-grid">

                    <CustomDropdown
                      label="Unit Status"
                      options={
                        STATUS_OPTIONS
                      }
                      value={
                        form.status
                      }
                      placeholder="Select Status"
                      optionValue={(
                        value
                      ) => value}
                      optionLabel={(
                        value
                      ) => value}
                      onChange={(
                        value
                      ) =>
                        selectDropdownValue(
                          "status",
                          value
                        )
                      }
                      open={
                        openDropdown ===
                        "status"
                      }
                      onToggle={() =>
                        setOpenDropdown(
                          openDropdown ===
                            "status"
                            ? null
                            : "status"
                        )
                      }
                    />

                    <div className="field-group">
                      <label className="field-label">
                        Current Availability
                      </label>

                      <div className="calculated-price">
                        {remainingUnits} of{" "}
                        {totalUnits}{" "}
                        Available
                      </div>
                    </div>

                  </div>
                </div>


                {/* =========================================
                    PHOTO
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Unit Photo
                  </h3>

                  <div className="photo-upload-box">
                    <input
                      className="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={
                        handlePhotoChange
                      }
                    />

                    <div className="photo-note">
                      Maximum image size:
                      5MB
                    </div>

                    {photoPreview && (
                      <div className="photo-preview-wrap">
                        <img
                          src={
                            photoPreview
                          }
                          alt="Unit Preview"
                          className="photo-preview"
                        />

                        <span className="photo-note">
                          Current unit
                          photo preview
                        </span>
                      </div>
                    )}
                  </div>
                </div>


                {/* =========================================
                    DESCRIPTION
                ========================================= */}

                <div className="form-section">
                  <h3 className="form-section-title">
                    Description
                  </h3>

                  <div className="field-group">
                    <textarea
                      className="field-textarea"
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter additional unit details..."
                    />
                  </div>
                </div>

              </div>


              {/* =========================================
                  FOOTER
              ========================================= */}

              <div className="form-footer">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingUnit
                    ? "Update Unit"
                    : "Save Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUnits;