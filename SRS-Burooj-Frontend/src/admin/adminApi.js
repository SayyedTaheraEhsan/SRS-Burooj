export function getAdminToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

export function adminFetch(input, options = {}) {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return window.fetch(input, {
    ...options,
    headers,
  });
}
