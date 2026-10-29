"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { AirflowRequest, FanSetting, OperatingPackage } from "../model";
import { newOperatingPackage } from "../operating";
import { TextField } from "./form";

// 풍량 지원 단위는 [추후 정의]. 임시로 하나를 고정해 라벨에 표시한다.
const AIRFLOW_UNIT = "m³/min";

function RadioOption({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function PackageCard({
  pkg,
  removable,
  onChange,
  onRemove,
}: {
  pkg: OperatingPackage;
  removable: boolean;
  onChange: (pkg: OperatingPackage) => void;
  onRemove: () => void;
}) {
  const fanCount = Number(pkg.fanCount);
  const fanRows = Number.isInteger(fanCount) && fanCount >= 1 && fanCount <= 10 ? fanCount : 0;
  const fanAt = (i: number): FanSetting => pkg.fans[i] ?? { rpm: "", location: "" };
  const setFan = (i: number, patch: Partial<FanSetting>) => {
    const fans = Array.from({ length: Math.max(pkg.fans.length, i + 1) }, (_, k) => fanAt(k));
    fans[i] = { ...fans[i], ...patch };
    onChange({ ...pkg, fans });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FieldGroup>
          <TextField
            label={`${pkg.name} 팬 개수`}
            type="number"
            min={1}
            max={10}
            value={pkg.fanCount}
            hint="한 운전 조건에 팬은 최대 10개입니다. 동시에 도는 여러 팬은 이 안에 입력하고, 서로 다른 운전 대안은 운전 조건을 따로 추가합니다."
            onChange={(v) => onChange({ ...pkg, fanCount: v })}
          />
          <Field>
            <FieldLabel>{pkg.name} 팬 회전수 설정 방식</FieldLabel>
            <RadioGroup
              value={pkg.rpmMode}
              onValueChange={(v) => onChange({ ...pkg, rpmMode: v as OperatingPackage["rpmMode"] })}
              className="flex gap-6"
            >
              <RadioOption id={`${pkg.id}-common`} value="common" label="모든 팬 동일" />
              <RadioOption id={`${pkg.id}-individual`} value="individual" label="팬별 설정" />
            </RadioGroup>
            <FieldDescription>회전수 숫자가 같다는 이유만으로 &ldquo;동일&rdquo;로 보지 않습니다.</FieldDescription>
          </Field>
          {pkg.rpmMode === "common" ? (
            <TextField label={`${pkg.name} 팬 회전수 (rpm)`} type="number" value={pkg.commonRpm} onChange={(v) => onChange({ ...pkg, commonRpm: v })} />
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: fanRows }, (_, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${pkg.id}-loc-${i}`}>{`팬 ${i + 1} 위치`}</FieldLabel>
                    <Input id={`${pkg.id}-loc-${i}`} value={fanAt(i).location} onChange={(e) => setFan(i, { location: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${pkg.id}-rpm-${i}`}>{`팬 ${i + 1} 회전수 (rpm)`}</FieldLabel>
                    <Input id={`${pkg.id}-rpm-${i}`} type="number" value={fanAt(i).rpm} onChange={(e) => setFan(i, { rpm: e.target.value })} />
                  </Field>
                </div>
              ))}
            </div>
          )}
          <TextField
            label={`${pkg.name} 제품 풍량 (${AIRFLOW_UNIT}, 선택)`}
            type="number"
            value={pkg.airflow}
            onChange={(v) => onChange({ ...pkg, airflow: v })}
          />
          {pkg.airflow.trim() !== "" ? (
            <Field>
              <FieldLabel>{pkg.name} 풍량 활용 목적</FieldLabel>
              <RadioGroup
                value={pkg.airflowPurpose}
                onValueChange={(v) => onChange({ ...pkg, airflowPurpose: v as OperatingPackage["airflowPurpose"] })}
                className="flex gap-6"
              >
                <RadioOption id={`${pkg.id}-reflect`} value="reflect" label="해석에 반영 요청" />
                <RadioOption id={`${pkg.id}-reference`} value="reference" label="참고 정보로 제공" />
              </RadioGroup>
            </Field>
          ) : null}
        </FieldGroup>
        {removable ? (
          <div>
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2Icon /> {pkg.name} 삭제
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OperatingStep({ request, onChange }: { request: AirflowRequest; onChange: (operating: OperatingPackage[]) => void }) {
  const { operating } = request;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        운전 조건은 서로 비교할 운전 대안입니다. 회전수나 풍량 중 하나는 입력해야 하며, 풍량을 입력하면 해석에 반영할지 참고로만 줄지 정합니다.
      </p>
      {operating.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          removable
          onChange={(next) => onChange(operating.map((p) => (p.id === pkg.id ? next : p)))}
          onRemove={() => onChange(operating.filter((p) => p.id !== pkg.id))}
        />
      ))}
      <div>
        <Button
          variant="outline"
          onClick={() => {
            const used = operating.map((p) => Number(p.name.replace("운전 ", "")) || 0);
            onChange([...operating, newOperatingPackage(crypto.randomUUID(), Math.max(0, ...used) + 1)]);
          }}
        >
          <PlusIcon /> 운전 조건 추가
        </Button>
      </div>
    </div>
  );
}
