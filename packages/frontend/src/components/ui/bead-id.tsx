import { useHealth } from "@/hooks/use-issues";
import { addToast } from "@/hooks/use-toast";
import { displayId } from "@/lib/format-id";

interface BeadIdProps {
  id: string;
  className?: string;
  interactive?: boolean;
}

export function BeadId({ id, className, interactive = true }: BeadIdProps) {
  const { data: health } = useHealth();
  const label = displayId(id, health?.project_prefix);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(id).then(
      () => addToast({ message: "Copied!", variant: "success", duration: 1500 }),
      () => {},
    );
  }

  if (!interactive) {
    return (
      <span className={className} title={id} aria-label={label || id}>
        {label}
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={className}
      title={id}
      aria-label={label || id}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      style={{ cursor: "pointer", font: "inherit" }}
    >
      {label}
    </span>
  );
}
