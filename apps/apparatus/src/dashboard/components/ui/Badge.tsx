import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "./cn"
import { typographyRole } from "./typography"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80", // Alias
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        neutral: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", // Alias
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        danger: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80", // Alias
        outline: "text-foreground",
        success: "border-transparent bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20",
        warning: "border-transparent bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20",
        info: "border-transparent bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border-blue-500/20",
        neon: "border-primary/50 bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,240,255,0.2)]",
        chip:
          "border-ops-line bg-ops-panel-soft/85 text-ops-text-muted px-2 py-1",
      },
      size: { // Added size variant to support legacy API
          default: "",
          sm: "text-[10px] px-1.5 py-0.5",
          md: "px-2.5 py-0.5",
          lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), typographyRole("tag"), className)} {...props}>
      {dot && (
        <span className={cn("mr-1.5 flex h-1.5 w-1.5 rounded-full transition-casual", 
            (variant === 'destructive' || variant === 'danger') ? 'bg-danger animate-pulse' :
            variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            'bg-primary'
        )} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
