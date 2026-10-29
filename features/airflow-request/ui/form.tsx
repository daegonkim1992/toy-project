"use client";

import { useId, useState, type ReactNode } from "react";

import { SimpleSelect, type Option } from "@/components/select-field";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  hint,
  placeholder,
  disabled,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  hint?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SimpleSelect id={id} value={value} onChange={onChange} options={options} disabled={disabled} />
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

const OTHER = "__other__";

/** 목록에서 고르거나 "직접 입력"을 골라 값을 적는다. */
export function ChoiceField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const id = useId();
  const [other, setOther] = useState(value !== "" && !options.includes(value));
  const selected = other ? OTHER : value;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SimpleSelect
        id={id}
        value={selected}
        onChange={(next) => {
          if (next === OTHER) {
            setOther(true);
            if (options.includes(value)) onChange("");
          } else {
            setOther(false);
            onChange(next);
          }
        }}
        options={[...options.map((o) => ({ value: o, label: o })), { value: OTHER, label: "직접 입력" }]}
      />
      {other ? (
        <Input aria-label={`${label} 직접 입력`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : null}
    </Field>
  );
}
