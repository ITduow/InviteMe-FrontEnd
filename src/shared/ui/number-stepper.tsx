"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

export function NumberStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 20,
  disabled = false,
  invalid = false,
  describedBy,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label: string;
}) {
  const number = Number(value);
  return (
    <div className="flex items-center gap-1 rounded-lg border border-foreground/15 bg-white p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-label={`Giảm ${label.toLocaleLowerCase("vi")}`}
        disabled={disabled || !value || number <= min}
        onClick={() => onChange(String(Math.max(min, number - 1)))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Input
        id={id}
        type="number"
        name="capacity"
        value={value}
        min={min}
        max={max}
        required
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-0 border-0 bg-white px-1 text-center shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-label={`Tăng ${label.toLocaleLowerCase("vi")}`}
        disabled={disabled || !value || number >= max}
        onClick={() => onChange(String(Math.min(max, Math.max(min, number + 1))))}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
