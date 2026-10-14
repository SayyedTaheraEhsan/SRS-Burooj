import { adminFetch } from "./adminApi";
import { useEffect, useMemo, useRef, useState } from "react";

const API = "http://localhost:5000";
const DOCUMENT_API = `${API}/api/customer-documents`;

const REQUIRED_DOCUMENTS = [
  "Aadhaar Card",
  "PAN Card",
  "Passport Size Photograph",
  "Address Proof",
  "Bank Details / Cancelled Cheque",
  "Booking / Allotment Documents",
];

/* =========================================================
   LARGE CUSTOM DROPDOWN
========================================================= */

function LargeSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
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

  const selectedOption = options.find(
    (option) =>
      String(option.value) === String(value)
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
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((previous) => !previous);
          }
        }}
        style={{
          width: "100%",
          minHeight: "50px",
          padding: "12px 16px",
          border: "1px solid #C9D9E8",
          borderRadius: "9px",
          background: disabled
            ? "#F1F5F8"
            : "#FFFFFF",
          color: selectedOption
            ? "#17324D"
            : "#71859A",
          fontSize: "16px",
          fontWeight: selectedOption
            ? "600"
            : "500",
          textAlign: "left",
          cursor: disabled
            ? "not-allowed"
            : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          outline: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: "10px",
          }}
        >
          {selectedOption
            ? selectedOption.label
            : placeholder}
        </span>

        <span
          style={{
            flexShrink: 0,
            fontSize: "18px",
            color: "#17324D",
            transform: open
              ? "rotate(180deg)"
              : "rotate(0deg)",
            transition: "0.2s",
          }}
        >
          ▼
        </span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            maxHeight: "330px",
            overflowY: "auto",
            background: "#FFFFFF",
            border: "1px solid #BFD1E0",
            borderRadius: "10px",
            boxShadow:
              "0 14px 32px rgba(15, 59, 92, 0.22)",
            zIndex: 10000,
            padding: "6px",
            boxSizing: "border-box",
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: "16px",
                fontSize: "16px",
                color: "#71859A",
              }}
            >
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected =
                String(option.value) ===
                String(value);

              return (
                <button
                  key={String(option.value)}
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
                    borderRadius: "8px",
                    background: isSelected
                      ? "#0B5EA8"
                      : "#FFFFFF",
                    color: isSelected
                      ? "#FFFFFF"
                      : "#17324D",
                    fontSize: "17px",
                    fontWeight: isSelected
                      ? "800"
                      : "600",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "2px",
                    lineHeight: "1.35",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(event) => {
                    if (!isSelected) {
                      event.currentTarget.style.background =
                        "#EAF4FC";
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!isSelected) {
                      event.currentTarget.style.background =
                        "#FFFFFF";
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
   MAIN COMPONENT
========================================================= */

function AdminDocuments() {
  const [documents, setDocuments] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [customerFilter, setCustomerFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [previewDocument, setPreviewDocument] =
    useState(null);

  const emptyForm = {
    customer_id: "",
    document_name: "",
    document_type: "",
    document_status: "Pending",
    document: null,
  };

  const [form, setForm] =
    useState(emptyForm);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    loadDocuments();
    loadCustomers();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const response = await adminFetch(
        DOCUMENT_API
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Documents load nahi hue."
        );
      }

      setDocuments(
        data.documents || []
      );
    } catch (error) {
      console.error(
        "Documents load error:",
        error
      );

      alert(
        "Documents load nahi ho sake."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await adminFetch(
        `${API}/api/customers`
      );

      const data =
        await response.json();

      if (!response.ok) {
        return;
      }

      const list =
        data.customers ||
        data.data ||
        (Array.isArray(data)
          ? data
          : []);

      setCustomers(list);
    } catch (error) {
      console.error(
        "Customer list load error:",
        error
      );
    }
  };

  /* =====================================================
     FORM
  ===================================================== */

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const openEditForm = (document) => {
    setEditingId(document.id);

    setForm({
      customer_id:
        document.customer_id || "",

      document_name:
        document.document_name || "",

      document_type:
        document.document_type || "",

      document_status:
        document.document_status ||
        "Pending",

      document: null,
    });

    setShowForm(true);
  };

  const handleChange = (event) => {
    const {
      name,
      value,
      files,
    } = event.target;

    if (name === "document") {
      setForm((previous) => ({
        ...previous,
        document:
          files?.[0] || null,
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     SAVE
  ===================================================== */

  const saveDocument = async (event) => {
    event.preventDefault();

    if (!form.customer_id) {
      alert(
        "Customer select karein."
      );
      return;
    }

    if (!form.document_name.trim()) {
      alert(
        "Document name enter karein."
      );
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const response = await adminFetch(
          `${DOCUMENT_API}/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              document_name:
                form.document_name.trim(),

              document_type:
                form.document_type || null,

              document_status:
                form.document_status ||
                "Pending",
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Document update nahi hua."
          );
        }

        alert(
          "Document successfully updated."
        );
      } else {
        if (!form.document) {
          alert(
            "Document file select karein."
          );
          return;
        }

        const formData =
          new FormData();

        formData.append(
          "customer_id",
          form.customer_id
        );

        formData.append(
          "document_name",
          form.document_name.trim()
        );

        formData.append(
          "document_type",
          form.document_type || ""
        );

        formData.append(
          "document_status",
          form.document_status ||
            "Pending"
        );

        formData.append(
          "document",
          form.document
        );

        const response = await adminFetch(
          DOCUMENT_API,
          {
            method: "POST",
            body: formData,
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Document upload nahi hua."
          );
        }

        alert(
          "Customer document successfully uploaded."
        );
      }

      closeForm();

      await loadDocuments();
    } catch (error) {
      console.error(
        "Save document error:",
        error
      );

      alert(
        error.message ||
          "Document save nahi ho saka."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const deleteDocument = async (id) => {
    const confirmed =
      window.confirm(
        "Kya aap ye document permanently delete karna chahte hain?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response = await adminFetch(
        `${DOCUMENT_API}/${id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Document delete nahi hua."
        );
      }

      alert(
        "Document deleted successfully."
      );

      await loadDocuments();
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      alert(
        error.message ||
          "Document delete nahi ho saka."
      );
    }
  };

  /* =====================================================
     DOCUMENT URL / PREVIEW
  ===================================================== */

  const getDocumentUrl = (document) => {
    if (!document?.document_url) {
      return "";
    }

    if (
      document.document_url.startsWith(
        "http://"
      ) ||
      document.document_url.startsWith(
        "https://"
      )
    ) {
      return document.document_url;
    }

    return `${API}${document.document_url}`;
  };

  const getFileExtension = (url) => {
    if (!url) {
      return "";
    }

    return url
      .split("?")[0]
      .split(".")
      .pop()
      .toLowerCase();
  };

  const isPdf = (document) => {
    return (
      getFileExtension(
        document?.document_url
      ) === "pdf"
    );
  };

  const isImage = (document) => {
    const extension =
      getFileExtension(
        document?.document_url
      );

    return [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
    ].includes(extension);
  };

  const openPreview = (document) => {
    if (!document?.document_url) {
      alert(
        "Document file available nahi hai."
      );
      return;
    }

    setPreviewDocument(document);
  };

  const closePreview = () => {
    setPreviewDocument(null);
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredDocuments =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return documents.filter(
        (item) => {
          const customerName =
            item.customer_name || "";

          const customerEmail =
            item.customer_email || "";

          const documentName =
            item.document_name || "";

          const customerId = String(
            item.customer_id || ""
          );

          const matchesSearch =
            !query ||
            customerName
              .toLowerCase()
              .includes(query) ||
            customerEmail
              .toLowerCase()
              .includes(query) ||
            documentName
              .toLowerCase()
              .includes(query) ||
            customerId.includes(query);

          const matchesCustomer =
            !customerFilter ||
            String(
              item.customer_id
            ) ===
              String(
                customerFilter
              );

          const matchesStatus =
            !statusFilter ||
            String(
              item.document_status || ""
            ).toLowerCase() ===
              statusFilter.toLowerCase();

          return (
            matchesSearch &&
            matchesCustomer &&
            matchesStatus
          );
        }
      );
    }, [
      documents,
      search,
      customerFilter,
      statusFilter,
    ]);

  /* =====================================================
     STATUS STYLE
  ===================================================== */

  const getStatusStyle = (
    status
  ) => {
    const value =
      String(
        status || "Pending"
      ).toLowerCase();

    if (value === "verified") {
      return {
        background: "#DCFCE7",
        color: "#166534",
      };
    }

    if (value === "rejected") {
      return {
        background: "#FEE2E2",
        color: "#991B1B",
      };
    }

    if (value === "active") {
      return {
        background: "#DBEAFE",
        color: "#1D4ED8",
      };
    }

    return {
      background: "#FEF3C7",
      color: "#92400E",
    };
  };

  /* =====================================================
     CUSTOMER NAME
  ===================================================== */

  const getCustomerName = (
    customerId
  ) => {
    const customer =
      customers.find(
        (item) =>
          String(
            item.profile_id ||
              item.customer_id ||
              item.id
          ) === String(customerId)
      );

    return (
      customer?.name ||
      customer?.customer_name ||
      `Customer #${customerId}`
    );
  };

  /* =====================================================
     REQUIRED DOCUMENT STATS
  ===================================================== */

  const requiredDocumentStats =
    REQUIRED_DOCUMENTS.map(
      (requiredName) => {
        const found =
          documents.filter(
            (document) =>
              document.document_name
                ?.toLowerCase()
                .trim() ===
              requiredName
                .toLowerCase()
                .trim()
          );

        return {
          name: requiredName,
          count: found.length,
        };
      }
    );

  /* =====================================================
     DROPDOWN OPTIONS
  ===================================================== */

  const customerFilterOptions = [
    {
      value: "",
      label: "All Customers",
    },

    ...customers.map(
      (customer) => {
        const id =
          customer.profile_id ||
          customer.customer_id ||
          customer.id;

        return {
          value: id,
          label:
            customer.name ||
            customer.customer_name ||
            `Customer #${id}`,
        };
      }
    ),
  ];

  const statusFilterOptions = [
    {
      value: "",
      label: "All Status",
    },
    {
      value: "Pending",
      label: "Pending",
    },
    {
      value: "Verified",
      label: "Verified",
    },
    {
      value: "Rejected",
      label: "Rejected",
    },
    {
      value: "Active",
      label: "Active",
    },
  ];

  const customerFormOptions =
    customers.map(
      (customer) => {
        const id =
          customer.profile_id ||
          customer.customer_id ||
          customer.id;

        const name =
          customer.name ||
          customer.customer_name ||
          `Customer #${id}`;

        const email =
          customer.email ||
          customer.customer_email ||
          "";

        return {
          value: id,
          label: email
            ? `${name} — ${email}`
            : name,
        };
      }
    );

  const documentNameOptions = [
    {
      value: "",
      label: "Select Document",
    },

    ...REQUIRED_DOCUMENTS.map(
      (name) => ({
        value: name,
        label: name,
      })
    ),

    {
      value: "Other",
      label: "Other Document",
    },
  ];

  const documentStatusOptions = [
    {
      value: "Pending",
      label: "Pending",
    },
    {
      value: "Verified",
      label: "Verified",
    },
    {
      value: "Rejected",
      label: "Rejected",
    },
    {
      value: "Active",
      label: "Active",
    },
  ];

  return (
    <div className="documents-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .documents-page {
          min-height: 100%;
          padding: 24px;
          background: #F4F8FC;
          color: #17324D;
          font-family: Arial, Helvetica, sans-serif;
        }

        .documents-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .documents-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .documents-brand img {
          width: 58px;
          height: 58px;
          object-fit: contain;
          background: white;
          border-radius: 12px;
          padding: 5px;
          box-shadow:
            0 4px 14px
            rgba(15, 59, 92, .12);
        }

        .documents-brand h1 {
          margin: 0;
          font-size: 29px;
          font-weight: 900;
          color: #0B3558;
        }

        .documents-brand p {
          margin: 5px 0 0;
          color: #64788B;
          font-size: 15px;
        }

        .primary-button {
          border: none;
          background: #0877C9;
          color: white;
          padding: 13px 21px;
          border-radius: 9px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 5px 14px
            rgba(8, 119, 201, .20);
        }

        .primary-button:hover {
          background: #075FA2;
        }

        .secondary-button {
          border: 1px solid #C9D9E8;
          background: white;
          color: #174B72;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .danger-button {
          border: 1px solid #FECACA;
          background: #FFF5F5;
          color: #B91C1C;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border: 1px solid #DCE8F2;
          border-radius: 14px;
          padding: 19px;
          box-shadow:
            0 5px 18px
            rgba(15, 59, 92, .06);
        }

        .stat-label {
          font-size: 13px;
          color: #71859A;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 900;
          color: #0B5EA8;
          margin-top: 8px;
        }

        .required-strip {
          background: white;
          border: 1px solid #DCE8F2;
          border-radius: 14px;
          padding: 19px;
          margin-bottom: 20px;
        }

        .required-strip h3 {
          margin: 0 0 14px;
          color: #0B3558;
          font-size: 19px;
        }

        .required-list {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .required-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid #E1EBF4;
          background: #F8FBFE;
          border-radius: 9px;
          padding: 12px 14px;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.35;
        }

        .filter-card {
          background: white;
          border: 1px solid #DCE8F2;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns:
            1.5fr 1fr 1fr auto;
          gap: 13px;
          align-items: end;
        }

        .field-label {
          display: block;
          font-size: 14px;
          color: #50677D;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .input,
        .textarea {
          width: 100%;
          border: 1px solid #C9D9E8;
          border-radius: 9px;
          padding: 12px 13px;
          min-height: 50px;
          background: white;
          color: #17324D;
          outline: none;
          font-size: 16px;
          font-weight: 500;
        }

        .input::placeholder,
        .textarea::placeholder {
          color: #8193A5;
          font-size: 15px;
        }

        .input:focus,
        .textarea:focus {
          border-color: #1688D6;
          box-shadow:
            0 0 0 3px
            rgba(22, 136, 214, .10);
        }

        .table-card {
          background: white;
          border: 1px solid #DCE8F2;
          border-radius: 14px;
          overflow: hidden;
          box-shadow:
            0 5px 18px
            rgba(15, 59, 92, .05);
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 950px;
        }

        th {
          background: #0B5EA8;
          color: white;
          padding: 14px 13px;
          text-align: left;
          font-size: 14px;
          letter-spacing: .3px;
        }

        td {
          padding: 14px 13px;
          border-bottom: 1px solid #E7EEF5;
          font-size: 15px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #F7FBFF;
        }

        .customer-name {
          font-weight: 800;
          color: #0B3558;
          font-size: 15px;
        }

        .customer-email {
          color: #708398;
          font-size: 13px;
          margin-top: 4px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 900;
        }

        .actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #71859A;
          font-size: 16px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 28, 49, .62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .modal {
          width: min(760px, 96vw);
          max-height: 94vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          box-shadow:
            0 25px 70px
            rgba(0, 0, 0, .25);
        }

        .modal-header {
          padding: 19px 22px;
          background: #0B5EA8;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .close-button {
          border: none;
          background: rgba(255,255,255,.15);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 22px;
        }

        .modal-body {
          padding: 23px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 17px 22px;
          border-top: 1px solid #E2EAF2;
        }

        .file-box {
          border: 2px dashed #BFD5E7;
          background: #F8FBFE;
          border-radius: 10px;
          padding: 19px;
        }

        .file-box input {
          width: 100%;
          font-size: 15px;
        }

        .preview-modal {
          width: min(1100px, 96vw);
          height: min(90vh, 850px);
          background: white;
          border-radius: 15px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .preview-content {
          flex: 1;
          background: #EDF4FA;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
        }

        .preview-content img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px;
          background: white;
        }

        .preview-content iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
          border-radius: 6px;
        }

        .preview-content .no-preview {
          text-align: center;
          color: #587089;
          font-size: 16px;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .required-list {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .filter-card {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 700px) {
          .documents-page {
            padding: 14px;
          }

          .stats-grid,
          .required-list,
          .filter-card,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .full-width {
            grid-column: auto;
          }

          .documents-brand h1 {
            font-size: 23px;
          }
        }
      `}</style>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="documents-header">
        <div className="documents-brand">
          <img
            src="/srs-burooj-logo.png"
            alt="SRS Burooj"
          />

          <div>
            <h1>
              Customer Documents
            </h1>

            <p>
              SRS Burooj • Documents
              Management
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Upload Document
        </button>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            Total Documents
          </div>

          <div className="stat-value">
            {documents.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Verified
          </div>

          <div className="stat-value">
            {
              documents.filter(
                (item) =>
                  String(
                    item.document_status
                  ).toLowerCase() ===
                  "verified"
              ).length
            }
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Pending
          </div>

          <div className="stat-value">
            {
              documents.filter(
                (item) =>
                  !item.document_status ||
                  String(
                    item.document_status
                  ).toLowerCase() ===
                    "pending"
              ).length
            }
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Rejected
          </div>

          <div className="stat-value">
            {
              documents.filter(
                (item) =>
                  String(
                    item.document_status
                  ).toLowerCase() ===
                  "rejected"
              ).length
            }
          </div>
        </div>
      </div>

      {/* =================================================
          REQUIRED DOCUMENTS
      ================================================= */}

      <div className="required-strip">
        <h3>
          Required Customer Documents
        </h3>

        <div className="required-list">
          {requiredDocumentStats.map(
            (item) => (
              <div
                className="required-item"
                key={item.name}
              >
                <span>
                  {item.name}
                </span>

                <span
                  style={{
                    color:
                      item.count > 0
                        ? "#15803D"
                        : "#B45309",
                    fontWeight: 900,
                    fontSize: "14px",
                  }}
                >
                  {item.count > 0
                    ? "Uploaded"
                    : "Pending"}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="filter-card">
        <div>
          <label className="field-label">
            Search
          </label>

          <input
            className="input"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search customer, email or document..."
          />
        </div>

        <div>
          <label className="field-label">
            Customer
          </label>

          <LargeSelect
            value={customerFilter}
            onChange={setCustomerFilter}
            options={
              customerFilterOptions
            }
            placeholder="All Customers"
          />
        </div>

        <div>
          <label className="field-label">
            Status
          </label>

          <LargeSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={
              statusFilterOptions
            }
            placeholder="All Status"
          />
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setSearch("");
            setCustomerFilter("");
            setStatusFilter("");
          }}
        >
          Reset
        </button>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="table-card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state">
              Loading customer
              documents...
            </div>
          ) : filteredDocuments.length ===
            0 ? (
            <div className="empty-state">
              <div
                style={{
                  fontSize: 46,
                  marginBottom: 12,
                }}
              >
                📄
              </div>

              <strong
                style={{
                  fontSize: "18px",
                }}
              >
                No documents found
              </strong>

              <div
                style={{
                  marginTop: 7,
                  fontSize: "15px",
                }}
              >
                Upload a customer
                document using the
                button above.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map(
                  (
                    document,
                    index
                  ) => (
                    <tr
                      key={
                        document.id
                      }
                    >
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <div className="customer-name">
                          {document.customer_name ||
                            getCustomerName(
                              document.customer_id
                            )}
                        </div>

                        <div className="customer-email">
                          {document.customer_email ||
                            "Email not available"}
                        </div>
                      </td>

                      <td>
                        <strong
                          style={{
                            fontSize:
                              "15px",
                          }}
                        >
                          {document.document_name ||
                            "Unnamed Document"}
                        </strong>
                      </td>

                      <td>
                        {document.document_type ||
                          "—"}
                      </td>

                      <td>
                        <span
                          className="status"
                          style={getStatusStyle(
                            document.document_status
                          )}
                        >
                          {document.document_status ||
                            "Pending"}
                        </span>
                      </td>

                      <td>
                        {document.uploaded_at
                          ? new Date(
                              document.uploaded_at
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openPreview(
                                document
                              )
                            }
                          >
                            👁 View
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openEditForm(
                                document
                              )
                            }
                          >
                            ✏ Edit
                          </button>

                          <button
                            type="button"
                            className="danger-button"
                            onClick={() =>
                              deleteDocument(
                                document.id
                              )
                            }
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={closeForm}
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                {editingId
                  ? "Edit Customer Document"
                  : "Upload Customer Document"}
              </h2>

              <button
                type="button"
                className="close-button"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveDocument}
            >
              <div className="modal-body">
                <div className="form-grid">

                  {/* CUSTOMER */}

                  <div className="full-width">
                    <label className="field-label">
                      Customer *
                    </label>

                    <LargeSelect
                      value={
                        form.customer_id
                      }
                      onChange={(value) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            customer_id:
                              value,
                          })
                        )
                      }
                      options={
                        customerFormOptions
                      }
                      placeholder="Select Customer"
                      disabled={Boolean(
                        editingId
                      )}
                    />
                  </div>

                  {/* DOCUMENT NAME */}

                  <div>
                    <label className="field-label">
                      Document Name *
                    </label>

                    <LargeSelect
                      value={
                        form.document_name
                      }
                      onChange={(value) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            document_name:
                              value,
                          })
                        )
                      }
                      options={
                        documentNameOptions
                      }
                      placeholder="Select Document"
                    />
                  </div>

                  {/* DOCUMENT TYPE */}

                  <div>
                    <label className="field-label">
                      Document Type
                    </label>

                    <input
                      name="document_type"
                      value={
                        form.document_type
                      }
                      onChange={
                        handleChange
                      }
                      className="input"
                      placeholder="PDF / Image / Other"
                    />
                  </div>

                  {/* STATUS */}

                  <div>
                    <label className="field-label">
                      Document Status
                    </label>

                    <LargeSelect
                      value={
                        form.document_status
                      }
                      onChange={(value) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            document_status:
                              value,
                          })
                        )
                      }
                      options={
                        documentStatusOptions
                      }
                      placeholder="Select Status"
                    />
                  </div>

                  {/* FILE */}

                  {!editingId && (
                    <div className="full-width">
                      <label className="field-label">
                        Document File *
                      </label>

                      <div className="file-box">
                        <input
                          type="file"
                          name="document"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={
                            handleChange
                          }
                          required
                        />

                        <div
                          style={{
                            marginTop: 9,
                            color:
                              "#71859A",
                            fontSize:
                              "14px",
                            lineHeight:
                              "1.5",
                          }}
                        >
                          Allowed: PDF,
                          JPG, JPEG,
                          PNG, WEBP.
                          Maximum 10
                          MB.
                        </div>

                        {form.document && (
                          <div
                            style={{
                              marginTop: 11,
                              color:
                                "#0B5EA8",
                              fontWeight:
                                700,
                              fontSize:
                                "15px",
                            }}
                          >
                            Selected:{" "}
                            {
                              form
                                .document
                                .name
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Document"
                    : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          PREVIEW MODAL
      ================================================= */}

      {previewDocument && (
        <div
          className="modal-overlay"
          onClick={closePreview}
        >
          <div
            className="preview-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {previewDocument.document_name ||
                    "Document Preview"}
                </h2>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: "14px",
                    opacity: 0.9,
                  }}
                >
                  {previewDocument.customer_name ||
                    "Customer"}
                </div>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closePreview}
              >
                ×
              </button>
            </div>

            <div className="preview-content">
              {isImage(
                previewDocument
              ) && (
                <img
                  src={getDocumentUrl(
                    previewDocument
                  )}
                  alt={
                    previewDocument.document_name
                  }
                />
              )}

              {isPdf(
                previewDocument
              ) && (
                <iframe
                  src={getDocumentUrl(
                    previewDocument
                  )}
                  title="Document Preview"
                />
              )}

              {!isImage(
                previewDocument
              ) &&
                !isPdf(
                  previewDocument
                ) && (
                  <div className="no-preview">
                    <div
                      style={{
                        fontSize: 50,
                        marginBottom: 13,
                      }}
                    >
                      📄
                    </div>

                    <strong
                      style={{
                        fontSize:
                          "18px",
                      }}
                    >
                      Preview not
                      available
                    </strong>

                    <p
                      style={{
                        fontSize:
                          "15px",
                      }}
                    >
                      Use the button
                      below to open
                      the document.
                    </p>

                    <a
                      href={getDocumentUrl(
                        previewDocument
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="primary-button"
                      style={{
                        display:
                          "inline-block",
                        textDecoration:
                          "none",
                      }}
                    >
                      Open Document
                    </a>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDocuments;