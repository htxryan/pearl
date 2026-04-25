import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionsIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIssueIcon,
  TrashIcon,
} from "@/components/ui/icons";

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
      <DropdownMenuTrigger>
        {(triggerProps) => (
          <Button {...triggerProps} variant="outline" size="sm" disabled={busy} className="gap-1.5">
            <ActionsIcon />
            Actions
            <ChevronDownIcon />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {!isClosed && (
          <>
            <DropdownMenuItem
              icon={<CheckIcon />}
              onClick={() => {
                setIsClaimPending(true);
                onClaim();
              }}
              disabled={isUpdatePending}
            >
              {isClaimPending ? "Claiming..." : "Claim"}
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<CloseIssueIcon />}
              onClick={onRequestClose}
              disabled={isClosePending}
              destructive
            >
              {isClosePending ? "Closing..." : "Close"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          icon={<TrashIcon />}
          onClick={onRequestDelete}
          disabled={isDeletePending}
          destructive
        >
          {isDeletePending ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
