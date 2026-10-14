import { adminFetch } from "./adminApi";
import { useEffect, useState } from "react";


function LargeCustomDropdown({
  name,
  value,
  onChange,
  options = [],
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  const choose = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
    setOpen(false);
  };

  return (
    <div className="srs-large-dropdown">
      <button
        type="button"
        className={`srs-large-dropdown-button ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? "selected" : "placeholder"}>
          {selected?.label || placeholder}
        </span>
        <span className="srs-large-dropdown-arrow">▾</span>
      </button>

      {open && (
        <div className="srs-large-dropdown-menu">
          {options.map((option) => (
            <button
              type="button"
              key={String(option.value)}
              className={`srs-large-dropdown-option ${
                option.value === value ? "active" : ""
              }`}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  // CUSTOMER LOGIN ID
  const [customerLoginId, setCustomerLoginId] = useState("");

  // PURCHASE / ALLOTMENT DOCUMENT
  const [selectedPurchaseCustomer, setSelectedPurchaseCustomer] =
    useState(null);

  // =====================================================
  // PAYMENT HISTORY
  // =====================================================

  const [showPaymentHistory, setShowPaymentHistory] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [paymentHistory, setPaymentHistory] = useState([]);

  const [paymentForm, setPaymentForm] = useState({
    payment_date: "",
    amount: "",
    payment_mode: "",
    transaction_reference: "",
    receipt_number: "",
    notes: "",
  });

  // =====================================================
  // INSTALLMENTS
  // =====================================================

  const [showInstallments, setShowInstallments] =
    useState(false);

  const [installments, setInstallments] = useState([]);

  const [installmentEditingId, setInstallmentEditingId] =
    useState(null);

  const [installmentForm, setInstallmentForm] = useState({
    installment_number: "",
    installment_amount: "",
    due_date: "",
    status: "Pending",
    paid_amount: "",
    paid_date: "",
    payment_mode: "",
    transaction_reference: "",
    receipt_number: "",
    notes: "",
  });

  // =====================================================
  // MAIN CUSTOMER FORM
  // =====================================================

  const emptyForm = {
    // CUSTOMER
    name: "",
    email: "",
    phone: "",
    alternate_phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    customer_status: "Active",
    priority_customer: false,
    notes: "",

    // PROPERTY
    project_name: "",
    unit_number: "",
    unit_type: "",
    carpet_area: "",
    rate_per_sqft: "",
    purchase_date: "",

    // PROPERTY COST
    base_value: "",
    parking_charges: "",
    floor_premium: "",
    club_charges: "",
    other_charges: "",
    agreement_value: "",
    gst: "",
    stamp_duty: "",
    registration_charges: "",
    maintenance_charges: "",
    sinking_fund: "",
    corpus_fund: "",
    estimated_total: "",

    // PAYMENT SUMMARY
    property_value: "",
    paid_amount: "",
    remaining_amount: "",

  };

  const [form, setForm] = useState(emptyForm);

  // =====================================================
  // LOAD CUSTOMERS
  // =====================================================

  const loadCustomers = async () => {
    try {
      const response = await adminFetch(
        "http://localhost:5000/api/customers"
      );

      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        alert(
          data.message ||
            "Customers load nahi ho rahe."
        );
      }
    } catch (error) {
      console.error(
        "Error loading customers:",
        error
      );

      alert("Server se connection nahi ho raha.");
    }
  };

  // =====================================================
  // LOAD PROJECTS
  // =====================================================

  const loadProjects = async () => {
    try {
      const response = await adminFetch(
        "http://localhost:5000/api/projects"
      );

      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error(
        "Error loading projects:",
        error
      );
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadCustomers();
    loadProjects();
  }, []);

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  const today = new Date().toISOString().slice(0, 10);

  const isValidEmail = (value) => {
    if (!value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value.trim());
  };

  const digitsOnly = (value, maxLength) =>
    value.replace(/\D/g, "").slice(0, maxLength);

  const formatINR = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (Number.isNaN(number)) return "";
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(number);
  };

  // =====================================================
  // AUTOMATIC PROPERTY COST CALCULATION
  // =====================================================

  const calculatePropertyTotals = (source) => {
    const carpetArea = Number(source.carpet_area) || 0;
    const ratePerSqft = Number(source.rate_per_sqft) || 0;

    const baseValue = carpetArea * ratePerSqft;

    const agreementValue =
      baseValue +
      (Number(source.parking_charges) || 0) +
      (Number(source.floor_premium) || 0) +
      (Number(source.club_charges) || 0) +
      (Number(source.other_charges) || 0);

    const estimatedTotal =
      agreementValue +
      (Number(source.gst) || 0) +
      (Number(source.stamp_duty) || 0) +
      (Number(source.registration_charges) || 0) +
      (Number(source.maintenance_charges) || 0) +
      (Number(source.sinking_fund) || 0) +
      (Number(source.corpus_fund) || 0);

    const paidAmount = Math.max(Number(source.paid_amount) || 0, 0);
    const remainingAmount = Math.max(estimatedTotal - paidAmount, 0);

    return {
      base_value: baseValue ? String(baseValue) : "",
      agreement_value: agreementValue ? String(agreementValue) : "",
      estimated_total: estimatedTotal ? String(estimatedTotal) : "",
      property_value: estimatedTotal ? String(estimatedTotal) : "",
      remaining_amount: remainingAmount ? String(remainingAmount) : "0",
    };
  };

  // =====================================================
  // MAIN INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let nextValue = type === "checkbox" ? checked : value;

    if (["phone", "alternate_phone"].includes(name)) {
      nextValue = digitsOnly(value, 10);
    }

    if (name === "pincode") {
      nextValue = digitsOnly(value, 6);
    }

    const nextForm = {
      ...form,
      [name]: nextValue,
    };

    const costFields = [
      "carpet_area",
      "rate_per_sqft",
      "parking_charges",
      "floor_premium",
      "club_charges",
      "other_charges",
      "gst",
      "stamp_duty",
      "registration_charges",
      "maintenance_charges",
      "sinking_fund",
      "corpus_fund",
      "paid_amount",
    ];

    if (costFields.includes(name)) {
      Object.assign(nextForm, calculatePropertyTotals(nextForm));
    }

    setForm(nextForm);
  };

  // =====================================================
  // COPY LOGIN ID
  // =====================================================

  const copyCustomerLoginId = async (id) => {
    if (!id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(id);

      alert(
        "Customer Login ID copied!"
      );
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );

      alert("ID copy nahi ho saki.");
    }
  };

  // =====================================================
  // OPEN ADD FORM
  // =====================================================

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCustomerLoginId("");

    setShowForm(true);
  };

  // =====================================================
  // CLOSE FORM
  // =====================================================

  const closeForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCustomerLoginId("");

    setShowForm(false);
  };

  // =====================================================
  // SAVE CUSTOMER
  // =====================================================

  const saveCustomer = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Customer name is required.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Customer phone is required.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      alert("Phone number must contain exactly 10 digits.");
      return;
    }

    if (form.alternate_phone && !/^\d{10}$/.test(form.alternate_phone)) {
      alert("Alternate phone number must contain exactly 10 digits.");
      return;
    }

    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      alert("Pincode must contain exactly 6 digits.");
      return;
    }

    if (!isValidEmail(form.email)) {
      alert("Please enter a valid email address, for example name@gmail.com.");
      return;
    }

    if (form.purchase_date && form.purchase_date > today) {
      alert("Purchase date future ki nahi ho sakti.");
      return;
    }

    try {
      const url = editingId
        ? `http://localhost:5000/api/customers/${editingId}`
        : "http://localhost:5000/api/customers";

      const response = await adminFetch(url, {
        method: editingId
          ? "PUT"
          : "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Customer save nahi hua."
        );

        return;
      }

      if (data.customerLoginId) {
        setCustomerLoginId(
          data.customerLoginId
        );
      }

      if (!editingId) {
        if (data.customerLoginId) {
          alert(
            `Customer added successfully!\n\nCustomer Login ID: ${data.customerLoginId}`
          );
        } else {
          alert(
            "Customer added successfully!"
          );
        }

        if (data.customerId) {
          setEditingId(
            data.customerId
          );
        }

        await loadCustomers();

        return;
      }

      alert(
        "Customer updated successfully!"
      );

      closeForm();

      await loadCustomers();
    } catch (error) {
      console.error(
        "Error saving customer:",
        error
      );

      alert(
        "Server se connection nahi ho raha."
      );
    }
  };

  // =====================================================
  // EDIT CUSTOMER
  // =====================================================

  const editCustomer = (customer) => {
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      alternate_phone:
        customer.alternate_phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pincode: customer.pincode || "",

      customer_status:
        customer.customer_status ||
        "Active",

      priority_customer:
        customer.priority_customer
          ? true
          : false,

      notes: customer.notes || "",

      project_name:
        customer.project_name || "",

      unit_number:
        customer.unit_number || "",

      unit_type:
        customer.unit_type || "",

      carpet_area:
        customer.carpet_area || "",

      rate_per_sqft:
        customer.rate_per_sqft || "",

      purchase_date:
        customer.purchase_date
          ? String(
              customer.purchase_date
            ).substring(0, 10)
          : "",

      base_value:
        customer.base_value || "",

      parking_charges:
        customer.parking_charges || "",

      floor_premium:
        customer.floor_premium || "",

      club_charges:
        customer.club_charges || "",

      other_charges:
        customer.other_charges || "",

      agreement_value:
        customer.agreement_value || "",

      gst: customer.gst || "",

      stamp_duty:
        customer.stamp_duty || "",

      registration_charges:
        customer.registration_charges || "",

      maintenance_charges:
        customer.maintenance_charges || "",

      sinking_fund:
        customer.sinking_fund || "",

      corpus_fund:
        customer.corpus_fund || "",

      estimated_total:
        customer.estimated_total || "",

      property_value:
        customer.property_value || "",

      paid_amount:
        customer.paid_amount || "",

      remaining_amount:
        customer.remaining_amount || "",

    });

    setForm((current) => ({
      ...current,
      ...calculatePropertyTotals({
        carpet_area: customer.carpet_area || "",
        rate_per_sqft: customer.rate_per_sqft || "",
        parking_charges: customer.parking_charges || "",
        floor_premium: customer.floor_premium || "",
        club_charges: customer.club_charges || "",
        other_charges: customer.other_charges || "",
        gst: customer.gst || "",
        stamp_duty: customer.stamp_duty || "",
        registration_charges: customer.registration_charges || "",
        maintenance_charges: customer.maintenance_charges || "",
        sinking_fund: customer.sinking_fund || "",
        corpus_fund: customer.corpus_fund || "",
        paid_amount: customer.paid_amount || "",
      }),
    }));

    setCustomerLoginId(
      customer.customer_login_id || ""
    );

    setEditingId(
      customer.profile_id
    );

    setShowForm(true);
  };

  // =====================================================
  // PURCHASE / ALLOTMENT DOCUMENT
  // =====================================================

  const openPurchaseDocument = (customer) => {
    setSelectedPurchaseCustomer(customer);

    // Isolate the purchase document while printing so the dashboard/sidebar
    // cannot bleed into the A4 printout.
    document.body.classList.add("srs-print-purchase");

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        document.body.classList.remove("srs-print-purchase");
      }, 500);
    }, 300);
  };

  // DOWNLOAD CUSTOMER DOCUMENT
  const downloadCustomerDocument = (customer) => {
    if (!customer) return;

    const esc = (value) =>
      String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const rows = [
      ["Base Value", customer.base_value],
      ["Parking Charges", customer.parking_charges],
      ["Floor Premium", customer.floor_premium],
      ["Club Charges", customer.club_charges],
      ["Other Charges", customer.other_charges],
      ["Agreement Value", customer.agreement_value],
      ["GST", customer.gst],
      ["Stamp Duty", customer.stamp_duty],
      ["Registration Charges", customer.registration_charges],
      ["Maintenance Charges", customer.maintenance_charges],
      ["Sinking Fund", customer.sinking_fund],
      ["Corpus Fund", customer.corpus_fund],
    ];

    const money = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "0";
      return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    };

    const costRows = rows.map(([label, value]) =>
      `<tr><td>${esc(label)}</td><td class="money">₹${money(value)}</td></tr>`
    ).join("");

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>SRS Burooj - ${esc(customer.name || "Customer")}</title>
<style>
@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#172033;margin:0;font-size:13px;line-height:1.5}h1,h2,h3{margin:0}.header{border-bottom:3px solid #0b5ed7;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between}.brand{font-size:22px;font-weight:800;color:#0b5ed7}.muted{color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;border:1px solid #d8e4f5;padding:14px;border-radius:7px}.section{margin-top:20px;color:#0b5ed7;border-bottom:1px solid #b9d2f3;padding-bottom:6px}table{width:100%;border-collapse:collapse}td{border:1px solid #d8e4f5;padding:8px}.money{text-align:right}.total{font-weight:800;background:#eef5ff}.summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}.box{border:1px solid #d8e4f5;padding:10px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:65px}.sign div{border-top:1px solid #333;padding-top:7px;text-align:center}.footer{text-align:center;margin-top:30px;font-size:10px;color:#667085}
</style></head><body>
<div class="header"><div><div class="brand">SRS BUROOJ</div><div class="muted">REAL ESTATE MANAGEMENT</div></div><div><strong>PURCHASE / ALLOTMENT DOCUMENT</strong><br>Customer Copy</div></div>
<h2 style="text-align:center;margin-bottom:18px">Property Purchase &amp; Allotment Details</h2>
<div class="grid">
<div><strong>Customer Name:</strong> ${esc(customer.name)}</div><div><strong>Customer Login ID:</strong> ${esc(customer.customer_login_id)}</div>
<div><strong>Email:</strong> ${esc(customer.email)}</div><div><strong>Phone:</strong> ${esc(customer.phone)}</div>
<div><strong>Project:</strong> ${esc(customer.project_name)}</div><div><strong>Unit No.:</strong> ${esc(customer.unit_number)}</div>
<div><strong>Unit Type:</strong> ${esc(customer.unit_type)}</div><div><strong>Carpet Area:</strong> ${esc(customer.carpet_area)} sq ft</div>
<div><strong>Rate / Sq.ft.:</strong> ₹${money(customer.rate_per_sqft)}</div><div><strong>Purchase Date:</strong> ${esc(customer.purchase_date ? String(customer.purchase_date).substring(0,10) : "—")}</div>
</div>
<h3 class="section">Cost Sheet</h3><table><tbody>${costRows}<tr class="total"><td>Estimated / Total Property Value</td><td class="money">₹${money(customer.estimated_total || customer.property_value)}</td></tr></tbody></table>
<h3 class="section">Payment Summary</h3><div class="summary"><div class="box"><strong>Total</strong><br>₹${money(customer.property_value || customer.estimated_total)}</div><div class="box"><strong>Paid</strong><br>₹${money(customer.paid_amount)}</div><div class="box"><strong>Remaining</strong><br>₹${money(customer.remaining_amount)}</div></div>
<div style="margin-top:25px"><strong>Declaration:</strong> This document records the property purchase/allotment details maintained in the SRS Burooj system.</div>
<div class="sign"><div>Customer Signature</div><div>Authorized Signatory — SRS Burooj</div></div>
<div class="footer">Generated from SRS Burooj Real Estate Management System</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = String(customer.name || "Customer").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    link.href = url;
    link.download = `SRS-Burooj-Customer-${safeName || "Document"}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // DELETE CUSTOMER
  // =====================================================

  const deleteCustomer = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this customer?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await adminFetch(
        `http://localhost:5000/api/customers/${id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (data.success) {
        alert(
          "Customer deleted successfully!"
        );

        await loadCustomers();
      } else {
        alert(
          data.message ||
            "Failed to delete customer."
        );
      }
    } catch (error) {
      console.error(
        "Error deleting customer:",
        error
      );

      alert(
        "Server se connection nahi ho raha."
      );
    }
  };

  // =====================================================
  // CUSTOMER PROPERTY ID
  // =====================================================

  const getCustomerPropertyId = (
    customer
  ) => {
    return (
      customer.customer_property_id ||
      customer.property_id ||
      customer.customerPropertyId ||
      null
    );
  };

  // =====================================================
  // PAYMENT HISTORY
  // =====================================================

  const loadPaymentHistory = async (
    customer
  ) => {
    const profileId =
      customer?.profile_id ||
      customer?.customer_id ||
      null;

    if (!profileId) {
      alert(
        "Customer Profile ID nahi mila."
      );
      return;
    }

    try {
      const response =
        await adminFetch(
          "http://localhost:5000/api/payments"
        );

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Payment history load nahi hui."
        );
        return;
      }

      const customerPayments =
        (data.payments || []).filter(
          (payment) =>
            Number(payment.customer_id) ===
            Number(profileId)
        );

      setPaymentHistory(
        customerPayments
      );
    } catch (error) {
      console.error(
        "Payment history error:",
        error
      );

      alert(
        "Payment history load nahi hui."
      );
    }
  };

  const openPaymentHistory = async (
    customer
  ) => {
    setSelectedCustomer(
      customer
    );

    setPaymentForm({
      payment_date: "",
      amount: "",
      payment_mode: "",
      transaction_reference: "",
      receipt_number: "",
      notes: "",
    });

    setShowPaymentHistory(true);

    await loadPaymentHistory(
      customer
    );
  };

  const handlePaymentChange = (
    e
  ) => {
    const {
      name,
      value,
    } = e.target;

    let nextValue = value;

    if (name === "amount") {
      nextValue = value.replace(/[^0-9.]/g, "");
    }

    setPaymentForm({
      ...paymentForm,
      [name]: nextValue,
    });
  };

  const addPayment = async (
    e
  ) => {
    e.preventDefault();

    const profileId =
      selectedCustomer?.profile_id ||
      selectedCustomer?.customer_id ||
      null;

    if (!profileId) {
      alert(
        "Customer Profile ID nahi mila."
      );
      return;
    }

    if (
      !paymentForm.amount ||
      Number(paymentForm.amount) <= 0
    ) {
      alert(
        "Valid payment amount enter karein."
      );
      return;
    }

    const currentPayment =
      paymentHistory[0];

    if (!currentPayment) {
      alert(
        "Is customer ke liye main Payments section mein payment record pehle create karein."
      );
      return;
    }

    const newPaidAmount =
      Number(currentPayment.paid_amount || 0) +
      Number(paymentForm.amount);

    const totalAmount =
      Number(currentPayment.total_amount || 0);

    if (newPaidAmount > totalAmount) {
      alert(
        "Paid amount total deal amount se zyada nahi ho sakta."
      );
      return;
    }

    try {
      const response =
        await adminFetch(
          `http://localhost:5000/api/payments/${currentPayment.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customer_id:
                Number(profileId),
              unit_id:
                currentPayment.unit_id,
              total_amount:
                totalAmount,
              paid_amount:
                newPaidAmount,
              remaining_amount:
                totalAmount -
                newPaidAmount,
              installment_amount:
                currentPayment.installment_amount ||
                0,
              total_installments:
                currentPayment.total_installments ||
                0,
              paid_installments:
                currentPayment.paid_installments ||
                0,
              next_due_date:
                currentPayment.next_due_date ||
                null,
              payment_status:
                newPaidAmount >= totalAmount
                  ? "Paid"
                  : newPaidAmount > 0
                  ? "Partial"
                  : "Pending",
              receipt:
                paymentForm.receipt_number ||
                currentPayment.receipt ||
                "",
            }),
          }
        );

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Payment update nahi hui."
        );
        return;
      }

      alert(
        "Payment summary updated successfully!"
      );

      setPaymentForm({
        payment_date: "",
        amount: "",
        payment_mode: "",
        transaction_reference: "",
        receipt_number: "",
        notes: "",
      });

      await loadPaymentHistory(
        selectedCustomer
      );

      await loadCustomers();
    } catch (error) {
      console.error(
        "Payment update error:",
        error
      );

      alert(
        "Payment update nahi ho saki."
      );
    }
  };

  const deletePayment = async (
    paymentId
  ) => {
    alert(
      "Main payment record ko Customer section se delete nahi karein. Payments & Installments section se manage karein."
    );
  };

  // =====================================================
  // INSTALLMENTS
  // =====================================================

  const loadInstallments = async (
    customer
  ) => {
    const propertyId =
      getCustomerPropertyId(
        customer
      );

    if (!propertyId) {
      alert(
        "Customer Property ID nahi mila."
      );
      return;
    }

    try {
      const response =
        await adminFetch(
          `http://localhost:5000/api/customer-installments/${propertyId}`
        );

      const data =
        await response.json();

      if (data.success) {
        setInstallments(
          data.installments || []
        );
      } else {
        alert(
          data.message ||
            "Installments load nahi hui."
        );
      }
    } catch (error) {
      console.error(
        "Installment load error:",
        error
      );

      alert(
        "Installments load nahi hui."
      );
    }
  };

  const openInstallments = async (
    customer
  ) => {
    setSelectedCustomer(
      customer
    );

    setInstallmentEditingId(
      null
    );

    setInstallmentForm({
      installment_number: "",
      installment_amount: "",
      due_date: "",
      status: "Pending",
      paid_amount: "",
      paid_date: "",
      payment_mode: "",
      transaction_reference: "",
      receipt_number: "",
      notes: "",
    });

    setShowInstallments(true);

    await loadInstallments(
      customer
    );
  };

  const handleInstallmentChange = (
    e
  ) => {
    const {
      name,
      value,
    } = e.target;

    let nextValue = value;

    if (["installment_amount", "paid_amount"].includes(name)) {
      nextValue = value.replace(/[^0-9.]/g, "");
    }

    setInstallmentForm({
      ...installmentForm,
      [name]: nextValue,
    });
  };

  const saveInstallment = async (
    e
  ) => {
    e.preventDefault();

    const propertyId =
      getCustomerPropertyId(
        selectedCustomer
      );

    if (!propertyId) {
      alert(
        "Customer Property ID nahi mila."
      );
      return;
    }

    if (
      !installmentForm
        .installment_number
    ) {
      alert(
        "Installment number enter karein."
      );
      return;
    }

    if (
      !installmentForm
        .installment_amount
    ) {
      alert(
        "Installment amount enter karein."
      );
      return;
    }

    if (
      !installmentForm.due_date
    ) {
      alert(
        "Due date select karein."
      );
      return;
    }

    // Due dates may be future because installments are scheduled in advance.
    // Historical paid dates are also allowed for old transactions.
    if (installmentForm.paid_date && installmentForm.paid_date > today) {
      alert("Paid date future ki nahi ho sakti.");
      return;
    }

    try {
      const url =
        installmentEditingId
          ? `http://localhost:5000/api/customer-installments/${installmentEditingId}`
          : "http://localhost:5000/api/customer-installments";

      const response =
        await adminFetch(url, {
          method:
            installmentEditingId
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            customer_property_id:
              propertyId,

            ...installmentForm,
          }),
        });

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Installment save nahi hui."
        );
        return;
      }

      alert(
        installmentEditingId
          ? "Installment updated successfully!"
          : "Installment added successfully!"
      );

      setInstallmentEditingId(
        null
      );

      setInstallmentForm({
        installment_number: "",
        installment_amount: "",
        due_date: "",
        status: "Pending",
        paid_amount: "",
        paid_date: "",
        payment_mode: "",
        transaction_reference: "",
        receipt_number: "",
        notes: "",
      });

      await loadInstallments(
        selectedCustomer
      );
    } catch (error) {
      console.error(
        "Installment save error:",
        error
      );

      alert(
        "Installment save nahi ho saki."
      );
    }
  };

  const editInstallment = (
    installment
  ) => {
    setInstallmentEditingId(
      installment.id
    );

    setInstallmentForm({
      installment_number:
        installment.installment_number ||
        "",

      installment_amount:
        installment.installment_amount ||
        "",

      due_date:
        installment.due_date
          ? String(
              installment.due_date
            ).substring(0, 10)
          : "",

      status:
        installment.status ||
        "Pending",

      paid_amount:
        installment.paid_amount ||
        "",

      paid_date:
        installment.paid_date
          ? String(
              installment.paid_date
            ).substring(0, 10)
          : "",

      payment_mode:
        installment.payment_mode ||
        "",

      transaction_reference:
        installment.transaction_reference ||
        "",

      receipt_number:
        installment.receipt_number ||
        "",

      notes:
        installment.notes || "",
    });
  };

  const deleteInstallment = async (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Delete this installment?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response =
        await adminFetch(
          `http://localhost:5000/api/customer-installments/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Installment delete nahi hui."
        );
        return;
      }

      alert(
        "Installment deleted successfully."
      );

      await loadInstallments(
        selectedCustomer
      );
    } catch (error) {
      console.error(
        "Delete installment error:",
        error
      );

      alert(
        "Installment delete nahi hui."
      );
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredCustomers =
    customers.filter(
      (customer) => {
        const text =
          search.toLowerCase();

        return (
          customer.name
            ?.toLowerCase()
            .includes(text) ||

          customer.phone
            ?.toLowerCase()
            .includes(text) ||

          customer.email
            ?.toLowerCase()
            .includes(text) ||

          customer.project_name
            ?.toLowerCase()
            .includes(text) ||

          customer.unit_number
            ?.toLowerCase()
            .includes(text) ||

          customer.city
            ?.toLowerCase()
            .includes(text) ||

          customer.customer_login_id
            ?.toLowerCase()
            .includes(text)
        );
      }
    );

  // =====================================================
  // STYLES
  // =====================================================

  const inputStyle = {
    padding: "13px 14px",
    width: "100%",
    boxSizing: "border-box",
    minHeight: "48px",
    marginBottom: "14px",
    border: "1px solid #9fc5f8",
    borderRadius: "8px",
    backgroundColor: "#fff",
    outline: "none",
    fontSize: "16px",
    color: "#172033",
  };

  const sectionStyle = {
    marginTop: "22px",
    padding: "20px",
    border: "1px solid #cfe0f7",
    borderRadius: "12px",
    backgroundColor: "#fff",
  };

  const primaryButton = {
    padding: "12px 20px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "15px",
    minHeight: "46px",
  };

  const secondaryButton = {
    padding: "11px 17px",
    border: "1px solid #ccc",
    borderRadius: "7px",
    cursor: "pointer",
    backgroundColor: "#fff",
    whiteSpace: "nowrap",
    flexShrink: 0,
    fontWeight: "700",
    fontSize: "15px",
    minHeight: "46px",
  };

  const modalOverlay = {
    position: "fixed",
    inset: 0,
    backgroundColor:
      "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 1000,
  };

  const modal = {
    width: "100%",
    maxWidth: "1000px",
    maxHeight: "90vh",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "14px",
    padding: "25px",
    boxSizing: "border-box",
  };

  // =====================================================
  // PRINTABLE PURCHASE DOCUMENT
  // =====================================================

  const purchase = selectedPurchaseCustomer;

  const purchaseRows = purchase
    ? [
        ["Base Value", purchase.base_value],
        ["Parking Charges", purchase.parking_charges],
        ["Floor Premium", purchase.floor_premium],
        ["Club Charges", purchase.club_charges],
        ["Other Charges", purchase.other_charges],
        ["Agreement Value", purchase.agreement_value],
        ["GST", purchase.gst],
        ["Stamp Duty", purchase.stamp_duty],
        ["Registration Charges", purchase.registration_charges],
        ["Maintenance Charges", purchase.maintenance_charges],
        ["Sinking Fund", purchase.sinking_fund],
        ["Corpus Fund", purchase.corpus_fund],
      ]
    : [];

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <div
      className="srs-customer-manager-page"
      style={{
        minHeight: "100vh",
        padding: "30px",
        maxWidth: "1250px",
        margin: "0 auto",
        boxSizing: "border-box",
        backgroundColor: "#eef5ff",
      }}
    >
      <style>{`
        .srs-customer-manager-page input,
        .srs-customer-manager-page select,
        .srs-customer-manager-page textarea {
          font-size: 18px !important;
          min-height: 48px;
          color: #172033;
        }
        .srs-customer-manager-page select {
          border-color: #8db7ee;
          background-color: #fff;
        }
        .srs-customer-manager-page select option {
          color: #172033 !important;
          background: #fff !important;
          font-size: 20px !important;
          line-height: 1.6 !important;
        }
        .srs-customer-manager-page label {
          font-size: 15px;
          line-height: 1.5;
        }
        .srs-purchase-print { display: none; }

        .srs-customer-manager-page select,
        .srs-customer-manager-page option {
          color: #172033 !important;
          background: #ffffff !important;
          font-size: 20px !important;
          line-height: 1.6 !important;
        }

        .srs-customer-manager-page select:focus {
          border-color: #0b4ea2 !important;
          box-shadow: 0 0 0 2px rgba(11, 78, 162, 0.12);
        }

        .srs-customer-manager-page input,
        .srs-customer-manager-page textarea {
          color: #172033 !important;
        }

        .srs-customer-manager-page input::placeholder,
        .srs-customer-manager-page textarea::placeholder {
          color: #667085 !important;
          opacity: 1 !important;
        }


        /* LARGE CUSTOM DROPDOWNS - option text is intentionally very large */
        .srs-large-dropdown {
          position: relative;
          width: 100%;
          margin-bottom: 14px;
          z-index: 20;
        }

        .srs-large-dropdown-button {
          width: 100%;
          min-height: 62px;
          padding: 14px 18px;
          border: 2px solid #8db7ee;
          border-radius: 10px;
          background: #ffffff;
          color: #172033;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.3;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .srs-large-dropdown-button:hover,
        .srs-large-dropdown-button.open {
          border-color: #0b5ed7;
          box-shadow: 0 0 0 3px rgba(11, 94, 215, 0.12);
        }

        .srs-large-dropdown-button .placeholder {
          color: #667085;
        }

        .srs-large-dropdown-button .selected {
          color: #172033;
        }

        .srs-large-dropdown-arrow {
          font-size: 25px;
          font-weight: 900;
          color: #0b5ed7;
          margin-left: 15px;
        }

        .srs-large-dropdown-menu {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          max-height: 330px;
          overflow-y: auto;
          padding: 7px;
          background: #ffffff;
          border: 2px solid #0b5ed7;
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
          z-index: 99999;
        }

        .srs-large-dropdown-option {
          display: block;
          width: 100%;
          min-height: 58px;
          padding: 13px 16px;
          margin: 2px 0;
          border: 0;
          border-radius: 8px;
          background: #ffffff;
          color: #172033;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.35;
          text-align: left;
          cursor: pointer;
          box-sizing: border-box;
        }

        .srs-large-dropdown-option:hover,
        .srs-large-dropdown-option.active {
          background: #e8f1ff;
          color: #0b4ea2;
        }

        .srs-large-dropdown-menu::-webkit-scrollbar {
          width: 10px;
        }

        .srs-large-dropdown-menu::-webkit-scrollbar-thumb {
          background: #8db7ee;
          border-radius: 10px;
        }

        /* Larger date field + calendar icon */
        .srs-customer-manager-page input[type="date"] {
          font-size: 18px !important;
          min-height: 60px !important;
          height: 60px !important;
          padding: 12px 16px !important;
          color: #172033 !important;
          background: #ffffff !important;
          border: 1px solid #8db7ee !important;
          border-radius: 10px !important;
          box-sizing: border-box;
        }

        .srs-customer-manager-page input[type="date"]::-webkit-calendar-picker-indicator {
          width: 34px !important;
          height: 34px !important;
          padding: 2px !important;
          cursor: pointer;
          opacity: 1 !important;
          transform: scale(1.25);
        }

        .srs-customer-manager-page input[type="date"]:focus {
          outline: none !important;
          border-color: #0b4ea2 !important;
          box-shadow: 0 0 0 3px rgba(11, 78, 162, 0.14) !important;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body.srs-print-purchase * {
            visibility: hidden !important;
          }

          body.srs-print-purchase .srs-purchase-print,
          body.srs-print-purchase .srs-purchase-print * {
            visibility: visible !important;
          }

          body.srs-print-purchase .srs-purchase-print {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
            color: #111 !important;
            font-family: Arial, sans-serif !important;
            overflow: visible !important;
          }

          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="srs-purchase-print">
        {purchase && (
          <div>
            <div style={{ borderBottom: "3px solid #0b5ed7", paddingBottom: "14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <img
                  src="/srs-burooj-logo.png"
                  alt="SRS Burooj"
                  style={{
                    width: "150px",
                    height: "65px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "3px", letterSpacing: "0.5px" }}>REAL ESTATE MANAGEMENT</div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px" }}>
                <strong>PURCHASE / ALLOTMENT DOCUMENT</strong><br />
                Customer Copy
              </div>
            </div>

            <h2 style={{ textAlign: "center", margin: "10px 0 20px" }}>Property Purchase & Allotment Details</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 25px", border: "1px solid #ddd", padding: "14px", borderRadius: "6px" }}>
              <div><strong>Customer Name:</strong> {purchase.name || "—"}</div>
              <div><strong>Customer Login ID:</strong> {purchase.customer_login_id || "—"}</div>
              <div><strong>Email:</strong> {purchase.email || "—"}</div>
              <div><strong>Phone:</strong> {purchase.phone || "—"}</div>
              <div><strong>Project:</strong> {purchase.project_name || "—"}</div>
              <div><strong>Unit No.:</strong> {purchase.unit_number || "—"}</div>
              <div><strong>Unit Type:</strong> {purchase.unit_type || "—"}</div>
              <div><strong>Carpet Area:</strong> {purchase.carpet_area || "—"} sq ft</div>
              <div><strong>Rate / Sq.ft.:</strong> ₹{formatINR(purchase.rate_per_sqft) || "0"}</div>
              <div><strong>Purchase Date:</strong> {purchase.purchase_date ? String(purchase.purchase_date).substring(0, 10) : "—"}</div>
            </div>

            <h3 style={{ marginTop: "22px", borderBottom: "1px solid #ccc", paddingBottom: "7px" }}>Cost Sheet</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {purchaseRows.map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{label}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "right" }}>₹{formatINR(value) || "0"}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ border: "1px solid #ddd", padding: "9px", fontWeight: "800" }}>Estimated / Total Property Value</td>
                  <td style={{ border: "1px solid #ddd", padding: "9px", textAlign: "right", fontWeight: "800" }}>₹{formatINR(purchase.estimated_total || purchase.property_value) || "0"}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: "22px", borderBottom: "1px solid #ccc", paddingBottom: "7px" }}>Payment Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div style={{ border: "1px solid #ddd", padding: "12px" }}><strong>Total</strong><br />₹{formatINR(purchase.property_value || purchase.estimated_total) || "0"}</div>
              <div style={{ border: "1px solid #ddd", padding: "12px" }}><strong>Paid</strong><br />₹{formatINR(purchase.paid_amount) || "0"}</div>
              <div style={{ border: "1px solid #ddd", padding: "12px" }}><strong>Remaining</strong><br />₹{formatINR(purchase.remaining_amount) || "0"}</div>
            </div>

            <div style={{ marginTop: "28px", fontSize: "12px", lineHeight: "1.6", color: "#555" }}>
              <strong>Declaration:</strong> This document records the property purchase/allotment details maintained in the SRS Burooj system. Payment receipts are issued separately for individual payments.
            </div>

            <div style={{ marginTop: "55px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px" }}>
              <div style={{ borderTop: "1px solid #333", paddingTop: "8px", textAlign: "center" }}>Customer Signature</div>
              <div style={{ borderTop: "1px solid #333", paddingTop: "8px", textAlign: "center" }}>Authorized Signatory — SRS Burooj</div>
            </div>

            <div style={{ marginTop: "35px", textAlign: "center", fontSize: "10px", color: "#888" }}>Generated from SRS Burooj Real Estate Management System</div>
          </div>
        )}
      </div>

      {/* HEADER */}

      <div
        style={{
          background: "linear-gradient(135deg, #0b5ed7 0%, #164a8a 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "24px 26px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#dbeafe", display: "grid", placeItems: "center", color: "#0b5ed7", fontWeight: "900", fontSize: "16px" }}>SRS</div>
          <div>
            <h1 style={{ margin: 0 }}>Customer Management</h1>
            <p style={{ margin: "5px 0 0", color: "#e7e7e7" }}>SRS Burooj • Customers, payments & installments</p>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e5e5e5",
          borderLeft: "4px solid #0b5ed7",
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#555",
            fontSize: "16px",
            lineHeight: "1.6",
            fontWeight: "500",
          }}
        >
          Manage customer information, purchased property,
          payments and installments.
        </p>
      </div>

      <hr />

      {/* TOP BAR */}

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={openAddForm}
          style={{
            ...primaryButton,
            backgroundColor: "#0b5ed7",
            color: "#fff",
          }}
        >
          + Add Customer
        </button>

        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            padding: "13px 14px",
            width: "300px",
            minHeight: "48px",
            fontSize: "16px",
            border:
              "1px solid #ccc",
            borderRadius: "7px",
          }}
        />
      </div>

      {/* =====================================================
          CUSTOMER FORM
      ===================================================== */}

      {showForm && (
        <div
          style={{
            padding: "25px",
            marginBottom: "30px",
            border:
              "1px solid #ddd",
            borderRadius: "14px",
            backgroundColor: "#fff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.05)",
          }}
        >
          <h2>
            {editingId
              ? "Edit Customer"
              : "Add New Customer"}
          </h2>

          <form
            onSubmit={saveCustomer}
          >
            {/* CUSTOMER INFORMATION */}

            <div
              style={sectionStyle}
            >
              <h3>
                Customer Information
              </h3>

              {/* LOGIN ID */}

              <div
                style={{
                  padding: "15px",
                  marginBottom: "15px",
                  border:
                    "2px solid #e2e2e2",
                  borderRadius: "9px",
                  backgroundColor:
                    "#f8f8f8",
                }}
              >
                <label>
                  <strong>
                    Customer Login ID
                  </strong>
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems:
                      "center",
                    marginTop: "8px",
                  }}
                >
                  <input
                    type="text"
                    value={
                      customerLoginId ||
                      "Will be generated automatically after Save"
                    }
                    readOnly
                    style={{
                      ...inputStyle,
                      marginBottom: "0",
                      fontWeight:
                        "bold",
                    }}
                  />

                  {customerLoginId && (
                    <button
                      type="button"
                      onClick={() =>
                        copyCustomerLoginId(
                          customerLoginId
                        )
                      }
                      style={
                        secondaryButton
                      }
                    >
                      Copy ID
                    </button>
                  )}
                </div>

                {!customerLoginId && (
                  <p
                    style={{
                      marginBottom:
                        "0",
                      fontSize:
                        "13px",
                      color:
                        "#666",
                    }}
                  >
                    Ye ID system
                    automatically
                    generate karega.
                  </p>
                )}
              </div>

              <input
                type="text"
                name="name"
                placeholder="Customer Name *"
                value={form.name}
                onChange={handleChange}
                style={inputStyle}
                required
              />

              <input
                type="tel"
                name="phone"
                placeholder="Phone Number * (10 digits)"
                maxLength={10}
                inputMode="numeric"
                value={form.phone}
                onChange={handleChange}
                style={inputStyle}
                required
              />

              <input
                type="tel"
                name="alternate_phone"
                placeholder="Alternate Phone (10 digits)"
                maxLength={10}
                inputMode="numeric"
                value={
                  form.alternate_phone
                }
                onChange={
                  handleChange
                }
                style={inputStyle}
              />

              <input
                type="email"
                name="email"
                placeholder="Email (example@gmail.com)"
                pattern="^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$"
                value={form.email}
                onChange={handleChange}
                style={inputStyle}
              />

              <textarea
                name="address"
                placeholder="Full Address"
                value={form.address}
                onChange={handleChange}
                rows="3"
                style={inputStyle}
              />

              <input
                type="text"
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                type="text"
                name="state"
                placeholder="State"
                value={form.state}
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                type="text"
                name="pincode"
                placeholder="Pincode (6 digits)"
                maxLength={6}
                inputMode="numeric"
                value={form.pincode}
                onChange={handleChange}
                style={inputStyle}
              />

              <label>
                <strong>
                  Customer Status
                </strong>
              </label>

              <LargeCustomDropdown
                name="customer_status"
                value={form.customer_status}
                onChange={handleChange}
                placeholder="Select Customer Status"
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Contacted", label: "Contacted" },
                  { value: "Interested", label: "Interested" },
                  { value: "Negotiation", label: "Negotiation" },
                  { value: "Converted", label: "Converted" },
                  { value: "Lost", label: "Lost" },
                ]}
              />

              <label>
                <input
                  type="checkbox"
                  name="priority_customer"
                  checked={
                    form.priority_customer
                  }
                  onChange={
                    handleChange
                  }
                />{" "}
                Priority Customer
              </label>

              <br />
              <br />

              <textarea
                name="notes"
                placeholder="Customer Notes"
                value={form.notes}
                onChange={handleChange}
                rows="4"
                style={inputStyle}
              />
            </div>

            {/* PURCHASED PROPERTY */}

            <div
              style={sectionStyle}
            >
              <h3>
                Purchased Property
              </h3>

              <label>
                <strong>
                  Project
                </strong>
              </label>

              <LargeCustomDropdown
                name="project_name"
                value={form.project_name}
                onChange={handleChange}
                placeholder="Select Project"
                options={projects.map((project) => ({
                  value: project.project_name,
                  label: project.project_name,
                }))}
              />

              <input
                type="text"
                name="unit_number"
                placeholder="Unit / Flat Number"
                value={
                  form.unit_number
                }
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                type="text"
                name="unit_type"
                placeholder="Unit Type (2BHK / 3BHK / Penthouse)"
                value={
                  form.unit_type
                }
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                type="number"
                name="carpet_area"
                placeholder="Carpet Area (sq ft)"
                value={
                  form.carpet_area
                }
                onChange={handleChange}
                style={inputStyle}
              />

              <input
                type="number"
                name="rate_per_sqft"
                placeholder="Rate per sq ft (₹)"
                value={
                  form.rate_per_sqft
                }
                onChange={handleChange}
                style={inputStyle}
              />

              <label>
                <strong>
                  Property Purchase Date
                </strong>
              </label>

              <input
                type="date"
                name="purchase_date"
                value={
                  form.purchase_date
                }
                max={today}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            {/* PROPERTY COST */}

            <div
              style={sectionStyle}
            >
              <h3>
                Property Cost & Charges
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <div>
                  <label><strong>Base Value (Auto)</strong></label>
                  <input
                    type="text"
                    value={formatINR(form.base_value) ? `₹ ${formatINR(form.base_value)}` : "₹ 0"}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: "#f3f7ff", color: "#172033", fontWeight: "700" }}
                  />
                </div>

                {[
                  ["parking_charges", "Parking Charges"],
                  ["floor_premium", "Floor Premium"],
                  ["club_charges", "Club Charges"],
                  ["other_charges", "Other Charges"],
                  ["gst", "GST"],
                  ["stamp_duty", "Stamp Duty"],
                  ["registration_charges", "Registration Charges"],
                  ["maintenance_charges", "Maintenance Charges"],
                  ["sinking_fund", "Sinking Fund"],
                  ["corpus_fund", "Corpus Fund"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label><strong>{label}</strong></label>
                    <input
                      type="number"
                      name={name}
                      placeholder={label}
                      value={form[name]}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div>
                  <label><strong>Agreement Value (Auto)</strong></label>
                  <input
                    type="text"
                    value={formatINR(form.agreement_value) ? `₹ ${formatINR(form.agreement_value)}` : "₹ 0"}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: "#f3f7ff", color: "#172033", fontWeight: "700" }}
                  />
                </div>

                <div>
                  <label><strong>Estimated Total (Auto)</strong></label>
                  <input
                    type="text"
                    value={formatINR(form.estimated_total) ? `₹ ${formatINR(form.estimated_total)}` : "₹ 0"}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: "#eaf2ff", color: "#0b4ea2", fontWeight: "800" }}
                  />
                </div>
              </div>
            </div>

            {/* PAYMENT SUMMARY */}

            <div
              style={sectionStyle}
            >
              <h3>
                Payment Summary
              </h3>

              <label><strong>Total Property Value (Auto)</strong></label>
              <input
                type="text"
                value={form.estimated_total ? `₹ ${formatINR(form.estimated_total)}` : "₹ 0"}
                readOnly
                style={{ ...inputStyle, backgroundColor: "#eaf2ff", color: "#0b4ea2", fontWeight: "800" }}
              />

              <input
                type="number"
                name="paid_amount"
                placeholder="Total Paid Amount"
                value={
                  form.paid_amount
                }
                onChange={handleChange}
                style={inputStyle}
              />

              <label><strong>Remaining Amount (Auto)</strong></label>
              <input
                type="text"
                value={form.remaining_amount ? `₹ ${formatINR(form.remaining_amount)}` : "₹ 0"}
                readOnly
                style={{ ...inputStyle, backgroundColor: "#f3f7ff", color: "#172033", fontWeight: "700" }}
              />

              <p
                style={{
                  fontSize: "13px",
                  color: "#666",
                  marginBottom:
                    "0",
                }}
              >
                Detailed payments
                aur installments
                customer list ke
                buttons se manage
                honge.
              </p>
            </div>

            <br />

            <button
              type="submit"
              style={{
                ...primaryButton,
                backgroundColor:
                  "#0b4ea2",
                color: "#fff",
              }}
            >
              {editingId
                ? "Update Customer"
                : "Save Customer"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              style={{
                ...secondaryButton,
                marginLeft: "10px",
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* =====================================================
          CUSTOMER LIST
      ===================================================== */}

      <h2>
        Customers (
        {filteredCustomers.length})
      </h2>

      {filteredCustomers.length ===
      0 ? (
        <p>
          No customers found.
        </p>
      ) : (
        filteredCustomers.map(
          (customer) => (
            <div
              key={
                customer.user_id
              }
              style={{
                border:
                  "1px solid #ddd",
                borderRadius:
                  "12px",
                padding: "20px",
                marginBottom:
                  "18px",
                backgroundColor:
                  "#fff",
                boxShadow:
                  "0 3px 12px rgba(0,0,0,0.04)",
              }}
            >
              {/* LOGIN ID */}

              <div
                style={{
                  marginBottom:
                    "15px",
                  padding:
                    "12px",
                  backgroundColor:
                    "#f5f6f8",
                  borderRadius:
                    "8px",
                }}
              >
                <strong>
                  Customer Login ID:
                </strong>{" "}

                <span
                  style={{
                    fontWeight:
                      "bold",
                    marginLeft:
                      "5px",
                  }}
                >
                  {customer.customer_login_id ||
                    "Not generated"}
                </span>

                {customer.customer_login_id && (
                  <button
                    type="button"
                    onClick={() =>
                      copyCustomerLoginId(
                        customer.customer_login_id
                      )
                    }
                    style={{
                      marginLeft:
                        "10px",
                      padding:
                        "5px 10px",
                      cursor:
                        "pointer",
                    }}
                  >
                    Copy ID
                  </button>
                )}
              </div>

              <h3>
                {customer.name}

                {customer.priority_customer ? (
                  <span
                    style={{
                      marginLeft:
                        "10px",
                      fontSize:
                        "14px",
                    }}
                  >
                    ⭐ Priority
                  </span>
                ) : null}
              </h3>

              <p>
                <strong>
                  Phone:
                </strong>{" "}
                {customer.phone ||
                  "Not provided"}
              </p>

              <p>
                <strong>
                  Email:
                </strong>{" "}
                {customer.email ||
                  "Not provided"}
              </p>

              <hr />

              <h4>
                Property
              </h4>

              <p>
                <strong>
                  Project:
                </strong>{" "}
                {customer.project_name ||
                  "Not assigned"}
              </p>

              <p>
                <strong>
                  Unit:
                </strong>{" "}
                {customer.unit_number ||
                  "Not assigned"}
              </p>

              <p>
                <strong>
                  Unit Type:
                </strong>{" "}
                {customer.unit_type ||
                  "Not specified"}
              </p>

              <p>
                <strong>
                  Purchase Date:
                </strong>{" "}
                {customer.purchase_date
                  ? String(
                      customer.purchase_date
                    ).substring(
                      0,
                      10
                    )
                  : "Not provided"}
              </p>

              <p>
                <strong>
                  Property Value:
                </strong>{" "}
                ₹
                {customer.property_value ||
                  "0"}
              </p>

              <h4>
                Payment Summary
              </h4>

              <p>
                <strong>
                  Paid:
                </strong>{" "}
                ₹
                {customer.paid_amount ||
                  "0"}
              </p>

              <p>
                <strong>
                  Remaining:
                </strong>{" "}
                ₹
                {customer.remaining_amount ||
                  "0"}
              </p>


              <p>
                <strong>
                  Status:
                </strong>{" "}
                {customer.customer_status ||
                  "Active"}
              </p>

              {/* ACTION BUTTONS */}

              <div
                style={{
                  display:
                    "flex",
                  gap: "10px",
                  flexWrap:
                    "nowrap",
                  overflowX:
                    "auto",
                  paddingBottom:
                    "6px",
                  marginTop:
                    "18px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    editCustomer(
                      customer
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openPurchaseDocument(
                      customer
                    )
                  }
                  style={{
                    ...secondaryButton,
                    borderColor: "#0b5ed7",
                    color: "#0b5ed7",
                  }}
                >
                  📄 Purchase Document
                </button>








                <button
                  type="button"
                  onClick={() =>
                    deleteCustomer(
                      customer.profile_id
                    )
                  }
                  style={{
                    ...secondaryButton,
                    borderColor:
                      "#d66",
                    color:
                      "#b00",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )
      )}

      {/* =====================================================
          PAYMENT HISTORY MODAL
      ===================================================== */}

      {showPaymentHistory && (
        <div
          style={modalOverlay}
          onClick={() =>
            setShowPaymentHistory(
              false
            )
          }
        >
          <div
            style={modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <div>
                <h2>
                  💳 Payment History
                </h2>

                <p
                  style={{
                    color:
                      "#666",
                  }}
                >
                  {selectedCustomer?.name ||
                    ""}
                  {" — "}
                  {selectedCustomer?.unit_number ||
                    ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPaymentHistory(
                    false
                  )
                }
                style={
                  secondaryButton
                }
              >
                ✕ Close
              </button>
            </div>

            <hr />

            {/* ADD PAYMENT */}

            <form
              onSubmit={addPayment}
              style={{
                padding:
                  "18px",
                border:
                  "1px solid #ddd",
                borderRadius:
                  "10px",
                backgroundColor:
                  "#fafafa",
              }}
            >
              <h3>
                Add Payment to Existing Record
              </h3>

              <input
                type="date"
                name="payment_date"
                value={
                  paymentForm.payment_date
                }
                max={today}
                onChange={
                  handlePaymentChange
                }
                style={
                  inputStyle
                }
                required
              />

              <input
                type="number"
                name="amount"
                placeholder="New Payment Amount"
                value={
                  paymentForm.amount
                }
                onChange={
                  handlePaymentChange
                }
                style={
                  inputStyle
                }
                min="0"
                step="0.01"
                required
              />

              <LargeCustomDropdown
                name="payment_mode"
                value={paymentForm.payment_mode}
                onChange={handlePaymentChange}
                placeholder="Payment Mode"
                options={[
                  { value: "Cash", label: "Cash" },
                  { value: "Bank Transfer", label: "Bank Transfer" },
                  { value: "UPI", label: "UPI" },
                  { value: "Cheque", label: "Cheque" },
                  { value: "Card", label: "Card" },
                ]}
              />

              <input
                type="text"
                name="transaction_reference"
                placeholder="Transaction / Reference Number"
                value={
                  paymentForm.transaction_reference
                }
                onChange={
                  handlePaymentChange
                }
                style={
                  inputStyle
                }
              />

              <input
                type="text"
                name="receipt_number"
                placeholder="Receipt Number"
                value={
                  paymentForm.receipt_number
                }
                onChange={
                  handlePaymentChange
                }
                style={
                  inputStyle
                }
              />

              <textarea
                name="notes"
                placeholder="Payment Notes"
                value={
                  paymentForm.notes
                }
                onChange={
                  handlePaymentChange
                }
                rows="2"
                style={
                  inputStyle
                }
              />

              <button
                type="submit"
                style={{
                  ...primaryButton,
                  backgroundColor:
                    "#0b5ed7",
                  color:
                    "#fff",
                }}
              >
                + Add Payment
              </button>
            </form>

            {/* PAYMENT LIST */}

            <h3
              style={{
                marginTop:
                  "25px",
              }}
            >
              Payment Records
            </h3>

            {paymentHistory.length ===
            0 ? (
              <p
                style={{
                  color:
                    "#777",
                }}
              >
                No payment records
                found.
              </p>
            ) : (
              paymentHistory.map(
                (payment) => (
                  <div
                    key={
                      payment.id
                    }
                    style={{
                      padding:
                        "18px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "10px",
                      marginBottom:
                        "12px",
                      backgroundColor:
                        "#fafafa",
                    }}
                  >
                    <p>
                      <strong>
                        Total Deal Amount:
                      </strong>{" "}
                      ₹{Number(payment.total_amount || 0).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>
                        Paid Amount:
                      </strong>{" "}
                      ₹{Number(payment.paid_amount || 0).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>
                        Remaining Amount:
                      </strong>{" "}
                      ₹{Number(payment.remaining_amount || 0).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>
                        Installment Amount:
                      </strong>{" "}
                      ₹{Number(payment.installment_amount || 0).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>
                        Installments:
                      </strong>{" "}
                      {payment.paid_installments || 0} / {payment.total_installments || 0}
                    </p>

                    <p>
                      <strong>
                        Next Due Date:
                      </strong>{" "}
                      {payment.next_due_date || "Not set"}
                    </p>

                    <p>
                      <strong>
                        Payment Status:
                      </strong>{" "}
                      <span style={{ fontWeight: "700" }}>
                        {payment.payment_status || "Pending"}
                      </span>
                    </p>

                    {payment.receipt && (
                      <p>
                        <strong>
                          Receipt / Reference:
                        </strong>{" "}
                        {payment.receipt}
                      </p>
                    )}

                    <p style={{ marginBottom: 0, color: "#666", fontSize: "13px" }}>
                      This is the same payment record shown in Payments & Installments.
                    </p>
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          INSTALLMENTS MODAL
      ===================================================== */}

      {showInstallments && (
        <div
          style={modalOverlay}
          onClick={() =>
            setShowInstallments(
              false
            )
          }
        >
          <div
            style={modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >
              <div>
                <h2>
                  📅 Installment Schedule
                </h2>

                <p
                  style={{
                    color:
                      "#666",
                  }}
                >
                  {selectedCustomer?.name ||
                    ""}
                  {" — "}
                  {selectedCustomer?.unit_number ||
                    ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowInstallments(
                    false
                  )
                }
                style={
                  secondaryButton
                }
              >
                ✕ Close
              </button>
            </div>

            <hr />

            <form
              onSubmit={
                saveInstallment
              }
              style={{
                padding:
                  "18px",
                border:
                  "1px solid #ddd",
                borderRadius:
                  "10px",
                backgroundColor:
                  "#fafafa",
              }}
            >
              <h3>
                {installmentEditingId
                  ? "Edit Installment"
                  : "Add Installment"}
              </h3>

              <input
                type="number"
                name="installment_number"
                placeholder="Installment Number"
                value={
                  installmentForm.installment_number
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
                min="1"
                required
              />

              <input
                type="number"
                name="installment_amount"
                placeholder="Installment Amount"
                value={
                  installmentForm.installment_amount
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
                min="0"
                step="0.01"
                required
              />

              <label>
                <strong>
                  Due Date
                </strong>
              </label>

              <input
                type="date"
                name="due_date"
                value={
                  installmentForm.due_date
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
                required
              />

              <label>
                <strong>
                  Status
                </strong>
              </label>

              <LargeCustomDropdown
                name="status"
                value={installmentForm.status}
                onChange={handleInstallmentChange}
                placeholder="Status"
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Paid", label: "Paid" },
                  { value: "Overdue", label: "Overdue" },
                ]}
              />

              <input
                type="number"
                name="paid_amount"
                placeholder="Paid Amount"
                value={
                  installmentForm.paid_amount
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
                min="0"
                step="0.01"
              />

              <label>
                <strong>
                  Paid Date
                </strong>
              </label>

              <input
                type="date"
                name="paid_date"
                value={
                  installmentForm.paid_date
                }
                max={today}
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
              />

              <LargeCustomDropdown
                name="payment_mode"
                value={installmentForm.payment_mode}
                onChange={handleInstallmentChange}
                placeholder="Payment Mode"
                options={[
                  { value: "Cash", label: "Cash" },
                  { value: "Bank Transfer", label: "Bank Transfer" },
                  { value: "UPI", label: "UPI" },
                  { value: "Cheque", label: "Cheque" },
                  { value: "Card", label: "Card" },
                ]}
              />

              <input
                type="text"
                name="transaction_reference"
                placeholder="Transaction / Reference Number"
                value={
                  installmentForm.transaction_reference
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
              />

              <input
                type="text"
                name="receipt_number"
                placeholder="Receipt Number"
                value={
                  installmentForm.receipt_number
                }
                onChange={
                  handleInstallmentChange
                }
                style={
                  inputStyle
                }
              />

              <textarea
                name="notes"
                placeholder="Installment Notes"
                value={
                  installmentForm.notes
                }
                onChange={
                  handleInstallmentChange
                }
                rows="2"
                style={
                  inputStyle
                }
              />

              <button
                type="submit"
                style={{
                  ...primaryButton,
                  backgroundColor:
                    "#0b5ed7",
                  color:
                    "#fff",
                }}
              >
                {installmentEditingId
                  ? "Update Installment"
                  : "+ Add Installment"}
              </button>

              {installmentEditingId && (
                <button
                  type="button"
                  onClick={() => {
                    setInstallmentEditingId(
                      null
                    );

                    setInstallmentForm({
                      installment_number:
                        "",
                      installment_amount:
                        "",
                      due_date:
                        "",
                      status:
                        "Pending",
                      paid_amount:
                        "",
                      paid_date:
                        "",
                      payment_mode:
                        "",
                      transaction_reference:
                        "",
                      receipt_number:
                        "",
                      notes:
                        "",
                    });
                  }}
                  style={{
                    ...secondaryButton,
                    marginLeft:
                      "10px",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            {/* INSTALLMENT LIST */}

            <h3
              style={{
                marginTop:
                  "25px",
              }}
            >
              Installment Records
            </h3>

            {installments.length ===
            0 ? (
              <p
                style={{
                  color:
                    "#777",
                }}
              >
                No installments
                added yet.
              </p>
            ) : (
              installments.map(
                (item) => {
                  const status =
                    item.display_status ||
                    item.status;

                  return (
                    <div
                      key={
                        item.id
                      }
                      style={{
                        padding:
                          "15px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "9px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <h4>
                        Installment #
                        {
                          item.installment_number
                        }
                      </h4>

                      <p>
                        <strong>
                          Amount:
                        </strong>{" "}
                        ₹
                        {
                          item.installment_amount
                        }
                      </p>

                      <p>
                        <strong>
                          Due Date:
                        </strong>{" "}
                        {
                          item.due_date
                        }
                      </p>

                      <p>
                        <strong>
                          Status:
                        </strong>{" "}
                        <span
                          style={{
                            fontWeight:
                              "bold",
                            color:
                              status ===
                              "Paid"
                                ? "green"
                                : status ===
                                  "Overdue"
                                ? "red"
                                : "#b06b00",
                          }}
                        >
                          {status}
                        </span>
                      </p>

                      <p>
                        <strong>
                          Paid:
                        </strong>{" "}
                        ₹
                        {
                          item.paid_amount ||
                          "0"
                        }
                      </p>

                      {item.paid_date && (
                        <p>
                          <strong>
                            Paid Date:
                          </strong>{" "}
                          {
                            item.paid_date
                          }
                        </p>
                      )}

                      {item.payment_mode && (
                        <p>
                          <strong>
                            Mode:
                          </strong>{" "}
                          {
                            item.payment_mode
                          }
                        </p>
                      )}

                      {item.transaction_reference && (
                        <p>
                          <strong>
                            Transaction:
                          </strong>{" "}
                          {
                            item.transaction_reference
                          }
                        </p>
                      )}

                      {item.receipt_number && (
                        <p>
                          <strong>
                            Receipt:
                          </strong>{" "}
                          {
                            item.receipt_number
                          }
                        </p>
                      )}

                      {item.notes && (
                        <p>
                          <strong>
                            Notes:
                          </strong>{" "}
                          {item.notes}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          editInstallment(
                            item
                          )
                        }
                        style={
                          secondaryButton
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteInstallment(
                            item.id
                          )
                        }
                        style={{
                          ...secondaryButton,
                          marginLeft:
                            "8px",
                          color:
                            "#b00",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminCustomers;