import Home from "./Home";
import Login from "./Login";
import Contact from "./Contact";
import CustomerReviews from "./pages/CustomerReviews";
import AdminDashboard from "./admin/AdminDashboard";
import AdminForgotPassword from "./admin/AdminForgotPassword";
import AdminResetPassword from "./admin/AdminResetPassword";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerForgotPassword from "./pages/CustomerForgotPassword";
import CustomerResetPassword from "./pages/CustomerResetPassword";

import ProjectDetails from "./pages/ProjectDetails";
import UnitDetails from "./pages/UnitDetails";

function App() {
  const path = window.location.pathname;

  // Dynamic Project Details route
  // Example: /project/1
  if (path.startsWith("/project/")) {
    return <ProjectDetails />;
  }
   
  
  // Dynamic Unit Details route
  // Example: /unit/1
  if (path.startsWith("/unit/")) {
    return <UnitDetails />;
  }

  switch (path) {
    case "/":
      return <Home />;

    case "/customer-reviews":
      return <CustomerReviews />;

    case "/home":
      return <Home />;

    case "/login":
      return <Login />;

    case "/admin":
      return <AdminDashboard />;

    case "/admin-forgot-password":
      return <AdminForgotPassword />;

    case "/admin-reset-password":
      return <AdminResetPassword />;

    case "/customer-login":
      return <CustomerLogin />;

    case "/customer-forgot-password":
      return <CustomerForgotPassword />;

    case "/customer-reset-password":
      return <CustomerResetPassword />;

    case "/customer":
      return <CustomerDashboard />;

    case "/contact":
      return <Contact />;

    default:
      return <Home />;
  }
}

export default App;