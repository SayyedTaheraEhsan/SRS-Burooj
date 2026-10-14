import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/customer-reviews";

function getCustomerToken() {
  return localStorage.getItem("customerToken") || "";
}

function authHeaders(extra = {}) {
  const token = getCustomerToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function CustomerReviews() {
  const [customer, setCustomer] = useState(null);

  const [reviews, setReviews] = useState([]);

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD CUSTOMER
  // =====================================================

  useEffect(() => {
    try {
      const savedCustomer =
        localStorage.getItem("customer");

      if (!savedCustomer) {
        setError(
          "Customer session not found. Please login again."
        );
        setLoading(false);
        return;
      }

      const parsedCustomer =
        JSON.parse(savedCustomer);

      setCustomer(parsedCustomer);
    } catch (err) {
      console.error(
        "Customer session error:",
        err
      );

      setError(
        "Unable to read customer information."
      );

      setLoading(false);
    }
  }, []);

  // =====================================================
  // CUSTOMER ID
  // =====================================================

  const customerId = useMemo(() => {
    if (!customer) {
      return null;
    }

    return (
      customer.id ||
      customer.profile_id ||
      customer.customerId ||
      customer.customer_id ||
      null
    );
  }, [customer]);

  // =====================================================
  // LOAD REVIEWS
  // =====================================================

  useEffect(() => {
    if (!customerId) {
      return;
    }

    loadReviews();
  }, [customerId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/customer/${customerId}`,
        { headers: authHeaders() }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load reviews."
        );
      }

      setReviews(data.reviews || []);
    } catch (err) {
      console.error(
        "Load customer reviews error:",
        err
      );

      setError(
        err.message ||
          "Unable to load reviews."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SUBMIT / UPDATE REVIEW
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanReview =
      review.trim();

    if (!customerId) {
      setError(
        "Customer information is missing. Please login again."
      );
      return;
    }

    if (
      !Number.isInteger(Number(rating)) ||
      Number(rating) < 1 ||
      Number(rating) > 5
    ) {
      setError(
        "Please select a rating from 1 to 5."
      );
      return;
    }

    if (!cleanReview) {
      setError(
        "Please write your review."
      );
      return;
    }

    if (cleanReview.length > 2000) {
      setError(
        "Review cannot exceed 2000 characters."
      );
      return;
    }

    try {
      setSaving(true);

      const isEditing =
        editingId !== null;

      const response = await fetch(
        isEditing
          ? `${API_URL}/${editingId}`
          : API_URL,
        {
          method: isEditing
            ? "PUT"
            : "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            customer_id:
              Number(customerId),
            rating:
              Number(rating),
            review:
              cleanReview,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to save review."
        );
      }

      setMessage(
        data.message ||
          "Review submitted successfully."
      );

      setReview("");
      setRating(5);
      setEditingId(null);

      await loadReviews();
    } catch (err) {
      console.error(
        "Save customer review error:",
        err
      );

      setError(
        err.message ||
          "Unable to save review."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (item) => {
    setEditingId(item.id);
    setRating(Number(item.rating));
    setReview(item.review || "");

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (item) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this review?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/${item.id}?customer_id=${customerId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to delete review."
        );
      }

      setMessage(
        "Review deleted successfully."
      );

      if (editingId === item.id) {
        setEditingId(null);
        setRating(5);
        setReview("");
      }

      await loadReviews();
    } catch (err) {
      console.error(
        "Delete customer review error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete review."
      );
    }
  };

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  const cancelEdit = () => {
    setEditingId(null);
    setRating(5);
    setReview("");
    setMessage("");
    setError("");
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatusStyle = (status) => {
    if (status === "Published") {
      return {
        background: "#e8f7ed",
        color: "#18794e",
      };
    }

    if (status === "Hidden") {
      return {
        background: "#f1f3f5",
        color: "#667085",
      };
    }

    return {
      background: "#fff5d6",
      color: "#946200",
    };
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    try {
      return new Date(
        value
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef5ff 0%, #f8fbff 50%, #edf4ff 100%)",
        padding: "35px 20px",
        boxSizing: "border-box",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #0b2a43, #155eef)",
            borderRadius: "18px",
            padding: "28px 30px",
            color: "#ffffff",
            marginBottom: "25px",
            boxShadow:
              "0 12px 35px rgba(11,42,67,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <img
              src="/srs-burooj-logo.png"
              alt="SRS Burooj"
              style={{
                width: "70px",
                height: "70px",
                objectFit: "contain",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "5px",
              }}
            />

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                }}
              >
                Reviews & Feedback
              </h1>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  fontSize: "15px",
                  opacity: 0.9,
                }}
              >
                Share your experience with
                SRS Burooj
              </p>
            </div>
          </div>
        </div>

        {/* MESSAGES */}

        {message && (
          <div
            style={{
              background: "#eaf7ee",
              color: "#18794e",
              border:
                "1px solid #b7e4c7",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fff1f1",
              color: "#b42318",
              border:
                "1px solid #f3b8b8",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            {error}
          </div>
        )}

        {/* REVIEW FORM */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow:
              "0 8px 28px rgba(16,24,40,0.08)",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0b2a43",
                  fontSize: "24px",
                }}
              >
                {editingId
                  ? "Edit Your Review"
                  : "Write a Review"}
              </h2>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color: "#667085",
                  fontSize: "14px",
                }}
              >
                Your feedback helps us improve
                our customer experience.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  border:
                    "1px solid #cdd9e8",
                  background: "#ffffff",
                  color: "#344054",
                  padding:
                    "10px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* RATING */}

            <label
              style={{
                display: "block",
                color: "#10233f",
                fontSize: "16px",
                fontWeight: "700",
                marginBottom: "10px",
              }}
            >
              Rating *
            </label>

            <div
              style={{
                display: "flex",
                gap: "7px",
                marginBottom: "22px",
              }}
            >
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setRating(star)
                    }
                    aria-label={`${star} star rating`}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      cursor: "pointer",
                      fontSize: "34px",
                      lineHeight: 1,
                      padding: "2px",
                      opacity:
                        star <= rating
                          ? 1
                          : 0.25,
                    }}
                  >
                    ★
                  </button>
                )
              )}

              <span
                style={{
                  alignSelf: "center",
                  marginLeft: "8px",
                  color: "#475467",
                  fontWeight: "700",
                }}
              >
                {rating}/5
              </span>
            </div>

            {/* REVIEW */}

            <label
              style={{
                display: "block",
                color: "#10233f",
                fontSize: "16px",
                fontWeight: "700",
                marginBottom: "9px",
              }}
            >
              Your Review *
            </label>

            <textarea
              value={review}
              onChange={(e) =>
                setReview(
                  e.target.value
                )
              }
              placeholder="Write your experience with SRS Burooj..."
              maxLength={2000}
              rows={6}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border:
                  "1px solid #cdd9e8",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "16px",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                color: "#1d2939",
              }}
            />

            <div
              style={{
                textAlign: "right",
                color: "#667085",
                fontSize: "13px",
                marginTop: "5px",
              }}
            >
              {review.length}/2000
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: "17px",
                border: "none",
                borderRadius: "9px",
                background: saving
                  ? "#8aa9e8"
                  : "#155eef",
                color: "#ffffff",
                padding:
                  "13px 25px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Review"
                : "Submit Review"}
            </button>
          </form>
        </div>

        {/* PREVIOUS REVIEWS */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow:
              "0 8px 28px rgba(16,24,40,0.08)",
          }}
        >
          <h2
            style={{
              margin:
                "0 0 20px",
              color: "#0b2a43",
              fontSize: "24px",
            }}
          >
            My Reviews
          </h2>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "35px",
                color: "#667085",
                fontSize: "16px",
              }}
            >
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "35px",
                background: "#f8fafc",
                borderRadius: "12px",
                color: "#667085",
              }}
            >
              <div
                style={{
                  fontSize: "38px",
                  marginBottom: "8px",
                }}
              >
                ⭐
              </div>

              <strong
                style={{
                  color: "#344054",
                  fontSize: "17px",
                }}
              >
                No reviews yet
              </strong>

              <p
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                Share your experience
                using the form above.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {reviews.map(
                (item) => (
                  <div
                    key={item.id}
                    style={{
                      border:
                        "1px solid #e4e7ec",
                      borderRadius: "12px",
                      padding: "20px",
                      background:
                        "#fcfdff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          color: "#f5a623",
                          fontSize: "22px",
                          letterSpacing:
                            "2px",
                        }}
                      >
                        {[
                          1, 2, 3, 4, 5,
                        ].map(
                          (star) =>
                            star <=
                            Number(
                              item.rating
                            )
                              ? "★"
                              : "☆"
                        )}
                      </div>

                      <span
                        style={{
                          ...getStatusStyle(
                            item.status
                          ),
                          padding:
                            "6px 10px",
                          borderRadius:
                            "20px",
                          fontSize:
                            "12px",
                          fontWeight:
                            "700",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p
                      style={{
                        color: "#344054",
                        fontSize: "16px",
                        lineHeight: 1.65,
                        margin:
                          "14px 0",
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {item.review}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: "10px",
                        flexWrap:
                          "wrap",
                        borderTop:
                          "1px solid #eaecf0",
                        paddingTop:
                          "12px",
                      }}
                    >
                      <span
                        style={{
                          color: "#667085",
                          fontSize:
                            "13px",
                        }}
                      >
                        {formatDate(
                          item.created_at
                        )}
                      </span>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              item
                            )
                          }
                          style={{
                            border:
                              "1px solid #cdd9e8",
                            background:
                              "#ffffff",
                            color:
                              "#155eef",
                            padding:
                              "8px 13px",
                            borderRadius:
                              "7px",
                            cursor:
                              "pointer",
                            fontWeight:
                              "700",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              item
                            )
                          }
                          style={{
                            border:
                              "1px solid #f1b7b7",
                            background:
                              "#fff5f5",
                            color:
                              "#b42318",
                            padding:
                              "8px 13px",
                            borderRadius:
                              "7px",
                            cursor:
                              "pointer",
                            fontWeight:
                              "700",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerReviews;