import { useState } from "react";

const API = "http://localhost:5000/api/inquiries";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      // Phone mein sirf digits allow karo
      const phoneValue = value.replace(/\D/g, "").slice(0, 10);

      setForm({
        ...form,
        phone: phoneValue,
      });

      return;
    }

    if (name === "email") {
      setForm({
        ...form,
        email: value,
      });

      return;
    }

    setForm({
      ...form,
      [name]: value,
    });
  };

  const isValidEmail = (email) => {
    if (!email.trim()) {
      return true; // Email optional hai
    }

    return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email.trim());
  };

  const isValidPhone = (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !phone || !message) {
      alert("Please fill Name, Phone and Message.");
      return;
    }

    // Indian mobile number validation
    if (!isValidPhone(phone)) {
      alert(
        "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9."
      );
      return;
    }

    // Email validation
    if (!isValidEmail(email)) {
      alert(
        "Please enter a valid email address, for example: example@gmail.com"
      );
      return;
    }

    try {
      setSending(true);

      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          message,
          source: "Website",
          status: "New",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Unable to submit inquiry.");
        return;
      }

      setSuccess(
        "Thank you! Your inquiry has been submitted. Our team will contact you soon."
      );

      setForm({
        name: "",
        phone: "",
        email: "",
        message: "",
      });
    } catch (error) {
      console.error("CONTACT ERROR:", error);
      alert("Unable to connect to server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f3ea",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#071a33",
            color: "#fff",
            padding: "35px",
            borderRadius: "18px 18px 0 0",
          }}
        >
          <h1 style={{ margin: 0 }}>Contact SRS Burooj</h1>

          <p
            style={{
              color: "#d4af37",
              marginBottom: 0,
            }}
          >
            Enquire about our properties and projects
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "35px",
            borderRadius: "0 0 18px 18px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Send Your Enquiry</h2>

          {success && (
            <div
              style={{
                background: "#e8f7ee",
                color: "#18794e",
                padding: "14px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "16px",
              }}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "18px",
              }}
            >
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full Name *"
                required
                style={inputStyle}
              />

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone Number * (10 digits)"
                required
                maxLength={10}
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9."
                style={inputStyle}
              />

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email Address (example@gmail.com)"
                maxLength={100}
                style={inputStyle}
              />
            </div>

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Tell us what property or project you are interested in *"
              required
              rows="6"
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
                marginTop: "18px",
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              disabled={sending}
              style={{
                marginTop: "20px",
                background: "#071a33",
                color: "#fff",
                border: "none",
                padding: "14px 28px",
                borderRadius: "9px",
                fontWeight: "700",
                fontSize: "16px",
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Submitting..." : "Submit Enquiry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  border: "1px solid #d8d0c0",
  borderRadius: "8px",
  fontSize: "16px",
  fontFamily: "inherit",
  outline: "none",
};

export default Contact;