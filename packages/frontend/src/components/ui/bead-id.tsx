import { useHealth } from "@/hooks/use-issues";
import { addToast } from "@/hooks/use-toast";
import { displayId } from "@/lib/format-id";

interface BeadIdProps {
  id: string;
  className?: string;
}

export function BeadId({ id, className }: BeadIdProps) {
  const { data: health } = useHealth();
  const label = displayId(id, health?.project_prefix);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(id).then(() => {
      addToast({ message: "Copied!", variant: "success", duration: 1500 });
    });
  }

  return (
    <button
      type="button"
      className={className}
      title={id}
      onClick={handleClick}
      style={{ cursor: "pointer", font: "inherit" }}
    >
      {label}
    </button>
  );
}
