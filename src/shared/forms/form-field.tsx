"use client";
import { useId, type ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Label } from "@/shared/ui/label";

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  children,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  children: (props: {
    id: string;
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    ref: (element: unknown) => void;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label htmlFor={id}>{label}</Label>
          {children({
            ...field,
            id,
            "aria-invalid": !!fieldState.error,
            "aria-describedby": fieldState.error ? `${id}-error` : undefined,
          })}
          {fieldState.error && (
            <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
