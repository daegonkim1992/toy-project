"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type {
  ConditionState,
  FilterPackage,
  HeatExchangerPackage,
  OptionalConditions,
  PhysicalFilter,
  PressurePackage,
} from "../model";
import { catalogOptions } from "../reference-data";
import { SelectInput, TextField } from "./form";

const nextIndex = (names: string[], prefix: string) =>
  Math.max(0, ...names.map((name) => Number(name.replace(prefix, "").trim()) || 0)) + 1;

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-heading text-base font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function UseOrNone({
  label,
  state,
  useLabel,
  noneLabel,
  onChange,
}: {
  label: string;
  state: ConditionState;
  useLabel: string;
  noneLabel: string;
  onChange: (state: "use" | "none") => void;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <RadioGroup value={state} onValueChange={(v) => onChange(v as "use" | "none")} className="flex gap-6">
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-use`} value="use" />
          <Label htmlFor={`${id}-use`}>{useLabel}</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-none`} value="none" />
          <Label htmlFor={`${id}-none`}>{noneLabel}</Label>
        </div>
      </RadioGroup>
    </Field>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Trash2Icon /> {label}
    </Button>
  );
}

// ───────────────────────── 공간 압력

function PressureSection({
  value,
  onChange,
}: {
  value: OptionalConditions["spacePressure"];
  onChange: (value: OptionalConditions["spacePressure"]) => void;
}) {
  const setPackage = (id: string, patch: Partial<PressurePackage>) =>
    onChange({ ...value, packages: value.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const newPackage = (): PressurePackage => ({
    id: crypto.randomUUID(),
    name: `공간 압력 ${nextIndex(value.packages.map((p) => p.name), "공간 압력")}`,
    inlet: "",
    outlet: "",
  });

  return (
    <Section title="공간 압력" hint="입구·출구 압력(정압·계기압, Pa) 조건이 있는 경우 입력해 주세요. 별도 압력 조건이 없는 경우에만 '없음'을 선택해 주세요.">
      <UseOrNone
        label="공간 압력 사용 여부"
        state={value.state}
        useLabel="공간 압력 있음"
        noneLabel="공간 압력 없음"
        onChange={(state) => onChange({ state, packages: state === "use" && value.packages.length === 0 ? [newPackage()] : value.packages })}
      />
      {value.state === "use" ? (
        <>
          {value.packages.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FieldGroup>
                  <TextField label={`${p.name} 입구 압력 (Pa)`} type="number" value={p.inlet} onChange={(v) => setPackage(p.id, { inlet: v })} />
                  <TextField label={`${p.name} 출구 압력 (Pa)`} type="number" value={p.outlet} onChange={(v) => setPackage(p.id, { outlet: v })} />
                </FieldGroup>
                <div>
                  <RemoveButton label={`${p.name} 삭제`} onClick={() => onChange({ ...value, packages: value.packages.filter((x) => x.id !== p.id) })} />
                </div>
              </CardContent>
            </Card>
          ))}
          <div>
            <Button variant="outline" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })}>
              <PlusIcon /> 공간 압력 추가
            </Button>
          </div>
        </>
      ) : null}
    </Section>
  );
}

// ───────────────────────── 열교환기

function ExchangerCard({
  pkg,
  onChange,
  onRemove,
}: {
  pkg: HeatExchangerPackage;
  onChange: (pkg: HeatExchangerPackage) => void;
  onRemove: () => void;
}) {
  const asOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));
  const type = pkg.type === "" ? undefined : pkg.type;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <SelectInput
            label={`${pkg.name} 유형`}
            value={pkg.type}
            options={asOptions(catalogOptions("type", {}))}
            onChange={(v) => onChange({ ...pkg, type: v as HeatExchangerPackage["type"], tubeDiameter: "", finType: "", rowCount: "", fpi: "" })}
          />
          <SelectInput
            label={`${pkg.name} 관 직경(Pi) 또는 채널 폭`}
            value={pkg.tubeDiameter}
            options={asOptions(catalogOptions("tubeDiameter", { type }))}
            disabled={!type}
            onChange={(v) => {
              const fins = catalogOptions("finType", { type, tubeDiameter: v });
              onChange({ ...pkg, tubeDiameter: v, finType: fins.length === 1 ? fins[0] : "", rowCount: "", fpi: "" });
            }}
          />
          <SelectInput
            label={`${pkg.name} Fin type`}
            value={pkg.finType}
            options={asOptions(catalogOptions("finType", { type, tubeDiameter: pkg.tubeDiameter }))}
            disabled={!pkg.tubeDiameter}
            hint={pkg.type === "Micro-Channel" ? "Micro-Channel은 Flat으로 고정됩니다." : undefined}
            onChange={(v) => onChange({ ...pkg, finType: v, rowCount: "", fpi: "" })}
          />
          <SelectInput
            label={`${pkg.name} 열 수`}
            value={pkg.rowCount}
            options={asOptions(catalogOptions("rowCount", { type, tubeDiameter: pkg.tubeDiameter, finType: pkg.finType }))}
            disabled={!pkg.finType}
            onChange={(v) => onChange({ ...pkg, rowCount: v, fpi: "" })}
          />
          <SelectInput
            label={`${pkg.name} FPI`}
            value={pkg.fpi}
            options={asOptions(
              catalogOptions("fpi", { type, tubeDiameter: pkg.tubeDiameter, finType: pkg.finType, rowCount: pkg.rowCount }),
            )}
            disabled={!pkg.rowCount}
            onChange={(v) => onChange({ ...pkg, fpi: v })}
          />
        </FieldGroup>
        <div>
          <RemoveButton label={`${pkg.name} 삭제`} onClick={onRemove} />
        </div>
      </CardContent>
    </Card>
  );
}

function ExchangerSection({
  value,
  onChange,
}: {
  value: OptionalConditions["heatExchanger"];
  onChange: (value: OptionalConditions["heatExchanger"]) => void;
}) {
  const newPackage = (): HeatExchangerPackage => ({
    id: crypto.randomUUID(),
    name: `열교환기 ${nextIndex(value.packages.map((p) => p.name), "열교환기")}`,
    type: "",
    tubeDiameter: "",
    finType: "",
    rowCount: "",
    fpi: "",
  });

  return (
    <Section title="열교환기 사양" hint="사양은 등록된 열교환기 Catalog에서 고릅니다. 열교환기가 없는 경우에만 '없음'을 선택해 주세요. 필터와는 별도 조건입니다.">
      <UseOrNone
        label="열교환기 사용 여부"
        state={value.state}
        useLabel="열교환기 사양 입력"
        noneLabel="열교환기 없음"
        onChange={(state) => onChange({ state, packages: state === "use" && value.packages.length === 0 ? [newPackage()] : value.packages })}
      />
      {value.state === "use" ? (
        <>
          {value.packages.map((pkg) => (
            <ExchangerCard
              key={pkg.id}
              pkg={pkg}
              onChange={(next) => onChange({ ...value, packages: value.packages.map((p) => (p.id === pkg.id ? next : p)) })}
              onRemove={() => onChange({ ...value, packages: value.packages.filter((p) => p.id !== pkg.id) })}
            />
          ))}
          <div>
            <Button variant="outline" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })}>
              <PlusIcon /> 열교환기 추가
            </Button>
          </div>
        </>
      ) : null}
    </Section>
  );
}

// ───────────────────────── 필터

const newPoint = () => ({ id: crypto.randomUUID(), velocity: "", pressureLoss: "" });

function newPhysicalFilter(existing: PhysicalFilter[]): PhysicalFilter {
  const used = existing.map((f) => f.name.replace("필터", "").trim().charCodeAt(0) - 64).filter((n) => n > 0);
  return { id: crypto.randomUUID(), name: `필터 ${String.fromCharCode(65 + Math.max(0, ...used))}`, points: [newPoint()] };
}

function FilterCard({
  pkg,
  onChange,
  onRemove,
}: {
  pkg: FilterPackage;
  onChange: (pkg: FilterPackage) => void;
  onRemove: () => void;
}) {
  const setPhysical = (id: string, next: PhysicalFilter) =>
    onChange({ ...pkg, physicalFilters: pkg.physicalFilters.map((f) => (f.id === id ? next : f)) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {pkg.physicalFilters.map((physical) => (
          <div key={physical.id} className="flex flex-col gap-3 rounded-md border p-4">
            <TextField
              label={`${pkg.name} 물리적 필터 이름 (${physical.name})`}
              value={physical.name}
              onChange={(v) => setPhysical(physical.id, { ...physical, name: v })}
            />
            {physical.points.map((point, i) => (
              <div key={point.id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Field>
                  <FieldLabel htmlFor={`${point.id}-v`}>{`${physical.name} 측정점 ${i + 1} 유속 (m/s)`}</FieldLabel>
                  <Input
                    id={`${point.id}-v`}
                    type="number"
                    value={point.velocity}
                    onChange={(e) =>
                      setPhysical(physical.id, {
                        ...physical,
                        points: physical.points.map((m) => (m.id === point.id ? { ...m, velocity: e.target.value } : m)),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${point.id}-p`}>{`${physical.name} 측정점 ${i + 1} 압력손실 (Pa)`}</FieldLabel>
                  <Input
                    id={`${point.id}-p`}
                    type="number"
                    value={point.pressureLoss}
                    onChange={(e) =>
                      setPhysical(physical.id, {
                        ...physical,
                        points: physical.points.map((m) => (m.id === point.id ? { ...m, pressureLoss: e.target.value } : m)),
                      })
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${physical.name} 측정점 ${i + 1} 삭제`}
                  onClick={() => setPhysical(physical.id, { ...physical, points: physical.points.filter((m) => m.id !== point.id) })}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPhysical(physical.id, { ...physical, points: [...physical.points, newPoint()] })}>
                <PlusIcon /> {physical.name} 측정점 추가
              </Button>
              <RemoveButton
                label={`${physical.name} 삭제`}
                onClick={() => onChange({ ...pkg, physicalFilters: pkg.physicalFilters.filter((f) => f.id !== physical.id) })}
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onChange({ ...pkg, physicalFilters: [...pkg.physicalFilters, newPhysicalFilter(pkg.physicalFilters)] })}>
            <PlusIcon /> {pkg.name} 물리적 필터 추가
          </Button>
          <RemoveButton label={`${pkg.name} 삭제`} onClick={onRemove} />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSection({
  value,
  onChange,
}: {
  value: OptionalConditions["filter"];
  onChange: (value: OptionalConditions["filter"]) => void;
}) {
  const id = useId();
  const newPackage = (): FilterPackage => ({
    id: crypto.randomUUID(),
    name: `필터 ${nextIndex(value.packages.map((p) => p.name), "필터")}`,
    physicalFilters: [newPhysicalFilter([])],
  });

  return (
    <Section title="필터 사양" hint="제품에 필터가 있는 경우 체크해 주세요. 필터가 없는 경우에는 체크하지 마세요.">
      <Field orientation="horizontal">
        <Checkbox
          id={id}
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({ enabled: checked === true, packages: checked === true && value.packages.length === 0 ? [newPackage()] : value.packages })
          }
        />
        <FieldLabel htmlFor={id}>제품에 필터가 있음</FieldLabel>
      </Field>
      <FieldDescription>필터 조건 패키지는 Case에서 비교하는 단위입니다. 물리적 필터나 측정점을 추가해도 Case가 늘지 않습니다.</FieldDescription>
      {value.enabled ? (
        <>
          {value.packages.map((pkg) => (
            <FilterCard
              key={pkg.id}
              pkg={pkg}
              onChange={(next) => onChange({ ...value, packages: value.packages.map((p) => (p.id === pkg.id ? next : p)) })}
              onRemove={() => onChange({ ...value, packages: value.packages.filter((p) => p.id !== pkg.id) })}
            />
          ))}
          <div>
            <Button variant="outline" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })}>
              <PlusIcon /> 필터 조건 추가
            </Button>
          </div>
        </>
      ) : null}
    </Section>
  );
}

export function OptionalConditionsStep({
  conditions,
  onChange,
}: {
  conditions: OptionalConditions;
  onChange: (conditions: OptionalConditions) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <PressureSection value={conditions.spacePressure} onChange={(spacePressure) => onChange({ ...conditions, spacePressure })} />
      <ExchangerSection value={conditions.heatExchanger} onChange={(heatExchanger) => onChange({ ...conditions, heatExchanger })} />
      <FilterSection value={conditions.filter} onChange={(filter) => onChange({ ...conditions, filter })} />
    </div>
  );
}
