import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import type * as React from "react";

import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

const ComboboxValue = ComboboxPrimitive.Value;

const useComboboxFilter = ComboboxPrimitive.useFilter;

function ComboboxInput({
  className,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Input>) {
  return (
    <ComboboxPrimitive.Input
      className={cn(
        "w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({
  className,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Trigger>) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      <ChevronIcon />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Popup> & {
  sideOffset?: number;
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset}>
        <ComboboxPrimitive.Popup
          className={cn(
            "z-50 rounded-lg border border-border bg-background shadow-lg overflow-y-auto max-h-64 py-1",
            "transition-[opacity,transform] duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Item>) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none",
        "data-[highlighted]:bg-accent",
        "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
        "data-[selected]:font-medium",
        className,
      )}
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator className="flex items-center justify-center w-4 h-4 shrink-0">
        <CheckIcon />
      </ComboboxPrimitive.ItemIndicator>
      {children}
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({
  className,
  ...props
}: React.ComponentProps<typeof ComboboxPrimitive.Empty>) {
  return (
    <ComboboxPrimitive.Empty
      className={cn("px-3 py-2 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

const ComboboxChips = ComboboxPrimitive.Chips;
const ComboboxChip = ComboboxPrimitive.Chip;
const ComboboxChipRemove = ComboboxPrimitive.ChipRemove;
const ComboboxInputGroup = ComboboxPrimitive.InputGroup;

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 opacity-50"
    >
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 5.5L4 7.5L8 3" />
    </svg>
  );
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxFilter,
};
