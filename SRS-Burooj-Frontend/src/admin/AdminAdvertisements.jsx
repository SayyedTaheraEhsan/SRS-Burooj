import { adminFetch } from "./adminApi";
import { useEffect, useMemo, useRef, useState } from "react";

const API = "http://localhost:5000/api/advertisements";
const SERVER_URL = "http://localhost:5000";

const emptyForm = {
  title: "",
  advertisement_type: "Property",
  description: "",
  offer_title: "",
  offer_details: "",
  offer_start_date: "",
  offer_end_date: "",
  project_name: "",
  location: "",
  unit_type: "",
  bhk: "",
  area: "",
  floor: "",
  bathrooms: "",
  price: "",
  image: "",
  status: "Active",
  featured: false,
};

const advertisementTypes = [
  "Property",
  "Special Offer",
  "Package",
  "Luxury",
  "Penthouse",
];

const statusOptions = ["Active", "Inactive"];

/* =========================
   LARGE CUSTOM DROPDOWN
========================= */
function LargeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "46px",
          padding: "10px 14px",
          border: "1px solid #d8cdbb",
          borderRadius: "8px",
          background: "#fff",
          color: "#222",
          fontSize: "16px",
          fontWeight: 500,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <span>{value || placeholder}</span>

        <span
          style={{
            fontSize: "18px",
            marginLeft: "10px",
            color: "#555",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            width: "100%",
            background: "#fff",
            border: "1px solid #cfc3b1",
            borderRadius: "9px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
            zIndex: 5000,
            overflow: "hidden",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {options.map((option) => {
            const selected = option === value;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  minHeight: "50px",
                  padding: "13px 16px",
                  border: "none",
                  borderBottom: "1px solid #eee",
                  background: selected ? "#eaf2ff" : "#fff",
                  color: selected ? "#1557a6" : "#222",
                  fontSize: "17px",
                  fontWeight: selected ? 700 : 500,
                  lineHeight: 1.4,
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = "#f4f7fb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = "#fff";
                  }
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================
   DATE HELPERS
========================= */
function pad2(number) {
  return String(number).padStart(2, "0");
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function parseDateValue(value) {
  if (!value) return null;

  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previousMonthDays = startDay;

  const totalCells = Math.ceil(
    (previousMonthDays + daysInMonth) / 7
  ) * 7;

  const days = [];

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - previousMonthDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      days.push(null);
    } else {
      days.push(new Date(year, month, dayNumber));
    }
  }

  return days;
}

/* =========================
   LARGE CUSTOM CALENDAR
========================= */
function LargeDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date",
}) {
  const [open, setOpen] = useState(false);

  const initialDate = parseDateValue(value) || new Date();

  const [viewDate, setViewDate] = useState(
    getMonthStart(initialDate)
  );

  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  useEffect(() => {
    if (value) {
      const selected = parseDateValue(value);

      if (selected) {
        setViewDate(getMonthStart(selected));
      }
    }
  }, [value]);

  const calendarDays = getCalendarDays(viewDate);

  const monthName = viewDate.toLocaleString("en-US", {
    month: "long",
  });

  const year = viewDate.getFullYear();

  const selectedDate = parseDateValue(value);
  const minimumDate = parseDateValue(minDate);

  const isSameDate = (a, b) => {
    if (!a || !b) return false;

    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isBeforeMinimum = (date) => {
    if (!date || !minimumDate) return false;

    const current = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const minimum = new Date(
      minimumDate.getFullYear(),
      minimumDate.getMonth(),
      minimumDate.getDate()
    );

    return current < minimum;
  };

  const goPrevious = () => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() - 1,
        1
      )
    );
  };

  const goNext = () => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + 1,
        1
      )
    );
  };

  const selectToday = () => {
    const today = new Date();

    if (!isBeforeMinimum(today)) {
      onChange(formatDateValue(today));
      setViewDate(getMonthStart(today));
      setOpen(false);
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!open) {
            const selected = parseDateValue(value);

            if (selected) {
              setViewDate(getMonthStart(selected));
            } else {
              setViewDate(getMonthStart(new Date()));
            }
          }

          setOpen((prev) => !prev);
        }}
        style={{
          width: "100%",
          minHeight: "46px",
          padding: "10px 14px",
          border: "1px solid #d8cdbb",
          borderRadius: "8px",
          background: "#fff",
          color: value ? "#222" : "#777",
          fontSize: "16px",
          fontWeight: 500,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <span>{value || placeholder}</span>

        <span style={{ fontSize: "20px" }}>📅</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "390px",
            maxWidth: "calc(100vw - 30px)",
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #cbd7e8",
            boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
            padding: "18px",
            zIndex: 6000,
            boxSizing: "border-box",
          }}
        >
          {/* CALENDAR HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              onClick={goPrevious}
              style={{
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "9px",
                background: "#eaf2ff",
                color: "#1456a0",
                fontSize: "25px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ‹
            </button>

            <div
              style={{
                textAlign: "center",
                fontSize: "21px",
                fontWeight: 800,
                color: "#123b68",
              }}
            >
              {monthName} {year}
            </div>

            <button
              type="button"
              onClick={goNext}
              style={{
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "9px",
                background: "#eaf2ff",
                color: "#1456a0",
                fontSize: "25px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ›
            </button>
          </div>

          {/* WEEK DAYS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "5px",
              marginBottom: "7px",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <div
                  key={day}
                  style={{
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#55708e",
                    padding: "5px 0",
                  }}
                >
                  {day}
                </div>
              )
            )}
          </div>

          {/* DATES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
            }}
          >
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    style={{
                      height: "43px",
                    }}
                  />
                );
              }

              const selected = isSameDate(date, selectedDate);
              const disabled = isBeforeMinimum(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onChange(formatDateValue(date));
                      setOpen(false);
                    }
                  }}
                  style={{
                    height: "43px",
                    border: selected
                      ? "2px solid #1557a6"
                      : "1px solid #dce5ef",
                    borderRadius: "9px",
                    background: selected
                      ? "#1557a6"
                      : disabled
                      ? "#f1f1f1"
                      : "#fff",
                    color: selected
                      ? "#fff"
                      : disabled
                      ? "#aaa"
                      : "#222",
                    fontSize: "15px",
                    fontWeight: selected ? 800 : 600,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* FOOTER BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginTop: "17px",
              paddingTop: "14px",
              borderTop: "1px solid #e5eaf0",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                flex: 1,
                minHeight: "42px",
                border: "1px solid #ccd6e1",
                borderRadius: "8px",
                background: "#fff",
                color: "#444",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={selectToday}
              style={{
                flex: 1,
                minHeight: "42px",
                border: "none",
                borderRadius: "8px",
                background: "#1557a6",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
function AdminAdvertisements() {
  const [advertisements, setAdvertisements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdvertisements();
  }, []);

  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:")
    ) {
      return image;
    }

    return `${SERVER_URL}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const loadAdvertisements = async () => {
    try {
      const response = await adminFetch(API);
      const data = await response.json();

      console.log("ADVERTISEMENT API:", data);

      if (data.success && Array.isArray(data.advertisements)) {
        setAdvertisements(data.advertisements);
      } else {
        setAdvertisements([]);
      }
    } catch (error) {
      console.error("Advertisement load error:", error);
      setAdvertisements([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size should be less than 10 MB.");
      e.target.value = "";
      return;
    }

    setImageFile(file);

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
  };

  const saveAdvertisement = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Promotion Title is required.");
      return;
    }

    if (!editingId && !imageFile) {
      alert("Promotion Banner image is required.");
      return;
    }

    if (
      form.offer_start_date &&
      form.offer_end_date &&
      form.offer_end_date < form.offer_start_date
    ) {
      alert("End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === "featured") {
          formData.append("featured", value ? "1" : "0");
        } else {
          formData.append(
            key,
            value === null || value === undefined ? "" : value
          );
        }
      });

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingId
        ? `${API}/${editingId}`
        : API;

      const method = editingId ? "PUT" : "POST";

      const response = await adminFetch(url, {
        method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Advertisement save failed."
        );
      }

      alert(
        editingId
          ? "Advertisement updated successfully."
          : "Advertisement added successfully."
      );

      closeForm();
      loadAdvertisements();
    } catch (error) {
      console.error("Save advertisement error:", error);
      alert(error.message || "Advertisement save failed.");
    } finally {
      setSaving(false);
    }
  };

  const editAdvertisement = (ad) => {
    setEditingId(ad.id);

    setForm({
      title: ad.title || "",
      advertisement_type:
        ad.advertisement_type || "Property",
      description: ad.description || "",
      offer_title: ad.offer_title || "",
      offer_details: ad.offer_details || "",
      offer_start_date: ad.offer_start_date
        ? String(ad.offer_start_date).slice(0, 10)
        : "",
      offer_end_date: ad.offer_end_date
        ? String(ad.offer_end_date).slice(0, 10)
        : "",
      project_name: ad.project_name || "",
      location: ad.location || "",
      unit_type: ad.unit_type || "",
      bhk: ad.bhk || "",
      area: ad.area || "",
      floor: ad.floor || "",
      bathrooms: ad.bathrooms || "",
      price: ad.price || "",
      image: ad.image || "",
      status: ad.status || "Active",
      featured:
        ad.featured === 1 ||
        ad.featured === true ||
        ad.featured === "1",
    });

    setImageFile(null);
    setImagePreview(getImageUrl(ad.image));

    setShowForm(true);
  };

  const deleteAdvertisement = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this advertisement?"
    );

    if (!confirmed) return;

    try {
      const response = await adminFetch(`${API}/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Delete failed."
        );
      }

      alert("Advertisement deleted successfully.");

      loadAdvertisements();
    } catch (error) {
      console.error("Delete advertisement error:", error);
      alert(error.message || "Delete failed.");
    }
  };

  const filteredAdvertisements = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return advertisements;

    return advertisements.filter((ad) => {
      const searchable = [
        ad.title,
        ad.project_name,
        ad.location,
        ad.unit_type,
        ad.price,
        ad.advertisement_type,
        ad.offer_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [advertisements, search]);

  const inputStyle = {
    width: "100%",
    minHeight: "46px",
    padding: "10px 13px",
    border: "1px solid #d8cdbb",
    borderRadius: "8px",
    fontSize: "16px",
    color: "#222",
    background: "#fff",
    boxSizing: "border-box",
    outline: "none",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "105px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#3d352b",
  };

  const fieldStyle = {
    marginBottom: "18px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f2e8",
        padding: "28px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#241d15",
              fontWeight: 800,
            }}
          >
            Featured Promotions
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              fontSize: "14px",
              color: "#756a5d",
            }}
          >
            Manage advertisements and promotional offers.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          style={{
            border: "none",
            borderRadius: "8px",
            background: "#a67c27",
            color: "#fff",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add Promotion
        </button>
      </div>

      {/* SEARCH */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eadfce",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "22px",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search promotions..."
          style={inputStyle}
        />
      </div>

      {/* FORM */}
      {showForm && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e1d5c3",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "25px",
            boxShadow: "0 5px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                color: "#2a2117",
              }}
            >
              {editingId
                ? "Edit Promotion"
                : "Add Promotion"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              style={{
                border: "none",
                background: "#f1ece4",
                color: "#444",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={saveAdvertisement}>
            {/* TYPE */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Advertisement Type *
              </label>

              <LargeSelect
                value={form.advertisement_type}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    advertisement_type: value,
                  }))
                }
                options={advertisementTypes}
              />
            </div>

            {/* TITLE */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Promotion Title *
              </label>

              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter promotion title"
                style={inputStyle}
              />
            </div>

            {/* DESCRIPTION */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter promotion description"
                style={textareaStyle}
              />
            </div>

            {/* OFFER TITLE */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Offer Title
              </label>

              <input
                name="offer_title"
                value={form.offer_title}
                onChange={handleChange}
                placeholder="Example: Special Booking Offer"
                style={inputStyle}
              />
            </div>

            {/* OFFER DETAILS */}
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Offer / Package Details
              </label>

              <textarea
                name="offer_details"
                value={form.offer_details}
                onChange={handleChange}
                placeholder="Enter offer details"
                style={textareaStyle}
              />
            </div>

            {/* DATES */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "18px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Offer Start Date
                </label>

                <LargeDatePicker
                  value={form.offer_start_date}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      offer_start_date: value,
                    }))
                  }
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Offer End Date
                </label>

                <LargeDatePicker
                  value={form.offer_end_date}
                  minDate={form.offer_start_date}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      offer_end_date: value,
                    }))
                  }
                  placeholder="Select end date"
                />
              </div>
            </div>

            {/* PROPERTY DETAILS */}
            <h3
              style={{
                margin: "25px 0 18px",
                fontSize: "18px",
                color: "#2d2419",
              }}
            >
              Property Details
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Project Name
                </label>

                <input
                  name="project_name"
                  value={form.project_name}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Location
                </label>

                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Unit Type
                </label>

                <input
                  name="unit_type"
                  value={form.unit_type}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  BHK
                </label>

                <input
                  name="bhk"
                  value={form.bhk}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Area
                </label>

                <input
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Floor
                </label>

                <input
                  name="floor"
                  value={form.floor}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Bathrooms
                </label>

                <input
                  name="bathrooms"
                  value={form.bathrooms}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Price
                </label>

                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* IMAGE */}
            <div style={{ marginTop: "5px", marginBottom: "20px" }}>
              <label style={labelStyle}>
                Promotion Banner
                {!editingId && " *"}
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px dashed #cdbfa9",
                  borderRadius: "8px",
                  background: "#faf8f4",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />

              {imagePreview && (
                <div
                  style={{
                    marginTop: "15px",
                    width: "250px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid #ddd",
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Promotion preview"
                    style={{
                      width: "100%",
                      height: "150px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              )}
            </div>

            {/* FEATURED + STATUS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "18px",
                alignItems: "end",
              }}
            >
              <div style={fieldStyle}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#333",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="featured"
                    checked={form.featured}
                    onChange={handleChange}
                    style={{
                      width: "19px",
                      height: "19px",
                      cursor: "pointer",
                    }}
                  />

                  Featured Promotion
                </label>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Status
                </label>

                <LargeSelect
                  value={form.status}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                  options={statusOptions}
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "10px",
              }}
            >
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{
                  padding: "12px 22px",
                  borderRadius: "8px",
                  border: "1px solid #cfc4b4",
                  background: "#fff",
                  color: "#444",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#a67c27",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Promotion"
                  : "Save Promotion"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIST */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e1d5c3",
          borderRadius: "14px",
          padding: "22px",
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: "22px",
            color: "#2a2117",
          }}
        >
          Promotions
        </h2>

        {filteredAdvertisements.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "45px 20px",
              color: "#777",
              fontSize: "15px",
            }}
          >
            No advertisements found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredAdvertisements.map((ad) => (
              <div
                key={ad.id}
                style={{
                  border: "1px solid #e5dac9",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {ad.image && (
                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <img
                      src={getImageUrl(ad.image)}
                      alt={ad.title || "Advertisement"}
                      style={{
                        width: "100%",
                        height: "190px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    {(ad.featured === 1 ||
                      ad.featured === true ||
                      ad.featured === "1") && (
                      <span
                        style={{
                          position: "absolute",
                          top: "12px",
                          left: "12px",
                          background: "#a67c27",
                          color: "#fff",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        Featured
                      </span>
                    )}
                  </div>
                )}

                <div style={{ padding: "17px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#8b6824",
                        fontWeight: 800,
                      }}
                    >
                      {ad.advertisement_type ||
                        "Property"}
                    </span>

                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color:
                          ad.status === "Active"
                            ? "#26733c"
                            : "#888",
                      }}
                    >
                      {ad.status || "Active"}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "18px",
                      color: "#2c241a",
                    }}
                  >
                    {ad.title}
                  </h3>

                  {ad.description && (
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        color: "#665d52",
                      }}
                    >
                      {ad.description}
                    </p>
                  )}

                  {ad.offer_title && (
                    <div
                      style={{
                        marginBottom: "10px",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      <strong>Offer:</strong>{" "}
                      {ad.offer_title}
                    </div>
                  )}

                  {ad.offer_details && (
                    <div
                      style={{
                        marginBottom: "10px",
                        fontSize: "13px",
                        lineHeight: 1.5,
                        color: "#666",
                      }}
                    >
                      {ad.offer_details}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gap: "5px",
                      fontSize: "13px",
                      color: "#555",
                      marginBottom: "15px",
                    }}
                  >
                    {ad.project_name && (
                      <div>
                        <strong>Project:</strong>{" "}
                        {ad.project_name}
                      </div>
                    )}

                    {ad.location && (
                      <div>
                        <strong>Location:</strong>{" "}
                        {ad.location}
                      </div>
                    )}

                    {ad.unit_type && (
                      <div>
                        <strong>Unit:</strong>{" "}
                        {ad.unit_type}
                      </div>
                    )}

                    {ad.bhk && (
                      <div>
                        <strong>BHK:</strong> {ad.bhk}
                      </div>
                    )}

                    {ad.area && (
                      <div>
                        <strong>Area:</strong> {ad.area}
                      </div>
                    )}

                    {ad.price && (
                      <div>
                        <strong>Price:</strong> {ad.price}
                      </div>
                    )}

                    {ad.floor && (
                      <div>
                        <strong>Floor:</strong>{" "}
                        {ad.floor}
                      </div>
                    )}

                    {ad.bathrooms && (
                      <div>
                        <strong>Bathrooms:</strong>{" "}
                        {ad.bathrooms}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "9px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        editAdvertisement(ad)
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "7px",
                        border: "1px solid #bda675",
                        background: "#fffaf0",
                        color: "#76571e",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAdvertisement(ad.id)
                      }
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "7px",
                        border: "none",
                        background: "#9c3d35",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAdvertisements;