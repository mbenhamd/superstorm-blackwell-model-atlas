import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2 text-[11.5px] leading-none font-medium tabular-nums whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border-strong text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        neutral: "rounded-[4px] border-border bg-muted text-ink-2",
        good: "border-transparent bg-muted text-ink-2 before:size-1.5 before:shrink-0 before:rounded-full before:content-[''] before:bg-good",
        warning: "border-transparent bg-muted text-ink-2 before:size-1.5 before:shrink-0 before:rounded-full before:content-[''] before:bg-warning",
        critical: "border-transparent bg-muted text-ink-2 before:size-1.5 before:shrink-0 before:rounded-full before:content-[''] before:bg-critical",
        info: "border-transparent bg-muted text-ink-2 before:size-1.5 before:shrink-0 before:rounded-full before:content-[''] before:bg-brand",
        mono: "rounded-[4px] border-border bg-muted font-mono text-[11px] text-ink-2",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
