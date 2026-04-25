import { Select as SelectPrimitive } from "@base-ui/react/select";
import type * as React from "react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  size = "md",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "md";
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-between gap-1 rounded border border-border bg-background cursor-pointer transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-foreground/30",
        "data-[placeholder]:text-muted-foreground",
        size === "sm"
          ? "min-h-[28px] px-2 text-xs"
          : "min-h-[44px] sm:min-h-[32px] px-2 text-xs sm:text-sm",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> & {
  sideOffset?: number;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={sideOffset}>
        <SelectPrimitive.Popup
          className={cn(
            "z-50 rounded-lg border border-border bg-background shadow-lg overflow-y-auto max-h-64 py-1",
            "transition-[opacity,transform] duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none",
        "data-[highlighted]:bg-accent",
        "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
        "data-[selected]:font-medium",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="flex items-center justify-center w-4 h-4 shrink-0">
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-3 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
