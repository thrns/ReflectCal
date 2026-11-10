import { HTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type SurfaceProps = HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" };

export function Surface({ as: Element = "section", className, ...props }: SurfaceProps) {
  return <Element className={twMerge(clsx("rounded-2xl border border-rule/80 bg-paper-card", className))} {...props} />;
}
