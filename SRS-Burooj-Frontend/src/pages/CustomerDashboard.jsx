import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000";

function getCustomerAuthToken() {
  const direct = localStorage.getItem("customerToken");
  if (direct) return direct;

  let customer = null;
  try {
    customer = JSON.parse(localStorage.getItem("customer") || "null");
  } catch {
    customer = null;
  }

  const savedCustomerToken = customer?.token;
  if (savedCustomerToken) return savedCustomerToken;

  // Legacy compatibility: only use generic token when the saved customer
  // record explicitly identifies this browser session as a customer.
  if (customer?.role === "customer") {
    const legacy = localStorage.getItem("token");
    if (legacy) return legacy;
  }

  return "";
}

const REQUIRED_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
  "Passport Size Photograph",
  "Address Proof",
  "Bank Details / Cancelled Cheque",
  "Booking / Allotment Documents",
];

function CustomerDashboard() {
  const [customer, setCustomer] = useState(null);

  const [constructionUpdates, setConstructionUpdates] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);

  // Customer Reviews
  const [customerReviews, setCustomerReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewMessageType, setReviewMessageType] = useState("success");

  const [loading, setLoading] = useState(true);
  const [constructionLoading, setConstructionLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [advertisementsLoading, setAdvertisementsLoading] =
    useState(true);

  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [showDocumentOptions, setShowDocumentOptions] = useState(false);

  const [showDocument, setShowDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadAdvertisements();
  }, []);

  /* =====================================================
     MAIN DASHBOARD
  ===================================================== */

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const savedCustomer = localStorage.getItem("customer");

      if (!savedCustomer) {
        stopLoading();
        return;
      }

      const savedData = JSON.parse(savedCustomer);

      const customerLoginId =
        savedData.customer_login_id ||
        savedData.customerLoginId;

      if (!customerLoginId) {
        console.error("Customer Login ID not found.");
        stopLoading();
        return;
      }

      const response = await fetch(
        `${API}/api/customers/dashboard/${customerLoginId}`
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.customer) {
        console.error(
          data.message || "Failed to load customer dashboard"
        );
        stopLoading();
        return;
      }

      const loadedCustomer = data.customer;

      setCustomer(loadedCustomer);

      localStorage.setItem(
        "customer",
        JSON.stringify(loadedCustomer)
      );

      const propertyId =
        loadedCustomer.customer_property_id ||
        loadedCustomer.property_id;

      const profileId =
        loadedCustomer.profile_id ||
        loadedCustomer.customer_id ||
        loadedCustomer.id;

      const unitId =
        loadedCustomer.unit_id ||
        loadedCustomer.property_unit_id ||
        loadedCustomer.unitId;

      if (propertyId) {
        loadConstructionProgress(propertyId);
      } else {
        setConstructionLoading(false);
      }

      await loadPaymentHistory(
        profileId,
        unitId,
        propertyId
      );

      if (profileId) {
        await Promise.all([
          loadDocuments(profileId),
          loadCustomerReviews(profileId),
        ]);
      } else {
        setDocumentsLoading(false);
        setReviewLoading(false);
      }
    } catch (error) {
      console.error("Customer dashboard error:", error);

      setConstructionLoading(false);
      setPaymentLoading(false);
      setDocumentsLoading(false);
      setReviewLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const stopLoading = () => {
    setLoading(false);
    setConstructionLoading(false);
    setPaymentLoading(false);
    setDocumentsLoading(false);
    setReviewLoading(false);
  };

  /* =====================================================
     CONSTRUCTION PROGRESS
  ===================================================== */

  const loadConstructionProgress = async (propertyId) => {
    try {
      setConstructionLoading(true);

      const response = await fetch(
        `${API}/api/construction-progress/${propertyId}`
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setConstructionUpdates(data.progress || []);
      }
    } catch (error) {
      console.error(
        "Construction progress error:",
        error
      );
    } finally {
      setConstructionLoading(false);
    }
  };

  /* =====================================================
     PAYMENT HISTORY
  ===================================================== */

  const loadPaymentHistory = async (
    profileId,
    unitId,
    propertyId
  ) => {
    try {
      setPaymentLoading(true);

      let history = [];

      if (profileId && unitId) {
        try {
          const response = await fetch(
            `${API}/api/payments/history/${profileId}/${unitId}`
          );

          const data = await response.json();

          if (response.ok && data.success) {
            history =
              data.payments ||
              data.history ||
              [];
          }
        } catch (error) {
          console.error(
            "New payment history error:",
            error
          );
        }
      }

      if (
        history.length === 0 &&
        propertyId
      ) {
        try {
          const response = await fetch(
            `${API}/api/customer-payments/history/${propertyId}`
          );

          const data = await response.json();

          if (response.ok) {
            if (Array.isArray(data)) {
              history = data;
            } else {
              history =
                data.payments ||
                data.history ||
                [];
            }
          }
        } catch (error) {
          console.error(
            "Old payment history fallback error:",
            error
          );
        }
      }

      const normalized = history.map(
        (payment, index) => {
          const receiptAmount = Number(
            payment.receipt_amount ??
              payment.payment_amount ??
              payment.amount ??
              0
          );

          const cumulativePaid = Number(
            payment.paid_amount ??
              payment.total_paid ??
              0
          );

          const totalAmount = Number(
            payment.total_amount ??
              payment.property_value ??
              customer?.property_value ??
              0
          );

          const remaining =
            payment.remaining_amount !==
              undefined &&
            payment.remaining_amount !== null
              ? Number(payment.remaining_amount)
              : Math.max(
                  totalAmount - cumulativePaid,
                  0
                );

          const totalInstallments = Number(
            payment.total_installments ??
              payment.number_of_installments ??
              customer?.number_of_installments ??
              0
          );

          const paidInstallments = Number(
            payment.paid_installments ??
              index + 1
          );

          return {
            ...payment,
            receipt_amount: receiptAmount,
            paid_amount: cumulativePaid,
            total_amount: totalAmount,
            remaining_amount: remaining,
            total_installments: totalInstallments,
            paid_installments: paidInstallments,
            payment_date:
              payment.payment_date ||
              payment.created_at,
            payment_method:
              payment.payment_method ||
              payment.method ||
              "Other",
            payment_status:
              payment.payment_status ||
              payment.status ||
              "Paid",
            receipt_number:
              payment.receipt_number ||
              payment.receipt ||
              `SRS-PAY-${String(
                payment.id || index + 1
              ).padStart(6, "0")}`,
          };
        }
      );

      normalized.sort((a, b) => {
        const aId = Number(a.id || 0);
        const bId = Number(b.id || 0);

        if (aId && bId) {
          return aId - bId;
        }

        return (
          new Date(a.payment_date || 0) -
          new Date(b.payment_date || 0)
        );
      });

      const finalHistory = normalized.map(
        (payment, index) => ({
          ...payment,
          paid_installments:
            Number(payment.paid_installments) > 0
              ? Number(payment.paid_installments)
              : index + 1,
        })
      );

      setPaymentHistory(finalHistory);
    } catch (error) {
      console.error(
        "Payment history error:",
        error
      );

      setPaymentHistory([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  /* =====================================================
     DOCUMENTS
  ===================================================== */

  const loadDocuments = async (profileId) => {
    try {
      setDocumentsLoading(true);

      const response = await fetch(
        `${API}/api/customer-documents/customer/${profileId}`
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error(
        "Customer documents error:",
        error
      );
    } finally {
      setDocumentsLoading(false);
    }
  };

  /* =====================================================
     CUSTOMER REVIEWS
  ===================================================== */

  const loadCustomerReviews = async (profileId) => {
    if (!profileId) {
      setCustomerReviews([]);
      setReviewLoading(false);
      return;
    }

    const token = getCustomerAuthToken();

    if (!token) {
      setCustomerReviews([]);
      setReviewLoading(false);
      console.error(
        "Customer session missing. Please login again."
      );
      return;
    }

    try {
      setReviewLoading(true);

      const response = await fetch(
        `${API}/api/customer-reviews/customer/${profileId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Reviews load nahi hui."
        );
      }

      // Backend direct array ya object dono return kar sakta hai.
      const reviews = Array.isArray(data)
        ? data
        : Array.isArray(data.reviews)
          ? data.reviews
          : [];

      setCustomerReviews(reviews);
    } catch (error) {
      console.error("Customer reviews load error:", error);
      setCustomerReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitCustomerReview = async (event) => {
    event.preventDefault();

    let savedCustomer = null;
    try {
      savedCustomer = JSON.parse(
        localStorage.getItem("customer") || "null"
      );
    } catch {
      savedCustomer = null;
    }

    const profileId =
      customer?.profile_id ||
      customer?.customer_id ||
      customer?.id ||
      savedCustomer?.profile_id ||
      savedCustomer?.customer_id ||
      savedCustomer?.id;

    const cleanReview = reviewText.trim();
    const token = getCustomerAuthToken();

    if (!token) {
      setReviewMessage(
        "Customer session expire ho gaya hai. Please logout karke dobara login karein."
      );
      setReviewMessageType("error");
      return;
    }

    if (!profileId) {
      setReviewMessage(
        "Customer profile nahi mila. Please dobara login karein."
      );
      setReviewMessageType("error");
      return;
    }

    if (!cleanReview) {
      setReviewMessage("Please apna review likhein.");
      setReviewMessageType("error");
      return;
    }

    if (cleanReview.length > 2000) {
      setReviewMessage(
        "Review 2000 characters se chhota rakhein."
      );
      setReviewMessageType("error");
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewMessage("");

      const response = await fetch(
        `${API}/api/customer-reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_id: profileId,
            rating: reviewRating,
            review: cleanReview,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("customerToken");
        setReviewMessage(
          "Customer session expire ho gaya hai. Please logout karke dobara login karein."
        );
        setReviewMessageType("error");
        return;
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Review submit nahi ho saka."
        );
      }

      setReviewMessage(
        "Thank you! Aapka review submit ho gaya hai. Admin approval ke baad hi website par publish hoga."
      );
      setReviewMessageType("success");
      setReviewText("");
      setReviewRating(5);

      await loadCustomerReviews(profileId);
    } catch (error) {
      setReviewMessage(
        error.message ||
          "Review submit nahi ho saka. Please dobara try karein."
      );
      setReviewMessageType("error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatReviewDate = (value) => {
    if (!value) return "Date not available";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "Date not available";
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =====================================================
     ADVERTISEMENTS
  ===================================================== */

  const loadAdvertisements = async () => {
    try {
      setAdvertisementsLoading(true);

      const response = await fetch(
        `${API}/api/advertisements`
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      const ads =
        data.advertisements ||
        data.ads ||
        data.data ||
        [];

      if (Array.isArray(ads)) {
        setAdvertisements(ads);
      }
    } catch (error) {
      console.error(
        "Advertisement loading error:",
        error
      );
    } finally {
      setAdvertisementsLoading(false);
    }
  };

  /* =====================================================
     PAYMENT CALCULATIONS
  ===================================================== */

  const propertyValue = useMemo(() => {
    return Number(
      customer?.property_value ||
        customer?.estimated_total ||
        paymentHistory[0]?.total_amount ||
        0
    );
  }, [customer, paymentHistory]);

  const paidAmount = useMemo(() => {
    if (!paymentHistory.length) {
      return Number(
        customer?.paid_amount || 0
      );
    }

    const latest =
      paymentHistory[
        paymentHistory.length - 1
      ];

    return Number(
      latest.paid_amount || 0
    );
  }, [customer, paymentHistory]);

  const remainingAmount = useMemo(() => {
    if (!paymentHistory.length) {
      return Number(
        customer?.remaining_amount ||
          Math.max(
            propertyValue - paidAmount,
            0
          )
      );
    }

    const latest =
      paymentHistory[
        paymentHistory.length - 1
      ];

    if (
      latest.remaining_amount !== undefined
    ) {
      return Number(
        latest.remaining_amount
      );
    }

    return Math.max(
      propertyValue - paidAmount,
      0
    );
  }, [
    customer,
    paymentHistory,
    propertyValue,
    paidAmount,
  ]);

  const latestPayment =
    paymentHistory.length
      ? paymentHistory[
          paymentHistory.length - 1
        ]
      : null;

  const totalInstallments = Number(
    latestPayment?.total_installments ||
      customer?.number_of_installments ||
      0
  );

  const paidInstallments = Number(
    latestPayment?.paid_installments ||
      paymentHistory.length ||
      0
  );

  const installmentAmount = Number(
    latestPayment?.installment_amount ||
      customer?.installment_amount ||
      0
  );

  /* =====================================================
     PROJECT FACILITIES / AMENITIES
  ===================================================== */

  const projectFacilities = useMemo(() => {
    if (!customer) {
      return [];
    }

    let facilities =
      customer.project_facilities ||
      customer.project_amenities ||
      customer.facilities ||
      customer.amenities ||
      customer.projectFacilities ||
      customer.projectAmenities ||
      [];

    if (typeof facilities === "string") {
      const trimmed = facilities.trim();

      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          facilities = parsed;
        } else if (
          parsed &&
          typeof parsed === "object"
        ) {
          facilities = Object.values(parsed);
        } else {
          facilities = trimmed
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        facilities = trimmed
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    if (!Array.isArray(facilities)) {
      facilities = [];
    }

    return facilities
      .map((facility) => {
        if (typeof facility === "string") {
          return facility.trim();
        }

        if (
          facility &&
          typeof facility === "object"
        ) {
          return (
            facility.name ||
            facility.title ||
            facility.facility ||
            facility.amenity ||
            facility.label ||
            ""
          ).trim();
        }

        return "";
      })
      .filter(Boolean);
  }, [customer]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "₹0";
    }

    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN")}`;
  };

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    const raw = String(value).substring(
      0,
      10
    );

    const parts = raw.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(
        "en-IN"
      );
    }

    return raw;
  };

  const getDocumentUrl = (url) => {
    if (!url) return "";

    if (
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      return url;
    }

    return `${API}${url}`;
  };

  const getAdvertisementImage = (
    advertisement
  ) => {
    const image =
      advertisement.image_url ||
      advertisement.image ||
      advertisement.photo ||
      advertisement.advertisement_image ||
      advertisement.image_path;

    if (!image) return "";

    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    return `${API}${image}`;
  };

  const getDocumentStatusStyle = (
    status
  ) => {
    const value = String(
      status || "Pending"
    ).toLowerCase();

    if (
      value.includes("verified") ||
      value.includes("approved")
    ) {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (value.includes("reject")) {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (value.includes("review")) {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      background: "#dbeafe",
      color: "#1e40af",
    };
  };

  const isDocumentUploaded = (
    requiredName
  ) => {
    return documents.some(
      (document) =>
        String(
          document.document_name || ""
        )
          .trim()
          .toLowerCase() ===
        requiredName
          .trim()
          .toLowerCase()
    );
  };

  /* =====================================================
     RECEIPT
  ===================================================== */

  const openReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  };

  const printReceipt = () => {
    document.body.classList.add(
      "srs-customer-print-receipt"
    );

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        document.body.classList.remove(
          "srs-customer-print-receipt"
        );
      }, 500);
    }, 200);
  };

  /* =====================================================
     DOCUMENT UPLOAD
  ===================================================== */

  const uploadDocument = async (e) => {
    e.preventDefault();

    if (!customer) {
      alert(
        "Customer information not found."
      );
      return;
    }

    const profileId =
      customer.profile_id ||
      customer.customer_id ||
      customer.id;

    if (!profileId) {
      alert(
        "Customer profile ID not found."
      );
      return;
    }

    if (!documentName.trim()) {
      alert(
        "Please select a document name."
      );
      return;
    }

    if (!documentFile) {
      alert(
        "Please select a document file."
      );
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        documentFile.type
      )
    ) {
      alert(
        "Only PDF, JPG, JPEG, PNG and WEBP files are allowed."
      );
      return;
    }

    if (
      documentFile.size >
      10 * 1024 * 1024
    ) {
      alert(
        "Maximum file size is 10 MB."
      );
      return;
    }

    try {
      setDocumentUploading(true);

      const formData =
        new FormData();

      formData.append(
        "customer_id",
        profileId
      );

      formData.append(
        "document_name",
        documentName
      );

      formData.append(
        "document_type",
        documentType ||
          documentName
      );

      formData.append(
        "document_status",
        "Pending"
      );

      formData.append(
        "document",
        documentFile
      );

      const response =
        await fetch(
          `${API}/api/customer-documents`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.message ||
            "Document upload failed."
        );
        return;
      }

      alert(
        "Document uploaded successfully."
      );

      setDocumentName("");
      setDocumentType("");
      setDocumentFile(null);

      const fileInput =
        document.getElementById(
          "customer-document-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadDocuments(
        profileId
      );
    } catch (error) {
      console.error(
        "Document upload error:",
        error
      );

      alert(
        "Document upload failed."
      );
    } finally {
      setDocumentUploading(false);
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    localStorage.removeItem(
      "customer"
    );

    localStorage.removeItem(
      "customerToken"
    );

    window.location.href =
      "/customer-login";
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div className="loading-logo">
          <img
            src="/srs-burooj-logo.png"
            alt="SRS Burooj"
          />
        </div>

        <div
          style={{
            fontSize: "24px",
            fontWeight: "900",
            color: "#0d47a1",
            letterSpacing: "1px",
          }}
        >
          SRS BUROOJ
        </div>

        <div
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#536b88",
          }}
        >
          Loading Customer Dashboard...
        </div>
      </div>
    );
  }

  /* =====================================================
     CUSTOMER NOT FOUND
  ===================================================== */

  if (!customer) {
    return (
      <div style={loadingStyle}>
        <div
          style={{
            background: "#fff",
            padding: "35px",
            borderRadius: "18px",
            boxShadow:
              "0 10px 35px rgba(13,71,161,.12)",
            textAlign: "center",
          }}
        >
          <div className="loading-logo">
            <img
              src="/srs-burooj-logo.png"
              alt="SRS Burooj"
            />
          </div>

          <h2
            style={{
              color: "#123b75",
              fontSize: "25px",
            }}
          >
            Customer Login Required
          </h2>

          <button
            onClick={() =>
              (window.location.href =
                "/customer-login")
            }
            style={blueButton}
          >
            Go to Customer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          background: #eef5ff;
        }

        button,
        input,
        select,
        textarea {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .customer-page {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #eaf3ff 0%,
              #f7fbff 48%,
              #eef6ff 100%
            );
          color: #172033;
        }

        .customer-header {
          background:
            linear-gradient(
              135deg,
              #063b91 0%,
              #0d47a1 48%,
              #1976d2 100%
            );
          color: white;
          padding: 14px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 82px;
          box-shadow:
            0 5px 22px
            rgba(13,71,161,.28);
          position: sticky;
          top: 0;
          z-index: 500;
        }

        .customer-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .customer-logo-box {
          width: 95px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(255,255,255,.08);
          border-radius: 9px;
          padding: 4px;
        }

        .customer-logo-small {
          width: 88px !important;
          height: 52px !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: contain !important;
          display: block !important;
        }

        .customer-header-title {
          line-height: 1.1;
        }

        .customer-header-title-main {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .customer-header-title-sub {
          font-size: 13px;
          color: #dbeafe;
          margin-top: 6px;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .logout-button {
          background: #dc2626;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 11px 18px;
          cursor: pointer;
          font-weight: 900;
          font-size: 14px;
          min-height: 44px;
        }

        .logout-button:hover {
          background: #b91c1c;
        }

        .customer-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow:
            0 5px 22px
            rgba(30,64,175,.09);
          border: 1px solid #cfe0f7;
        }

        .customer-section h1 {
          font-size: 30px;
        }

        .customer-section h2 {
          margin-top: 0;
          color: #103d7a;
          font-size: 24px;
          font-weight: 900;
        }

        .customer-section h3 {
          color: #174ea6;
          font-size: 19px;
          font-weight: 900;
        }

        .customer-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(235px, 1fr)
            );
          gap: 17px;
        }

        .customer-info-card {
          background:
            linear-gradient(
              135deg,
              #f9fcff,
              #edf5ff
            );
          border: 1px solid #c9def7;
          border-radius: 12px;
          padding: 19px;
          min-height: 91px;
        }

        .customer-info-title {
          color: #526987;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .customer-info-value {
          color: #123b75;
          font-size: 18px;
          font-weight: 900;
          word-break: break-word;
          line-height: 1.35;
        }

        .blue-summary-card {
          background:
            linear-gradient(
              135deg,
              #e1efff,
              #f6faff
            );
          border: 1px solid #bcd7f5;
        }

        /* =================================================
           PROJECT FACILITIES
        ================================================= */

        .facilities-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(220px, 1fr)
            );
          gap: 16px;
        }

        .facility-card {
          background:
            linear-gradient(
              135deg,
              #f5faff,
              #e8f3ff
            );
          border: 1px solid #c7dcf5;
          border-radius: 13px;
          padding: 18px;
          min-height: 82px;
          display: flex;
          align-items: center;
          gap: 13px;
          box-shadow:
            0 4px 14px
            rgba(30,64,175,.06);
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .facility-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 20px
            rgba(30,64,175,.11);
        }

        .facility-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #0d47a1,
              #1976d2
            );
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 900;
        }

        .facility-name {
          color: #123b75;
          font-size: 16px;
          font-weight: 900;
          line-height: 1.4;
          word-break: break-word;
        }

        /* =================================================
           ADVERTISEMENTS
        ================================================= */

        .advertisement-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(280px, 1fr)
            );
          gap: 20px;
        }

        .advertisement-card {
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid #c8dcf5;
          background: white;
          box-shadow:
            0 6px 20px
            rgba(30,64,175,.10);
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .advertisement-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 10px 28px
            rgba(30,64,175,.15);
        }

        .advertisement-image {
          width: 100%;
          height: 205px;
          object-fit: cover;
          display: block;
        }

        .advertisement-content {
          padding: 19px;
        }

        .advertisement-title {
          color: #174ea6;
          font-size: 19px;
          font-weight: 900;
          margin-bottom: 9px;
        }

        /* =================================================
           PAYMENT TABLE
        ================================================= */

        .payment-scroll {
          overflow-x: auto;
          border: 1px solid #d3e2f4;
          border-radius: 11px;
        }

        .payment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;
        }

        .payment-table th {
          background:
            linear-gradient(
              135deg,
              #dcecff,
              #edf5ff
            );
          color: #174ea6;
          padding: 15px 13px;
          border-bottom:
            1px solid #bdd4f2;
          text-align: left;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .payment-table td {
          padding: 14px 13px;
          border-bottom:
            1px solid #e2eaf4;
          font-size: 14px;
          color: #273b56;
          white-space: nowrap;
        }

        .payment-table tr:hover {
          background: #f5faff;
        }

        .installment-badge {
          display: inline-block;
          background: #dcecff;
          color: #174ea6;
          border-radius: 20px;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 900;
          border: 1px solid #c1d9f7;
        }

        /* =================================================
           DOCUMENTS
        ================================================= */

        .document-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(285px, 1fr)
            );
          gap: 17px;
        }

        .document-card {
          border: 1px solid #cddff3;
          border-radius: 13px;
          padding: 19px;
          background: #fbfdff;
          box-shadow:
            0 3px 12px
            rgba(30,64,175,.05);
        }

        .document-card.required {
          border-left:
            5px solid #1976d2;
        }

        .document-card-header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }

        .document-name {
          color: #17345f;
          font-weight: 900;
          font-size: 16px;
          line-height: 1.4;
        }

        .required-badge {
          background: #dbeafe;
          color: #174ea6;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          border: 1px solid #bfd7f5;
        }

        .document-status {
          display: inline-block;
          border-radius: 20px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          margin-top: 12px;
        }

        .document-upload-box {
          background:
            linear-gradient(
              135deg,
              #eaf4ff,
              #f8fbff
            );
          border: 2px dashed #7ba9dd;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 24px;
        }

        .document-upload-box h3 {
          font-size: 21px;
          margin-bottom: 18px;
        }

        .document-form-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(240px, 1fr)
            );
          gap: 17px;
          align-items: end;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 900;
          color: #294a70;
          margin-bottom: 8px;
        }

        .form-input,
        .form-select {
          width: 100%;
          min-height: 48px;
          border: 1px solid #b8cde6;
          border-radius: 9px;
          padding: 11px 13px;
          background: #ffffff;
          color: #172033;
          outline: none;
          font-size: 15px;
          font-weight: 600;
        }

        .form-select {
          cursor: pointer;
        }

.form-select {
  width: 100%;
  min-height: 58px;
  border: 2px solid #a9c6e8;
  border-radius: 10px;
  padding: 13px 15px;
  background: #ffffff;
  color: #123b75;
  outline: none;
  font-size: 18px;
  font-weight: 700;
}

.form-select {
  width: 100%;
  min-height: 58px;
  border: 2px solid #a9c6e8;
  border-radius: 10px;
  padding: 13px 15px;
  background: #ffffff;
  color: #123b75;
  outline: none;
  font-size: 18px;
  font-weight: 700;
}

.form-select option {
  font-size: 18px;
  font-weight: 700;
  color: #123b75;
  background: #ffffff;
  padding: 12px;
}


        .form-input::placeholder {
          color: #71839b;
          opacity: 1;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #1976d2;
          box-shadow:
            0 0 0 4px
            rgba(25,118,210,.12);
        }

        input[type="file"].form-input {
          padding: 9px;
          cursor: pointer;
        }

        input[type="file"]::file-selector-button {
          background: #e4f0ff;
          color: #174ea6;
          border: 1px solid #bdd6f4;
          border-radius: 7px;
          padding: 8px 12px;
          margin-right: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        /* =================================================
           BUTTONS
        ================================================= */

        .srs-primary-button {
          min-height: 48px;
          background:
            linear-gradient(
              135deg,
              #0d47a1,
              #1976d2
            );
          color: #fff;
          border: none;
          border-radius: 9px;
          padding: 11px 18px;
          cursor: pointer;
          font-weight: 900;
          font-size: 14px;
          box-shadow:
            0 4px 12px
            rgba(13,71,161,.20);
        }

        .srs-primary-button:hover {
          background:
            linear-gradient(
              135deg,
              #083b88,
              #1565c0
            );
        }

        .srs-secondary-button {
          background: #e7f1ff;
          color: #174ea6;
          border: 1px solid #bdd5f2;
          border-radius: 8px;
          padding: 10px 15px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
        }

        /* =================================================
           CONSTRUCTION
        ================================================= */

        .construction-progress-box {
          border: 1px solid #c9ddf3;
          border-radius: 12px;
          padding: 21px;
          margin-bottom: 22px;
          background:
            linear-gradient(
              135deg,
              #f4f9ff,
              #ffffff
            );
        }

        .progress-track {
          width: 100%;
          height: 19px;
          background: #d6e5f6;
          border-radius: 20px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background:
            linear-gradient(
              90deg,
              #0d47a1,
              #1976d2,
              #42a5f5
            );
          border-radius: 20px;
          transition: width .4s ease;
        }

        .construction-card {
          border: 1px solid #cddff3;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          box-shadow:
            0 4px 15px
            rgba(30,64,175,.06);
        }

        .construction-card-image {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
        }

        /* =================================================
           RECEIPT
        ================================================= */

        .receipt-backdrop {
          position: fixed;
          inset: 0;
          background:
            rgba(5,25,55,.76);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 28px;
          overflow-y: auto;
        }

        .receipt-paper {
          width: 210mm;
          min-height: 270mm;
          background: white;
          padding: 18mm;
          box-sizing: border-box;
          color: #111;
          border-radius: 9px;
          position: relative;
          box-shadow:
            0 20px 60px
            rgba(0,0,0,.35);
        }

        .receipt-logo {
          width: 120px;
          height: auto;
          max-height: 65px;
          object-fit: contain;
        }

        .receipt-info-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 24px;
        }

        .receipt-info-table td {
          border: 1px solid #d7d7d7;
          padding: 11px;
          font-size: 14px;
        }

        .receipt-info-table td:first-child {
          width: 36%;
          font-weight: 800;
          background: #eef5ff;
        }

        /* =================================================
           DOCUMENT PREVIEW
        ================================================= */

        .document-preview-backdrop {
          position: fixed;
          inset: 0;
          background:
            rgba(0,0,0,.74);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .document-preview-box {
          width: min(1050px,95vw);
          height: min(90vh,850px);
          background: white;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 20px 60px
            rgba(0,0,0,.35);
        }

        .document-preview-header {
          padding: 16px 19px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom:
            1px solid #dce6f2;
          color: #174ea6;
          font-size: 17px;
          font-weight: 900;
        }

        .document-preview-content {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #eef3f9;
        }

        .document-preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .document-preview-pdf {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* =================================================
           LOADING
        ================================================= */

        .loading-logo {
          width: 130px;
          height: 75px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .loading-logo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        /* =================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 800px) {
          .customer-header {
            padding: 12px 16px;
          }

          .customer-header-title-main {
            font-size: 19px;
          }

          .customer-header-title-sub {
            font-size: 11px;
          }

          .customer-logo-box {
            width: 78px;
            height: 50px;
          }

          .customer-logo-small {
            width: 72px !important;
            height: 46px !important;
          }

          .customer-section {
            padding: 20px;
          }

          .customer-section h1 {
            font-size: 25px;
          }

          .customer-section h2 {
            font-size: 21px;
          }

          .document-form-grid {
            grid-template-columns: 1fr;
          }

          .advertisement-grid,
          .document-grid,
          .facilities-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .customer-header {
            min-height: 74px;
            padding: 10px 12px;
          }

          .customer-header-left {
            gap: 9px;
          }

          .customer-logo-box {
            width: 65px;
            height: 44px;
          }

          .customer-logo-small {
            width: 60px !important;
            height: 40px !important;
          }

          .customer-header-title-main {
            font-size: 16px;
          }

          .customer-header-title-sub {
            font-size: 9px;
          }

          .logout-button {
            padding: 9px 11px;
            font-size: 12px;
            min-height: 40px;
          }

          .customer-section {
            padding: 16px;
            border-radius: 12px;
          }

          .customer-grid {
            grid-template-columns: 1fr;
          }

          .customer-info-value {
            font-size: 17px;
          }

          .receipt-backdrop {
            padding: 8px;
          }

          .receipt-paper {
            width: 100%;
            min-height: auto;
            padding: 18px;
          }

          .receipt-info-table td {
            font-size: 12px;
            padding: 8px;
          }

          .document-preview-backdrop {
            padding: 8px;
          }

          .document-preview-box {
            width: 100%;
            height: 92vh;
          }
        }

        /* =================================================
           CUSTOMER REVIEWS
        ================================================= */
        .customer-review-layout {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(300px, 1.1fr);
          gap: 22px;
          align-items: start;
        }
        .customer-review-form, .customer-review-item {
          background: #ffffff;
          border: 1px solid #dbe7f6;
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 6px 20px rgba(23, 78, 166, 0.06);
        }
        .customer-review-form label {
          display: block;
          margin: 16px 0 8px;
          color: #203c60;
          font-size: 15px;
          font-weight: 700;
        }
        .customer-review-form textarea {
          width: 100%;
          min-height: 130px;
          resize: vertical;
          padding: 13px 14px;
          border: 1px solid #c9d8ec;
          border-radius: 10px;
          box-sizing: border-box;
          color: #18324f;
          background: #fff;
          font: inherit;
          font-size: 15px;
          outline: none;
        }
        .customer-review-form textarea:focus {
          border-color: #2765bd;
          box-shadow: 0 0 0 3px rgba(39, 101, 189, 0.12);
        }
        .customer-review-stars { display: flex; gap: 7px; flex-wrap: wrap; }
        .customer-review-star {
          border: 0; background: transparent; cursor: pointer;
          padding: 2px; font-size: 34px; line-height: 1;
          color: #c8d2e0; transition: transform 0.15s ease;
        }
        .customer-review-star:hover { transform: scale(1.12); }
        .customer-review-star.selected { color: #f4b400; }
        .customer-review-submit {
          width: 100%; margin-top: 15px; padding: 13px 18px;
          border: 0; border-radius: 10px; background: #174ea6;
          color: #fff; font-weight: 700; font-size: 15px; cursor: pointer;
        }
        .customer-review-submit:disabled { opacity: .65; cursor: not-allowed; }
        .customer-review-message { margin-top: 13px; padding: 12px 14px;
          border-radius: 9px; font-size: 14px; line-height: 1.5; }
        .customer-review-message.success { color: #17603a; background: #eaf8ef; border: 1px solid #bde6ca; }
        .customer-review-message.error { color: #9b2424; background: #fff0f0; border: 1px solid #f3caca; }
        .customer-review-list { display: grid; gap: 13px; }
        .customer-review-item { padding: 18px 20px; }
        .customer-review-item-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .customer-review-rating { color: #f4b400; font-size: 20px; letter-spacing: 1px; }
        .customer-review-status { display: inline-block; padding: 5px 10px; border-radius: 999px;
          background: #fff5d6; color: #8a6100; font-size: 12px; font-weight: 700; }
        .customer-review-status.published { background: #e6f7ed; color: #17603a; }
        .customer-review-status.hidden { background: #eef2f7; color: #526176; }
        .customer-review-content { color: #344760; font-size: 15px; line-height: 1.65; margin: 12px 0 5px; white-space: pre-wrap; overflow-wrap: anywhere; }
        .customer-review-muted { color: #6b7c93; font-size: 13px; }
        @media (max-width: 760px) {
          .customer-review-layout { grid-template-columns: minmax(0, 1fr); }
          .customer-review-form, .customer-review-item { padding: 17px; }
        }

        /* =================================================
           PRINT
        ================================================= */

        @media print {
          body.srs-customer-print-receipt * {
            visibility: hidden !important;
          }

          body.srs-customer-print-receipt
          .receipt-print-area,

          body.srs-customer-print-receipt
          .receipt-print-area * {
            visibility: visible !important;
          }

          body.srs-customer-print-receipt
          .receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 12mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }

          body.srs-customer-print-receipt
          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="customer-header">
        <div className="customer-header-left">
          <div className="customer-logo-box">
            <img
              src="/srs-burooj-logo.png"
              alt="SRS Burooj"
              className="customer-logo-small"
            />
          </div>

          <div className="customer-header-title">
            <div className="customer-header-title-main">
              SRS BUROOJ
            </div>

            <div className="customer-header-title-sub">
              CUSTOMER DASHBOARD
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="logout-button"
        >
          Logout
        </button>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "30px 18px",
        }}
      >

        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="customer-section">
          <h1
            style={{
              marginTop: 0,
              marginBottom: 8,
              color: "#123b75",
              fontWeight: "900",
            }}
          >
            Welcome
            {customer.name
              ? `, ${customer.name}`
              : ""}
          </h1>

          <p
            style={{
              color: "#536b88",
              marginBottom: 0,
              fontSize: "16px",
              lineHeight: "1.6",
            }}
          >
            Welcome to your SRS Burooj
            property account.
          </p>
        </section>

        {/* =================================================
            ADVERTISEMENTS
        ================================================= */}

        <section className="customer-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  marginBottom: "5px",
                }}
              >
                Featured Promotions
              </h2>

              <div
                style={{
                  color: "#637895",
                  fontSize: "15px",
                  lineHeight: "1.5",
                }}
              >
                Latest SRS Burooj offers
                and property updates.
              </div>
            </div>

            <div
              style={{
                background: "#dbeafe",
                color: "#174ea6",
                borderRadius: "20px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "900",
                border: "1px solid #c1d9f5",
              }}
            >
              OFFERS
            </div>
          </div>

          {advertisementsLoading ? (
            <p
              style={{
                fontSize: "15px",
                color: "#536b88",
              }}
            >
              Loading advertisements...
            </p>
          ) : advertisements.length === 0 ? (
            <div
              style={{
                border:
                  "1px solid #d9e6f5",
                borderRadius: "10px",
                padding: "24px",
                textAlign: "center",
                color: "#718096",
                background: "#f8fbff",
                fontSize: "15px",
              }}
            >
              No featured promotions
              available at the moment.
            </div>
          ) : (
            <div className="advertisement-grid">
              {advertisements.map(
                (advertisement) => {
                  const image =
                    getAdvertisementImage(
                      advertisement
                    );

                  return (
                    <div
                      className="advertisement-card"
                      key={
                        advertisement.id ||
                        advertisement._id
                      }
                    >
                      {image && (
                        <img
                          src={image}
                          alt={
                            advertisement.title ||
                            advertisement.name ||
                            "SRS Burooj Promotion"
                          }
                          className="advertisement-image"
                        />
                      )}

                      <div className="advertisement-content">
                        <div className="advertisement-title">
                          {advertisement.title ||
                            advertisement.name ||
                            "SRS Burooj Promotion"}
                        </div>

                        <div
                          style={{
                            color: "#607089",
                            fontSize: "14px",
                            lineHeight: "1.65",
                          }}
                        >
                          {advertisement.description ||
                            advertisement.details ||
                            advertisement.advertisement_details ||
                            ""}
                        </div>

                        {(advertisement.offer ||
                          advertisement.price) && (
                          <div
                            style={{
                              marginTop: "11px",
                              color: "#0d47a1",
                              fontWeight: "900",
                              fontSize: "16px",
                            }}
                          >
                            {advertisement.offer ||
                              advertisement.price}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            PROPERTY
        ================================================= */}

        <section className="customer-section">
          <h2>My Property</h2>

          <div className="customer-grid">
            <InfoCard
              title="Project"
              value={
                customer.project_name ||
                "Not available"
              }
            />

            <InfoCard
              title="Unit Number"
              value={
                customer.unit_number ||
                "Not available"
              }
            />

            <InfoCard
              title="Unit Type"
              value={
                customer.unit_type ||
                "Not available"
              }
            />

            <InfoCard
              title="Purchase Date"
              value={formatDate(
                customer.purchase_date
              )}
            />

            <InfoCard
              title="Carpet Area"
              value={
                customer.carpet_area
                  ? `${customer.carpet_area} sq.ft`
                  : "Not available"
              }
            />
          </div>
        </section>

        {/* =================================================
            PROJECT FACILITIES / AMENITIES
        ================================================= */}

        <section className="customer-section">
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                marginBottom: "6px",
              }}
            >
              Project Facilities / Amenities
            </h2>

            <p
              style={{
                color: "#66758b",
                fontSize: "15px",
                marginTop: 0,
                lineHeight: "1.6",
              }}
            >
              Facilities and amenities available
              in your SRS Burooj project.
            </p>
          </div>

          {projectFacilities.length === 0 ? (
            <div
              style={{
                border:
                  "1px solid #d9e6f5",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                color: "#718096",
                background: "#f8fbff",
                fontSize: "15px",
                lineHeight: "1.6",
              }}
            >
              Project facilities / amenities
              are not available yet.
            </div>
          ) : (
            <div className="facilities-grid">
              {projectFacilities.map(
                (facility, index) => (
                  <div
                    key={`${facility}-${index}`}
                    className="facility-card"
                  >
                    <div className="facility-icon">
                      ✓
                    </div>

                    <div className="facility-name">
                      {facility}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* =================================================
            PAYMENT SUMMARY
        ================================================= */}

        <section className="customer-section">
          <h2>Payment Summary</h2>

          <div className="customer-grid">
            <div className="customer-info-card blue-summary-card">
              <InfoCard
                title="Total Property Amount"
                value={formatMoney(
                  propertyValue
                )}
              />
            </div>

            <div className="customer-info-card blue-summary-card">
              <InfoCard
                title="Total Paid"
                value={formatMoney(
                  paidAmount
                )}
              />
            </div>

            <div className="customer-info-card blue-summary-card">
              <InfoCard
                title="Remaining Amount"
                value={formatMoney(
                  remainingAmount
                )}
              />
            </div>

            <InfoCard
              title="Installment Amount"
              value={
                installmentAmount
                  ? formatMoney(
                      installmentAmount
                    )
                  : "Not available"
              }
            />

            <InfoCard
              title="Paid Installments"
              value={
                totalInstallments
                  ? `${paidInstallments} / ${totalInstallments}`
                  : paidInstallments || 0
              }
            />

            <InfoCard
              title="Next Due Date"
              value={
                latestPayment?.next_due_date
                  ? formatDate(
                      latestPayment.next_due_date
                    )
                  : "Not available"
              }
            />
          </div>
        </section>

        {/* =================================================
            PAYMENT HISTORY
        ================================================= */}

        <section className="customer-section">
          <h2>Payment History</h2>

          <p
            style={{
              color: "#66758b",
              fontSize: "14px",
              marginTop: "-8px",
              lineHeight: "1.6",
            }}
          >
            All your payment receipts are
            shown separately below.
          </p>

          {paymentLoading ? (
            <p
              style={{
                fontSize: "15px",
                color: "#536b88",
              }}
            >
              Loading payment history...
            </p>
          ) : paymentHistory.length === 0 ? (
            <div
              style={{
                border:
                  "1px solid #d9e6f5",
                borderRadius: "9px",
                padding: "22px",
                textAlign: "center",
                color: "#718096",
                background: "#f8fbff",
                fontSize: "15px",
              }}
            >
              No payment history available.
            </div>
          ) : (
            <div className="payment-scroll">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th>Total Paid</th>
                    <th>Remaining</th>
                    <th>Installment</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>

                <tbody>
                  {paymentHistory.map(
                    (payment, index) => {
                      const installmentNo =
                        Number(
                          payment.paid_installments ||
                            index + 1
                        );

                      const totalInst =
                        Number(
                          payment.total_installments ||
                            totalInstallments ||
                            0
                        );

                      return (
                        <tr
                          key={
                            payment.id ||
                            `${payment.receipt_number}-${index}`
                          }
                        >
                          <td>
                            <strong>
                              {payment.receipt_number ||
                                `SRS-PAY-${String(
                                  payment.id ||
                                    index + 1
                                ).padStart(
                                  6,
                                  "0"
                                )}`}
                            </strong>
                          </td>

                          <td>
                            {formatDate(
                              payment.payment_date
                            )}
                          </td>

                          <td
                            style={{
                              fontWeight: "900",
                              color: "#174ea6",
                            }}
                          >
                            {formatMoney(
                              payment.receipt_amount
                            )}
                          </td>

                          <td
                            style={{
                              fontWeight: "800",
                            }}
                          >
                            {formatMoney(
                              payment.paid_amount
                            )}
                          </td>

                          <td>
                            {formatMoney(
                              payment.remaining_amount
                            )}
                          </td>

                          <td>
                            <span className="installment-badge">
                              {totalInst
                                ? `${installmentNo}/${totalInst}`
                                : installmentNo}
                            </span>
                          </td>

                          <td>
                            {payment.payment_method ||
                              "Other"}
                          </td>

                          <td>
                            <span
                              style={{
                                background:
                                  payment.payment_status ===
                                  "Paid"
                                    ? "#dcfce7"
                                    : "#dbeafe",
                                color:
                                  payment.payment_status ===
                                  "Paid"
                                    ? "#166534"
                                    : "#174ea6",
                                padding:
                                  "7px 11px",
                                borderRadius:
                                  "20px",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  "900",
                              }}
                            >
                              {payment.payment_status ||
                                "Paid"}
                            </span>
                          </td>

                          <td>
                            <button
                              onClick={() =>
                                openReceipt(
                                  payment
                                )
                              }
                              className="srs-primary-button"
                              style={{
                                whiteSpace:
                                  "nowrap",
                                minHeight:
                                  "42px",
                                padding:
                                  "9px 13px",
                              }}
                            >
                              🧾 View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =================================================
            DOCUMENTS
        ================================================= */}

        <section className="customer-section">
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                marginBottom: "6px",
              }}
            >
              My Documents
            </h2>

            <p
              style={{
                color: "#66758b",
                fontSize: "14px",
                marginTop: 0,
                lineHeight: "1.6",
              }}
            >
              Upload your required documents
              and check their verification
              status.
            </p>
          </div>

          <div className="document-upload-box">
            <h3
              style={{
                marginTop: 0,
                color: "#174ea6",
              }}
            >
              Upload Document
            </h3>

            <form
              onSubmit={uploadDocument}
            >
              <div className="document-form-grid">
                <div>
                  <label className="form-label">
                    Document Name *
                  </label>

                                    <div style={{ position: "relative", width: "100%" }}>
                    <button
                      type="button"
                      className="form-select"
                      aria-expanded={showDocumentOptions}
                      onClick={() => setShowDocumentOptions((open) => !open)}
                      style={{
                        minHeight: "60px",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        textAlign: "left",
                        fontSize: "18px",
                        fontWeight: 700,
                        color: documentName ? "#123b75" : "#66758b",
                        background: "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      <span>{documentName || "Select document"}</span>
                      <span aria-hidden="true" style={{ fontSize: "20px" }}>
                        {showDocumentOptions ? "▲" : "▼"}
                      </span>
                    </button>

                    {showDocumentOptions && (
                      <div
                        role="listbox"
                        aria-label="Choose document name"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 5px)",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          maxHeight: "320px",
                          overflowY: "auto",
                          padding: "7px",
                          background: "#ffffff",
                          border: "2px solid #a9c6e8",
                          borderRadius: "12px",
                          boxShadow: "0 10px 28px rgba(20, 60, 110, 0.22)"
                        }}
                      >
                        {[
                          ...REQUIRED_DOCUMENTS,
                          "Other Document"
                        ].map((document) => (
                          <button
                            key={document}
                            type="button"
                            role="option"
                            aria-selected={documentName === document}
                            onClick={() => {
                              setDocumentName(document);
                              setDocumentType(document);
                              setShowDocumentOptions(false);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              minHeight: "52px",
                              padding: "12px 14px",
                              marginBottom: "4px",
                              border: documentName === document
                                ? "2px solid #1976d2"
                                : "1px solid #d7e5f5",
                              borderRadius: "8px",
                              background: documentName === document
                                ? "#eaf3ff"
                                : "#ffffff",
                              color: "#123b75",
                              textAlign: "left",
                              fontSize: "17px",
                              fontWeight: 700,
                              lineHeight: 1.4,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                              cursor: "pointer"
                            }}
                          >
                            {document}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Document Type
                  </label>

                  <input
                    className="form-input"
                    value={documentType}
                    onChange={(e) =>
                      setDocumentType(
                        e.target.value
                      )
                    }
                    placeholder="Document type"
                  />
                </div>

                <div>
                  <label className="form-label">
                    File *
                  </label>

                  <input
                    id="customer-document-file"
                    className="form-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      setDocumentFile(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                    required
                  />

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#647892",
                      marginTop: "7px",
                      fontWeight: "600",
                    }}
                  >
                    PDF/JPG/PNG/WEBP •
                    Maximum 10 MB
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={
                      documentUploading
                    }
                    className="srs-primary-button"
                    style={{
                      width: "100%",
                      opacity:
                        documentUploading
                          ? 0.65
                          : 1,
                    }}
                  >
                    {documentUploading
                      ? "Uploading..."
                      : "⬆️ Upload Document"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <h3
            style={{
              color: "#174ea6",
              marginBottom: "14px",
            }}
          >
            Required Documents
          </h3>

          <div className="document-grid">
            {REQUIRED_DOCUMENTS.map(
              (requiredDocument) => {
                const uploaded =
                  isDocumentUploaded(
                    requiredDocument
                  );

                const matchingDocument =
                  documents.find(
                    (document) =>
                      String(
                        document.document_name ||
                          ""
                      )
                        .trim()
                        .toLowerCase() ===
                      requiredDocument
                        .trim()
                        .toLowerCase()
                  );

                return (
                  <div
                    key={
                      requiredDocument
                    }
                    className="document-card required"
                  >
                    <div className="document-card-header">
                      <div className="document-name">
                        {requiredDocument}
                      </div>

                      <span className="required-badge">
                        COMPULSORY
                      </span>
                    </div>

                    <div
                      className="document-status"
                      style={
                        uploaded
                          ? getDocumentStatusStyle(
                              matchingDocument?.document_status
                            )
                          : {
                              background:
                                "#fee2e2",
                              color:
                                "#991b1b",
                            }
                      }
                    >
                      {uploaded
                        ? matchingDocument?.document_status ||
                          "Uploaded"
                        : "Not Uploaded"}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <h3
            style={{
              color: "#174ea6",
              marginTop: "28px",
              marginBottom: "14px",
            }}
          >
            Uploaded Documents
          </h3>

          {documentsLoading ? (
            <p
              style={{
                fontSize: "15px",
                color: "#536b88",
              }}
            >
              Loading documents...
            </p>
          ) : documents.length === 0 ? (
            <div
              style={{
                border:
                  "1px solid #d9e6f5",
                borderRadius: "9px",
                padding: "22px",
                textAlign: "center",
                color: "#718096",
                background: "#f8fbff",
                fontSize: "15px",
              }}
            >
              No documents uploaded yet.
            </div>
          ) : (
            <div className="document-grid">
              {documents.map(
                (document) => {
                  const documentUrl =
                    getDocumentUrl(
                      document.document_url
                    );

                  return (
                    <div
                      className="document-card"
                      key={document.id}
                    >
                      <div className="document-card-header">
                        <div className="document-name">
                          📄{" "}
                          {
                            document.document_name
                          }
                        </div>

                        <span
                          className="document-status"
                          style={getDocumentStatusStyle(
                            document.document_status
                          )}
                        >
                          {
                            document.document_status ||
                            "Pending"
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#718096",
                          marginTop: "11px",
                        }}
                      >
                        Type:{" "}
                        {document.document_type ||
                          "Document"}
                      </div>

                      <div
                        style={{
                          fontSize: "13px",
                          color: "#718096",
                          marginTop: "5px",
                        }}
                      >
                        Uploaded:{" "}
                        {formatDate(
                          document.uploaded_at
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "9px",
                          marginTop: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocument(
                              document
                            );

                            setShowDocument(
                              true
                            );
                          }}
                          className="srs-primary-button"
                          style={{
                            padding:
                              "9px 13px",
                          }}
                        >
                          👁️ View
                        </button>

                        <a
                          href={
                            documentUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="srs-secondary-button"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            CONSTRUCTION
        ================================================= */}

        <section className="customer-section">
          <h2>
            Construction Progress
          </h2>

          <div className="construction-progress-box">
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "10px",
                marginBottom: "9px",
                fontSize: "16px",
              }}
            >
              <strong>
                Current Progress
              </strong>

              <strong
                style={{
                  color: "#174ea6",
                  fontSize: "18px",
                }}
              >
                {customer.project_progress ||
                  0}
                %
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      Number(
                        customer.project_progress ||
                          0
                      )
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <h3>
            Construction Updates
          </h3>

          {constructionLoading ? (
            <p
              style={{
                fontSize: "15px",
                color: "#536b88",
              }}
            >
              Loading construction updates...
            </p>
          ) : constructionUpdates.length === 0 ? (
            <div
              style={{
                border:
                  "1px solid #d9e6f5",
                borderRadius: "8px",
                padding: "22px",
                textAlign: "center",
                color: "#718096",
                fontSize: "15px",
              }}
            >
              No construction updates
              available yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(290px,1fr))",
                gap: "20px",
              }}
            >
              {constructionUpdates.map(
                (item) => (
                  <div
                    key={item.id}
                    className="construction-card"
                  >
                    {item.progress_photo && (
                      <img
                        src={
                          /^https?:\/\//i.test(String(item.progress_photo))
                            ? item.progress_photo
                            : `${API}${item.progress_photo.startsWith("/") ? "" : "/"}${item.progress_photo}`
                        }
                        alt="Construction Progress"
                        className="construction-card-image"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    <div
                      style={{
                        padding: "18px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          marginBottom:
                            "10px",
                          fontSize:
                            "16px",
                        }}
                      >
                        <strong>
                          Progress
                        </strong>

                        <strong
                          style={{
                            color:
                              "#174ea6",
                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            item.progress_percentage
                          }
                          %
                        </strong>
                      </div>

                      {item.progress_date && (
                        <p
                          style={{
                            color:
                              "#66758b",
                            fontSize:
                              "14px",
                          }}
                        >
                          Date:{" "}
                          {formatDate(
                            item.progress_date
                          )}
                        </p>
                      )}

                      {item.update_note && (
                        <p
                          style={{
                            lineHeight:
                              "1.65",
                            fontSize:
                              "14px",
                            color:
                              "#334155",
                          }}
                        >
                          {
                            item.update_note
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* =================================================
            CUSTOMER REVIEWS
        ================================================= */}

        <section className="customer-section" id="customer-reviews">
          <h2>⭐ My Reviews</h2>
          <p style={{ color: "#61748e", fontSize: "15px", lineHeight: 1.6, marginTop: "-5px" }}>
            Apne SRS Burooj experience ke baare mein feedback share karein. Review admin approval ke baad publish hoga.
          </p>

          <div className="customer-review-layout">
            <form className="customer-review-form" onSubmit={submitCustomerReview}>
              <h3 style={{ margin: 0, color: "#173d70", fontSize: "19px" }}>Share Your Experience</h3>
              <p style={{ margin: "8px 0 0", color: "#6b7c93", fontSize: "14px", lineHeight: 1.55 }}>
                Aapki feedback humein apni service behtar banane mein madad karti hai.
              </p>

              <label>Rating <span style={{ color: "#d93025" }}>*</span></label>
              <div className="customer-review-stars" role="radiogroup" aria-label="Review rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`customer-review-star ${star <= reviewRating ? "selected" : ""}`}
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                    aria-pressed={reviewRating === star}
                  >
                    {star <= reviewRating ? "★" : "☆"}
                  </button>
                ))}
                <span style={{ alignSelf: "center", color: "#405875", fontWeight: 700, fontSize: "14px" }}>
                  {reviewRating}/5
                </span>
              </div>

              <label htmlFor="customer-review-text">Your Review <span style={{ color: "#d93025" }}>*</span></label>
              <textarea
                id="customer-review-text"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Apna experience yahan likhein..."
                maxLength={2000}
                required
              />
              <div style={{ textAlign: "right", color: "#73849a", fontSize: "12px", marginTop: "5px" }}>
                {reviewText.length}/2000 characters
              </div>

              <button className="customer-review-submit" type="submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? "Submitting Review..." : "Submit Review"}
              </button>

              {reviewMessage && (
                <div className={`customer-review-message ${reviewMessageType}`} role="status">
                  {reviewMessage}
                </div>
              )}
            </form>

            <div>
              <h3 style={{ margin: "2px 0 14px", color: "#173d70", fontSize: "19px" }}>Your Review History</h3>
              {reviewLoading ? (
                <div className="customer-review-item" style={{ color: "#61748e" }}>Loading your reviews...</div>
              ) : customerReviews.length === 0 ? (
                <div className="customer-review-item" style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div style={{ fontSize: "30px", marginBottom: "8px" }}>💬</div>
                  <strong style={{ color: "#173d70" }}>No reviews submitted yet</strong>
                  <p className="customer-review-muted" style={{ lineHeight: 1.6, marginBottom: 0 }}>Aapka pehla review submit karne ke baad woh yahan nazar aayega.</p>
                </div>
              ) : (
                <div className="customer-review-list">
                  {customerReviews.map((review) => {
                    const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
                    const status = review.status || "Pending";
                    return (
                      <article className="customer-review-item" key={review.id}>
                        <div className="customer-review-item-top">
                          <div className="customer-review-rating" aria-label={`${rating} out of 5 stars`}>
                            {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                          </div>
                          <span className={`customer-review-status ${String(status).toLowerCase()}`}>
                            {status === "Published" ? "✓ Published" : status === "Hidden" ? "Hidden" : "⏳ Pending Approval"}
                          </span>
                        </div>
                        <p className="customer-review-content">{review.review || review.review_text || "No review text available."}</p>
                        <div className="customer-review-muted">Submitted: {formatReviewDate(review.created_at || review.review_date)}</div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            ACCOUNT
        ================================================= */}

        <section className="customer-section">
          <h2>My Account</h2>

          <div className="customer-grid">
            <InfoCard
              title="Customer Login ID"
              value={
                customer.customer_login_id ||
                "Not available"
              }
            />

            <InfoCard
              title="Name"
              value={
                customer.name ||
                "Not available"
              }
            />

            <InfoCard
              title="Email"
              value={
                customer.email ||
                "Not available"
              }
            />

            <InfoCard
              title="Phone"
              value={
                customer.phone ||
                "Not available"
              }
            />
          </div>
        </section>
      </main>

      {/* =================================================
          DOCUMENT PREVIEW
      ================================================= */}

      {showDocument &&
        selectedDocument && (
          <div
            className="document-preview-backdrop"
            onClick={() =>
              setShowDocument(false)
            }
          >
            <div
              className="document-preview-box"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="document-preview-header">
                <span>
                  {
                    selectedDocument.document_name
                  }
                </span>

                <button
                  onClick={() =>
                    setShowDocument(false)
                  }
                  style={{
                    border: "none",
                    background:
                      "#eef3f9",
                    color: "#174ea6",
                    borderRadius:
                      "50%",
                    width: "38px",
                    height: "38px",
                    cursor:
                      "pointer",
                    fontSize:
                      "24px",
                    fontWeight:
                      "700",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="document-preview-content">
                {String(
                  selectedDocument.document_url ||
                    ""
                )
                  .toLowerCase()
                  .endsWith(".pdf") ? (
                  <iframe
                    className="document-preview-pdf"
                    src={getDocumentUrl(
                      selectedDocument.document_url
                    )}
                    title={
                      selectedDocument.document_name
                    }
                  />
                ) : (
                  <img
                    className="document-preview-image"
                    src={getDocumentUrl(
                      selectedDocument.document_url
                    )}
                    alt={
                      selectedDocument.document_name
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}

      {/* =================================================
          PAYMENT RECEIPT
      ================================================= */}

      {showReceipt &&
        selectedPayment && (
          <div className="receipt-backdrop">
            <div
              className="receipt-paper receipt-print-area"
            >
              <button
                className="no-print"
                onClick={() =>
                  setShowReceipt(false)
                }
                style={{
                  position:
                    "absolute",
                  top: "12px",
                  right: "12px",
                  width: "38px",
                  height: "38px",
                  border: "none",
                  borderRadius:
                    "50%",
                  background:
                    "#eee",
                  color: "#333",
                  fontSize:
                    "22px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  borderBottom:
                    "3px solid #1976d2",
                  paddingBottom:
                    "15px",
                  gap: "20px",
                }}
              >
                <div>
                  <img
                    src="/srs-burooj-logo.png"
                    alt="SRS Burooj"
                    className="receipt-logo"
                  />

                  <div
                    style={{
                      fontSize:
                        "25px",
                      fontWeight:
                        "900",
                      marginTop:
                        "5px",
                    }}
                  >
                    SRS BUROOJ
                  </div>

                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#666",
                    }}
                  >
                    REAL ESTATE MANAGEMENT
                  </div>
                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "21px",
                      fontWeight:
                        "900",
                      color:
                        "#174ea6",
                    }}
                  >
                    PAYMENT RECEIPT
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#666",
                    }}
                  >
                    Customer Copy
                  </div>
                </div>
              </div>

              <table className="receipt-info-table">
                <tbody>
                  <tr>
                    <td>
                      Receipt Number
                    </td>
                    <td>
                      {selectedPayment.receipt_number ||
                        `SRS-PAY-${String(
                          selectedPayment.id
                        ).padStart(
                          6,
                          "0"
                        )}`}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Receipt Date
                    </td>
                    <td>
                      {formatDate(
                        selectedPayment.payment_date
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Customer Name
                    </td>
                    <td>
                      {customer.name ||
                        "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Customer Login ID
                    </td>
                    <td>
                      {customer.customer_login_id ||
                        "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>Email</td>
                    <td>
                      {customer.email ||
                        "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>Project</td>
                    <td>
                      {customer.project_name ||
                        "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>Unit</td>
                    <td>
                      {customer.unit_number ||
                        "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Payment Amount
                    </td>
                    <td
                      style={{
                        fontWeight:
                          "900",
                        fontSize:
                          "18px",
                        color:
                          "#174ea6",
                      }}
                    >
                      {formatMoney(
                        selectedPayment.receipt_amount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Installment
                    </td>
                    <td>
                      {selectedPayment.total_installments
                        ? `${selectedPayment.paid_installments}/${selectedPayment.total_installments}`
                        : selectedPayment.paid_installments ||
                          "—"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Payment Method
                    </td>
                    <td>
                      {selectedPayment.payment_method ||
                        "Other"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Transaction Reference
                    </td>
                    <td>
                      {selectedPayment.transaction_reference ||
                        selectedPayment.receipt ||
                        "Not provided"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Payment Status
                    </td>
                    <td>
                      {selectedPayment.payment_status ||
                        "Paid"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Property Value
                    </td>
                    <td>
                      {formatMoney(
                        selectedPayment.total_amount ||
                          propertyValue
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Total Paid After This Payment
                    </td>
                    <td
                      style={{
                        fontWeight:
                          "800",
                      }}
                    >
                      {formatMoney(
                        selectedPayment.paid_amount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Remaining Balance
                    </td>
                    <td>
                      {formatMoney(
                        selectedPayment.remaining_amount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Next Due Date
                    </td>
                    <td>
                      {selectedPayment.next_due_date
                        ? formatDate(
                            selectedPayment.next_due_date
                          )
                        : "Not available"}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Payment Note
                    </td>
                    <td>
                      {selectedPayment.payment_note ||
                        selectedPayment.receipt_note ||
                        "—"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  marginTop:
                    "45px",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-end",
                  gap: "30px",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "10px",
                    color:
                      "#777",
                  }}
                >
                  This is a computer-generated
                  payment receipt.
                </div>

                <div
                  style={{
                    minWidth:
                      "180px",
                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      borderTop:
                        "1px solid #222",
                      paddingTop:
                        "8px",
                      fontWeight:
                        "700",
                      fontSize:
                        "12px",
                    }}
                  >
                    Authorized Signatory
                  </div>

                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#666",
                    }}
                  >
                    SRS Burooj
                  </div>
                </div>
              </div>

              <div
                className="no-print"
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "center",
                  gap: "10px",
                  marginTop:
                    "30px",
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  onClick={printReceipt}
                  className="srs-primary-button"
                >
                  🧾 Print / Save PDF
                </button>

                <button
                  onClick={() =>
                    setShowReceipt(false)
                  }
                  style={{
                    background:
                      "#374151",
                    color:
                      "#fff",
                    border:
                      "none",
                    borderRadius:
                      "7px",
                    padding:
                      "11px 19px",
                    cursor:
                      "pointer",
                    fontSize:
                      "14px",
                    fontWeight:
                      "800",
                    minHeight:
                      "48px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

/* =====================================================
   INFO CARD
===================================================== */

function InfoCard({
  title,
  value,
}) {
  return (
    <div className="customer-info-card">
      <div className="customer-info-title">
        {title}
      </div>

      <div className="customer-info-value">
        {value}
      </div>
    </div>
  );
}

/* =====================================================
   LOADING STYLE
===================================================== */

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "14px",
  fontFamily:
    "Arial, sans-serif",
  background:
    "linear-gradient(180deg,#eaf3ff,#f7fbff)",
};

/* =====================================================
   DEFAULT BLUE BUTTON
===================================================== */

const blueButton = {
  background:
    "linear-gradient(135deg,#0d47a1,#1976d2)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "12px 20px",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "14px",
  minHeight: "46px",
};

export default CustomerDashboard;