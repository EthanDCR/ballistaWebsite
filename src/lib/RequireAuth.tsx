import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { pb } from "./pb";

export function useAuth() {
  const [isValid, setIsValid] = useState(pb.authStore.isValid);
  useEffect(() => pb.authStore.onChange(() => setIsValid(pb.authStore.isValid)), []);
  return isValid;
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const isValid = useAuth();
  const location = useLocation();

  if (!isValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
