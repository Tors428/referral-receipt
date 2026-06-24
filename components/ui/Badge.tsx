/**
 * Clinical-style badge — a small, rounded label used for status, confidence,
 * urgency, and audit metadata across the app.
 */

import { clsx } from "clsx";

type Variant = "neutral" | "success" | "warning" | "danger" | "accent";

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const styles: Record<Variant, string> = {
    neutral: "bg-canvas text-muted border-border",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger:  "bg-danger/10 text-danger border-danger/30",
    accent:  "bg-accent/10 text-accent border-accent/30",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}