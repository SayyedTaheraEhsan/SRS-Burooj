import { useState } from "react";

function AdminResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset link token is missing. Please request a new link.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Password reset failed.");
        return;
      }

      setMessage(data.message || "Password reset successful.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src="/srs-burooj-logo.png" alt="SRS Burooj" style={styles.logo} />
        <h1 style={styles.title}>Reset Admin Password</h1>
        <p style={styles.subtitle}>Create a new password for your administrator account.</p>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={submit}>
          <label style={styles.label}>New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} autoComplete="new-password" />

          <label style={styles.label}>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={styles.input} autoComplete="new-password" />

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <button onClick={() => (window.location.href = "/login")} style={styles.linkButton}>
          Go to Admin Login
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "25px", background: "linear-gradient(135deg, #0b1f3a, #155eef)", fontFamily: "Arial, sans-serif" },
  card: { width: "100%", maxWidth: "430px", background: "#fff", borderRadius: "16px", padding: "35px", boxSizing: "border-box", boxShadow: "0 18px 45px rgba(0,0,0,.22)", textAlign: "center" },
  logo: { width: "75px", height: "75px", objectFit: "contain", marginBottom: "10px" },
  title: { margin: "5px 0 8px", color: "#0b1f3a", fontSize: "27px" },
  subtitle: { margin: "0 0 25px", color: "#667085" },
  label: { display: "block", textAlign: "left", marginBottom: "7px", fontWeight: "700", color: "#10233f" },
  input: { width: "100%", boxSizing: "border-box", padding: "13px", border: "1px solid #cdd9e8", borderRadius: "8px", fontSize: "15px", marginBottom: "16px" },
  button: { width: "100%", border: "none", borderRadius: "8px", padding: "13px", background: "#155eef", color: "#fff", fontWeight: "700", cursor: "pointer" },
  linkButton: { marginTop: "20px", border: "none", background: "transparent", color: "#155eef", cursor: "pointer", fontWeight: "700" },
  success: { background: "#eaf7ee", color: "#18794e", border: "1px solid #b7e4c7", borderRadius: "8px", padding: "10px", marginBottom: "16px", fontSize: "14px" },
  error: { background: "#fff1f1", color: "#b42318", border: "1px solid #f3b8b8", borderRadius: "8px", padding: "10px", marginBottom: "16px", fontSize: "14px" },
};

export default AdminResetPassword;
