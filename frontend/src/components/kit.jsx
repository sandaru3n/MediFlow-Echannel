"use client";

import { forwardRef } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  teal: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  outline: "border border-input bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

export const Button = forwardRef(({ variant = "primary", loading, size = "md", className, children, disabled, type = "button", ...p }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
      size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-13 px-6 text-base" : "h-11 px-4 text-[0.95rem]",
      variants[variant],
      className,
    )}
    {...p}
  >
    {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";

export const btnClass = (variant = "primary", extra = "") =>
  cn("inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[0.95rem] font-semibold transition-colors", variants[variant], extra);

export function Card({ className, children, as: As = "div", ...p }) {
  return (
    <As className={cn("card-surface", className)} {...p}>
      {children}
    </As>
  );
}

export function Field({ id, label, hint, error, children, optionalLabel }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {optionalLabel && <span className="font-normal text-muted-foreground"> ({optionalLabel})</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-input bg-card text-base placeholder:text-muted-foreground focus-visible:border-primary aria-invalid:border-destructive disabled:opacity-60";

export const Input = forwardRef(({ className, invalid, ...p }, ref) => (
  <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "h-12 px-3.5", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef(({ className, invalid, ...p }, ref) => (
  <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "p-3", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef(({ className, invalid, children, ...p }, ref) => (
  <select ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, "h-12 px-3", className)} {...p}>
    {children}
  </select>
));
Select.displayName = "Select";

export const selectClass = cn(inputBase, "h-12 px-3");

export function Alert({ tone = "info", title, children, action, className }) {
  const map = {
    info: ["bg-accent text-accent-foreground", Info],
    error: ["bg-destructive-soft text-destructive", AlertCircle],
    success: ["bg-success-soft text-success", CheckCircle2],
    warning: ["bg-warning-soft text-warning", AlertCircle],
  };
  const [cls, Icon] = map[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg p-3.5 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
        {action}
      </div>
    </div>
  );
}

export function Badge({ tone = "muted", children, className }) {
  const m = {
    muted: "bg-muted text-muted-foreground",
    blue: "bg-accent text-accent-foreground",
    teal: "bg-teal-soft text-secondary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-destructive-soft text-destructive",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", m[tone], className)}>{children}</span>;
}

export const statusTone = (s) => ({ booked: "blue", completed: "success", cancelled: "muted" })[s] ?? "muted";

export function Skeleton({ className }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function ErrorState({ message, onRetry, retryLabel = "Try again" }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertCircle className="size-10 text-destructive" aria-hidden />
      <p className="font-semibold">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden /> {retryLabel}
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
