import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "text-destructive-foreground border-transparent bg-destructive hover:bg-destructive/80",
        outline: "border-border bg-background text-foreground",
        neutral:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        info: "border-transparent bg-primary/12 text-primary hover:bg-primary/16",
        success:
          "border-transparent bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/16 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-500/14 text-amber-800 hover:bg-amber-500/18 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
