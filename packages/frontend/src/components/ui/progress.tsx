import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({ className, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative", className)} {...props}>
      <ProgressPrimitive.Track className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
        <ProgressPrimitive.Indicator className="h-full bg-primary transition-all duration-200 ease-out" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
