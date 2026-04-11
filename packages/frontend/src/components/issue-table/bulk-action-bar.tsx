import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  selectedCount: number;
  onClose: () => void;
  onClearSelection: () => void;
  isClosing: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClose,
  onClearSelection,
  isClosing,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded border border-border bg-accent/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} issue{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <Button
        variant="destructive"
        size="sm"
        onClick={onClose}
        disabled={isClosing}
      >
        {isClosing ? "Closing..." : "Close selected"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        Clear selection
      </Button>
    </div>
  );
}
