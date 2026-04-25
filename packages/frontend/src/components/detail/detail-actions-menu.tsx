import { Check, ChevronDown, CircleCheck, Ellipsis, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DetailActionsMenuProps {
  isClosed: boolean;
  onClaim: () => void;
  onRequestClose: () => void;
  onRequestDelete: () => void;
  isUpdatePending: boolean;
  isClosePending: boolean;
  isDeletePending: boolean;
}

export function DetailActionsMenu({
  isClosed,
  onClaim,
  onRequestClose,
  onRequestDelete,
  isUpdatePending,
  isClosePending,
  isDeletePending,
}: DetailActionsMenuProps) {
  const [isClaimPending, setIsClaimPending] = useState(false);

  useEffect(() => {
    if (!isUpdatePending) setIsClaimPending(false);
  }, [isUpdatePending]);

  const busy = isUpdatePending || isClosePending || isDeletePending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" disabled={busy} className="gap-1.5" />}
      >
        <Ellipsis size={14} />
        Actions
        <ChevronDown size={12} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {!isClosed && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setIsClaimPending(true);
                onClaim();
              }}
              disabled={isUpdatePending}
              className="gap-2"
            >
              <Check className="size-4" />
              {isClaimPending ? "Claiming..." : "Claim"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRequestClose}
              disabled={isClosePending}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <CircleCheck className="size-4" />
              {isClosePending ? "Closing..." : "Close"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={onRequestDelete}
          disabled={isDeletePending}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="size-4" />
          {isDeletePending ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
