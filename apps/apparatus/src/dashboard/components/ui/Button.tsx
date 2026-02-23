import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "./cn"
import { typographyRole } from "./typography"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm uppercase text-[11px] ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // High Contrast: Theme-controlled text on solid Teal
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-5px_rgba(0,196,167,0.4)] border border-transparent",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-5px_rgba(0,196,167,0.4)] border border-transparent",

        // High Contrast: White text on Crimson (from screenshot)
        destructive:
          "bg-danger text-white hover:bg-danger/90 shadow-[0_0_15px_-5px_rgba(225,29,72,0.4)] border border-transparent",
        danger: "bg-danger text-white hover:bg-danger/90 shadow-[0_0_15px_-5px_rgba(225,29,72,0.4)] border border-transparent",

        // Opaque outline with glow effect - improved from transparent
        secondary:
          "bg-neutral-900/60 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 shadow-[0_0_10px_-3px_rgba(0,0,0,0.5)] transition-all",

        outline:
          "border border-primary/50 bg-primary/5 text-primary/90 hover:bg-primary/15 hover:border-primary/70 shadow-[0_0_8px_-3px_rgba(0,196,167,0.2)]",

        ghost: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",

        link: "text-primary underline-offset-4 hover:underline",

        // Tech style - opaque background
        neon: "bg-primary/15 border border-primary/60 text-primary shadow-[0_0_10px_rgba(0,196,167,0.3)] hover:bg-primary/25 hover:border-primary/80 hover:shadow-[0_0_20px_rgba(0,196,167,0.5)] transition-all duration-300",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-4",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, leftIcon, rightIcon, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), typographyRole("tag"), className)}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
           <>
             <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>PROCESSING...</span>
           </>
        ) : (
          <>
            {leftIcon && <span className="mr-2.5 opacity-80">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2.5 opacity-80">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
