
import { useState } from "react";

function CustomerForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your registered email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/customer-forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Unable to send password reset link."
        );
        return;
      }

      setMessage(
        data.message ||
          "Password reset link sent. Please check your email."
      );

      setEmail("");
    } catch (error) {
      console.error(
        "Customer forgot password error:",
        error
      );

      setError(
        "Server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "25px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #071a33 0%, #155eef 55%, #0b4db8 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          padding: "38px",
          borderRadius: "18px",
          boxSizing: "border-box",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <img
            src="/srs-burooj-logo.png"
            alt="SRS Burooj"
            style={{
              width: "80px",
              height: "80px",
              objectFit: "contain",
              marginBottom: "10px",
            }}
          />

          <h1
            style={{
              margin: "0 0 8px",
              color: "#0b1f3a",
              fontSize: "28px",
            }}
          >
            SRS Burooj
          </h1>

          <h2
            style={{
              margin: "0",
              color: "#155eef",
              fontSize: "23px",
            }}
          >
            Forgot Customer Password
          </h2>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#667085",
            fontSize: "15px",
            lineHeight: "1.6",
            marginBottom: "25px",
          }}
        >
          Apne customer account ka registered
          email address enter karein. Hum aapko
          password reset link bhejenge.
        </p>

        {/* Success Message */}
        {message && (
          <div
            style={{
              background: "#eaf7ee",
              color: "#18794e",
              border: "1px solid #b7e4c7",
              borderRadius: "9px",
              padding: "13px",
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "#fff1f1",
              color: "#b42318",
              border: "1px solid #f3b8b8",
              borderRadius: "9px",
              padding: "13px",
              marginBottom: "20px",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontWeight: "700",
              color: "#10233f",
              marginBottom: "8px",
              fontSize: "16px",
            }}
          >
            Registered Email *
          </label>

          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "20px",
              boxSizing: "border-box",
              border: "1px solid #cdd9e8",
              borderRadius: "9px",
              fontSize: "16px",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "9px",
              background: loading
                ? "#8aa9e8"
                : "#155eef",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: "700",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/customer-login";
          }}
          style={{
            display: "block",
            margin: "22px auto 0",
            border: "none",
            background: "transparent",
            color: "#155eef",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          ← Back to Customer Login
        </button>
      </div>
    </div>
  );
}

export default CustomerForgotPassword;
