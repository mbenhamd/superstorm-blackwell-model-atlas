import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] hover:bg-primary-hover",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-border bg-card hover:border-border-strong hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border bg-card text-foreground hover:border-border-strong hover:bg-accent",
        ghost:
          "text-ink-2 hover:bg-accent hover:text-accent-foreground",
        link: "h-auto px-0 text-link underline-offset-4 hover:underline has-[>svg]:px-0",
      },
      size: {
        default: "h-8 px-3 has-[>svg]:px-2.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 rounded-md px-4 has-[>svg]:px-3",
        icon: "size-8 text-ink-2 hover:text-foreground",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 text-ink-2 hover:text-foreground",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
