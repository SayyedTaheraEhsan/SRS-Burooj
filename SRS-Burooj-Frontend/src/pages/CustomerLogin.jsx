import { useState } from "react";

function CustomerLogin() {
  const [customerLoginId, setCustomerLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!customerLoginId.trim()) {
      alert("Customer Login ID enter karein.");
      return;
    }

    if (!password.trim()) {
      alert("Password enter karein.");
      return;
    }

    try {
      setLoading(true);

      localStorage.removeItem("customerToken");
      localStorage.removeItem("customer");

      const response = await fetch(
        "http://localhost:5000/api/auth/customer-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerLoginId: customerLoginId.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Invalid Customer Login ID or Password."
        );
        return;
      }

      localStorage.setItem(
        "customerToken",
        data.token || ""
      );

      localStorage.setItem(
        "customer",
        JSON.stringify({
          ...(data.customer || {}),
          token: data.token || "",
        })
      );

      window.location.href = "/customer";
    } catch (error) {
      console.error("Customer login error:", error);
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
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          SRS Burooj
        </h1>

        <h2
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          Customer Login
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Apne property account me login karein.
        </p>

        <form onSubmit={handleLogin}>
          <label>
            <strong>Customer Login ID</strong>
          </label>

          <input
            type="text"
            placeholder="Example: SRS-CUST-000001"
            value={customerLoginId}
            onChange={(e) =>
              setCustomerLoginId(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              boxSizing: "border-box",
            }}
          />

          <label>
            <strong>Password</strong>
          </label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "10px",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              textAlign: "right",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/customer-forgot-password";
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#0066cc",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontSize: "16px",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: "#777",
          }}
        >
          Customer Login ID admin dwara generate
          kiya jata hai.
        </p>
      </div>
    </div>
  );
}

export default CustomerLogin;