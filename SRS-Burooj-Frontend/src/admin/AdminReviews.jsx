
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API = "http://localhost:5000";
const STATUSES = ["Pending", "Published", "Hidden"];

const STATUS_COLORS = {
  Pending: { background: "#fff4d6", color: "#8a5a00" },
  Published: { background: "#dcfce7", color: "#166534" },
  Hidden: { background: "#e5e7eb", color: "#374151" },
};

function getAdminToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function adminRequest(path, options = {}) {
  const token = getAdminToken();

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function getStatus(review) {
  return STATUSES.includes(review?.status) ? review.status : "Pending";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReviewText(review) {
  return (
    review?.review_text ||
    review?.review ||
    review?.comment ||
    "No review text available."
  );
}

function getGuestName(review) {
  return (
    review?.reviewer_name ||
    review?.guest_name ||
    review?.name ||
    "Website Guest"
  );
}

function getCustomerName(review) {
  return review?.customer_name || review?.name || "Registered Customer";
}

function getCustomerLoginId(review) {
  return review?.customer_login_id || review?.login_id || "Login ID unavailable";
}

function getRating(review) {
  const rating = Number(review?.rating || 0);

  return Number.isFinite(rating)
    ? Math.min(5, Math.max(0, Math.round(rating)))
    : 0;
}

function getList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.reviews)) return result.reviews;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

/* Custom dropdown: options remain readable when opened. */
function CustomDropdown({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel = "Select an option",
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectedOption = options.find(
    (option) => String(option.value) === String(value)
  );

  const chooseOption = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      style={{ ...styles.dropdownRoot, ...style }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        style={{
          ...styles.dropdownTrigger,
          ...(open ? styles.dropdownTriggerOpen : {}),
          ...(disabled ? styles.dropdownDisabled : {}),
        }}
      >
        <span style={styles.dropdownSelectedText}>
          {selectedOption?.label ?? String(value ?? "Select")}
        </span>

        <span
          aria-hidden="true"
          style={{
            ...styles.dropdownArrow,
            transform: open ? "rotate(225deg)" : "rotate(45deg)",
            marginTop: open ? 7 : -5,
          }}
        />
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={styles.dropdownMenu}
        >
          {options.map((option) => {
            const selected =
              String(option.value) === String(value);

            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => chooseOption(option)}
                style={{
                  ...styles.dropdownOption,
                  ...(selected ? styles.dropdownOptionSelected : {}),
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = selected
                    ? "#dbeafe"
                    : "#eff6ff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = selected
                    ? "#dbeafe"
                    : "#ffffff";
                }}
              >
                <span>{option.label}</span>
                {selected && (
                  <span aria-hidden="true" style={styles.optionCheck}>
                    ✓
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

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Pending;

  return (
    <span
      style={{
        ...styles.statusBadge,
        background: colors.background,
        color: colors.color,
      }}
    >
      {status}
    </span>
  );
}

function RatingStars({ rating }) {
  return (
    <div aria-label={`${rating} out of 5 stars`} style={styles.rating}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          style={{ color: index < rating ? "#f59e0b" : "#cbd5e1" }}
        >
          ★
        </span>
      ))}
      <span style={styles.ratingNumber}>{rating}/5</span>
    </div>
  );
}

function ReviewCard({ review, type, busy, onStatusChange, onDelete }) {
  const isGuest = type === "guest";
  const name = isGuest ? getGuestName(review) : getCustomerName(review);
  const status = getStatus(review);
  const rating = getRating(review);

  return (
    <article style={styles.reviewCard}>
      <div style={styles.cardTop}>
        <div style={styles.personBlock}>
          <div style={styles.avatar}>
            {String(name).trim().charAt(0).toUpperCase() || "R"}
          </div>

          <div style={{ minWidth: 0 }}>
            <h3 style={styles.personName}>{name}</h3>

            <div style={styles.typeLabel}>
              {isGuest ? "Website Guest" : "Registered Customer"}
            </div>

            {!isGuest && (
              <div style={styles.loginId}>
                Login ID: {getCustomerLoginId(review)}
              </div>
            )}

            {!isGuest && review?.customer_email && (
              <div style={styles.email}>{review.customer_email}</div>
            )}
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      <RatingStars rating={rating} />

      <p style={styles.reviewText}>{getReviewText(review)}</p>

      <div style={styles.dateText}>
        Submitted: {formatDate(review?.created_at)}
      </div>

      {review?.updated_at &&
        review.updated_at !== review.created_at && (
          <div style={styles.dateText}>
            Updated: {formatDate(review.updated_at)}
          </div>
        )}

      <div style={styles.cardDivider} />

      <div style={styles.actionArea}>
        <label style={styles.fieldLabel}>
          Review Status

          <CustomDropdown
            value={status}
            disabled={busy}
            ariaLabel={`Review status for ${name}`}
            onChange={(nextStatus) =>
              onStatusChange(review.id, nextStatus)
            }
            options={STATUSES.map((item) => ({
              value: item,
              label: item,
            }))}
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(review.id, name)}
          style={{
            ...styles.deleteButton,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Please wait..." : "Delete Review"}
        </button>
      </div>

      <div style={styles.visibilityNote}>
        {status === "Published"
          ? "This review is approved for public display."
          : status === "Hidden"
            ? "This review is hidden from the public website."
            : "This review is awaiting approval."}
      </div>
    </article>
  );
}

export default function AdminReviews() {
  const [activeTab, setActiveTab] = useState("guest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [guestReviews, setGuestReviews] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const results = await Promise.allSettled([
        adminRequest("/api/customer-reviews/admin/all"),
        adminRequest("/api/customer-reviews/admin/guest/all"),
      ]);

      const customerResult = results[0];
      const guestResult = results[1];

      if (customerResult.status === "fulfilled") {
        setCustomerReviews(getList(customerResult.value));
      } else {
        setCustomerReviews([]);
        console.error("Admin customer reviews load:", customerResult.reason);
      }

      if (guestResult.status === "fulfilled") {
        setGuestReviews(getList(guestResult.value));
      } else {
        setGuestReviews([]);
        console.error("Admin guest reviews load:", guestResult.reason);
      }

      if (results.every((result) => result.status === "rejected")) {
        throw new Error("Reviews load nahi ho paaye. Admin login/session check karein.");
      }
    } catch (error) {
      setLoadError(
        error.message ||
          "Reviews load nahi ho paaye. Backend aur admin login check karein."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const currentReviews =
    activeTab === "guest" ? guestReviews : customerReviews;

  const filteredReviews = useMemo(() => {
    if (statusFilter === "All") return currentReviews;

    return currentReviews.filter(
      (review) => getStatus(review) === statusFilter
    );
  }, [currentReviews, statusFilter]);

  const counts = useMemo(() => {
    const countStatuses = (list) => ({
      All: list.length,
      Pending: list.filter(
        (review) => getStatus(review) === "Pending"
      ).length,
      Published: list.filter(
        (review) => getStatus(review) === "Published"
      ).length,
      Hidden: list.filter(
        (review) => getStatus(review) === "Hidden"
      ).length,
    });

    return {
      guest: countStatuses(guestReviews),
      customer: countStatuses(customerReviews),
    };
  }, [guestReviews, customerReviews]);

  const updateStatus = async (id, nextStatus) => {
    const type = activeTab;
    const setList =
      type === "guest" ? setGuestReviews : setCustomerReviews;

    const endpoint =
      type === "guest"
        ? `/api/customer-reviews/admin/guest/${id}/status`
        : `/api/customer-reviews/admin/${id}/status`;

    setBusyId(`${type}-${id}`);
    setNotice("");
    setLoadError("");

    try {
      await adminRequest(endpoint, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      setList((previous) =>
        previous.map((review) =>
          String(review.id) === String(id)
            ? { ...review, status: nextStatus }
            : review
        )
      );

      setNotice(
        nextStatus === "Published"
          ? "Review published successfully. It can now appear on the public website."
          : `Review status updated to ${nextStatus}.`
      );
    } catch (error) {
      setLoadError(error.message || "Review status update nahi hua.");
    } finally {
      setBusyId("");
    }
  };

  const deleteReview = async (id, name) => {
    const type = activeTab;
    const setList =
      type === "guest" ? setGuestReviews : setCustomerReviews;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the review from "${name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const endpoint =
      type === "guest"
        ? `/api/customer-reviews/admin/guest/${id}`
        : `/api/customer-reviews/admin/${id}`;

    setBusyId(`${type}-${id}`);
    setNotice("");
    setLoadError("");

    try {
      await adminRequest(endpoint, { method: "DELETE" });

      setList((previous) =>
        previous.filter((review) => String(review.id) !== String(id))
      );

      setNotice("Review deleted successfully.");
    } catch (error) {
      setLoadError(error.message || "Review delete nahi hua.");
    } finally {
      setBusyId("");
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setStatusFilter("All");
    setNotice("");
    setLoadError("");
  };

  const activeCounts =
    activeTab === "guest" ? counts.guest : counts.customer;

  const filterOptions = ["All", ...STATUSES].map((status) => ({
    value: status,
    label: `${status} (${activeCounts[status]})`,
  }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>SRS BUROOJ ADMIN PANEL</div>
          <h1 style={styles.heading}>Reviews Management</h1>
          <p style={styles.subtitle}>
            Manage guest feedback and registered customer reviews separately.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          style={{
            ...styles.refreshButton,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading..." : "↻ Refresh Reviews"}
        </button>
      </div>

      <div style={styles.summaryGrid}>
        <SummaryCard
          label="Website Guest Reviews"
          value={guestReviews.length}
          hint="Reviews submitted without customer login"
        />

        <SummaryCard
          label="Customer Reviews"
          value={customerReviews.length}
          hint="Reviews linked to registered customers"
        />

        <SummaryCard
          label="Awaiting Approval"
          value={counts.guest.Pending + counts.customer.Pending}
          hint="Reviews with Pending status"
        />

        <SummaryCard
          label="Published Reviews"
          value={counts.guest.Published + counts.customer.Published}
          hint="Approved guest and customer reviews"
        />
      </div>

      <div style={styles.mainPanel}>
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => switchTab("guest")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "guest" ? styles.activeTab : {}),
            }}
          >
            Website Guest Reviews

            <span
              style={{
                ...styles.tabCount,
                ...(activeTab === "guest" ? styles.activeTabCount : {}),
              }}
            >
              {guestReviews.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("customer")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "customer" ? styles.activeTab : {}),
            }}
          >
            Customer Reviews

            <span
              style={{
                ...styles.tabCount,
                ...(activeTab === "customer" ? styles.activeTabCount : {}),
              }}
            >
              {customerReviews.length}
            </span>
          </button>
        </div>

        <div style={styles.toolbar}>
          <div>
            <h2 style={styles.sectionHeading}>
              {activeTab === "guest"
                ? "Website Guest Reviews"
                : "Registered Customer Reviews"}
            </h2>

            <p style={styles.sectionSubtitle}>
              {activeTab === "guest"
                ? "Manage reviews submitted through the public website."
                : "Customer identity and Login ID are displayed with each review."}
            </p>
          </div>

          <label style={styles.filterLabel}>
            Filter by status

            <CustomDropdown
              value={statusFilter}
              ariaLabel="Filter reviews by status"
              onChange={setStatusFilter}
              options={filterOptions}
              style={styles.filterDropdown}
            />
          </label>
        </div>

        {notice && (
          <div role="status" style={styles.successMessage}>
            {notice}
          </div>
        )}

        {loadError && (
          <div role="alert" style={styles.errorMessage}>
            <strong>Reviews request failed</strong>

            <div style={{ marginTop: 5 }}>{loadError}</div>

            <button
              type="button"
              onClick={loadReviews}
              style={styles.errorRetryButton}
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.loaderDot}>●</div>
            <h3 style={styles.emptyHeading}>Loading reviews...</h3>
            <p style={styles.emptyText}>
              Please wait while the review lists are loaded.
            </p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyHeading}>No reviews found</h3>

            <p style={styles.emptyText}>
              {currentReviews.length === 0
                ? activeTab === "guest"
                  ? "Website guest reviews will appear here after someone submits a review."
                  : "Registered customer reviews will appear here after customers submit their feedback."
                : `No ${statusFilter.toLowerCase()} reviews are available in this tab.`}
            </p>

            {statusFilter !== "All" && currentReviews.length > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                style={styles.clearFilterButton}
              >
                Show All Reviews
              </button>
            )}
          </div>
        ) : (
          <div style={styles.reviewGrid}>
            {filteredReviews.map((review) => (
              <ReviewCard
                key={`${activeTab}-${review.id}`}
                review={review}
                type={activeTab}
                busy={busyId === `${activeTab}-${review.id}`}
                onStatusChange={updateStatus}
                onDelete={deleteReview}
              />
            ))}
          </div>
        )}

        <div style={styles.footerNote}>
          <strong>Public website rule:</strong> only reviews with Published
          status should appear on the public website. Guest reviews and
          registered customer reviews remain in separate lists.
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
      <div style={styles.summaryHint}>{hint}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f1f5fb",
    color: "#172b4d",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 26,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heading: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#102a56",
  },
  subtitle: {
    margin: "9px 0 0",
    fontSize: 16,
    lineHeight: 1.6,
    color: "#64748b",
  },
  refreshButton: {
    padding: "13px 19px",
    background: "#174ea6",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 17,
    marginBottom: 25,
  },
  summaryCard: {
    background: "#fff",
    border: "1px solid #dbe6f4",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 5px 18px rgba(23, 78, 166, 0.05)",
  },
  summaryLabel: {
    color: "#526782",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 700,
  },
  summaryValue: {
    color: "#174ea6",
    fontSize: 34,
    lineHeight: 1.25,
    fontWeight: 800,
    marginTop: 8,
  },
  summaryHint: {
    color: "#7b8ba3",
    fontSize: 14,
    lineHeight: 1.5,
    marginTop: 7,
  },
  mainPanel: {
    background: "#fff",
    border: "1px solid #dbe6f4",
    borderRadius: 16,
    overflow: "visible",
    boxShadow: "0 8px 26px rgba(23, 78, 166, 0.06)",
  },
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    padding: "0 22px",
    borderBottom: "1px solid #dce6f3",
    background: "#fbfdff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "19px 18px",
    background: "transparent",
    color: "#526782",
    border: "none",
    borderBottom: "3px solid transparent",
    marginBottom: -1,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  activeTab: {
    color: "#174ea6",
    borderBottomColor: "#2563eb",
  },
  tabCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 29,
    height: 29,
    padding: "0 7px",
    borderRadius: 20,
    background: "#e9eff8",
    color: "#405875",
    fontSize: 15,
    fontWeight: 800,
    boxSizing: "border-box",
  },
  activeTabCount: {
    background: "#dbeafe",
    color: "#174ea6",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 20,
    padding: 24,
    borderBottom: "1px solid #e6edf6",
    position: "relative",
    zIndex: 5,
  },
  sectionHeading: {
    margin: 0,
    color: "#16345f",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.4,
  },
  sectionSubtitle: {
    margin: "7px 0 0",
    color: "#6b7d95",
    fontSize: 15,
    lineHeight: 1.6,
  },
  filterLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#405875",
    fontSize: 16,
    fontWeight: 700,
    minWidth: 230,
  },
  filterDropdown: {
    width: 250,
    maxWidth: "100%",
  },
  dropdownRoot: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  dropdownTrigger: {
    width: "100%",
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "13px 16px",
    border: "1px solid #a9c2e2",
    borderRadius: 9,
    background: "#ffffff",
    color: "#172b4d",
    fontSize: 19,
    fontWeight: 700,
    textAlign: "left",
    cursor: "pointer",
    outlineColor: "#2563eb",
    boxSizing: "border-box",
  },
  dropdownTriggerOpen: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.13)",
  },
  dropdownSelectedText: {
    flex: 1,
    minWidth: 0,
    overflowWrap: "anywhere",
    lineHeight: 1.4,
  },
  dropdownArrow: {
    width: 11,
    height: 11,
    flexShrink: 0,
    borderRight: "3px solid #174ea6",
    borderBottom: "3px solid #174ea6",
    transition: "transform 0.15s ease",
  },
  dropdownDisabled: {
    background: "#f1f5f9",
    color: "#64748b",
    cursor: "not-allowed",
    opacity: 0.75,
  },
  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 7px)",
    left: 0,
    right: 0,
    zIndex: 10000,
    maxHeight: 280,
    overflowY: "auto",
    padding: 6,
    border: "1px solid #b8cbe3",
    borderRadius: 11,
    background: "#ffffff",
    boxShadow: "0 12px 30px rgba(15, 42, 85, 0.2)",
    boxSizing: "border-box",
  },
  dropdownOption: {
    width: "100%",
    minHeight: 49,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    border: "none",
    borderRadius: 7,
    backgroundColor: "#ffffff",
    color: "#172b4d",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 19,
    fontWeight: 600,
    lineHeight: 1.4,
    textAlign: "left",
    overflowWrap: "anywhere",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  dropdownOptionSelected: {
    backgroundColor: "#dbeafe",
    color: "#174ea6",
    fontWeight: 800,
  },
  optionCheck: {
    flexShrink: 0,
    color: "#174ea6",
    fontSize: 21,
    fontWeight: 800,
  },
  successMessage: {
    margin: "20px 24px 0",
    padding: "13px 16px",
    borderRadius: 9,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  errorMessage: {
    margin: "20px 24px 0",
    padding: 16,
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#fff1f2",
    color: "#991b1b",
    fontSize: 15,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  errorRetryButton: {
    marginTop: 10,
    padding: "10px 15px",
    border: "1px solid #dc2626",
    borderRadius: 7,
    background: "#fff",
    color: "#991b1b",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
    gap: 18,
    padding: 24,
    alignItems: "start",
    position: "relative",
    zIndex: 1,
  },
  reviewCard: {
    minWidth: 0,
    padding: 20,
    border: "1px solid #dce6f3",
    borderRadius: 13,
    background: "#fff",
    boxShadow: "0 3px 12px rgba(23, 78, 166, 0.045)",
    boxSizing: "border-box",
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  personBlock: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: 45,
    height: 45,
    borderRadius: 12,
    background: "#dbeafe",
    color: "#174ea6",
    fontSize: 21,
    fontWeight: 800,
  },
  personName: {
    margin: "1px 0 5px",
    color: "#18365f",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },
  typeLabel: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  loginId: {
    marginTop: 5,
    color: "#435875",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
  email: {
    marginTop: 4,
    color: "#718096",
    fontSize: 14,
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },
  statusBadge: {
    flexShrink: 0,
    display: "inline-flex",
    padding: "7px 10px",
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.3,
  },
  rating: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 20,
    fontSize: 23,
    lineHeight: 1.4,
  },
  ratingNumber: {
    marginLeft: 6,
    color: "#526782",
    fontSize: 14,
    fontWeight: 700,
  },
  reviewText: {
    margin: "13px 0 16px",
    color: "#354b67",
    fontSize: 16,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  dateText: {
    marginTop: 5,
    color: "#718096",
    fontSize: 13,
    lineHeight: 1.5,
  },
  cardDivider: {
    height: 1,
    background: "#e5edf6",
    margin: "17px 0",
  },
  actionArea: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#405875",
    fontSize: 16,
    fontWeight: 700,
  },
  deleteButton: {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fff5f5",
    color: "#b91c1c",
    fontSize: 16,
    fontWeight: 800,
  },
  visibilityNote: {
    marginTop: 13,
    padding: 11,
    borderRadius: 8,
    background: "#f4f7fc",
    color: "#536780",
    fontSize: 14,
    lineHeight: 1.6,
  },
  emptyState: {
    padding: "55px 24px",
    textAlign: "center",
  },
  loaderDot: {
    color: "#2563eb",
    fontSize: 25,
  },
  emptyHeading: {
    margin: "16px 0 8px",
    color: "#19375f",
    fontSize: 22,
    fontWeight: 800,
  },
  emptyText: {
    maxWidth: 510,
    margin: "0 auto",
    color: "#6b7d95",
    fontSize: 16,
    lineHeight: 1.8,
  },
  clearFilterButton: {
    marginTop: 17,
    padding: "12px 17px",
    border: "none",
    borderRadius: 8,
    background: "#174ea6",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  footerNote: {
    margin: "0 24px 24px",
    padding: "15px 17px",
    border: "1px solid #dce8f8",
    borderRadius: 10,
    background: "#f4f8ff",
    color: "#425a78",
    fontSize: 14,
    lineHeight: 1.8,
  },
};