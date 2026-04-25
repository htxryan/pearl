import { Navigate, Outlet, useLocation } from "react-router";
import { useSetupStatus } from "@/hooks/use-issues";

export function SetupGuard() {
  const { data: status, isLoading, error } = useSetupStatus();
  const location = useLocation();

  if (isLoading || error) return <Outlet />;

  const onSetupPage = location.pathname === "/setup";

  if (!status?.configured && !onSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  if (status?.configured && onSetupPage) {
    return <Navigate to="/list" replace />;
  }

  return <Outlet />;
}
