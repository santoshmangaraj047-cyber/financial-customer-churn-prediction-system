import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Role restriction (admin / bank)
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
