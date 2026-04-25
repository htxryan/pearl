import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, cloneElement, isValidElement, type ReactElement } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] active:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/25",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2 text-xs",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
        "icon-xs": "h-7 w-7",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends ComponentProps<"button">, ButtonVariantProps {
  render?: ReactElement;
}

function Button({ className, variant, size, render, ref, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (render && isValidElement(render)) {
    return cloneElement(render as ReactElement<Record<string, unknown>>, {
      ...props,
      className: cn(classes, (render.props as { className?: string }).className),
      ref,
    });
  }

  return <button ref={ref} className={classes} {...props} />;
}

export { Button, buttonVariants };
