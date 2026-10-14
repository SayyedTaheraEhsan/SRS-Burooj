import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000";

function normalizeReview(item, type) {
  return {
    ...item,
    reviewType: type,
    review: item.review_text || item.review || "",
    reviewerName:
      item.reviewer_name || item.customer_name || "SRS Burooj Customer",
  };
}

function WebsiteReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const loadReviews = async (signal) => {
    try {
      setLoading(true);
      setLoadError("");

      const [customerResponse, guestResponse] = await Promise.all([
        fetch(`${API}/api/customer-reviews/public`, { signal }),
        fetch(`${API}/api/customer-reviews/guest/public`, { signal }),
      ]);

      const customerData = await customerResponse.json().catch(() => []);
      const guestData = await guestResponse.json().catch(() => []);

      if (!customerResponse.ok) {
        throw new Error(
          customerData.message || "Unable to load customer reviews."
        );
      }

      if (!guestResponse.ok) {
        throw new Error(
          guestData.message || "Unable to load guest reviews."
        );
      }

      const customerReviews = Array.isArray(customerData)
        ? customerData
        : Array.isArray(customerData.reviews)
          ? customerData.reviews
          : [];

      const guestReviews = Array.isArray(guestData)
        ? guestData
        : Array.isArray(guestData.reviews)
          ? guestData.reviews
          : [];

      const combined = [
        ...customerReviews.map((item) => normalizeReview(item, "customer")),
        ...guestReviews.map((item) => normalizeReview(item, "guest")),
      ]
        .filter((item) => String(item.status || "Published") === "Published")
        .sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        });

      setReviews(combined);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Public reviews error:", error);
        setLoadError(
          error.message || "Reviews are temporarily unavailable."
        );
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadReviews(controller.signal);
    return () => controller.abort();
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce(
      (sum, item) =>
        sum + Math.min(5, Math.max(1, Number(item.rating) || 0)),
      0
    );
    return total / reviews.length;
  }, [reviews]);

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderStars = (value, large = false) => (
    <span
      aria-label={`${Number(value)} out of 5 stars`}
      style={{
        ...styles.stars,
        ...(large ? styles.largeStars : {}),
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true">
          {star <= Number(value) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );

  const shareOnFacebook = (item) => {
    const pageUrl = window.location.href.split("#")[0];
    const shareUrl = new URL("https://www.facebook.com/sharer/sharer.php");
    shareUrl.searchParams.set("u", pageUrl);
    shareUrl.searchParams.set(
      "quote",
      `SRS Burooj customer review (${item.rating}/5): ${item.review}`
    );
    window.open(
      shareUrl.toString(),
      "srsBuroojFacebookShare",
      "noopener,noreferrer,width=720,height=620"
    );
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    const cleanName = reviewerName.trim();
    const cleanReview = reviewText.trim();

    if (!cleanName) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (cleanName.length > 100) {
      setSubmitError("Name cannot exceed 100 characters.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setSubmitError("Please select a star rating from 1 to 5.");
      return;
    }
    if (!cleanReview) {
      setSubmitError("Please write your review before submitting.");
      return;
    }
    if (cleanReview.length > 2000) {
      setSubmitError("Your review must be 2,000 characters or fewer.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API}/api/customer-reviews/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewer_name: cleanName,
          rating,
          review: cleanReview,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Your review could not be submitted. Please try again."
        );
      }

      setSubmitMessage(
        data.message ||
          "Thank you! Your review has been submitted for approval."
      );
      setReviewerName("");
      setReviewText("");
      setRating(0);
      await loadReviews();
    } catch (error) {
      console.error("Submit guest review error:", error);
      setSubmitError(
        error.message ||
          "Your review could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" style={styles.section} aria-labelledby="reviews-heading">
      <div style={styles.container}>
        <div style={styles.headingArea}>
          <div style={styles.eyebrow}>CUSTOMER EXPERIENCE</div>
          <h2 id="reviews-heading" style={styles.heading}>
            What Our Customers Say
          </h2>
          <p style={styles.subtitle}>
            Genuine feedback from customers who have shared their experience with SRS Burooj.
          </p>
          {!loading && !loadError && reviews.length > 0 && (
            <div style={styles.ratingSummary}>
              <strong style={styles.average}>{averageRating.toFixed(1)}</strong>
              <div style={styles.ratingSummaryText}>
                {renderStars(Math.round(averageRating), true)}
                <span style={styles.reviewCount}>
                  Based on {reviews.length} published {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.message} role="status">
            Loading customer reviews…
          </div>
        ) : loadError ? (
          <div style={styles.message} role="status">
            {loadError}
          </div>
        ) : reviews.length === 0 ? (
          <div style={styles.message}>
            No published reviews yet. Be the first to share your experience.
          </div>
        ) : (
          <div style={styles.grid}>
            {reviews.map((item) => {
              const reviewer = item.reviewerName;
              return (
                <article key={`${item.reviewType}-${item.id}`} style={styles.card}>
                  <div style={styles.quote} aria-hidden="true">“</div>
                  {renderStars(item.rating)}
                  <p style={styles.review}>{item.review}</p>
                  <div style={styles.customer}>
                    <div style={styles.avatar} aria-hidden="true">
                      {reviewer.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.customerDetails}>
                      <div style={styles.customerName}>{reviewer}</div>
                      <div style={styles.customerLabel}>
                        Published {item.reviewType === "guest" ? "website" : "customer"} review
                      </div>
                      {formatDate(item.created_at) && (
                        <time style={styles.date} dateTime={item.created_at}>
                          {formatDate(item.created_at)}
                        </time>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={styles.shareButton}
                    onClick={() => shareOnFacebook(item)}
                    aria-label={`Share ${reviewer}'s review on Facebook`}
                  >
                    <span style={styles.facebookMark} aria-hidden="true">f</span>
                    Share on Facebook
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div style={styles.writePanel}>
          <div style={styles.writeHeader}>
            <div>
              <h3 style={styles.writeTitle}>Share Your Experience</h3>
              <p style={styles.writeSubtitle}>
                Tell us about your experience with SRS Burooj.
              </p>
            </div>
            <button
              type="button"
              style={styles.writeButton}
              onClick={() => {
                setFormOpen((open) => !open);
                setSubmitError("");
                setSubmitMessage("");
              }}
            >
              {formOpen ? "Close Review Form" : "Write a Review"}
            </button>
          </div>

          {formOpen && (
            <form onSubmit={submitReview} style={styles.form}>
              <label htmlFor="srs-review-name" style={styles.label}>
                Your Name <span style={styles.required}>*</span>
              </label>
              <input
                id="srs-review-name"
                value={reviewerName}
                onChange={(event) => setReviewerName(event.target.value)}
                maxLength={100}
                placeholder="Enter your full name"
                style={styles.input}
                required
              />

              <label style={styles.label}>
                Your Rating <span style={styles.required}>*</span>
              </label>
              <div style={styles.ratingPicker} role="radiogroup" aria-label="Choose a rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    onClick={() => setRating(star)}
                    style={{
                      ...styles.starChoice,
                      color: star <= rating ? "#e5a000" : "#9aa9ba",
                    }}
                  >
                    ★
                  </button>
                ))}
                <span style={styles.ratingHint}>
                  {rating ? `${rating} out of 5` : "Select 1–5 stars"}
                </span>
              </div>

              <label htmlFor="srs-review-text" style={styles.label}>
                Your Review <span style={styles.required}>*</span>
              </label>
              <textarea
                id="srs-review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Write your genuine experience here…"
                style={styles.textarea}
                required
              />
              <div style={styles.characterCount}>
                {reviewText.length}/2000 characters
              </div>

              {submitError && (
                <div style={styles.errorMessage} role="alert">
                  {submitError}
                </div>
              )}
              {submitMessage && (
                <div style={styles.successMessage} role="status">
                  {submitMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...styles.submitButton,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit Review for Approval"}
              </button>
              <p style={styles.formNote}>
                Your review will appear publicly only after the SRS Burooj team approves it.
              </p>
            </form>
          )}
        </div>

        <p style={styles.footerNote}>
          Reviews are displayed after approval by the SRS Burooj team. Facebook sharing opens Facebook; it does not publish a post automatically.
        </p>
      </div>
    </section>
  );
}

const styles = {
  section: { width: "100%", padding: "70px 20px", background: "linear-gradient(180deg, #f7fbff 0%, #eef5fc 100%)", boxSizing: "border-box" },
  container: { maxWidth: "1200px", margin: "0 auto" },
  headingArea: { textAlign: "center", marginBottom: "35px" },
  eyebrow: { color: "#0b5cad", fontSize: "13px", fontWeight: 800, letterSpacing: "2px", marginBottom: "10px" },
  heading: { margin: 0, color: "#0b3b78", fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 800, lineHeight: 1.25 },
  subtitle: { margin: "12px auto 0", maxWidth: "650px", color: "#52657d", fontSize: "16px", lineHeight: 1.7 },
  ratingSummary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "14px", marginTop: "24px", padding: "14px 22px", background: "#fff", border: "1px solid #dce6f2", borderRadius: "14px", boxShadow: "0 6px 20px rgba(15, 55, 95, 0.06)" },
  average: { color: "#0b3b78", fontSize: "34px", lineHeight: 1, fontWeight: 800 },
  ratingSummaryText: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" },
  reviewCount: { color: "#64748b", fontSize: "13px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "22px" },
  card: { position: "relative", display: "flex", flexDirection: "column", alignItems: "stretch", background: "#fff", borderRadius: "18px", padding: "27px", minHeight: "280px", boxSizing: "border-box", border: "1px solid #dce6f2", boxShadow: "0 8px 28px rgba(15, 55, 95, 0.08)" },
  quote: { position: "absolute", right: "22px", top: "10px", fontSize: "60px", lineHeight: 1, color: "#dcecff", fontFamily: "Georgia, serif", fontWeight: 800 },
  stars: { display: "inline-flex", color: "#e5a000", fontSize: "22px", letterSpacing: "2px", marginBottom: "16px" },
  largeStars: { fontSize: "20px", marginBottom: 0 },
  review: { margin: 0, color: "#334155", fontSize: "16px", lineHeight: 1.75, minHeight: "80px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  customer: { display: "flex", alignItems: "center", gap: "12px", marginTop: "22px", paddingTop: "17px", borderTop: "1px solid #e5edf6" },
  avatar: { flex: "0 0 43px", width: "43px", height: "43px", borderRadius: "50%", background: "#0b5cad", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" },
  customerDetails: { minWidth: 0 },
  customerName: { color: "#1e3552", fontWeight: 800, fontSize: "15px", overflowWrap: "anywhere" },
  customerLabel: { color: "#647b97", fontSize: "12px", marginTop: "3px" },
  date: { display: "block", color: "#7890ad", fontSize: "12px", marginTop: "3px" },
  shareButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "9px", marginTop: "20px", padding: "11px 14px", border: "1px solid #cfe0f7", borderRadius: "9px", background: "#f3f7ff", color: "#1456a0", fontSize: "14px", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" },
  facebookMark: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "21px", height: "21px", borderRadius: "50%", background: "#1877f2", color: "#fff", fontSize: "17px", fontWeight: 800, fontFamily: "Arial, sans-serif" },
  message: { textAlign: "center", background: "#fff", borderRadius: "15px", padding: "35px", color: "#52657d", border: "1px solid #dce6f2", lineHeight: 1.6 },
  writePanel: { marginTop: "32px", background: "#fff", border: "1px solid #dce6f2", borderRadius: "18px", padding: "clamp(18px, 3vw, 30px)", boxShadow: "0 8px 28px rgba(15, 55, 95, 0.06)" },
  writeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  writeTitle: { margin: 0, color: "#0b3b78", fontSize: "23px", fontWeight: 800 },
  writeSubtitle: { margin: "7px 0 0", color: "#64748b", fontSize: "15px" },
  writeButton: { border: 0, borderRadius: "9px", background: "#0b5cad", color: "#fff", padding: "12px 19px", fontWeight: 800, fontSize: "15px", cursor: "pointer" },
  form: { marginTop: "24px", borderTop: "1px solid #e5edf6", paddingTop: "23px", display: "flex", flexDirection: "column", gap: "10px" },
  label: { color: "#243b5a", fontWeight: 800, fontSize: "15px", marginTop: "7px" },
  required: { color: "#c62828" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #cbd8e8", borderRadius: "10px", padding: "14px", color: "#172033", fontSize: "16px", outlineColor: "#0b5cad", background: "#fff" },
  ratingPicker: { display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", marginBottom: "6px" },
  starChoice: { border: 0, background: "transparent", padding: "0 2px", fontSize: "34px", cursor: "pointer", lineHeight: 1.2 },
  ratingHint: { color: "#64748b", fontSize: "14px", marginLeft: "8px" },
  textarea: { width: "100%", boxSizing: "border-box", border: "1px solid #cbd8e8", borderRadius: "10px", padding: "14px", color: "#172033", fontSize: "16px", lineHeight: 1.6, resize: "vertical", outlineColor: "#0b5cad", background: "#fff" },
  characterCount: { textAlign: "right", color: "#7890ad", fontSize: "12px" },
  errorMessage: { color: "#9f2222", background: "#fff1f1", border: "1px solid #ffd1d1", padding: "12px", borderRadius: "8px", lineHeight: 1.5 },
  successMessage: { color: "#166534", background: "#f0fff4", border: "1px solid #b7ebc6", padding: "12px", borderRadius: "8px", lineHeight: 1.5 },
  submitButton: { alignSelf: "flex-start", marginTop: "6px", border: 0, borderRadius: "9px", background: "#0b3b78", color: "#fff", padding: "13px 20px", fontWeight: 800, fontSize: "15px", cursor: "pointer" },
  formNote: { margin: "2px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.5 },
  footerNote: { margin: "24px auto 0", maxWidth: "760px", textAlign: "center", color: "#64748b", fontSize: "13px", lineHeight: 1.6 },
};

export default WebsiteReviews;
