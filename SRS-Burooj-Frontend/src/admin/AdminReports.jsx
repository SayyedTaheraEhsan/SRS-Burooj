import { adminFetch } from "./adminApi";
import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000/api";

const money = (value) => {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const numberValue = (obj, keys) => {
  for (const key of keys) {
    if (
      obj?.[key] !== undefined &&
      obj?.[key] !== null &&
      obj?.[key] !== ""
    ) {
      const n = Number(obj[key]);

      if (!Number.isNaN(n)) {
        return n;
      }
    }
  }

  return 0;
};

const textValue = (obj, keys) => {
  for (const key of keys) {
    if (
      obj?.[key] !== undefined &&
      obj?.[key] !== null &&
      String(obj[key]).trim() !== ""
    ) {
      return String(obj[key]);
    }
  }

  return "-";
};

const unwrap = (payload, keys) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const dateOnly = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

const formatDate = (value) => {
  const raw = dateOnly(value);

  if (!raw) {
    return "-";
  }

  const p = raw.split("-");

  return p.length === 3
    ? `${p[2]}/${p[1]}/${p[0]}`
    : raw;
};

const csvEscape = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

/* =========================================================
   LARGE DATE PICKER
========================================================= */

function LargeDatePicker({
  value,
  onChange,
  placeholder = "Select date",
}) {
  const [open, setOpen] = useState(false);

  const initialDate = value
    ? new Date(`${value}T00:00:00`)
    : new Date();

  const [viewDate, setViewDate] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );

  const pickerId = useMemo(
    () =>
      `reports-date-${Math.random()
        .toString(36)
        .slice(2)}`,
    []
  );

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        !event.target.closest(
          `.large-report-date-picker-${pickerId}`
        )
      ) {
        setOpen(false);
      }
    };

    const handleOtherPicker = (event) => {
      if (event.detail !== pickerId) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    window.addEventListener(
      "srs-reports-date-open",
      handleOtherPicker
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );

      window.removeEventListener(
        "srs-reports-date-open",
        handleOtherPicker
      );
    };
  }, [pickerId]);

  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);

      if (!Number.isNaN(d.getTime())) {
        setViewDate(
          new Date(
            d.getFullYear(),
            d.getMonth(),
            1
          )
        );
      }
    }
  }, [value]);

  const openPicker = () => {
    window.dispatchEvent(
      new CustomEvent("srs-reports-date-open", {
        detail: pickerId,
      })
    );

    setOpen((previous) => !previous);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekdays = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const calendarDays = [];

  for (let i = 0; i < firstDay; i += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(day);
  }

  const selectDate = (day) => {
    if (!day) {
      return;
    }

    const monthText = String(month + 1).padStart(
      2,
      "0"
    );

    const dayText = String(day).padStart(2, "0");

    const formatted = `${year}-${monthText}-${dayText}`;

    onChange(formatted);
    setOpen(false);
  };

  const goPrevious = () => {
    setViewDate(
      new Date(year, month - 1, 1)
    );
  };

  const goNext = () => {
    setViewDate(
      new Date(year, month + 1, 1)
    );
  };

  const goToday = () => {
    const today = new Date();

    setViewDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    const todayValue = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    onChange(todayValue);
    setOpen(false);
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div
      className={`large-report-date-picker-${pickerId}`}
      style={reportDateStyles.wrapper}
    >
      <button
        type="button"
        onClick={openPicker}
        style={reportDateStyles.trigger}
      >
        <span>
          {value ? formatDate(value) : placeholder}
        </span>

        <span style={reportDateStyles.calendarIcon}>
          📅
        </span>
      </button>

      {open && (
        <div style={reportDateStyles.popup}>
          <div style={reportDateStyles.popupHeader}>
            <button
              type="button"
              onClick={goPrevious}
              style={reportDateStyles.navButton}
            >
              ‹
            </button>

            <div style={reportDateStyles.monthTitle}>
              {monthNames[month]} {year}
            </div>

            <button
              type="button"
              onClick={goNext}
              style={reportDateStyles.navButton}
            >
              ›
            </button>
          </div>

          <div style={reportDateStyles.weekRow}>
            {weekdays.map((day) => (
              <div
                key={day}
                style={reportDateStyles.weekday}
              >
                {day}
              </div>
            ))}
          </div>

          <div style={reportDateStyles.daysGrid}>
            {calendarDays.map((day, index) => {
              const monthText = String(
                month + 1
              ).padStart(2, "0");

              const dayText = day
                ? String(day).padStart(2, "0")
                : "";

              const currentValue = day
                ? `${year}-${monthText}-${dayText}`
                : "";

              const selected =
                currentValue === value;

              return (
                <button
                  key={`${year}-${month}-${index}`}
                  type="button"
                  disabled={!day}
                  onClick={() => selectDate(day)}
                  style={{
                    ...reportDateStyles.dayButton,
                    ...(selected
                      ? reportDateStyles.selectedDay
                      : {}),
                    ...(day
                      ? {}
                      : reportDateStyles.emptyDay),
                  }}
                >
                  {day || ""}
                </button>
              );
            })}
          </div>

          <div style={reportDateStyles.footer}>
            <button
              type="button"
              onClick={goToday}
              style={reportDateStyles.todayButton}
            >
              Today
            </button>

            <button
              type="button"
              onClick={clearDate}
              style={reportDateStyles.clearButton}
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
   MAIN REPORTS
========================================================= */

function AdminReports() {
  const [reportType, setReportType] =
    useState("overview");

  const [customers, setCustomers] =
    useState([]);

  const [units, setUnits] =
    useState([]);

  const [projects, setProjects] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [paymentError, setPaymentError] =
    useState("");

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    setPaymentError("");

    const requests =
      await Promise.allSettled([
        adminFetch(`${API}/customers`).then((r) =>
          r.json()
        ),

        adminFetch(`${API}/units`).then((r) =>
          r.json()
        ),

        adminFetch(`${API}/projects`).then((r) =>
          r.json()
        ),

        adminFetch(`${API}/payments`).then(
          async (r) => {
            const data = await r.json();

            if (!r.ok) {
              throw new Error(
                data?.message ||
                  "Payment endpoint unavailable"
              );
            }

            return data;
          }
        ),
      ]);

    const [
      customerResult,
      unitResult,
      projectResult,
      paymentResult,
    ] = requests;

    if (
      customerResult.status ===
      "fulfilled"
    ) {
      setCustomers(
        unwrap(customerResult.value, [
          "customers",
          "customer",
        ])
      );
    } else {
      setCustomers([]);
    }

    if (
      unitResult.status === "fulfilled"
    ) {
      setUnits(
        unwrap(unitResult.value, [
          "units",
          "properties",
        ])
      );
    } else {
      setUnits([]);
    }

    if (
      projectResult.status ===
      "fulfilled"
    ) {
      setProjects(
        unwrap(projectResult.value, [
          "projects",
        ])
      );
    } else {
      setProjects([]);
    }

    if (
      paymentResult.status ===
      "fulfilled"
    ) {
      setPayments(
        unwrap(paymentResult.value, [
          "payments",
          "transactions",
        ])
      );
    } else {
      setPayments([]);

      setPaymentError(
        "Payment transaction report is unavailable because the payments API/table is not available. Customer paid/outstanding totals can still be shown from customer records."
      );
    }

    if (
      customerResult.status ===
        "rejected" &&
      unitResult.status === "rejected" &&
      projectResult.status ===
        "rejected"
    ) {
      setError(
        "Reports data load nahi ho saka. Backend server aur API routes check karein."
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  /* =========================================================
     FINANCIAL CALCULATIONS
  ========================================================= */

  const financial = useMemo(() => {
    const sales = customers.reduce(
      (sum, c) =>
        sum +
        numberValue(c, [
          "agreement_value",
          "estimated_total",
          "property_value",
          "purchase_value",
        ]),
      0
    );

    const paid = customers.reduce(
      (sum, c) =>
        sum +
        numberValue(c, [
          "paid_amount",
          "amount_paid",
          "total_paid",
        ]),
      0
    );

    const outstandingFromCustomers =
      customers.reduce(
        (sum, c) =>
          sum +
          numberValue(c, [
            "remaining_amount",
            "outstanding_amount",
            "balance_amount",
          ]),
        0
      );

    const recordedPayments =
      payments.reduce(
        (sum, p) =>
          sum +
          numberValue(p, [
            "payment_amount",
            "amount",
            "paid_amount",
          ]),
        0
      );

    return {
      sales,
      paid,
      outstanding:
        outstandingFromCustomers,
      recordedPayments,
    };
  }, [customers, payments]);

  const filteredPayments =
    useMemo(() => {
      const q = search
        .trim()
        .toLowerCase();

      return payments.filter((p) => {
        const d = dateOnly(
          p.payment_date ||
            p.date ||
            p.created_at
        );

        const matchesDate =
          (!fromDate || d >= fromDate) &&
          (!toDate || d <= toDate);

        const blob = [
          p.customer_name,
          p.name,
          p.project_name,
          p.unit_number,
          p.receipt_number,
          p.transaction_reference,
          p.payment_method,
          p.payment_mode,
        ]
          .map((x) =>
            String(x ?? "").toLowerCase()
          )
          .join(" ");

        return (
          matchesDate &&
          (!q || blob.includes(q))
        );
      });
    }, [
      payments,
      search,
      fromDate,
      toDate,
    ]);

  const filteredCustomers =
    useMemo(() => {
      const q = search
        .trim()
        .toLowerCase();

      if (!q) {
        return customers;
      }

      return customers.filter((c) =>
        [
          c.name,
          c.email,
          c.phone,
          c.customer_login_id,
          c.project_name,
          c.unit_number,
        ]
          .map((x) =>
            String(x ?? "").toLowerCase()
          )
          .join(" ")
          .includes(q)
      );
    }, [customers, search]);

  const filteredUnits = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) {
      return units;
    }

    return units.filter((u) =>
      [
        u.unit_number,
        u.unit_name,
        u.project_name,
        u.status,
        u.unit_type,
        u.floor,
      ]
        .map((x) =>
          String(x ?? "").toLowerCase()
        )
        .join(" ")
        .includes(q)
    );
  }, [units, search]);

  const unitStatus = useMemo(() => {
    const counts = {
      available: 0,
      reserved: 0,
      sold: 0,
      other: 0,
    };

    units.forEach((u) => {
      const s = textValue(u, [
        "status",
        "unit_status",
      ]).toLowerCase();

      if (s.includes("available")) {
        counts.available += 1;
      } else if (
        s.includes("reserved") ||
        s.includes("booked")
      ) {
        counts.reserved += 1;
      } else if (
        s.includes("sold") ||
        s.includes("allotted")
      ) {
        counts.sold += 1;
      } else {
        counts.other += 1;
      }
    });

    return counts;
  }, [units]);

  const averageProgress =
    useMemo(() => {
      if (!customers.length) {
        return 0;
      }

      return Math.round(
        customers.reduce(
          (sum, c) =>
            sum +
            numberValue(c, [
              "project_progress",
              "progress_percentage",
              "construction_progress",
            ]),
          0
        ) / customers.length
      );
    }, [customers]);

  /* =========================================================
     CSV EXPORT
  ========================================================= */

  const exportReport = () => {
    let rows = [];

    let filename = `srs-burooj-${reportType}-report.csv`;

    if (reportType === "customers") {
      rows = [
        [
          "Customer",
          "Login ID",
          "Phone",
          "Project",
          "Unit",
          "Agreement Value",
          "Paid",
          "Outstanding",
          "Progress",
          "Status",
        ],

        ...filteredCustomers.map(
          (c) => [
            c.name,
            c.customer_login_id,
            c.phone,
            c.project_name,
            c.unit_number,

            numberValue(c, [
              "agreement_value",
              "estimated_total",
              "property_value",
              "purchase_value",
            ]),

            numberValue(c, [
              "paid_amount",
              "amount_paid",
              "total_paid",
            ]),

            numberValue(c, [
              "remaining_amount",
              "outstanding_amount",
              "balance_amount",
            ]),

            numberValue(c, [
              "project_progress",
              "progress_percentage",
              "construction_progress",
            ]),

            c.customer_status ||
              c.status,
          ]
        ),
      ];
    } else if (
      reportType === "payments"
    ) {
      rows = [
        [
          "Date",
          "Customer",
          "Project",
          "Unit",
          "Amount",
          "Payment Mode",
          "Receipt Number",
          "Transaction Reference",
        ],

        ...filteredPayments.map(
          (p) => [
            dateOnly(
              p.payment_date ||
                p.date ||
                p.created_at
            ),

            textValue(p, [
              "customer_name",
              "name",
            ]),

            p.project_name,
            p.unit_number,

            numberValue(p, [
              "payment_amount",
              "amount",
              "paid_amount",
            ]),

            textValue(p, [
              "payment_method",
              "payment_mode",
            ]),

            p.receipt_number,
            p.transaction_reference,
          ]
        ),
      ];
    } else if (
      reportType === "units"
    ) {
      rows = [
        [
          "Unit",
          "Project",
          "Type",
          "Floor",
          "Area Sq Ft",
          "Price",
          "Status",
        ],

        ...filteredUnits.map(
          (u) => [
            textValue(u, [
              "unit_number",
              "unit_name",
            ]),

            u.project_name,
            u.unit_type,
            u.floor,

            numberValue(u, [
              "carpet_area",
              "area",
              "area_sqft",
            ]),

            numberValue(u, [
              "price",
              "unit_price",
              "property_value",
            ]),

            textValue(u, [
              "status",
              "unit_status",
            ]),
          ]
        ),
      ];
    } else {
      rows = [
        ["Metric", "Value"],

        ["Projects", projects.length],

        ["Customers", customers.length],

        ["Units", units.length],

        [
          "Property Sales",
          financial.sales,
        ],

        [
          "Customer Paid",
          financial.paid,
        ],

        [
          "Outstanding",
          financial.outstanding,
        ],

        [
          "Recorded Payment Transactions",
          payments.length,
        ],

        [
          "Recorded Payment Amount",
          financial.recordedPayments,
        ],

        [
          "Available Units",
          unitStatus.available,
        ],

        [
          "Reserved Units",
          unitStatus.reserved,
        ],

        [
          "Sold Units",
          unitStatus.sold,
        ],

        [
          "Average Construction Progress %",
          averageProgress,
        ],
      ];
    }

    const csv = rows
      .map((row) =>
        row.map(csvEscape).join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  };

  const card = (
    label,
    value,
    note
  ) => (
    <div style={styles.card}>
      <div style={styles.cardLabel}>
        {label}
      </div>

      <div style={styles.cardValue}>
        {value}
      </div>

      <div style={styles.cardNote}>
        {note}
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            SRS BUROOJ • MANAGEMENT REPORTS
          </div>

          <h1 style={styles.title}>
            Reports & Analytics
          </h1>

          <p style={styles.subtitle}>
            Sales, customers, payments,
            installments-ready finance data
            and property status in one place.
          </p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            onClick={loadReports}
          >
            ↻ Refresh
          </button>

          <button
            style={styles.goldButton}
            onClick={() =>
              window.print()
            }
          >
            🖨 Print
          </button>

          <button
            style={styles.goldButton}
            onClick={exportReport}
          >
            ⇩ Export CSV
          </button>
        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div style={styles.tabs}>
        {[
          "overview",
          "customers",
          "payments",
          "units",
        ].map((type) => (
          <button
            key={type}
            onClick={() =>
              setReportType(type)
            }
            style={{
              ...styles.tab,
              ...(reportType === type
                ? styles.activeTab
                : {}),
            }}
          >
            {type === "overview"
              ? "Overview"
              : type[0].toUpperCase() +
                type.slice(1) +
                " Report"}
          </button>
        ))}
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div style={styles.filters}>
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search customer, unit, project, receipt..."
          style={styles.input}
        />

        {(reportType === "payments" ||
          reportType === "overview") && (
          <>
            <LargeDatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="From date"
            />

            <LargeDatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="To date"
            />
          </>
        )}

        <button
          style={styles.clearButton}
          onClick={() => {
            setSearch("");
            setFromDate("");
            setToDate("");
          }}
        >
          Clear
        </button>
      </div>

      {/* =====================================================
          MESSAGES
      ===================================================== */}

      {loading && (
        <div style={styles.message}>
          Reports load ho rahe hain...
        </div>
      )}

      {!loading && error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {!loading && paymentError && (
        <div style={styles.warning}>
          ⚠ {paymentError}
        </div>
      )}

      {/* =====================================================
          OVERVIEW
      ===================================================== */}

      {!loading &&
        reportType === "overview" && (
          <>
            <div style={styles.grid}>
              {card(
                "Property Sales",
                money(financial.sales),
                `${customers.length} customer records`
              )}

              {card(
                "Customer Paid",
                money(financial.paid),
                "From customer financial records"
              )}

              {card(
                "Outstanding",
                money(financial.outstanding),
                "Current customer balances"
              )}

              {card(
                "Payment Transactions",
                payments.length.toLocaleString(
                  "en-IN"
                ),
                money(
                  financial.recordedPayments
                ) + " recorded"
              )}

              {card(
                "Projects",
                projects.length,
                "Projects in system"
              )}

              {card(
                "Customers",
                customers.length,
                "Registered customer profiles"
              )}

              {card(
                "Available Units",
                unitStatus.available,
                "Currently available"
              )}

              {card(
                "Reserved / Booked",
                unitStatus.reserved,
                "Reserved or booked"
              )}

              {card(
                "Sold / Allotted",
                unitStatus.sold,
                "Sold or allotted"
              )}

              {card(
                "Avg. Construction",
                `${averageProgress}%`,
                "Across customer records"
              )}
            </div>

            <div style={styles.twoCol}>
              <section style={styles.panel}>
                <h2 style={styles.panelTitle}>
                  Business Summary
                </h2>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Total projects
                  </span>

                  <strong>
                    {projects.length}
                  </strong>
                </div>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Total units /
                    properties
                  </span>

                  <strong>
                    {units.length}
                  </strong>
                </div>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Total customers
                  </span>

                  <strong>
                    {customers.length}
                  </strong>
                </div>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Sales value
                  </span>

                  <strong>
                    {money(
                      financial.sales
                    )}
                  </strong>
                </div>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Collected from
                    customers
                  </span>

                  <strong>
                    {money(
                      financial.paid
                    )}
                  </strong>
                </div>

                <div
                  style={styles.summaryRow}
                >
                  <span>
                    Outstanding
                  </span>

                  <strong>
                    {money(
                      financial.outstanding
                    )}
                  </strong>
                </div>
              </section>

              <section style={styles.panel}>
                <h2 style={styles.panelTitle}>
                  Property Status
                </h2>

                <div
                  style={styles.statusLine}
                >
                  <span>
                    Available
                  </span>

                  <b>
                    {unitStatus.available}
                  </b>
                </div>

                <div style={styles.bar}>
                  <span
                    style={{
                      ...styles.barSpan,
                      width: `${
                        units.length
                          ? Math.min(
                              100,
                              (unitStatus.available /
                                units.length) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div
                  style={styles.statusLine}
                >
                  <span>
                    Reserved / Booked
                  </span>

                  <b>
                    {unitStatus.reserved}
                  </b>
                </div>

                <div style={styles.bar}>
                  <span
                    style={{
                      ...styles.barSpan,
                      width: `${
                        units.length
                          ? Math.min(
                              100,
                              (unitStatus.reserved /
                                units.length) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div
                  style={styles.statusLine}
                >
                  <span>
                    Sold / Allotted
                  </span>

                  <b>
                    {unitStatus.sold}
                  </b>
                </div>

                <div style={styles.bar}>
                  <span
                    style={{
                      ...styles.barSpan,
                      width: `${
                        units.length
                          ? Math.min(
                              100,
                              (unitStatus.sold /
                                units.length) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </section>
            </div>
          </>
        )}

      {/* =====================================================
          CUSTOMER REPORT
      ===================================================== */}

      {!loading &&
        reportType === "customers" && (
          <Table
            title="Customer Report"
            headers={[
              "Customer",
              "Login ID",
              "Project / Unit",
              "Agreement",
              "Paid",
              "Outstanding",
              "Progress",
              "Status",
            ]}
            rows={filteredCustomers.map(
              (c) => [
                textValue(c, ["name"]),

                textValue(c, [
                  "customer_login_id",
                ]),

                `${textValue(c, [
                  "project_name",
                ])} / ${textValue(c, [
                  "unit_number",
                ])}`,

                money(
                  numberValue(c, [
                    "agreement_value",
                    "estimated_total",
                    "property_value",
                    "purchase_value",
                  ])
                ),

                money(
                  numberValue(c, [
                    "paid_amount",
                    "amount_paid",
                    "total_paid",
                  ])
                ),

                money(
                  numberValue(c, [
                    "remaining_amount",
                    "outstanding_amount",
                    "balance_amount",
                  ])
                ),

                `${numberValue(c, [
                  "project_progress",
                  "progress_percentage",
                  "construction_progress",
                ])}%`,

                textValue(c, [
                  "customer_status",
                  "status",
                ]),
              ]
            )}
            empty="No customer records found."
          />
        )}

      {/* =====================================================
          PAYMENT REPORT
      ===================================================== */}

      {!loading &&
        reportType === "payments" && (
          <Table
            title="Payment Transaction Report"
            headers={[
              "Date",
              "Customer",
              "Project / Unit",
              "Amount",
              "Mode",
              "Receipt",
              "Reference",
            ]}
            rows={filteredPayments.map(
              (p) => [
                formatDate(
                  p.payment_date ||
                    p.date ||
                    p.created_at
                ),

                textValue(p, [
                  "customer_name",
                  "name",
                ]),

                `${textValue(p, [
                  "project_name",
                ])} / ${textValue(p, [
                  "unit_number",
                ])}`,

                money(
                  numberValue(p, [
                    "payment_amount",
                    "amount",
                    "paid_amount",
                  ])
                ),

                textValue(p, [
                  "payment_method",
                  "payment_mode",
                ]),

                textValue(p, [
                  "receipt_number",
                ]),

                textValue(p, [
                  "transaction_reference",
                ]),
              ]
            )}
            empty="No payment transactions available."
          />
        )}

      {/* =====================================================
          UNIT REPORT
      ===================================================== */}

      {!loading &&
        reportType === "units" && (
          <Table
            title="Property & Unit Report"
            headers={[
              "Unit",
              "Project",
              "Type",
              "Floor",
              "Area",
              "Price",
              "Status",
            ]}
            rows={filteredUnits.map(
              (u) => [
                textValue(u, [
                  "unit_number",
                  "unit_name",
                ]),

                textValue(u, [
                  "project_name",
                ]),

                textValue(u, [
                  "unit_type",
                ]),

                textValue(u, ["floor"]),

                `${numberValue(u, [
                  "carpet_area",
                  "area",
                  "area_sqft",
                ])} sq ft`,

                money(
                  numberValue(u, [
                    "price",
                    "unit_price",
                    "property_value",
                  ])
                ),

                textValue(u, [
                  "status",
                  "unit_status",
                ]),
              ]
            )}
            empty="No unit records found."
          />
        )}

      <div style={styles.footerNote}>
        SRS Burooj Reports • Data is read
        from the existing backend APIs. No
        existing customer/project/unit
        records are modified by this page.
      </div>
    </div>
  );
}

/* =========================================================
   TABLE
========================================================= */

function Table({
  title,
  headers,
  rows,
  empty,
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.tableHead}>
        <h2 style={styles.panelTitle}>
          {title}
        </h2>

        <span style={styles.count}>
          {rows.length} records
        </span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={styles.th}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map(
                    (cell, j) => (
                      <td
                        key={j}
                        style={styles.td}
                      >
                        {cell}
                      </td>
                    )
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  style={styles.empty}
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   MAIN STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100%",
    padding: "30px",
    background: "#f5f7fb",
    color: "#162033",
    fontFamily:
      "Inter, Arial, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "flex-start",
    marginBottom: 24,
  },

  eyebrow: {
    color: "#b08a2e",
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 2,
  },

  title: {
    margin: "7px 0 8px",
    fontSize: 34,
    lineHeight: 1.2,
    color: "#101827",
    fontWeight: 900,
  },

  subtitle: {
    margin: 0,
    color: "#687386",
    fontSize: 16,
    lineHeight: 1.55,
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  goldButton: {
    border: "0",
    borderRadius: 9,
    padding: "12px 17px",
    minHeight: 46,
    background: "#b18a36",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #d8dee8",
    borderRadius: 9,
    padding: "12px 17px",
    minHeight: 46,
    background: "#fff",
    color: "#263246",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },

  tabs: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
    marginBottom: 16,
  },

  tab: {
    border: "1px solid #dce2eb",
    background: "#fff",
    color: "#586579",
    borderRadius: 9,
    padding: "12px 17px",
    minHeight: 46,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  activeTab: {
    background: "#162033",
    color: "#fff",
    borderColor: "#162033",
  },

  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    background: "#fff",
    border: "1px solid #e0e5ed",
    padding: 14,
    borderRadius: 13,
    marginBottom: 18,
    alignItems: "center",
    position: "relative",
    zIndex: 20,
  },

  input: {
    flex: "1 1 300px",
    minWidth: 240,
    minHeight: 50,
    border: "1px solid #d8dee8",
    borderRadius: 9,
    padding: "12px 14px",
    outline: "none",
    fontSize: 16,
    color: "#162033",
    boxSizing: "border-box",
    background: "#fff",
  },

  clearButton: {
    border: "1px solid #d8dee8",
    background: "#f8fafc",
    color: "#273348",
    borderRadius: 9,
    padding: "11px 16px",
    cursor: "pointer",
    minHeight: 50,
    fontSize: 15,
    fontWeight: 800,
  },

  message: {
    background: "#fff",
    borderRadius: 13,
    padding: 22,
    border: "1px solid #e0e5ed",
    fontSize: 16,
    color: "#39465b",
  },

  error: {
    background: "#fff0f0",
    color: "#a52626",
    border: "1px solid #efc6c6",
    padding: 16,
    borderRadius: 11,
    marginBottom: 15,
    fontSize: 15,
    fontWeight: 700,
  },

  warning: {
    background: "#fff9e9",
    color: "#765d19",
    border: "1px solid #ead69c",
    padding: 16,
    borderRadius: 11,
    marginBottom: 15,
    lineHeight: 1.6,
    fontSize: 15,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 15,
    marginBottom: 20,
  },

  card: {
    background: "#fff",
    border: "1px solid #e0e5ed",
    borderRadius: 14,
    padding: 19,
    minHeight: 135,
    boxShadow:
      "0 4px 16px rgba(20,30,50,.04)",
    boxSizing: "border-box",
  },

  cardLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: "#738096",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  cardValue: {
    fontSize: 27,
    lineHeight: 1.25,
    fontWeight: 900,
    marginTop: 10,
    color: "#152033",
  },

  cardNote: {
    fontSize: 14,
    color: "#8993a3",
    marginTop: 7,
    lineHeight: 1.4,
  },

  twoCol: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(320px,1fr))",
    gap: 16,
  },

  panel: {
    background: "#fff",
    border: "1px solid #e0e5ed",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    boxShadow:
      "0 4px 16px rgba(20,30,50,.04)",
    boxSizing: "border-box",
  },

  panelTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.3,
    color: "#172237",
    fontWeight: 900,
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 0",
    borderBottom:
      "1px solid #edf0f5",
    color: "#657084",
    fontSize: 15,
    lineHeight: 1.4,
  },

  statusLine: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
    fontSize: 15,
    color: "#5e6b7e",
  },

  bar: {
    height: 9,
    background: "#edf0f4",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 8,
  },

  barSpan: {
    height: "100%",
    background: "#b18a36",
    display: "block",
    borderRadius: 20,
  },

  tableHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 16,
  },

  count: {
    color: "#8a94a4",
    fontSize: 14,
    fontWeight: 800,
  },

  tableWrap: {
    overflowX: "auto",
    width: "100%",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 800,
  },

  th: {
    textAlign: "left",
    padding: "14px 12px",
    background: "#f7f8fb",
    color: "#657084",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderBottom:
      "1px solid #e3e7ee",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px 12px",
    borderBottom:
      "1px solid #edf0f4",
    fontSize: 15,
    color: "#283448",
    whiteSpace: "nowrap",
    lineHeight: 1.45,
  },

  empty: {
    textAlign: "center",
    padding: 34,
    color: "#8791a0",
    fontSize: 15,
  },

  footerNote: {
    color: "#929baa",
    fontSize: 12,
    textAlign: "center",
    padding: "5px 0 20px",
    lineHeight: 1.5,
  },
};

/* =========================================================
   LARGE CALENDAR STYLES
========================================================= */

const reportDateStyles = {
  wrapper: {
    position: "relative",
    width: "190px",
    flex: "0 0 190px",
    zIndex: 100,
  },

  trigger: {
    width: "100%",
    minHeight: 50,
    boxSizing: "border-box",
    border: "1px solid #d8dee8",
    borderRadius: 9,
    padding: "11px 13px",
    background: "#fff",
    color: "#162033",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    textAlign: "left",
  },

  calendarIcon: {
    fontSize: 19,
    flex: "0 0 auto",
  },

  popup: {
    position: "absolute",
    top: "calc(100% + 7px)",
    left: 0,
    width: 390,
    maxWidth: "calc(100vw - 30px)",
    background: "#fff",
    border: "1px solid #c8d5e3",
    borderRadius: 13,
    padding: 12,
    boxShadow:
      "0 16px 40px rgba(15,59,92,.22)",
    zIndex: 99999,
    boxSizing: "border-box",
  },

  popupHeader: {
    display: "grid",
    gridTemplateColumns:
      "48px 1fr 48px",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  navButton: {
    width: 48,
    height: 48,
    border: "1px solid #c7d7e6",
    borderRadius: 9,
    background: "#f4f8fc",
    color: "#075fa2",
    fontSize: 30,
    lineHeight: 1,
    fontWeight: 900,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    textAlign: "center",
    fontSize: 21,
    fontWeight: 900,
    color: "#17324d",
    lineHeight: 1.2,
  },

  weekRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, 1fr)",
    gap: 5,
    marginBottom: 5,
  },

  weekday: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: 900,
    color: "#6c7c8d",
    padding: "7px 2px",
  },

  daysGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, 1fr)",
    gap: 5,
  },

  dayButton: {
    width: "100%",
    height: 43,
    minHeight: 43,
    border: "1px solid #d9e3ed",
    borderRadius: 8,
    background: "#fff",
    color: "#17324d",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  selectedDay: {
    background: "#075fa2",
    borderColor: "#075fa2",
    color: "#fff",
  },

  emptyDay: {
    border: "1px solid transparent",
    background: "transparent",
    cursor: "default",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTop:
      "1px solid #e7edf3",
  },

  todayButton: {
    flex: 1,
    minHeight: 44,
    border: "1px solid #075fa2",
    borderRadius: 8,
    background: "#075fa2",
    color: "#fff",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  },

  clearButton: {
    flex: 1,
    minHeight: 44,
    border: "1px solid #cbd7e2",
    borderRadius: 8,
    background: "#f7f9fb",
    color: "#40546a",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  },
};

export default AdminReports;