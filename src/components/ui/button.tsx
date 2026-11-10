import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ButtonHTMLAttributes } from "react";

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-field disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-field active:bg-field-deep",
        secondary: "border border-rule bg-paper-card text-ink hover:bg-paper-muted active:bg-paper-dim",
        quiet: "text-copy hover:bg-paper-muted",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function buttonClassName(props: VariantProps<typeof buttonStyles> & { className?: string }) {
  const { variant, className } = props;
  return twMerge(clsx(buttonStyles({ variant }), className));
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ variant, className, ...props }: ButtonProps) {
  return <button className={buttonClassName({ variant, className })} {...props} />;
}
