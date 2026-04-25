import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = Menu.Trigger;

const DropdownMenuGroup = Menu.Group;

const DropdownMenuSub = Menu.SubmenuRoot;

const DropdownMenuRadioGroup = Menu.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.SubmenuTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <Menu.SubmenuTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </Menu.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

function DropdownMenuPortal(props: React.ComponentProps<typeof Menu.Portal>) {
  return <Menu.Portal {...props} />;
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof Menu.Popup>) {
  return (
    <Menu.Positioner sideOffset={-4}>
      <Menu.Popup
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
          "transition-[opacity,transform] duration-150",
          "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
          "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          className,
        )}
        {...props}
      />
    </Menu.Positioner>
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  ...props
}: React.ComponentProps<typeof Menu.Popup> & {
  sideOffset?: number;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenuPortal>
      <Menu.Positioner sideOffset={sideOffset} align={align}>
        <Menu.Popup
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            "transition-[opacity,transform] duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </DropdownMenuPortal>
  );
}

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <Menu.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Menu.CheckboxItemIndicator>
        <Check className="h-4 w-4" />
      </Menu.CheckboxItemIndicator>
    </span>
    {children}
  </Menu.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.RadioItem>
>(({ className, children, ...props }, ref) => (
  <Menu.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Menu.RadioItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </Menu.RadioItemIndicator>
    </span>
    {children}
  </Menu.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <Menu.GroupLabel
      className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
