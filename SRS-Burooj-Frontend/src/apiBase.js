
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://srs-burooj-api.onrender.com"
).replace(/\/+$/, "");

export default API_BASE_URL;
