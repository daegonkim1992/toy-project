"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Option = { value: string; label: string };

export function SimpleSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled,
  className,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={value === "" ? null : value}
      onValueChange={(next) => onChange(next ?? "")}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
