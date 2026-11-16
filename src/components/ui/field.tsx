import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-xl border bg-white px-4 text-[15px] text-ink placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500";

interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
}

type InputProps = ComponentProps<"input"> & FieldProps;

/** Input acessível: label associado, erro anunciado via aria-describedby. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(control, "h-12", error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-slate-200")}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

type TextareaProps = ComponentProps<"textarea"> & FieldProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(control, "min-h-28 py-3", error ? "border-red-400" : "border-slate-200")}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

type SelectProps = ComponentProps<"select"> & FieldProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, className, id, children, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%2364748b%22 stroke-width=%221.5%22 fill=%22none%22/></svg>')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10", error ? "border-red-400" : "border-slate-200")}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode; error?: string };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, error, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
        <input ref={ref} id={inputId} type="checkbox" className="mt-0.5 size-5 shrink-0 rounded-md border-slate-300 accent-brand-600" {...props} />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
