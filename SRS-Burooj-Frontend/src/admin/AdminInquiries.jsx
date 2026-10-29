import { adminFetch } from "./adminApi";
import { useEffect, useRef, useState } from "react";

const API_URL = "http://localhost:5000/api/inquiries";

/* =========================================================
   LARGE CUSTOM DROPDOWN
========================================================= */
function LargeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "12px 16px",
          border: "1px solid #c8c8c8",
          borderRadius: "8px",
          background: "#ffffff",
          color: selectedOption ? "#172033" : "#777",
          fontSize: "16px",
          fontWeight: "600",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <span>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <span
          style={{
            fontSize: "18px",
            color: "#071a33",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            maxHeight: "320px",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #bfc5cc",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
            zIndex: 5000,
            padding: "6px",
            boxSizing: "border-box",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  minHeight: "50px",
                  padding: "13px 16px",
                  border: "none",
                  borderRadius: "7px",
                  background: isSelected ? "#071a33" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#172033",
                  fontSize: "17px",
                  fontWeight: isSelected ? "700" : "500",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "2px",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#eef3f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#ffffff";
                  }
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CALENDAR HELPERS
========================================================= */
const pad2 = (number) => String(number).padStart(2, "0");

function formatDateValue(date) {
  if (!date) return "";

  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(date.getDate())}`;
}

function parseDateValue(value) {
  if (!value) return null;

  const parts = value.split("-");

  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const previousMonthDays = new Date(year, month, 0).getDate();

  const days = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, previousMonthDays - i),
      currentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: new Date(year, month, day),
      currentMonth: true,
    });
  }

  let nextDay = 1;

  while (days.length < 42) {
    days.push({
      date: new Date(year, month + 1, nextDay),
      currentMonth: false,
    });

    nextDay++;
  }

  return days;
}

/* =========================================================
   LARGE CUSTOM DATE PICKER
========================================================= */
function LargeDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Select date",
}) {
  const selectedDate = parseDateValue(value);
  const minimumDate = parseDateValue(minDate);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const initialDate = selectedDate || new Date();

  const [viewDate, setViewDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1
        )
      );
    }
  }, [value]);

  const calendarDays = getCalendarDays(
    viewDate.getFullYear(),
    viewDate.getMonth()
  );

  const monthName = viewDate.toLocaleString("default", {
    month: "long",
  });

  const year = viewDate.getFullYear();

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isBeforeMinimum = (date) => {
    if (!minimumDate) return false;

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

  const goPreviousMonth = () => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() - 1,
        1
      )
    );
  };

  const goNextMonth = () => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + 1,
        1
      )
    );
  };

  const selectDate = (date) => {
    if (isBeforeMinimum(date)) return;

    onChange(formatDateValue(date));
    setOpen(false);
  };

  const selectToday = () => {
    const today = new Date();

    if (isBeforeMinimum(today)) return;

    onChange(formatDateValue(today));

    setViewDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setOpen(false);
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "11px 15px",
          border: "1px solid #c8c8c8",
          borderRadius: "8px",
          background: "#ffffff",
          color: value ? "#172033" : "#777",
          fontSize: "16px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}
        >
          <span style={{ fontSize: "19px" }}>📅</span>
          <span>{value || placeholder}</span>
        </span>

        <span
          style={{
            fontSize: "18px",
            color: "#071a33",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: "390px",
            maxWidth: "calc(100vw - 30px)",
            background: "#ffffff",
            border: "1px solid #c5cbd2",
            borderRadius: "14px",
            boxShadow: "0 14px 35px rgba(0,0,0,0.22)",
            padding: "16px",
            zIndex: 6000,
            boxSizing: "border-box",
          }}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "15px",
            }}
          >
            <button
              type="button"
              onClick={goPreviousMonth}
              style={{
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "9px",
                background: "#071a33",
                color: "#ffffff",
                fontSize: "23px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              ‹
            </button>

            <div
              style={{
                fontSize: "21px",
                fontWeight: "800",
                color: "#071a33",
                textAlign: "center",
              }}
            >
              {monthName} {year}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              style={{
                width: "44px",
                height: "44px",
                border: "none",
                borderRadius: "9px",
                background: "#071a33",
                color: "#ffffff",
                fontSize: "23px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              ›
            </button>
          </div>

          {/* Weekdays */}
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
                    fontWeight: "800",
                    color: "#586274",
                    padding: "7px 0",
                  }}
                >
                  {day}
                </div>
              )
            )}
          </div>

          {/* Dates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "5px",
            }}
          >
            {calendarDays.map((item, index) => {
              const selected = isSameDate(item.date, selectedDate);
              const disabled = isBeforeMinimum(item.date);

              return (
                <button
                  key={`${item.date.toISOString()}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(item.date)}
                  style={{
                    width: "100%",
                    height: "43px",
                    border: selected
                      ? "2px solid #071a33"
                      : "1px solid #e0e3e7",
                    borderRadius: "8px",
                    background: selected
                      ? "#071a33"
                      : item.currentMonth
                      ? "#ffffff"
                      : "#f3f4f6",
                    color: selected
                      ? "#ffffff"
                      : disabled
                      ? "#c5c8cc"
                      : item.currentMonth
                      ? "#172033"
                      : "#9da3aa",
                    fontSize: "15px",
                    fontWeight: selected ? "800" : "600",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  {item.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button
              type="button"
              onClick={selectToday}
              style={{
                flex: 1,
                minHeight: "44px",
                border: "none",
                borderRadius: "8px",
                background: "#071a33",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={clearDate}
              style={{
                flex: 1,
                minHeight: "44px",
                border: "1px solid #c5cbd2",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#071a33",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Website",
    status: "New",
    callback_date: "",
    feedback: "",
    message: "",
  });

  /* =======================================================
     LOAD INQUIRIES
  ======================================================= */
  const loadInquiries = async () => {
    try {
      setLoading(true);

      const response = await adminFetch(API_URL);
      const data = await response.json();

      if (data.success) {
        setInquiries(data.inquiries || []);
      } else {
        alert(data.message || "Failed to load inquiries");
      }
    } catch (error) {
      console.error("Load inquiries error:", error);
      alert("Server se connection nahi ho raha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  /* =======================================================
     RESET FORM
  ======================================================= */
  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      source: "Website",
      status: "New",
      callback_date: "",
      feedback: "",
      message: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  /* =======================================================
     INPUT CHANGE
  ======================================================= */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =======================================================
     SAVE / UPDATE
  ======================================================= */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      alert("Name and Phone are required.");
      return;
    }

    try {
      setSaving(true);

      const url = editingId
        ? `${API_URL}/${editingId}`
        : API_URL;

      const method = editingId ? "PUT" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to save inquiry"
        );
      }

      alert(
        editingId
          ? "Inquiry updated successfully."
          : "Inquiry saved successfully."
      );

      resetForm();
      loadInquiries();
    } catch (error) {
      console.error("Save inquiry error:", error);
      alert(error.message || "Failed to save inquiry.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     EDIT
  ======================================================= */
  const handleEdit = (inquiry) => {
    setForm({
      name: inquiry.name || "",
      phone: inquiry.phone || "",
      email: inquiry.email || "",
      source: inquiry.source || "Website",
      status: inquiry.status || "New",
      callback_date: inquiry.callback_date
        ? inquiry.callback_date.substring(0, 10)
        : "",
      feedback: inquiry.feedback || "",
      message: inquiry.message || "",
    });

    setEditingId(inquiry.id);
    setShowForm(true);
  };

  /* =======================================================
     DELETE
  ======================================================= */
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this inquiry?"
    );

    if (!confirmed) return;

    try {
      const response = await adminFetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete inquiry"
        );
      }

      alert("Inquiry deleted successfully.");
      loadInquiries();
    } catch (error) {
      console.error("Delete inquiry error:", error);
      alert(error.message || "Failed to delete inquiry.");
    }
  };

  /* =======================================================
     FILTER
  ======================================================= */
  const filteredInquiries = inquiries.filter((inquiry) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return [
      inquiry.name,
      inquiry.phone,
      inquiry.email,
      inquiry.source,
      inquiry.status,
      inquiry.message,
      inquiry.feedback,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(query)
      );
  });

  /* =======================================================
     STATUS STYLE
  ======================================================= */
  const getStatusStyle = (status) => {
    switch (status) {
      case "Contacted":
        return {
          background: "#e6f0ff",
          color: "#0757b5",
        };

      case "Follow-up":
        return {
          background: "#fff4cf",
          color: "#8a6200",
        };

      case "Closed":
        return {
          background: "#e4f7e9",
          color: "#19733a",
        };

      default:
        return {
          background: "#ffe6e6",
          color: "#b42318",
        };
    }
  };

  const totalCount = inquiries.length;

  const newCount = inquiries.filter(
    (item) => item.status === "New"
  ).length;

  const followUpCount = inquiries.filter(
    (item) => item.status === "Follow-up"
  ).length;

  const closedCount = inquiries.filter(
    (item) => item.status === "Closed"
  ).length;

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#f7f3ea",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .inquiry-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .inquiry-field label {
          font-size: 14px;
          font-weight: 700;
          color: #172033;
        }

        .inquiry-field input,
        .inquiry-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #c8c8c8;
          border-radius: 8px;
          background: #ffffff;
          color: #172033;
          font-size: 16px;
          font-weight: 500;
          outline: none;
          padding: 12px 14px;
        }

        .inquiry-field input {
          min-height: 48px;
        }

        .inquiry-field textarea {
          min-height: 110px;
          resize: vertical;
          line-height: 1.5;
        }

        .inquiry-field input:focus,
        .inquiry-field textarea:focus {
          border-color: #071a33;
          box-shadow: 0 0 0 3px rgba(7, 26, 51, 0.08);
        }

        .inquiry-action-button {
          border: none;
          border-radius: 8px;
          min-height: 44px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .inquiry-table {
          width: 100%;
          border-collapse: collapse;
        }

        .inquiry-table th {
          background: #071a33;
          color: #ffffff;
          padding: 13px 10px;
          font-size: 13px;
          text-align: left;
          white-space: nowrap;
        }

        .inquiry-table td {
          padding: 13px 10px;
          border-bottom: 1px solid #e4e4e4;
          color: #273142;
          font-size: 13px;
          vertical-align: top;
        }

        .inquiry-table tr:hover td {
          background: #fafafa;
        }
      `}</style>

      {/* ===================================================
          HEADER
      =================================================== */}
      <div
        style={{
          background: "linear-gradient(135deg, #0b3b82 0%, #071a33 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "22px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#d4af37",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "1px",
              marginBottom: "5px",
            }}
          >
            SRS BUROOJ
          </div>

          <h1
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: "800",
              lineHeight: 1.25,
            }}
          >
            Inquiry Management
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#dbe4f0",
              fontSize: "14px",
            }}
          >
            Manage website and customer inquiries
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingId(null);
              setShowForm(true);
            }
          }}
          className="inquiry-action-button"
          style={{
            background: "#d4af37",
            color: "#071a33",
            minWidth: "145px",
          }}
        >
          {showForm ? "Close Form" : "+ Add Inquiry"}
        </button>
      </div>

      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <SummaryCard
          title="Total"
          value={totalCount}
          accent="#071a33"
        />

        <SummaryCard
          title="New"
          value={newCount}
          accent="#b42318"
        />

        <SummaryCard
          title="Follow-up"
          value={followUpCount}
          accent="#8a6200"
        />

        <SummaryCard
          title="Closed"
          value={closedCount}
          accent="#19733a"
        />
      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px",
          border: "1px solid #e3dfd5",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, email, source, status..."
          style={{
            width: "100%",
            minHeight: "48px",
            boxSizing: "border-box",
            padding: "12px 15px",
            border: "1px solid #c8c8c8",
            borderRadius: "8px",
            outline: "none",
            fontSize: "16px",
            color: "#172033",
          }}
        />
      </div>

      {/* ===================================================
          FORM
      =================================================== */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid #e3dfd5",
            boxShadow: "0 5px 18px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                color: "#071a33",
                fontWeight: "800",
              }}
            >
              {editingId ? "Edit Inquiry" : "Add New Inquiry"}
            </h2>

            {editingId && (
              <span
                style={{
                  background: "#eef3f9",
                  color: "#071a33",
                  padding: "7px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                Editing Inquiry #{editingId}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            <FormField label="Name *">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Customer name"
                required
              />
            </FormField>

            <FormField label="Phone *">
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone number"
                required
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email address"
              />
            </FormField>

            <FormField label="Source">
              <LargeSelect
                value={form.source}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    source: value,
                  }))
                }
                options={[
                  {
                    value: "Website",
                    label: "Website",
                  },
                  {
                    value: "Instagram",
                    label: "Instagram",
                  },
                  {
                    value: "Facebook",
                    label: "Facebook",
                  },
                  {
                    value: "Phone",
                    label: "Phone",
                  },
                  {
                    value: "Reference",
                    label: "Reference",
                  },
                  {
                    value: "Office Visit",
                    label: "Office Visit",
                  },
                  {
                    value: "Other",
                    label: "Other",
                  },
                ]}
              />
            </FormField>

            <FormField label="Status">
              <LargeSelect
                value={form.status}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value,
                  }))
                }
                options={[
                  {
                    value: "New",
                    label: "New",
                  },
                  {
                    value: "Contacted",
                    label: "Contacted",
                  },
                  {
                    value: "Follow-up",
                    label: "Follow-up",
                  },
                  {
                    value: "Closed",
                    label: "Closed",
                  },
                ]}
              />
            </FormField>

            <FormField label="Callback Date">
              <LargeDatePicker
                value={form.callback_date}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    callback_date: value,
                  }))
                }
                placeholder="Select callback date"
              />
            </FormField>

            <div
              className="inquiry-field"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <label>Message</label>

              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Customer inquiry / message"
              />
            </div>

            <div
              className="inquiry-field"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <label>Feedback / Follow-up Notes</label>

              <textarea
                name="feedback"
                value={form.feedback}
                onChange={handleChange}
                placeholder="Add feedback or follow-up notes"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "22px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              className="inquiry-action-button"
              style={{
                background: "#071a33",
                color: "#ffffff",
                minWidth: "140px",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Inquiry"
                : "Save Inquiry"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="inquiry-action-button"
              style={{
                background: "#ffffff",
                color: "#071a33",
                border: "1px solid #c8c8c8",
                minWidth: "100px",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ===================================================
          TABLE
      =================================================== */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #e3dfd5",
          boxShadow: "0 5px 18px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #e6e6e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#071a33",
              fontSize: "19px",
              fontWeight: "800",
            }}
          >
            All Inquiries
          </h2>

          <span
            style={{
              fontSize: "13px",
              color: "#687386",
              fontWeight: "600",
            }}
          >
            {filteredInquiries.length} record
            {filteredInquiries.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div
            style={{
              padding: "45px",
              textAlign: "center",
              color: "#687386",
              fontSize: "15px",
            }}
          >
            Loading inquiries...
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#687386",
              fontSize: "15px",
            }}
          >
            No inquiries found.
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <table className="inquiry-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Callback</th>
                  <th>Feedback</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInquiries.map((inquiry) => {
                  const statusStyle = getStatusStyle(
                    inquiry.status
                  );

                  return (
                    <tr key={inquiry.id}>
                      <td>
                        <div
                          style={{
                            fontWeight: "800",
                            color: "#071a33",
                            fontSize: "14px",
                            marginBottom: "4px",
                          }}
                        >
                          {inquiry.name || "-"}
                        </div>

                        <div
                          style={{
                            color: "#7a8494",
                            fontSize: "12px",
                          }}
                        >
                          #{inquiry.id}
                        </div>
                      </td>

                      <td>
                        <div>{inquiry.phone || "-"}</div>

                        {inquiry.email && (
                          <div
                            style={{
                              color: "#687386",
                              marginTop: "4px",
                            }}
                          >
                            {inquiry.email}
                          </div>
                        )}
                      </td>

                      <td>
                        {inquiry.source || "-"}
                      </td>

                      <td
                        style={{
                          maxWidth: "220px",
                          lineHeight: "1.5",
                        }}
                      >
                        {inquiry.message || "-"}
                      </td>

                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "800",
                            background:
                              statusStyle.background,
                            color: statusStyle.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {inquiry.status || "New"}
                        </span>
                      </td>

                      <td>
                        {inquiry.callback_date
                          ? inquiry.callback_date.substring(
                              0,
                              10
                            )
                          : "-"}
                      </td>

                      <td
                        style={{
                          maxWidth: "220px",
                          lineHeight: "1.5",
                        }}
                      >
                        {inquiry.feedback || "-"}
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "7px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(inquiry)
                            }
                            style={{
                              border: "1px solid #071a33",
                              background: "#ffffff",
                              color: "#071a33",
                              borderRadius: "7px",
                              padding: "7px 10px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(inquiry.id)
                            }
                            style={{
                              border: "1px solid #b42318",
                              background: "#ffffff",
                              color: "#b42318",
                              borderRadius: "7px",
                              padding: "7px 10px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */
function SummaryCard({ title, value, accent }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "18px",
        border: "1px solid #e3dfd5",
        borderLeft: `5px solid ${accent}`,
        boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          color: "#687386",
          fontSize: "14px",
          fontWeight: "700",
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#071a33",
          fontSize: "28px",
          fontWeight: "800",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */
function FormField({ label, children }) {
  return (
    <div className="inquiry-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default AdminInquiries;