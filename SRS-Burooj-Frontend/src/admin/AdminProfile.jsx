import { adminFetch } from "./adminApi";
﻿import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function getAdminToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function AdminProfile() {
  const [admin, setAdmin] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getAdminToken();

      if (!token) {
        throw new Error("Admin session token not found. Please login again.");
      }

      const response = await adminFetch(`${API}/auth/admin-profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load admin profile");
      }

      setAdmin({
        name: data.admin?.name || "",
        email: data.admin?.email || "",
        phone: data.admin?.phone || "",
      });

      // Keep local admin information updated
      if (data.admin) {
        localStorage.setItem(
          "adminData",
          JSON.stringify(data.admin)
        );

        localStorage.setItem(
          "adminName",
          data.admin.name || ""
        );

        localStorage.setItem(
          "adminEmail",
          data.admin.email || ""
        );

        localStorage.setItem(
          "adminPhone",
          data.admin.phone || ""
        );
      }
    } catch (err) {
      console.error("Admin profile load error:", err);

      setError(err.message || "Unable to load admin profile.");

      setAdmin({
        name:
          localStorage.getItem("adminName") ||
          "Administrator",
        email:
          localStorage.getItem("adminEmail") ||
          "admin@srsburooj.com",
        phone:
          localStorage.getItem("adminPhone") || "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setAdmin((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!admin.name.trim()) {
      setError("Admin name is required.");
      return;
    }

    if (!admin.email.trim()) {
      setError("Admin email is required.");
      return;
    }

    try {
      setSaving(true);

      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin session token not found. Please login again."
        );
      }

      const response = await adminFetch(`${API}/auth/admin-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: admin.name.trim(),
          email: admin.email.trim(),
          phone: admin.phone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update profile"
        );
      }

      // IMPORTANT:
      // Backend returns a fresh JWT after profile update.
      if (data.token) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("token", data.token);
      }

      const updatedAdmin = data.admin || {
        ...admin,
        name: admin.name.trim(),
        email: admin.email.trim(),
        phone: admin.phone.trim(),
      };

      setAdmin({
        name: updatedAdmin.name || "",
        email: updatedAdmin.email || "",
        phone: updatedAdmin.phone || "",
      });

      localStorage.setItem(
        "adminData",
        JSON.stringify(updatedAdmin)
      );

      localStorage.setItem(
        "adminName",
        updatedAdmin.name || ""
      );

      localStorage.setItem(
        "adminEmail",
        updatedAdmin.email || ""
      );

      localStorage.setItem(
        "adminPhone",
        updatedAdmin.phone || ""
      );

      setMessage("Admin profile updated successfully.");
    } catch (err) {
      console.error("Admin profile update error:", err);
      setError(
        err.message || "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPassword((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const changePassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!password.currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!password.newPassword) {
      setError("New password is required.");
      return;
    }

    if (password.newPassword.length < 6) {
      setError(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (
      password.newPassword !==
      password.confirmPassword
    ) {
      setError(
        "New password and confirm password do not match."
      );
      return;
    }

    try {
      setChangingPassword(true);

      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Admin session token not found. Please login again."
        );
      }

      const response = await adminFetch(
        `${API}/auth/admin-change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword:
              password.currentPassword,
            newPassword:
              password.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to change password"
        );
      }

      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(
        "Password changed successfully. Please use the new password for your next login."
      );
    } catch (err) {
      console.error(
        "Password change error:",
        err
      );

      setError(
        err.message ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-profile-page">
        <style>{styles}</style>

        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading administrator profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-profile-page">
      <style>{styles}</style>

      <div className="profile-header">
        <div>
          <div className="system-label">
            SRS BUROOJ MANAGEMENT SYSTEM
          </div>

          <h1>Admin Profile</h1>

          <p>
            Manage the administrator account and contact information.
          </p>
        </div>

        <div className="online-badge">
          <span></span>
          System Online
        </div>
      </div>

      {message && (
        <div className="success-message">
          <span>✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>!</span>
          {error}
        </div>
      )}

      <div className="profile-layout">
        <div className="profile-card main-profile-card">
          <div className="card-heading">
            <div className="card-icon">♙</div>

            <div>
              <h2>Profile Information</h2>

              <p>
                Manage administrator name, email and contact information.
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Admin Name <span>*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={admin.name}
                  onChange={handleProfileChange}
                  placeholder="Enter admin name"
                />
              </div>

              <div className="form-group">
                <label>
                  Email Address <span>*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  value={admin.email}
                  onChange={handleProfileChange}
                  placeholder="Enter admin email"
                />
              </div>

              <div className="form-group full-width">
                <label>Contact Number</label>

                <input
                  type="tel"
                  name="phone"
                  value={admin.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <button
              type="submit"
              className="gold-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Profile Changes"}
            </button>
          </form>
        </div>

        <div className="profile-card">
          <div className="card-heading">
            <div className="card-icon">🔐</div>

            <div>
              <h2>Password</h2>

              <p>
                Change the administrator login password securely.
              </p>
            </div>
          </div>

          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>
                Current Password <span>*</span>
              </label>

              <input
                type="password"
                name="currentPassword"
                value={password.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label>
                New Password <span>*</span>
              </label>

              <input
                type="password"
                name="newPassword"
                value={password.newPassword}
                onChange={handlePasswordChange}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>
                Confirm New Password <span>*</span>
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={password.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="dark-button"
              disabled={changingPassword}
            >
              {changingPassword
                ? "Changing..."
                : "Change Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="profile-card email-card">
        <div className="card-heading">
          <div className="card-icon">✉</div>

          <div>
            <h2>Email & Communication</h2>

            <p>
              The email below is currently registered for administrator
              communication.
            </p>
          </div>
        </div>

        <div className="email-display">
          <div>
            <small>
              REGISTERED ADMIN EMAIL
            </small>

            <strong>
              {admin.email || "Not available"}
            </strong>
          </div>

          <div className="email-status">
            <span></span>
            Active
          </div>
        </div>
      </div>

      <div className="security-note">
        <strong>Security Notice</strong>

        <p>
          Keep your administrator password private. Never share your login
          credentials with other users.
        </p>
      </div>
    </div>
  );
}

const styles = `
.admin-profile-page {
  min-height: 100%;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(212,175,55,.08), transparent 30%),
    #080808;
  color: #f5f5f5;
  box-sizing: border-box;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.system-label {
  color: #c9a227;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.profile-header h1 {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 800;
}

.profile-header p {
  margin: 0;
  color: #a9a9a9;
  font-size: 14px;
}

.online-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #252525;
  background: #101010;
  color: #d6d6d6;
  padding: 10px 15px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.online-badge span,
.email-status span {
  width: 8px;
  height: 8px;
  background: #35c76f;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(53,199,111,.6);
}

.profile-layout {
  display: grid;
  grid-template-columns: 1.35fr .9fr;
  gap: 20px;
}

.profile-card {
  background: linear-gradient(145deg, #111111, #0c0c0c);
  border: 1px solid #292929;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 14px 40px rgba(0,0,0,.25);
}

.card-heading {
  display: flex;
  gap: 15px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.card-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(201,162,39,.10);
  border: 1px solid rgba(201,162,39,.30);
  color: #d8b443;
  font-size: 22px;
}

.card-heading h2 {
  margin: 2px 0 6px;
  font-size: 18px;
}

.card-heading p {
  margin: 0;
  color: #909090;
  font-size: 13px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 17px;
}

.form-group {
  margin-bottom: 17px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  margin-bottom: 7px;
  color: #d8d8d8;
  font-size: 12px;
  font-weight: 700;
}

.form-group label span {
  color: #d5ad2a;
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #303030;
  border-radius: 9px;
  padding: 12px 13px;
  background: #080808;
  color: #f2f2f2;
  outline: none;
  font-size: 13px;
  transition: .2s;
}

.form-group input:focus {
  border-color: #c9a227;
  box-shadow: 0 0 0 3px rgba(201,162,39,.08);
}

.form-group input::placeholder {
  color: #666;
}

.gold-button,
.dark-button {
  width: 100%;
  border: none;
  border-radius: 9px;
  padding: 13px 16px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  transition: .2s;
}

.gold-button {
  background: linear-gradient(135deg, #c9a227, #e2c158);
  color: #090909;
}

.gold-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(201,162,39,.18);
}

.dark-button {
  background: #181818;
  border: 1px solid #3a3a3a;
  color: #e0c15b;
}

.dark-button:hover {
  border-color: #c9a227;
  background: #202020;
}

.gold-button:disabled,
.dark-button:disabled {
  opacity: .6;
  cursor: not-allowed;
  transform: none;
}

.email-card {
  margin-top: 20px;
}

.email-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 17px;
  border: 1px solid #292929;
  border-radius: 11px;
  background: #080808;
}

.email-display small {
  display: block;
  color: #777;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.email-display strong {
  color: #e4e4e4;
  font-size: 14px;
}

.email-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #75d995;
  font-size: 12px;
  font-weight: 700;
}

.success-message,
.error-message {
  padding: 13px 15px;
  border-radius: 10px;
  margin-bottom: 18px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.success-message {
  background: rgba(53,199,111,.08);
  border: 1px solid rgba(53,199,111,.25);
  color: #8ce4a9;
}

.error-message {
  background: rgba(220,70,70,.08);
  border: 1px solid rgba(220,70,70,.25);
  color: #ff9999;
}

.security-note {
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid #292929;
  border-radius: 12px;
  background: #0e0e0e;
}

.security-note strong {
  color: #d7b342;
  font-size: 13px;
}

.security-note p {
  margin: 5px 0 0;
  color: #858585;
  font-size: 12px;
  line-height: 1.5;
}

.profile-loading {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #999;
  gap: 14px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #292929;
  border-top-color: #c9a227;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .admin-profile-page {
    padding: 18px;
  }

  .profile-header {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .full-width {
    grid-column: auto;
  }

  .email-display {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;

export default AdminProfile;