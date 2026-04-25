import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const Sheet = DrawerPrimitive.Root;

const SheetTrigger = DrawerPrimitive.Trigger;

const SheetClose = DrawerPrimitive.Close;

function SheetPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Backdrop>) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/80",
        "transition-opacity duration-200 ease-out",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

type SheetSide = "top" | "right" | "bottom" | "left";

const sideStyles: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "inset-x-0 bottom-0 border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-r sm:max-w-sm data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
};

interface SheetContentProps extends React.ComponentProps<typeof DrawerPrimitive.Popup> {
  side?: SheetSide;
}

function SheetContent({ side = "right", className, children, ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DrawerPrimitive.Popup
        className={cn(
          "fixed z-50 gap-4 bg-background p-6 shadow-lg",
          "transition-transform duration-200 ease-out",
          sideStyles[side],
          className,
        )}
        {...props}
      >
        <DrawerPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X size={16} />
          <span className="sr-only">Close</span>
        </DrawerPrimitive.Close>
        {children}
      </DrawerPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export type { SheetSide };
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
