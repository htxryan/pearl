import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { BoardIcon, GraphIcon, ListIcon } from "@/components/ui/icons";

export function NotFoundView() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="text-center">
        <div className="text-8xl font-bold text-muted-foreground/20 select-none">404</div>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate("/list")} className="gap-1.5">
          <ListIcon />
          List View
        </Button>
        <Button variant="outline" onClick={() => navigate("/board")} className="gap-1.5">
          <BoardIcon />
          Board View
        </Button>
        <Button variant="outline" onClick={() => navigate("/graph")} className="gap-1.5">
          <GraphIcon />
          Graph View
        </Button>
      </div>
    </div>
  );
}
