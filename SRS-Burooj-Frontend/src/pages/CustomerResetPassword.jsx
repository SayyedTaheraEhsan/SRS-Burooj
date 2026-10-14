import { useState } from "react";

function CustomerResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      alert("Invalid or missing reset link.");
      return;
    }

    if (!newPassword.trim()) {
      alert("New password enter karein.");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password minimum 6 characters ka hona chahiye.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords match nahi kar rahe.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "http://localhost:5000/api/auth/customer-reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(data.message || "Password reset nahi hua.");
        return;
      }

      setMessage(
        "Password successfully reset ho gaya. Ab aap Customer Login kar sakte hain."
      );

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href = "/customer-login";
      }, 2000);
    } catch (error) {
      console.error("Reset password error:", error);
      alert("Server se connection nahi ho raha.");
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
        backgroundColor: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#fff",
          padding: "35px",
          borderRadius: "10px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>SRS Burooj</h1>

        <h2 style={{ textAlign: "center" }}>
          Reset Password
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Apna new password set karein.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            <strong>New Password</strong>
          </label>

          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              boxSizing: "border-box",
            }}
          />

          <label>
            <strong>Confirm New Password</strong>
          </label>

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "20px",
              textAlign: "center",
              color: "green",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default CustomerResetPassword;