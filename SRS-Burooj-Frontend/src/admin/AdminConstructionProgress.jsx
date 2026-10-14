import { adminFetch } from "./adminApi";
import { useEffect, useRef, useState } from "react";

const API = "http://localhost:5000";

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
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const selectedOption = options.find(
    (option) => String(option.value) === String(value)
  );

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
          border: "1px solid #d8d0c0",
          borderRadius: "8px",
          background: "#fff",
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
          {selectedOption
            ? selectedOption.label
            : placeholder}
        </span>

        <span
          style={{
            fontSize: "18px",
            color: "#172033",
            transform: open
              ? "rotate(180deg)"
              : "rotate(0deg)",
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
            background: "#fff",
            border: "1px solid #c7c7c7",
            borderRadius: "10px",
            boxShadow:
              "0 12px 30px rgba(0,0,0,0.20)",
            zIndex: 5000,
            padding: "6px",
            boxSizing: "border-box",
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: "16px",
                fontSize: "16px",
                color: "#777",
              }}
            >
              No project/unit available
            </div>
          ) : (
            options.map((option) => {
              const isSelected =
                String(option.value) === String(value);

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
                    minHeight: "52px",
                    padding: "13px 16px",
                    border: "none",
                    borderRadius: "7px",
                    background: isSelected
                      ? "#172033"
                      : "#fff",
                    color: isSelected
                      ? "#fff"
                      : "#172033",
                    fontSize: "17px",
                    fontWeight: isSelected
                      ? "700"
                      : "500",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "#eef2f7";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "#fff";
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CALENDAR HELPERS
========================================================= */

const pad2 = (number) =>
  String(number).padStart(2, "0");

function formatDateValue(date) {
  if (!date) return "";

  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(date.getDate())}`;
}

function parseDateValue(value) {
  if (!value) return null;

  const parts = String(value).split("-");

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

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const previousMonthDays = new Date(
    year,
    month,
    0
  ).getDate();

  const days = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push({
      date: new Date(
        year,
        month - 1,
        previousMonthDays - i
      ),
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
      date: new Date(
        year,
        month + 1,
        nextDay
      ),
      currentMonth: false,
    });

    nextDay++;
  }

  return days;
}

/* =========================================================
   LARGE CUSTOM CALENDAR
========================================================= */

function LargeDatePicker({
  value,
  onChange,
  placeholder = "Select progress date",
}) {
  const selectedDate = parseDateValue(value);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const initialDate =
    selectedDate || new Date();

  const [viewDate, setViewDate] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
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

  const monthName = viewDate.toLocaleString(
    "default",
    {
      month: "long",
    }
  );

  const year = viewDate.getFullYear();

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;

    return (
      date1.getFullYear() ===
        date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
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
    onChange(formatDateValue(date));
    setOpen(false);
  };

  const selectToday = () => {
    const today = new Date();

    onChange(formatDateValue(today));

    setViewDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
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
          border: "1px solid #d8d0c0",
          borderRadius: "8px",
          background: "#fff",
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
          <span style={{ fontSize: "19px" }}>
            📅
          </span>

          <span>
            {value || placeholder}
          </span>
        </span>

        <span
          style={{
            fontSize: "18px",
            color: "#172033",
            transform: open
              ? "rotate(180deg)"
              : "rotate(0deg)",
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
            background: "#fff",
            border: "1px solid #c7c7c7",
            borderRadius: "14px",
            boxShadow:
              "0 14px 35px rgba(0,0,0,0.22)",
            padding: "16px",
            zIndex: 6000,
            boxSizing: "border-box",
          }}
        >
          {/* HEADER */}

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
                background: "#172033",
                color: "#fff",
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
                color: "#172033",
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
                background: "#172033",
                color: "#fff",
                fontSize: "23px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              ›
            </button>
          </div>

          {/* WEEKDAYS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(7, 1fr)",
              gap: "5px",
              marginBottom: "7px",
            }}
          >
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
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
            ))}
          </div>

          {/* DATES */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(7, 1fr)",
              gap: "5px",
            }}
          >
            {calendarDays.map(
              (item, index) => {
                const selected =
                  isSameDate(
                    item.date,
                    selectedDate
                  );

                return (
                  <button
                    key={`${item.date.toISOString()}-${index}`}
                    type="button"
                    onClick={() =>
                      selectDate(item.date)
                    }
                    style={{
                      width: "100%",
                      height: "43px",
                      border: selected
                        ? "2px solid #172033"
                        : "1px solid #e0e3e7",
                      borderRadius: "8px",
                      background: selected
                        ? "#172033"
                        : item.currentMonth
                        ? "#fff"
                        : "#f3f4f6",
                      color: selected
                        ? "#fff"
                        : item.currentMonth
                        ? "#172033"
                        : "#9da3aa",
                      fontSize: "15px",
                      fontWeight: selected
                        ? "800"
                        : "600",
                      cursor: "pointer",
                    }}
                  >
                    {item.date.getDate()}
                  </button>
                );
              }
            )}
          </div>

          {/* FOOTER */}

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
                background: "#172033",
                color: "#fff",
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
                border:
                  "1px solid #c5cbd2",
                borderRadius: "8px",
                background: "#fff",
                color: "#172033",
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

function AdminConstructionProgress() {
  const [customers, setCustomers] = useState([]);
  const [updates, setUpdates] = useState([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [listLoading, setListLoading] =
    useState(true);

  const emptyForm = {
    customer_property_id: "",
    progress_percentage: "",
    progress_date: "",
    update_note: "",
    progress_photo: null,
  };

  const [form, setForm] =
    useState(emptyForm);

  /* =====================================================
     LOAD CUSTOMER PROPERTY RECORDS
  ===================================================== */

  const loadCustomers = async () => {
    try {
      const response = await adminFetch(
        `${API}/api/customers`
      );

      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error(
        "Customer/property load error:",
        error
      );
    }
  };

  /* =====================================================
     LOAD ALL CONSTRUCTION UPDATES
  ===================================================== */

  const loadUpdates = async () => {
    setListLoading(true);

    try {
      const response = await adminFetch(
        `${API}/api/construction-progress`
      );

      const data = await response.json();

      if (data.success) {
        setUpdates(data.progress || []);
      } else {
        setUpdates([]);
      }
    } catch (error) {
      console.error(
        "Construction updates error:",
        error
      );

      setUpdates([]);
    } finally {
      setListLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadCustomers();
    loadUpdates();
  }, []);

  /* =====================================================
     INPUT CHANGE
  ===================================================== */

  const handleChange = (e) => {
    const {
      name,
      value,
      files,
    } = e.target;

    if (name === "progress_photo") {
      setForm({
        ...form,
        progress_photo:
          files?.[0] || null,
      });

      return;
    }

    if (name === "progress_percentage") {
      let number = value.replace(
        /[^0-9.]/g,
        ""
      );

      if (number !== "") {
        number = Math.min(
          100,
          Math.max(0, Number(number))
        );
      }

      setForm({
        ...form,
        progress_percentage: number,
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  /* =====================================================
     ADD BUTTON
  ===================================================== */

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      ...emptyForm,
      progress_date: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setShowForm(true);
  };

  /* =====================================================
     EDIT BUTTON
  ===================================================== */

  const openEditForm = (item) => {
    setEditingId(item.id);

    setForm({
      customer_property_id:
        item.customer_property_id || "",

      progress_percentage:
        item.progress_percentage ?? "",

      progress_date: item.progress_date
        ? String(item.progress_date).slice(
            0,
            10
          )
        : "",

      update_note: item.update_note || "",

      progress_photo: null,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     CLOSE FORM
  ===================================================== */

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  /* =====================================================
     SAVE / UPDATE
  ===================================================== */

  const saveProgress = async (e) => {
    e.preventDefault();

    if (!form.customer_property_id) {
      alert(
        "Please select project/unit."
      );
      return;
    }

    if (
      form.progress_percentage === "" ||
      Number(form.progress_percentage) < 0 ||
      Number(form.progress_percentage) > 100
    ) {
      alert(
        "Progress 0 se 100 ke beech hona chahiye."
      );
      return;
    }

    if (!form.progress_date) {
      alert(
        "Please select progress date."
      );
      return;
    }

    if (
      !editingId &&
      !form.progress_photo
    ) {
      alert(
        "Progress photo select karein."
      );
      return;
    }

    if (
      form.progress_photo &&
      form.progress_photo.size >
        5 * 1024 * 1024
    ) {
      alert(
        "Photo maximum 5 MB honi chahiye."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "customer_property_id",
        form.customer_property_id
      );

      formData.append(
        "progress_percentage",
        form.progress_percentage
      );

      formData.append(
        "progress_date",
        form.progress_date
      );

      formData.append(
        "update_note",
        form.update_note || ""
      );

      if (form.progress_photo) {
        formData.append(
          "progress_photo",
          form.progress_photo
        );
      }

      const url = editingId
        ? `${API}/api/construction-progress/${editingId}`
        : `${API}/api/construction-progress`;

      const response = await adminFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            (editingId
              ? "Progress update nahi hua."
              : "Progress save nahi hua.")
        );
        return;
      }

      alert(
        editingId
          ? "Construction progress updated successfully!"
          : "Construction progress added successfully!"
      );

      closeForm();

      await loadUpdates();
    } catch (error) {
      console.error(
        "Save progress error:",
        error
      );

      alert(
        "Server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const deleteProgress = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this construction progress update?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await adminFetch(
        `${API}/api/construction-progress/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Progress update delete nahi hua."
        );

        return;
      }

      alert(
        "Construction progress deleted successfully!"
      );

      await loadUpdates();
    } catch (error) {
      console.error(
        "Delete progress error:",
        error
      );

      alert(
        "Progress delete nahi hua."
      );
    }
  };

  /* =====================================================
     PROJECT NAME
  ===================================================== */

  const getProjectName = (item) => {
    if (item.project_name) {
      return item.project_name;
    }

    const property = customers.find(
      (c) =>
        Number(
          c.customer_property_id
        ) ===
        Number(
          item.customer_property_id
        )
    );

    return (
      property?.project_name ||
      property?.project ||
      "Project"
    );
  };

  /* =====================================================
     UNIT NAME
  ===================================================== */

  const getUnitName = (item) => {
    if (item.unit_number) {
      return item.unit_number;
    }

    const property = customers.find(
      (c) =>
        Number(
          c.customer_property_id
        ) ===
        Number(
          item.customer_property_id
        )
    );

    return (
      property?.unit_number ||
      property?.unit ||
      "Unit"
    );
  };

  /* =====================================================
     PHOTO URL
  ===================================================== */

  const getPhotoUrl = (photo) => {
    if (!photo) return "";

    if (photo.startsWith("http")) {
      return photo;
    }

    if (photo.startsWith("/")) {
      return `${API}${photo}`;
    }

    return `${API}/${photo}`;
  };

  /* =====================================================
     PROJECT / UNIT OPTIONS
  ===================================================== */

  const projectUnitOptions =
    customers
      .filter(
        (customer) =>
          customer.customer_property_id
      )
      .map((customer) => ({
        value:
          customer.customer_property_id,

        label: `${customer.project_name || "Project"} — ${
          customer.unit_number ||
          customer.unit ||
          "Unit"
        }`,
      }));

  return (
    <div
      style={{
        padding: "30px",
        background: "#f7f1e3",
        minHeight: "100%",
        color: "#172033",
      }}
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: "800",
            }}
          >
            Construction Progress
          </h1>

          <p
            style={{
              marginTop: "7px",
              color: "#687083",
              fontSize: "15px",
            }}
          >
            Manage construction updates,
            photos and progress history for
            projects and units.
          </p>
        </div>

        <button
          onClick={openAddForm}
          style={{
            border: "none",
            background: "#b88a2e",
            color: "#fff",
            padding: "13px 22px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "15px",
          }}
        >
          + Add Progress Update
        </button>
      </div>

      {/* ================================================= */}
      {/* ADD / EDIT FORM */}
      {/* ================================================= */}

      {showForm && (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "25px",
            marginBottom: "30px",
            boxShadow:
              "0 8px 25px rgba(23,32,51,0.08)",
            border: "1px solid #eadfca",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              {editingId
                ? "Edit Construction Progress"
                : "Add Construction Progress"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              style={{
                border: "none",
                background: "#eee",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={saveProgress}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "18px",
              }}
            >
              {/* PROJECT / UNIT */}

              <div>
                <label style={labelStyle}>
                  Project / Unit *
                </label>

                <LargeSelect
                  value={
                    form.customer_property_id
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      customer_property_id:
                        value,
                    })
                  }
                  placeholder="Select Project / Unit"
                  options={
                    projectUnitOptions
                  }
                />
              </div>

              {/* PROGRESS */}

              <div>
                <label style={labelStyle}>
                  Progress Percentage *
                </label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="number"
                    name="progress_percentage"
                    value={
                      form.progress_percentage
                    }
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 45"
                    style={inputStyle}
                    required
                  />

                  <strong
                    style={{
                      fontSize: "17px",
                    }}
                  >
                    %
                  </strong>
                </div>
              </div>

              {/* DATE */}

              <div>
                <label style={labelStyle}>
                  Progress Date *
                </label>

                <LargeDatePicker
                  value={
                    form.progress_date
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      progress_date:
                        value,
                    })
                  }
                  placeholder="Select progress date"
                />
              </div>

              {/* PHOTO */}

              <div>
                <label style={labelStyle}>
                  Progress Photo{" "}
                  {editingId
                    ? "(Optional)"
                    : "*"}
                </label>

                <input
                  type="file"
                  name="progress_photo"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    fontSize: "15px",
                  }}
                  required={!editingId}
                />

                <small
                  style={{
                    color: "#777",
                    display: "block",
                    marginTop: "5px",
                    fontSize: "13px",
                  }}
                >
                  JPG, PNG or WEBP — Max
                  5 MB
                </small>
              </div>
            </div>

            {/* NOTE */}

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <label style={labelStyle}>
                Update Note
              </label>

              <textarea
                name="update_note"
                value={form.update_note}
                onChange={handleChange}
                rows="4"
                placeholder="Example: Brickwork completed on first floor."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontSize: "16px",
                }}
              />
            </div>

            {/* BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <button
                type="submit"
                disabled={loading}
                style={{
                  border: "none",
                  background: "#172033",
                  color: "#fff",
                  padding: "13px 24px",
                  borderRadius: "9px",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Progress"
                  : "Save Progress"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                style={{
                  border:
                    "1px solid #ccc",
                  background: "#fff",
                  padding: "13px 24px",
                  borderRadius: "9px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================= */}
      {/* PROGRESS HISTORY */}
      {/* ================================================= */}

      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "25px",
          boxShadow:
            "0 8px 25px rgba(23,32,51,0.08)",
          border: "1px solid #eadfca",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              Progress History
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "14px",
              }}
            >
              All construction updates
            </p>
          </div>

          <strong
            style={{
              background: "#f7f1e3",
              padding: "8px 13px",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            {updates.length} Updates
          </strong>
        </div>

        {listLoading ? (
          <p
            style={{
              fontSize: "15px",
            }}
          >
            Loading construction updates...
          </p>
        ) : updates.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px 20px",
              color: "#777",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                marginBottom: "10px",
              }}
            >
              🏗️
            </div>

            <h3
              style={{
                fontSize: "18px",
              }}
            >
              No construction updates yet
            </h3>

            <p
              style={{
                fontSize: "14px",
              }}
            >
              Click “Add Progress Update”
              to add the first construction
              update.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(300px,1fr))",
              gap: "20px",
            }}
          >
            {updates.map((item) => (
              <div
                key={item.id}
                style={{
                  border:
                    "1px solid #e8dfcf",
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {/* PHOTO */}

                {item.progress_photo ? (
                  <img
                    src={getPhotoUrl(
                      item.progress_photo
                    )}
                    alt="Construction Progress"
                    style={{
                      width: "100%",
                      height: "190px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "190px",
                      background: "#eee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      fontSize: "40px",
                    }}
                  >
                    🏗️
                  </div>
                )}

                <div
                  style={{
                    padding: "18px",
                  }}
                >
                  {/* PROJECT + UNIT ONLY */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                      alignItems:
                        "center",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontSize: "16px",
                          color: "#172033",
                        }}
                      >
                        {getProjectName(item)}
                      </strong>

                      <div
                        style={{
                          color: "#777",
                          fontSize: "14px",
                          marginTop: "5px",
                          fontWeight: "600",
                        }}
                      >
                        Unit:{" "}
                        {getUnitName(item)}
                      </div>
                    </div>

                    <strong
                      style={{
                        background:
                          "#172033",
                        color: "#fff",
                        padding:
                          "7px 11px",
                        borderRadius:
                          "20px",
                        fontSize:
                          "14px",
                      }}
                    >
                      {
                        item.progress_percentage
                      }
                      %
                    </strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#eee",
                      borderRadius:
                        "10px",
                      marginTop: "15px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Number(
                            item.progress_percentage
                          )
                        )}%`,
                        height: "100%",
                        background:
                          "#b88a2e",
                        borderRadius:
                          "10px",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    📅{" "}
                    {item.progress_date
                      ? String(
                          item.progress_date
                        ).slice(
                          0,
                          10
                        )
                      : "No date"}
                  </div>

                  {item.update_note && (
                    <p
                      style={{
                        marginTop: "12px",
                        lineHeight: "1.5",
                        color: "#444",
                        fontSize: "14px",
                      }}
                    >
                      {item.update_note}
                    </p>
                  )}

                  {/* ACTIONS */}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "18px",
                    }}
                  >
                    <button
                      onClick={() =>
                        openEditForm(item)
                      }
                      style={{
                        flex: 1,
                        border:
                          "1px solid #172033",
                        background: "#fff",
                        color: "#172033",
                        padding: "10px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                        fontSize:
                          "14px",
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteProgress(
                          item.id
                        )
                      }
                      style={{
                        flex: 1,
                        border: "none",
                        background:
                          "#9d3030",
                        color: "#fff",
                        padding: "10px",
                        borderRadius:
                          "8px",
                        cursor:
                          "pointer",
                        fontWeight:
                          "700",
                        fontSize:
                          "14px",
                      }}
                    >
                      🗑️ Delete
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

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: "700",
  color: "#172033",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  minHeight: "48px",
  border: "1px solid #d8d0c0",
  borderRadius: "8px",
  background: "#fff",
  color: "#172033",
  fontSize: "16px",
  outline: "none",
};

export default AdminConstructionProgress;