import { Navigate, useLocation } from "react-router";
import { useSetupStatus } from "@/hooks/use-issues";

/**
 * Wraps app content and redirects to /setup when the backend reports
 * configured: false. Also prevents navigating away from /setup when
 * setup is still needed.
 */
export function SetupGuard({ children }: { children: React.ReactNode }) {
  const { data: status, isLoading, error } = useSetupStatus();
  const location = useLocation();

  // While loading or if the backend is unreachable, render children
  // (the health banner will show connectivity issues)
  if (isLoading || error) return <>{children}</>;

  const onSetupPage = location.pathname === "/setup";

  if (!status?.configured && !onSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  if (status?.configured && onSetupPage) {
    return <Navigate to="/list" replace />;
  }

  return <>{children}</>;
}
