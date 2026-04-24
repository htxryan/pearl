import { Navigate, useParams } from "react-router";
import { IssueDetail } from "@/components/detail/issue-detail";

export function DetailView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/list" replace />;
  return <IssueDetail id={id} />;
}
