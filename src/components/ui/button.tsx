import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline: "border border-input bg-background/50 backdrop-blur-sm hover:bg-accent/10 hover:border-accent/40 hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        hero: "bg-gradient-ocean text-primary-foreground shadow-glow hover:shadow-elegant hover:brightness-110",
        glow: "bg-accent text-accent-foreground shadow-glow hover:bg-accent/90 hover:brightness-110",
        soft: "bg-accent/10 text-foreground hover:bg-accent/20 border border-accent/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
