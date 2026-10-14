import { adminFetch } from "./adminApi";
﻿import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/payments";
const UNITS_API = "http://localhost:5000/api/units";
const CUSTOMERS_API = "http://localhost:5000/api/customers";
const LOGO_URL = "/srs-burooj-logo.png";

function LargePaymentDropdown({ value, onChange, options = [], placeholder = "Select" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === String(value));
  return (
    <div className="payment-large-dropdown">
      <button type="button" className={`payment-large-dropdown-button ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <span className={selected ? "selected" : "placeholder"}>{selected?.label || placeholder}</span>
        <span className="payment-large-dropdown-arrow">▾</span>
      </button>
      {open && <div className="payment-large-dropdown-menu">
        {options.length === 0 ? <div className="payment-large-dropdown-empty">No options available</div> : options.map((option) => (
          <button type="button" key={String(option.value)} className={`payment-large-dropdown-option ${String(option.value) === String(value) ? "active" : ""}`} onClick={() => { onChange(option.value); setOpen(false); }}>
            {option.label}
          </button>
        ))}
      </div>}
    </div>
  );
}


function LargeDatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const today = new Date();

  const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = String(dateString).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const initialDate = parseDate(value) || today;
  const [viewDate, setViewDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  useEffect(() => {
    if (value) {
      const selected = parseDate(value);
      if (selected) {
        setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event) => {
      if (!event.target.closest(".srs-large-date-picker")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i -= 1) {
    calendarDays.push({ day: daysInPreviousMonth - i, currentMonth: false, date: new Date(year, month - 1, daysInPreviousMonth - i) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push({ day, currentMonth: true, date: new Date(year, month, day) });
  }
  let nextDay = 1;
  while (calendarDays.length < 42) {
    calendarDays.push({ day: nextDay, currentMonth: false, date: new Date(year, month + 1, nextDay) });
    nextDay += 1;
  }

  const formatValue = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const displayValue = value
    ? String(value).split("-").reverse().join("/")
    : "Select due date";

  const monthLabel = viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const goMonth = (offset) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const selectDate = (date) => {
    onChange(formatValue(date));
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(false);
  };

  const isToday = (date) => formatValue(date) === formatValue(today);
  const isSelected = (date) => value && formatValue(date) === value;

  return (
    <div className="srs-large-date-picker">
      <button
        type="button"
        className={`srs-large-date-input ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "selected" : "placeholder"}>{displayValue}</span>
        <span className="srs-date-calendar-icon">▣</span>
      </button>

      {open && (
        <div className="srs-large-calendar-popup">
          <div className="srs-calendar-header">
            <button type="button" onClick={() => goMonth(-1)} aria-label="Previous month">‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => goMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="srs-calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="srs-calendar-days">
            {calendarDays.map(({ day, currentMonth, date }) => (
              <button
                type="button"
                key={formatValue(date)}
                className={`srs-calendar-day ${currentMonth ? "current" : "outside"} ${isToday(date) ? "today" : ""} ${isSelected(date) ? "selected" : ""}`}
                onClick={() => selectDate(date)}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="srs-calendar-footer">
            <button type="button" onClick={() => selectDate(today)}>Today</button>
            {value && <button type="button" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const emptyForm = {
    customer_id: "",
    unit_id: "",
    total_amount: "",
    paid_amount: "",
    remaining_amount: "",
    installment_amount: "",
    total_installments: "",
    paid_installments: "",
    next_due_date: "",
    payment_status: "Pending",
    receipt: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadPayments();
    loadUnits();
    loadCustomers();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await adminFetch(API_URL);
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      } else {
        alert(data.message || "Failed to load payments.");
      }
    } catch (error) {
      console.error("Load payments error:", error);
      alert("Unable to connect to payment server.");
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const response = await adminFetch(UNITS_API);
      const data = await response.json();

      if (data.success) {
        setUnits(data.units || []);
      }
    } catch (error) {
      console.error("Load units error:", error);
    }
  };

  const loadCustomers = async () => {
    try {
      setCustomersLoading(true);
      const response = await adminFetch(CUSTOMERS_API);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        console.error("Customer loading failed:", data.message);
      }
    } catch (error) {
      console.error("Load customers error:", error);
    } finally {
      setCustomersLoading(false);
    }
  };

  const getCustomerByLoginId = (loginId) => customers.find((customer) => String(customer.customer_login_id || "").toLowerCase() === String(loginId || "").toLowerCase()) || null;

  const getCustomerTotalDeal = (customer) => {
    if (!customer) return 0;
    return Number([customer.property_value, customer.estimated_total, customer.agreement_value].find((v) => Number(v || 0) > 0) || 0);
  };

  const findCustomerUnit = (customer) => {
    if (!customer) return null;
    const explicitId = customer.unit_id || customer.property_unit_id || customer.customer_unit_id;
    if (explicitId) {
      const direct = units.find((u) => Number(u.id) === Number(explicitId));
      if (direct) return direct;
    }
    const unitNumber = String(customer.unit_number || "").trim().toLowerCase();
    const projectName = String(customer.project_name || "").trim().toLowerCase();
    return units.find((u) => {
      const sameUnit = String(u.unit_number || u.unit_name || "").trim().toLowerCase() === unitNumber;
      const sameProject = !projectName || String(u.project_name || u.project || "").trim().toLowerCase() === projectName;
      return sameUnit && sameProject;
    }) || units.find((u) => String(u.unit_number || u.unit_name || "").trim().toLowerCase() === unitNumber) || null;
  };

  const loadCustomerPaymentHistory = async (customerId, unitId) => {
    if (!customerId || !unitId) return [];
    try {
      const response = await adminFetch(`${API_URL}/history/${customerId}/${unitId}`);
      const data = await response.json();
      return data.success ? (data.payments || []) : [];
    } catch (error) {
      console.error("Customer payment history error:", error);
      return [];
    }
  };

  const selectCustomerByLoginId = async (loginId) => {
    setCustomerLookupLoading(true);
    const customer = getCustomerByLoginId(loginId);
    if (!customer) {
      setSelectedCustomerDetails(null); setReceiptHistory([]); setForm(emptyForm); setCustomerLookupLoading(false); return;
    }
    const customerId = customer.profile_id || customer.id || customer.customer_id;
    const unit = findCustomerUnit(customer);
    const unitId = unit?.id || customer.unit_id || customer.property_unit_id || "";
    const totalDeal = getCustomerTotalDeal(customer);
    const history = await loadCustomerPaymentHistory(customerId, unitId);
    const latest = history.length ? history[history.length - 1] : null;
    const alreadyPaid = Number(latest?.paid_amount || 0);
    setSelectedCustomerDetails({ customer, unit, totalDeal, alreadyPaid, history });
    setReceiptHistory(history);
    setForm((previous) => ({ ...previous, customer_id: String(customerId || ""), unit_id: String(unitId || ""), total_amount: totalDeal || latest?.total_amount || "", paid_amount: "", remaining_amount: Math.max((totalDeal || Number(latest?.total_amount || 0)) - alreadyPaid, 0), installment_amount: latest?.installment_amount || "", total_installments: latest?.total_installments || "", paid_installments: history.filter((row) => Number(row.paid_amount || 0) > 0).length }));
    setCustomerLookupLoading(false);
  };

  // Paid installments are counted automatically from saved payment receipts.
  // Admin does not need to type the installment count manually.
  // Find the latest saved receipt for the same customer + unit.
  // The latest row contains the cumulative paid/remaining values.
  const getPreviousPayment = (customerId, unitId, excludePaymentId = null) => {
    const customerValue = customerId ? Number(customerId) : null;
    const unitValue = unitId ? Number(unitId) : null;

    if (!customerValue || !unitValue) return null;

    const rows = payments
      .filter((payment) =>
        Number(payment.customer_id) === customerValue &&
        Number(payment.unit_id) === unitValue &&
        (excludePaymentId === null || Number(payment.id) !== Number(excludePaymentId)) &&
        Number(payment.paid_amount || 0) > 0
      )
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

    return rows.length ? rows[rows.length - 1] : null;
  };

  // Installments are based on cumulative money paid, not receipt count.
  // If a customer pays more than one installment in a receipt, the count advances accordingly.
  const calculatePaidInstallments = (cumulativePaid, installmentAmount, totalInstallments) => {
    const paid = Number(cumulativePaid) || 0;
    const installment = Number(installmentAmount) || 0;
    const total = Number(totalInstallments) || 0;

    if (installment <= 0) return 0;

    const count = Math.ceil(paid / installment);
    return total > 0 ? Math.min(count, total) : count;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => {
      const updated = { ...previous, [name]: value };
      if (name === "paid_amount") {
        const total = Number(updated.total_amount || selectedCustomerDetails?.totalDeal || 0);
        const alreadyPaid = Number(selectedCustomerDetails?.alreadyPaid || 0);
        const cumulative = alreadyPaid + Number(value || 0);
        updated.remaining_amount = Math.max(total - cumulative, 0);
        updated.paid_installments = calculatePaidInstallments(cumulative, Number(updated.installment_amount || 0), Number(updated.total_installments || 0));
      }
      return updated;
    });
  };

  const handleCustomerChange = async (loginId) => {
    if (!loginId) { setSelectedCustomerDetails(null); setReceiptHistory([]); setForm(emptyForm); return; }
    await selectCustomerByLoginId(loginId);
  };

  const openAddForm = () => {
    setEditingId(null); setSelectedCustomerDetails(null); setReceiptHistory([]); setForm(emptyForm);
    setShowForm(true); loadCustomers(); loadUnits();
  };

  const openEditForm = (payment) => {
    setEditingId(payment.id);

    setForm({
      customer_id: payment.customer_id ? String(payment.customer_id) : "",
      unit_id: payment.unit_id ? String(payment.unit_id) : "",
      total_amount: payment.total_amount || "",
      paid_amount: payment.paid_amount || "",
      remaining_amount: payment.remaining_amount || "",
      installment_amount: payment.installment_amount || "",
      total_installments: payment.total_installments || "",
      paid_installments: payment.paid_installments || "",
      next_due_date: payment.next_due_date
        ? String(payment.next_due_date).substring(0, 10)
        : "",
      payment_status: payment.payment_status || "Pending",
      receipt: payment.receipt || "",
    });

    setShowForm(true);
    loadCustomers();
    loadUnits();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customer_id) {
      alert("Please select Customer Login ID.");
      return;
    }

    if (!form.unit_id) {
      alert("Customer ka Property / Unit nahi mila.");
      return;
    }

    if (!form.total_amount || Number(form.total_amount) <= 0) {
      alert("Customer ka Total Deal Amount nahi mila.");
      return;
    }

    // A receipt can be larger than one installment. It cannot make cumulative paid exceed the deal.
    const previousForValidation = getPreviousPayment(form.customer_id, form.unit_id, editingId);
    const previousPaidForValidation = Number(previousForValidation?.paid_amount || 0);
    const currentForValidation = Number(form.paid_amount) || 0;
    const totalForValidation = Number(form.total_amount || previousForValidation?.total_amount || 0);

    if (previousPaidForValidation + currentForValidation > totalForValidation) {
      alert("Cumulative paid amount cannot be greater than the total deal amount.");
      return;
    }

    // The amount typed here is ONLY the current receipt amount.
    // Previous paid amount is fetched from the last receipt automatically.
    const currentPayment = Number(form.paid_amount) || 0;
    if (currentPayment <= 0) {
      alert("Current payment amount enter karein.");
      return;
    }

    const previous = getPreviousPayment(
      form.customer_id,
      form.unit_id,
      editingId
    );

    const previousPaid = Number(previous?.paid_amount || 0);
    const totalAmount = Number(form.total_amount || previous?.total_amount || 0);
    const installmentAmount = Number(form.installment_amount || previous?.installment_amount || 0);
    const totalInstallments = Number(form.total_installments || previous?.total_installments || 0);
    const cumulativePaid = previousPaid + currentPayment;
    const remainingAmount = Math.max(totalAmount - cumulativePaid, 0);
    const autoPaidInstallments = calculatePaidInstallments(
      cumulativePaid,
      installmentAmount,
      totalInstallments
    );

    try {
      setSaving(true);

      const payload = {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        total_amount: totalAmount,
        // Backend treats this as the CURRENT receipt amount and stores cumulative paid amount.
        paid_amount: currentPayment,
        remaining_amount: remainingAmount,
        installment_amount: installmentAmount,
        total_installments: totalInstallments,
        paid_installments: autoPaidInstallments,
        next_due_date: form.next_due_date || null,
        payment_status: form.payment_status || "Pending",
        receipt: form.receipt || null,
      };

      const url = editingId ? `${API_URL}/${editingId}` : API_URL;
      const method = editingId ? "PUT" : "POST";

      const response = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Payment save failed.");
        return;
      }

      alert(
        editingId
          ? "Payment updated successfully."
          : "Payment added successfully."
      );

      closeForm();
      await loadPayments();
    } catch (error) {
      console.error("Save payment error:", error);
      alert("Unable to save payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) {
      return;
    }

    try {
      const response = await adminFetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Delete failed.");
        return;
      }

      alert("Payment deleted successfully.");
      await loadPayments();
    } catch (error) {
      console.error("Delete payment error:", error);
      alert("Unable to delete payment.");
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        String(payment.customer_name || "").toLowerCase().includes(searchText) ||
        String(payment.customer_email || "").toLowerCase().includes(searchText) ||
        String(payment.project_name || "").toLowerCase().includes(searchText) ||
        String(payment.unit_number || "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        payment.payment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const totalCollection = payments.reduce(
    (sum, payment) => sum + Number(payment.paid_amount || 0),
    0
  );

  const totalPending = payments.reduce(
    (sum, payment) => sum + Number(payment.remaining_amount || 0),
    0
  );

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const raw = String(value).substring(0, 10);
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return raw;
  };

  const getStatusClass = (status) => {
    if (status === "Paid") return "status-paid";
    if (status === "Partial") return "status-partial";
    if (status === "Overdue") return "status-overdue";
    return "status-pending";
  };

  const getUnit = (payment) => {
    return (
      units.find((unit) => Number(unit.id) === Number(payment.unit_id)) ||
      null
    );
  };

  const getFirstValue = (object, keys) => {
    for (const key of keys) {
      if (object && object[key]) return object[key];
    }
    return "";
  };

  const getUnitPhoto = (payment) => {
    const unit = getUnit(payment);

    return getFirstValue(payment, [
      "unit_photo",
      "property_photo",
      "project_photo",
      "photo",
      "image",
      "image_url",
      "unit_image",
      "property_image",
      "project_image",
    ]) || getFirstValue(unit, [
      "unit_photo",
      "property_photo",
      "project_photo",
      "photo",
      "image",
      "image_url",
      "unit_image",
      "property_image",
      "project_image",
    ]);
  };

  const getDocumentUrl = (payment) => {
    const unit = getUnit(payment);

    return getFirstValue(payment, [
      "document_url",
      "document",
      "document_path",
      "file_url",
      "file",
      "attachment_url",
      "attachment",
    ]) || getFirstValue(unit, [
      "document_url",
      "document",
      "document_path",
      "file_url",
      "file",
      "attachment_url",
      "attachment",
    ]);
  };

  const getProjectName = (payment) => {
    const unit = getUnit(payment);
    return (
      payment.project_name ||
      payment.project ||
      unit?.project_name ||
      unit?.project ||
      "SRS Burooj"
    );
  };

  const getUnitNumber = (payment) => {
    const unit = getUnit(payment);
    return (
      payment.unit_number ||
      payment.unit_name ||
      unit?.unit_number ||
      unit?.unit_name ||
      "Not assigned"
    );
  };

  const openPreview = (url, title) => {
    if (!url) {
      alert("Photo / document available nahi hai.");
      return;
    }

    setPreviewUrl(url);
    setPreviewTitle(title || "Preview");
    setShowPreview(true);
  };

  const openReceipt = async (payment) => {
    setSelectedReceipt(payment);
    const history = await loadCustomerPaymentHistory(payment.customer_id, payment.unit_id);
    setReceiptHistory(history.length ? history : [payment]);
    setShowReceipt(true);
  };

  const printReceipt = () => {
    document.body.classList.add("srs-payment-print");

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        document.body.classList.remove("srs-payment-print");
      }, 500);
    }, 150);
  };

  const getReceiptNumber = (payment) =>
    payment.receipt_number ||
    payment.receipt ||
    `SRS-REC-${String(payment.id).padStart(6, "0")}`;

  const receiptTotal = Number(selectedReceipt?.total_amount || selectedReceipt?.property_value || selectedReceipt?.estimated_total || 0);
  const receiptPaid = Number(selectedReceipt?.paid_amount || 0);
  const receiptRemaining = Math.max(Number(selectedReceipt?.remaining_amount ?? receiptTotal - receiptPaid), 0);
  const getReceiptInstallmentAmount = (row, index, rows) => {
    const explicit = Number(row?.receipt_amount || 0);
    if (explicit > 0) return explicit;
    const cumulative = Number(row?.paid_amount || 0);
    const previous = index > 0 ? Number(rows[index - 1]?.paid_amount || 0) : 0;
    return Math.max(cumulative - previous, 0);
  };

  return (
    <div className="payments-page">
      <style>{`
        .payments-page {
          padding: 8px;
          color: #172D41;
        }

        .payments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .payments-title h2 {
          margin: 0;
          font-size: 28px;
          color: #0B2A43;
        }

        .payments-title p {
          margin: 6px 0 0;
          color: #64748B;
          font-size: 14px;
        }

        .add-payment-btn {
          border: none;
          background: #0B2A43;
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .payment-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 4px 14px rgba(15,23,42,.05);
        }

        .summary-label {
          font-size: 13px;
          color: #64748B;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 800;
          color: #0B2A43;
        }

        .payments-toolbar {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .payments-toolbar input {
          border: 2px solid #8DB7EE;
          border-radius: 10px;
          padding: 13px 16px;
          min-height: 62px;
          font-size: 19px;
          outline: none;
          background: #fff;
          color: #172D41;
          box-sizing: border-box;
        }

        .payments-toolbar input { flex: 1; }

        .payments-table-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(15,23,42,.05);
        }

        .table-scroll { overflow-x: auto; }

        .payments-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1250px;
        }

        .payments-table th {
          background: #F4F7F9;
          color: #526575;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: 14px;
          text-align: left;
          border-bottom: 1px solid #E2E8F0;
        }

        .payments-table td {
          padding: 14px;
          border-bottom: 1px solid #EEF2F6;
          color: #243B53;
          font-size: 13px;
          vertical-align: middle;
        }

        .customer-name {
          font-weight: 700;
          color: #0B2A43;
        }

        .customer-email {
          color: #64748B;
          font-size: 12px;
          margin-top: 3px;
        }

        .property-cell {
          min-width: 180px;
        }

        .property-name {
          font-weight: 800;
          color: #0B2A43;
        }

        .unit-badge {
          display: inline-block;
          margin-top: 4px;
          background: #EEF4F8;
          color: #0B2A43;
          padding: 5px 9px;
          border-radius: 7px;
          font-weight: 700;
        }

        .property-photo-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #D8C18A;
          background: #FFF9E9;
          color: #765A12;
          border-radius: 8px;
          padding: 5px 8px;
          cursor: pointer;
          margin-top: 7px;
        }

        .property-photo-btn img {
          width: 42px;
          height: 32px;
          object-fit: cover;
          border-radius: 5px;
        }

        .document-btn {
          border: 1px solid #CBD5E1;
          background: #F8FAFC;
          color: #0B2A43;
          border-radius: 7px;
          padding: 7px 9px;
          cursor: pointer;
          font-weight: 700;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }

        .status-paid { background: #DCFCE7; color: #166534; }
        .status-partial { background: #FEF3C7; color: #92400E; }
        .status-overdue { background: #FEE2E2; color: #991B1B; }
        .status-pending { background: #E0E7FF; color: #3730A3; }

        .action-buttons {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: none;
          padding: 7px 10px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .edit-btn { background: #E8F1F7; color: #0B2A43; }
        .delete-btn { background: #FEE2E2; color: #991B1B; }
        .receipt-btn { background: #FFF4D6; color: #795B10; }

        .empty-state,
        .loading-state {
          text-align: center;
          padding: 50px 20px;
          color: #64748B;
        }

        .payment-modal-overlay,
        .preview-overlay,
        .receipt-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11,42,67,.60);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 9999;
        }

        .payment-modal {
          width: min(850px,100%);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(0,0,0,.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          background: #F8FAFC;
        }

        .modal-header h3 { margin: 0; color: #0B2A43; }

        .close-modal {
          border: none;
          background: #E2E8F0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }

        .payment-form { padding: 24px; }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full-width { grid-column: 1/-1; }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .required { color: #B8860B; }

        .payment-form input,
        .payment-form select {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #CBD5E1;
          border-radius: 9px;
          outline: none;
          font-size: 14px;
          color: #172D41;
          background: white;
        }

        .payment-form input[readonly] {
          background: #F1F5F9;
          font-weight: 700;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #E2E8F0;
        }

        .cancel-btn,
        .save-btn {
          border: none;
          padding: 11px 20px;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .cancel-btn { background: #E2E8F0; color: #334155; }
        .save-btn { background: #0B2A43; color: white; }
        .save-btn:disabled { opacity: .6; cursor: not-allowed; }

        .preview-box {
          width: min(1000px, 96vw);
          height: min(88vh, 900px);
          background: white;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .preview-header {
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #E2E8F0;
        }

        .preview-content {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          background: #F1F5F9;
        }

        .preview-content img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .preview-content iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: white;
        }

        .receipt-wrapper {
          width: min(900px, 96vw);
          max-height: 94vh;
          overflow: auto;
          background: #E8E8E8;
          border-radius: 14px;
          padding: 18px;
        }

        .receipt-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-bottom: 12px;
        }

        .receipt-paper {
          background: white;
          min-height: 1050px;
          padding: 42px;
          border-top: 8px solid #B58B2A;
          box-sizing: border-box;
          color: #111;
          font-family: Arial, sans-serif;
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          gap: 25px;
          align-items: flex-start;
          border-bottom: 2px solid #B58B2A;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }

        .receipt-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .receipt-brand img {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }

        .receipt-brand-name {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .receipt-brand-sub {
          font-size: 11px;
          letter-spacing: 1.5px;
          color: #666;
          margin-top: 4px;
        }

        .receipt-title {
          text-align: right;
        }

        .receipt-title h1 {
          margin: 0 0 8px;
          font-size: 26px;
          letter-spacing: 2px;
        }

        .receipt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 30px;
          margin-bottom: 24px;
        }

        .receipt-label {
          color: #777;
          font-size: 11px;
          margin-bottom: 4px;
          letter-spacing: .5px;
        }

        .receipt-value {
          font-weight: 700;
          font-size: 14px;
        }

        .receipt-amount {
          border: 1px solid #DDD;
          margin: 20px 0;
        }

        .receipt-amount-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #EEE;
        }

        .receipt-amount-row:last-child { border-bottom: none; }

        .receipt-main-amount {
          font-size: 24px;
          font-weight: 900;
          color: #8A6718;
        }

        .receipt-footer {
          margin-top: 70px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          font-size: 12px;
          color: #555;
        }

        .signature {
          min-width: 220px;
          text-align: center;
          border-top: 1px solid #444;
          padding-top: 7px;
        }

        .payment-large-dropdown {
          position: relative;
          width: 100%;
        }

        .payment-large-dropdown-button {
          width: 100%;
          min-height: 62px;
          padding: 13px 17px;
          border: 2px solid #8DB7EE;
          border-radius: 10px;
          background: #fff;
          color: #172033;
          font-size: 21px;
          font-weight: 700;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          box-sizing: border-box;
        }

        .payment-large-dropdown-button.open {
          border-color: #0B5ED7;
          box-shadow: 0 0 0 3px rgba(11,94,215,.12);
        }

        .payment-large-dropdown-arrow {
          color: #0B5ED7;
          font-size: 26px;
          font-weight: 900;
        }

        .payment-large-dropdown-menu {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          max-height: 350px;
          overflow-y: auto;
          padding: 7px;
          background: #fff;
          border: 2px solid #0B5ED7;
          border-radius: 10px;
          box-shadow: 0 14px 32px rgba(0,0,0,.20);
          z-index: 99999;
        }

        .payment-large-dropdown-option {
          display: block;
          width: 100%;
          min-height: 60px;
          padding: 13px 16px;
          margin: 2px 0;
          border: 0;
          border-radius: 8px;
          background: #fff;
          color: #172033;
          font-size: 21px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
        }

        .payment-large-dropdown-option:hover,
        .payment-large-dropdown-option.active {
          background: #E8F1FF;
          color: #0B4EA2;
        }

        .payment-large-dropdown-empty {
          padding: 16px;
          font-size: 18px;
          color: #667085;
        }

        .payment-large-dropdown { position: relative; width: 100%; z-index: 50; }
        .payment-large-dropdown-button { width: 100%; min-height: 64px; padding: 14px 18px; border: 2px solid #8db7ee; border-radius: 10px; background: #fff; color: #172033; font-size: 21px; font-weight: 600; text-align: left; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .payment-large-dropdown-button.open { border-color: #0b5ed7; box-shadow: 0 0 0 3px rgba(11,94,215,.12); }
        .payment-large-dropdown-button .placeholder { color: #667085; }
        .payment-large-dropdown-arrow { font-size: 25px; color: #0b5ed7; }
        .payment-large-dropdown-menu { position: absolute; left: 0; right: 0; top: calc(100% + 6px); max-height: 320px; overflow-y: auto; padding: 7px; background: #fff; border: 2px solid #0b5ed7; border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.18); z-index: 99999; }
        .payment-large-dropdown-option { width: 100%; min-height: 58px; padding: 13px 16px; margin: 2px 0; border: 0; border-radius: 8px; background: #fff; color: #172033; font-size: 20px; font-weight: 600; text-align: left; cursor: pointer; }
        .payment-large-dropdown-option:hover,.payment-large-dropdown-option.active { background: #e8f1ff; color: #0b4ea2; }
        .payment-large-dropdown-empty { padding: 16px; font-size: 18px; color: #667085; }
        .lookup-note { margin-top: 7px; color: #0b5ed7; font-size: 16px; font-weight: 600; }
        .customer-payment-card { background: #eef5ff; border: 2px solid #c7dcfa; border-radius: 12px; padding: 18px; }
        .customer-payment-card-title { font-size: 21px; font-weight: 800; color: #0b4ea2; margin-bottom: 14px; }
        .customer-payment-details-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .customer-payment-details-grid span { display: block; font-size: 14px; color: #64748b; margin-bottom: 5px; }
        .customer-payment-details-grid strong { display: block; font-size: 19px; color: #172033; }
        .payment-readonly-field,.payment-amount-display { min-height: 64px; display: flex; align-items: center; padding: 12px 16px; border: 2px solid #8db7ee; border-radius: 10px; background: #f7fbff; color: #172033; font-size: 22px; font-weight: 700; }
        .payment-amount-display.remaining { color: #0b4ea2; }
        .payment-form input.payment-large-input { min-height: 64px; padding: 13px 16px; font-size: 21px; font-weight: 600; border: 2px solid #8db7ee; }
        .payment-form input.payment-large-input:focus { border-color: #0b5ed7; box-shadow: 0 0 0 3px rgba(11,94,215,.12); }
        .payment-date-input {
          min-height: 78px !important;
          height: 78px !important;
          padding: 13px 16px !important;
          font-size: 27px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          color-scheme: light;
        }

        .payment-date-input::-webkit-calendar-picker-indicator {
          width: 32px;
          height: 32px;
          padding: 4px;
          cursor: pointer;
          opacity: 1;
        }

        .payment-date-input::-webkit-datetime-edit {
          font-size: 24px;
          font-weight: 700;
        }
        .receipt-history-section { margin-top: 24px; }
        .receipt-history-section h3 { margin: 0 0 10px; font-size: 18px; }
        .receipt-history-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .receipt-history-table th,.receipt-history-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .receipt-history-table th { background: #f5f5f5; }

        @media (max-width: 800px) {
          .payment-summary { grid-template-columns: 1fr; }
          .payments-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .payments-toolbar { flex-direction: column; }
          .form-grid { grid-template-columns: 1fr; }
          .form-group.full-width { grid-column: auto; }
          .customer-payment-details-grid { grid-template-columns: 1fr 1fr; }
          .receipt-paper { padding: 24px; }
          .receipt-header { flex-direction: column; }
          .receipt-title { text-align: left; }
          .receipt-grid { grid-template-columns: 1fr; }
        }

        @media print {
          body.srs-payment-print * {
            visibility: hidden !important;
          }

          body.srs-payment-print .srs-payment-receipt-print,
          body.srs-payment-print .srs-payment-receipt-print * {
            visibility: visible !important;
          }

          body.srs-payment-print .srs-payment-receipt-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          body.srs-payment-print .receipt-wrapper {
            position: static !important;
            width: 100% !important;
            max-height: none !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          body.srs-payment-print .receipt-actions {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }



        .srs-large-date-picker {
          position: relative;
          width: 100%;
          z-index: 60;
        }

        .srs-large-date-input {
          width: 100%;
          min-height: 78px;
          height: 78px;
          padding: 14px 18px;
          border: 2px solid #8DB7EE;
          border-radius: 10px;
          background: #fff;
          color: #172033;
          font-size: 27px;
          font-weight: 700;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
          box-sizing: border-box;
        }

        .srs-large-date-input:hover,
        .srs-large-date-input.open {
          border-color: #0B5ED7;
          box-shadow: 0 0 0 3px rgba(11,94,215,.12);
        }

        .srs-large-date-input .placeholder { color: #667085; }
        .srs-large-date-input .selected { color: #172033; }

        .srs-date-calendar-icon {
          font-size: 30px;
          line-height: 1;
          color: #0B5ED7;
          margin-left: 16px;
        }

        .srs-large-calendar-popup {
          position: absolute;
          left: 0;
          top: calc(100% + 8px);
          width: 390px;
          max-width: min(390px, 90vw);
          padding: 18px;
          background: #fff;
          border: 2px solid #0B5ED7;
          border-radius: 16px;
          box-shadow: 0 18px 45px rgba(0,0,0,.25);
          box-sizing: border-box;
          z-index: 999999;
        }

        .srs-calendar-header {
          display: grid;
          grid-template-columns: 52px 1fr 52px;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .srs-calendar-header strong {
          text-align: center;
          font-size: 23px;
          color: #0B2A43;
          font-weight: 800;
        }

        .srs-calendar-header button {
          width: 52px;
          height: 52px;
          border: 1px solid #8DB7EE;
          border-radius: 10px;
          background: #E8F1FF;
          color: #0B5ED7;
          font-size: 34px;
          line-height: 1;
          font-weight: 800;
          cursor: pointer;
        }

        .srs-calendar-weekdays,
        .srs-calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .srs-calendar-weekdays {
          margin-bottom: 7px;
        }

        .srs-calendar-weekdays span {
          text-align: center;
          font-size: 15px;
          font-weight: 800;
          color: #64748B;
          padding: 5px 0;
        }

        .srs-calendar-day {
          height: 44px;
          border: 1px solid transparent;
          border-radius: 9px;
          background: #fff;
          color: #172033;
          font-size: 19px;
          font-weight: 700;
          cursor: pointer;
        }

        .srs-calendar-day:hover {
          background: #E8F1FF;
          border-color: #8DB7EE;
          color: #0B4EA2;
        }

        .srs-calendar-day.outside {
          color: #A8B0BB;
        }

        .srs-calendar-day.today {
          border-color: #0B5ED7;
          color: #0B5ED7;
        }

        .srs-calendar-day.selected {
          background: #0B5ED7;
          border-color: #0B5ED7;
          color: #fff;
        }

        .srs-calendar-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 15px;
          padding-top: 13px;
          border-top: 1px solid #E2E8F0;
        }

        .srs-calendar-footer button {
          min-height: 44px;
          padding: 8px 18px;
          border: 1px solid #8DB7EE;
          border-radius: 9px;
          background: #F5F9FF;
          color: #0B5ED7;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .payments-page input[type="date"],
        .payment-modal input[type="date"] {
          min-height: 78px !important;
          height: 78px !important;
          width: 100% !important;
          padding: 14px 18px !important;
          font-size: 27px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          box-sizing: border-box !important;
          cursor: pointer !important;
        }

        .payments-page input[type="date"]::-webkit-calendar-picker-indicator,
        .payment-modal input[type="date"]::-webkit-calendar-picker-indicator {
          width: 38px !important;
          height: 38px !important;
          padding: 5px !important;
          cursor: pointer !important;
          transform: scale(1.15) !important;
        }
      `}
</style>

      <div className="payments-header">
        <div className="payments-title">
          <h2>Payments & Installments</h2>
          <p>Manage customer payments, installments and pending amounts.</p>
        </div>

        <button className="add-payment-btn" onClick={openAddForm}>
          + Add Payment
        </button>
      </div>

      <div className="payment-summary">
        <div className="summary-card">
          <div className="summary-label">Total Payment Records</div>
          <div className="summary-value">{payments.length}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Total Collection</div>
          <div className="summary-value">{formatCurrency(totalCollection)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-label">Pending Amount</div>
          <div className="summary-value">{formatCurrency(totalPending)}</div>
        </div>
      </div>

      <div className="payments-toolbar">
        <input
          type="text"
          placeholder="Search customer, email, project or unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ position: "relative", zIndex: 50 }}>
          <LargePaymentDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "All", label: "All Status" },
              { value: "Pending", label: "Pending" },
              { value: "Partial", label: "Partial" },
              { value: "Paid", label: "Paid" },
              { value: "Overdue", label: "Overdue" },
            ]}
            placeholder="All Status"
          />
        </div>
      </div>

      <div className="payments-table-card">
        {loading ? (
          <div className="loading-state">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="empty-state">
            <h3>No payment records found</h3>
            <p>Click <strong>+ Add Payment</strong> to create the first payment record.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Project / Unit</th>
                  <th>Photo</th>
                  <th>Document</th>
                  <th>Total Deal</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Installment</th>
                  <th>Progress</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  <th>Receipt</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => {
                  const photo = getUnitPhoto(payment);
                  const documentUrl = getDocumentUrl(payment);

                  return (
                    <tr key={payment.id}>
                      <td>
                        <div className="customer-name">
                          {payment.customer_name || "Not assigned"}
                        </div>
                        {payment.customer_email && (
                          <div className="customer-email">
                            {payment.customer_email}
                          </div>
                        )}
                      </td>

                      <td className="property-cell">
                        <div className="property-name">
                          {getProjectName(payment)}
                        </div>
                        <span className="unit-badge">
                          {getUnitNumber(payment)}
                        </span>
                      </td>

                      <td>
                        {photo ? (
                          <button
                            className="property-photo-btn"
                            type="button"
                            onClick={() =>
                              openPreview(photo, `${getProjectName(payment)} - ${getUnitNumber(payment)}`)
                            }
                          >
                            <img src={photo} alt="Property" />
                            Open
                          </button>
                        ) : (
                          <span style={{ color: "#94A3B8" }}>No photo</span>
                        )}
                      </td>

                      <td>
                        {documentUrl ? (
                          <button
                            className="document-btn"
                            type="button"
                            onClick={() =>
                              openPreview(
                                documentUrl,
                                `${getProjectName(payment)} - Document`
                              )
                            }
                          >
                            📄 View
                          </button>
                        ) : (
                          <span style={{ color: "#94A3B8" }}>No document</span>
                        )}
                      </td>

                      <td>{formatCurrency(payment.total_amount)}</td>
                      <td>{formatCurrency(payment.paid_amount)}</td>
                      <td>{formatCurrency(payment.remaining_amount)}</td>
                      <td>{formatCurrency(payment.installment_amount)}</td>

                      <td>
                        {payment.paid_installments || 0} /{" "}
                        {payment.total_installments || 0}
                      </td>

                      <td>{formatDate(payment.next_due_date)}</td>

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            payment.payment_status
                          )}`}
                        >
                          {payment.payment_status || "Pending"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="action-btn receipt-btn"
                          onClick={() => openReceipt(payment)}
                        >
                          📁 Open Customer File
                        </button>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => openEditForm(payment)}
                          >
                            Edit
                          </button>

                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(payment.id)}
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

      {showForm && (
        <div className="payment-modal-overlay" onClick={closeForm}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Payment" : "Add Payment"}</h3>

              <button className="close-modal" onClick={closeForm}>
                ×
              </button>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Customer Login ID <span className="required">*</span></label>
                  <LargePaymentDropdown
                    value={customers.find((c) => String(c.profile_id || c.id) === String(form.customer_id))?.customer_login_id || ""}
                    onChange={handleCustomerChange}
                    placeholder={customersLoading ? "Loading customers..." : "Select Customer Login ID"}
                    options={customers.map((customer) => ({ value: customer.customer_login_id || String(customer.profile_id || customer.id), label: `${customer.customer_login_id || "No Login ID"} — ${customer.name || "Unnamed Customer"}` }))}
                  />
                  {customerLookupLoading && <div className="lookup-note">Customer data fetch ho raha hai...</div>}
                </div>

                <div className="form-group full-width">
                  <label>Property / Unit <span className="required">*</span></label>
                  <div className="payment-readonly-field">{selectedCustomerDetails?.unit ? `${selectedCustomerDetails.unit.unit_number || "Unit"}${selectedCustomerDetails.unit.property_type ? ` - ${selectedCustomerDetails.unit.property_type}` : ""}` : selectedCustomerDetails?.customer?.unit_number || "Customer property/unit not found"}</div>
                  <input type="hidden" name="unit_id" value={form.unit_id} />
                </div>

                <div className="form-group">
                  <label>Total Deal Amount</label>
                  <div className="payment-amount-display">{formatCurrency(form.total_amount || selectedCustomerDetails?.totalDeal || 0)}</div>
                </div>

                <div className="form-group">
                  <label>Already Paid</label>
                  <div className="payment-amount-display">{formatCurrency(selectedCustomerDetails?.alreadyPaid || 0)}</div>
                </div>

                <div className="form-group">
                  <label>Current Payment Amount (₹) <span className="required">*</span></label>
                  <input className="payment-large-input" type="number" name="paid_amount" value={form.paid_amount} onChange={handleChange} min="0" step="0.01" required />
                </div>

                <div className="form-group">
                  <label>Remaining Amount</label>
                  <div className="payment-amount-display remaining">{formatCurrency(form.remaining_amount || 0)}</div>
                </div>

                <div className="form-group">
                  <label>Installment Amount (₹)</label>
                  <input className="payment-large-input" type="number" name="installment_amount" value={form.installment_amount} onChange={handleChange} min="0" step="0.01" readOnly={receiptHistory.length > 0} placeholder={receiptHistory.length ? "From first receipt" : "Enter first installment amount"} />
                </div>

                <div className="form-group">
                  <label>Total Installments</label>
                  <input className="payment-large-input" type="number" name="total_installments" value={form.total_installments} onChange={handleChange} min="1" step="1" readOnly={receiptHistory.length > 0} placeholder={receiptHistory.length ? "From first receipt" : "Enter total installments"} />
                </div>

                <div className="form-group">
                  <label>Paid Installments (Auto)</label>
                  <div className="payment-amount-display">{form.paid_installments || 0}{form.total_installments ? ` / ${form.total_installments}` : ""}</div>
                </div>

                <div className="form-group">
                  <label>Next Due Date</label>
                  <LargeDatePicker value={form.next_due_date} onChange={(value) => handleChange({ target: { name: "next_due_date", value } })} />
                </div>

                <div className="form-group">
                  <label>Payment Status</label>
                  <LargePaymentDropdown
                    value={form.payment_status}
                    onChange={(value) => setForm((previous) => ({ ...previous, payment_status: value }))}
                    options={[{ value: "Pending", label: "Pending" }, { value: "Partial", label: "Partial" }, { value: "Paid", label: "Paid" }, { value: "Overdue", label: "Overdue" }]}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Receipt / Reference</label>
                  <input className="payment-large-input" type="text" name="receipt" value={form.receipt} onChange={handleChange} placeholder="Receipt number or reference" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>

                <button type="submit" className="save-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Payment"
                    : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && (
        <div
          className="preview-overlay"
          onClick={() => setShowPreview(false)}
        >
          <div className="preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <strong>{previewTitle}</strong>

              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="document-btn"
                  style={{ textDecoration: "none" }}
                >
                  Open in New Tab
                </a>

                <button
                  type="button"
                  className="close-modal"
                  onClick={() => setShowPreview(false)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="preview-content">
              {/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(previewUrl) ? (
                <img src={previewUrl} alt={previewTitle} />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewTitle}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showReceipt && selectedReceipt && (
        <div
          className="receipt-overlay"
          onClick={() => setShowReceipt(false)}
        >
          <div className="receipt-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-actions">
              <button
                type="button"
                className="action-btn receipt-btn"
                onClick={printReceipt}
              >
                🖨 Print / Save Customer File
              </button>

              <button
                type="button"
                className="action-btn delete-btn"
                onClick={() => setShowReceipt(false)}
              >
                ✕ Close
              </button>
            </div>

            <div className="receipt-paper srs-payment-receipt-print">
              <div className="receipt-header">
                <div className="receipt-brand">
                  <img
                    src={LOGO_URL}
                    alt="SRS Burooj Logo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <div>
                    <div className="receipt-brand-name">SRS BUROOJ</div>
                    <div className="receipt-brand-sub">
                      REAL ESTATE MANAGEMENT
                    </div>
                  </div>
                </div>

                <div className="receipt-title">
                  <h1>CUSTOMER PAYMENT FILE</h1>

                  <div>
                    <strong>Receipt No:</strong>{" "}
                    {getReceiptNumber(selectedReceipt)}
                  </div>

                  <div>
                    <strong>Receipt Date:</strong>{" "}
                    {formatDate(
                      selectedReceipt.payment_date ||
                        selectedReceipt.created_at
                    )}
                  </div>
                </div>
              </div>

              <div className="receipt-grid">
                <div>
                  <div className="receipt-label">CUSTOMER NAME</div>
                  <div className="receipt-value">
                    {selectedReceipt.customer_name || "-"}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">CUSTOMER LOGIN ID</div>
                  <div className="receipt-value">
                    {selectedReceipt.customer_login_id || "-"}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">EMAIL</div>
                  <div className="receipt-value">
                    {selectedReceipt.customer_email || "-"}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">PHONE</div>
                  <div className="receipt-value">
                    {selectedReceipt.customer_phone || "-"}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">PROJECT</div>
                  <div className="receipt-value">
                    {getProjectName(selectedReceipt)}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">UNIT</div>
                  <div className="receipt-value">
                    {getUnitNumber(selectedReceipt)}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">PAYMENT METHOD</div>
                  <div className="receipt-value">
                    {selectedReceipt.payment_method ||
                      selectedReceipt.payment_mode ||
                      "-"}
                  </div>
                </div>

                <div>
                  <div className="receipt-label">TRANSACTION REFERENCE</div>
                  <div className="receipt-value">
                    {selectedReceipt.transaction_reference || "-"}
                  </div>
                </div>
              </div>

              <div className="receipt-amount">
                <div className="receipt-amount-row">
                  <span>Payment Amount</span>
                  <strong className="receipt-main-amount">
                    {formatCurrency(
                      selectedReceipt.paid_amount ||
                        selectedReceipt.payment_amount ||
                        selectedReceipt.amount
                    )}
                  </strong>
                </div>

                <div className="receipt-amount-row">
                  <span>Total Property / Deal Value</span>
                  <strong>{formatCurrency(receiptTotal)}</strong>
                </div>

                <div className="receipt-amount-row">
                  <span>Total Paid</span>
                  <strong>{formatCurrency(receiptPaid)}</strong>
                </div>

                <div className="receipt-amount-row">
                  <span>Remaining Balance</span>
                  <strong>{formatCurrency(receiptRemaining)}</strong>
                </div>

                <div className="receipt-amount-row">
                  <span>Payment Status</span>
                  <strong>{selectedReceipt.payment_status || "Pending"}</strong>
                </div>
              </div>

              <div className="receipt-history-section">
                <h3>Complete Installment / Payment History</h3>
                <table className="receipt-history-table">
                  <thead><tr><th>#</th><th>Date</th><th>Paid Amount</th><th>Total Paid</th><th>Remaining</th><th>Status</th></tr></thead>
                  <tbody>
                    {receiptHistory.map((row, index) => (
                      <tr key={row.id || index}>
                        <td>{index + 1}</td>
                        <td>{formatDate(row.payment_date || row.created_at)}</td>
                        <td>{formatCurrency(getReceiptInstallmentAmount(row, index, receiptHistory))}</td>
                        <td>{formatCurrency(row.paid_amount)}</td>
                        <td>{formatCurrency(row.remaining_amount)}</td>
                        <td>{row.payment_status || "Partial"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 22 }}>
                <div className="receipt-label">PAYMENT NOTE</div>
                <div style={{ minHeight: 55, borderBottom: "1px solid #DDD", padding: "8px 0" }}>
                  {selectedReceipt.payment_note ||
                    selectedReceipt.receipt_note ||
                    selectedReceipt.notes ||
                    "Payment received and recorded in the SRS Burooj system."}
                </div>
              </div>

              <div className="receipt-footer">
                <div>
                  <strong>Thank you for your payment.</strong>
                  <div style={{ marginTop: 5 }}>
                    This receipt is system generated and is subject to verification.
                  </div>
                </div>

                <div className="signature">
                  Authorized Signatory
                  <br />
                  <strong>SRS BUROOJ</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;
