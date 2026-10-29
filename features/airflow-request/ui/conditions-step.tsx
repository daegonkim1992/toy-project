"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { SimpleSelect } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type {
  AirflowRequest,
  FanSetting,
  FilterPackage,
  HeatExchangerPackage,
  OperatingPackage,
  OptionalConditions,
  PhysicalFilter,
  PressurePackage,
} from "../model";
import { newOperatingPackage } from "../operating";
import { catalogOptions } from "../reference-data";
import { CellInput, ConditionHeading, SectionHeading } from "./form-layout";

// 풍량 지원 단위는 [추후 정의]. 임시로 하나를 고정해 라벨에 표시한다.
const AIRFLOW_UNIT = "m³/min";

const nextIndex = (names: string[], prefix: string) =>
  Math.max(0, ...names.map((name) => Number(name.replace(prefix, "").trim()) || 0)) + 1;
const replaceAt = <T,>(list: T[], index: number, item: T) => list.map((x, i) => (i === index ? item : x));
const removeAt = <T,>(list: T[], index: number) => list.filter((_, i) => i !== index);

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
      <Trash2Icon />
    </Button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <PlusIcon /> {label}
    </Button>
  );
}

// ───────────────────────── 운전 조건

function OperatingRows({ pkg, onChange, onRemove }: { pkg: OperatingPackage; onChange: (pkg: OperatingPackage) => void; onRemove: () => void }) {
  const fanCount = Number(pkg.fanCount);
  const fanRows = Number.isInteger(fanCount) && fanCount >= 1 && fanCount <= 10 ? fanCount : 0;
  const fanAt = (i: number): FanSetting => pkg.fans[i] ?? { rpm: "", location: "" };
  const setFan = (i: number, patch: Partial<FanSetting>) => {
    const fans = Array.from({ length: Math.max(pkg.fans.length, i + 1) }, (_, k) => fanAt(k));
    fans[i] = { ...fans[i], ...patch };
    onChange({ ...pkg, fans });
  };
  const hasAirflow = pkg.airflow.trim() !== "";

  return (
    <>
      <TableRow>
        <TableCell className="font-medium whitespace-nowrap">{pkg.name}</TableCell>
        <TableCell>
          <CellInput label={`${pkg.name} 팬 개수`} type="number" value={pkg.fanCount} className="w-20" onChange={(v) => onChange({ ...pkg, fanCount: v })} />
        </TableCell>
        <TableCell>
          <SimpleSelect
            ariaLabel={`${pkg.name} 회전수 설정`}
            value={pkg.rpmMode}
            className="h-8 w-36"
            options={[
              { value: "common", label: "모든 팬 동일" },
              { value: "individual", label: "팬별 설정" },
            ]}
            onChange={(v) => onChange({ ...pkg, rpmMode: v as OperatingPackage["rpmMode"] })}
          />
        </TableCell>
        <TableCell>
          {pkg.rpmMode === "common" ? (
            <CellInput label={`${pkg.name} 회전수`} type="number" value={pkg.commonRpm} onChange={(v) => onChange({ ...pkg, commonRpm: v })} />
          ) : (
            <span className="text-sm text-muted-foreground">팬별 {fanRows}개 · 아래 행</span>
          )}
        </TableCell>
        <TableCell>
          <CellInput
            label={`${pkg.name} 풍량`}
            type="number"
            value={pkg.airflow}
            onChange={(v) => onChange({ ...pkg, airflow: v, airflowPurpose: v.trim() === "" ? "" : pkg.airflowPurpose })}
          />
        </TableCell>
        <TableCell>
          <SimpleSelect
            ariaLabel={`${pkg.name} 풍량 활용`}
            value={pkg.airflowPurpose}
            disabled={!hasAirflow}
            placeholder="—"
            className="h-8 w-32"
            options={[
              { value: "reflect", label: "해석에 반영" },
              { value: "reference", label: "참고 정보" },
            ]}
            onChange={(v) => onChange({ ...pkg, airflowPurpose: v as OperatingPackage["airflowPurpose"] })}
          />
        </TableCell>
        <TableCell>
          <RemoveButton label={`${pkg.name} 삭제`} onClick={onRemove} />
        </TableCell>
      </TableRow>
      {pkg.rpmMode === "individual" && fanRows > 0 ? (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell />
          <TableCell colSpan={6}>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: fanRows }, (_, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_6rem] items-center gap-2">
                  <span className="text-sm">팬 {i + 1}</span>
                  <CellInput label={`${pkg.name} 팬 ${i + 1} 위치`} placeholder="위치" value={fanAt(i).location} onChange={(v) => setFan(i, { location: v })} />
                  <CellInput label={`${pkg.name} 팬 ${i + 1} 회전수`} placeholder="rpm" type="number" value={fanAt(i).rpm} onChange={(v) => setFan(i, { rpm: v })} />
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function OperatingSection({ operating, onChange }: { operating: OperatingPackage[]; onChange: (operating: OperatingPackage[]) => void }) {
  return (
    <section aria-label="운전 조건" className="flex flex-col gap-3">
      <SectionHeading
        title="운전 조건"
        aside="운전 대안마다 한 줄 · 회전수나 풍량 중 하나는 필수"
        help="서로 비교할 운전 대안은 운전 조건을 따로 추가하고, 한 운전 조건 안에서 동시에 도는 여러 팬은 팬 개수로 입력합니다(최대 10개). 회전수 숫자가 같다는 이유만으로 '모든 팬 동일'로 보지 않습니다. 풍량을 입력하면 해석에 반영할지 참고 정보로만 줄지 고릅니다."
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>팬 개수</TableHead>
              <TableHead>회전수 설정</TableHead>
              <TableHead>회전수 (rpm)</TableHead>
              <TableHead>풍량 ({AIRFLOW_UNIT})</TableHead>
              <TableHead>풍량 활용</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {operating.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  운전 조건을 추가해 주세요.
                </TableCell>
              </TableRow>
            ) : null}
            {operating.map((pkg, i) => (
              <OperatingRows key={pkg.id} pkg={pkg} onChange={(next) => onChange(replaceAt(operating, i, next))} onRemove={() => onChange(removeAt(operating, i))} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <AddButton
          label="운전 조건 추가"
          onClick={() => onChange([...operating, newOperatingPackage(crypto.randomUUID(), nextIndex(operating.map((p) => p.name), "운전"))])}
        />
      </div>
    </section>
  );
}

// ───────────────────────── 공간 압력

function PressureSection({ value, onChange }: { value: OptionalConditions["spacePressure"]; onChange: (value: OptionalConditions["spacePressure"]) => void }) {
  const newPackage = (): PressurePackage => ({
    id: crypto.randomUUID(),
    name: `공간 압력 ${nextIndex(value.packages.map((p) => p.name), "공간 압력")}`,
    inlet: "",
    outlet: "",
  });
  return (
    <section aria-label="공간 압력" className="flex flex-col gap-3">
      <ConditionHeading
        title="공간 압력"
        value={value.state}
        noneNote="없음 · 입력값은 보존됩니다"
        onChange={(state) => onChange({ state, packages: state === "use" && value.packages.length === 0 ? [newPackage()] : value.packages })}
      />
      {value.state === "use" ? (
        <>
          <p className="text-sm text-muted-foreground">입구·출구 압력(정압·계기압, Pa)</p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>입구 압력 (Pa)</TableHead>
                  <TableHead>출구 압력 (Pa)</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.packages.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                    <TableCell>
                      <CellInput label={`${p.name} 입구 압력`} type="number" value={p.inlet} onChange={(v) => onChange({ ...value, packages: replaceAt(value.packages, i, { ...p, inlet: v }) })} />
                    </TableCell>
                    <TableCell>
                      <CellInput label={`${p.name} 출구 압력`} type="number" value={p.outlet} onChange={(v) => onChange({ ...value, packages: replaceAt(value.packages, i, { ...p, outlet: v }) })} />
                    </TableCell>
                    <TableCell>
                      <RemoveButton label={`${p.name} 삭제`} onClick={() => onChange({ ...value, packages: removeAt(value.packages, i) })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <AddButton label="공간 압력 추가" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })} />
          </div>
        </>
      ) : null}
    </section>
  );
}

// ───────────────────────── 열교환기

const HX_COLUMNS = [
  ["type", "유형"],
  ["tubeDiameter", "관 직경 / 채널 폭"],
  ["finType", "Fin type"],
  ["rowCount", "열 수"],
  ["fpi", "FPI"],
] as const;

function ExchangerRow({ pkg, onChange, onRemove }: { pkg: HeatExchangerPackage; onChange: (pkg: HeatExchangerPackage) => void; onRemove: () => void }) {
  const type = pkg.type === "" ? undefined : pkg.type;
  const chosen = { type, tubeDiameter: pkg.tubeDiameter, finType: pkg.finType, rowCount: pkg.rowCount };
  // 앞 칸을 바꾸면 뒤 칸을 비우고, 선택지가 하나뿐이면 바로 채운다(Micro-Channel의 Flat 등).
  const choose = (index: number, value: string) => {
    const next = { ...pkg, [HX_COLUMNS[index][0]]: value } as HeatExchangerPackage;
    for (const [field] of HX_COLUMNS.slice(index + 1)) (next as Record<string, string>)[field] = "";
    const following = HX_COLUMNS[index + 1];
    if (following) {
      const options = catalogOptions(following[0], { type: next.type || undefined, tubeDiameter: next.tubeDiameter, finType: next.finType, rowCount: next.rowCount });
      if (options.length === 1) (next as Record<string, string>)[following[0]] = options[0];
    }
    onChange(next);
  };
  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">{pkg.name}</TableCell>
      {HX_COLUMNS.map(([field, label], index) => {
        const previousField = index > 0 ? HX_COLUMNS[index - 1][0] : undefined;
        const enabled = !previousField || pkg[previousField] !== "";
        const options = catalogOptions(field, index === 0 ? {} : Object.fromEntries(Object.entries(chosen).slice(0, index)));
        return (
          <TableCell key={field}>
            <SimpleSelect
              ariaLabel={`${pkg.name} ${label}`}
              value={pkg[field]}
              disabled={!enabled}
              className="h-8 w-full min-w-24"
              options={options.map((o) => ({ value: o, label: o }))}
              onChange={(v) => choose(index, v)}
            />
          </TableCell>
        );
      })}
      <TableCell>
        <RemoveButton label={`${pkg.name} 삭제`} onClick={onRemove} />
      </TableCell>
    </TableRow>
  );
}

function ExchangerSection({ value, onChange }: { value: OptionalConditions["heatExchanger"]; onChange: (value: OptionalConditions["heatExchanger"]) => void }) {
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
    <section aria-label="열교환기" className="flex flex-col gap-3">
      <ConditionHeading
        title="열교환기"
        value={value.state}
        noneNote="없음 · 입력값은 보존됩니다"
        onChange={(state) => onChange({ state, packages: state === "use" && value.packages.length === 0 ? [newPackage()] : value.packages })}
      />
      {value.state === "use" ? (
        <>
          <p className="text-sm text-muted-foreground">등록된 Catalog에 있는 조합만 고를 수 있습니다. 필터와는 별도 조건입니다.</p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  {HX_COLUMNS.map(([field, label]) => (
                    <TableHead key={field}>{label}</TableHead>
                  ))}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.packages.map((pkg, i) => (
                  <ExchangerRow
                    key={pkg.id}
                    pkg={pkg}
                    onChange={(next) => onChange({ ...value, packages: replaceAt(value.packages, i, next) })}
                    onRemove={() => onChange({ ...value, packages: removeAt(value.packages, i) })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <AddButton label="열교환기 추가" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })} />
          </div>
        </>
      ) : null}
    </section>
  );
}

// ───────────────────────── 필터

const newPoint = () => ({ id: crypto.randomUUID(), velocity: "", pressureLoss: "" });

function newPhysicalFilter(existing: PhysicalFilter[]): PhysicalFilter {
  const used = existing.map((f) => f.name.replace("필터", "").trim().charCodeAt(0) - 64).filter((n) => n > 0);
  return { id: crypto.randomUUID(), name: `필터 ${String.fromCharCode(65 + Math.max(0, ...used))}`, points: [newPoint()] };
}

function FilterTable({ pkg, onChange, onRemove }: { pkg: FilterPackage; onChange: (pkg: FilterPackage) => void; onRemove: () => void }) {
  const setPhysical = (index: number, next: PhysicalFilter) => onChange({ ...pkg, physicalFilters: replaceAt(pkg.physicalFilters, index, next) });
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold">{pkg.name}</h3>
        <div className="flex gap-1">
          <AddButton label={`${pkg.name} 물리적 필터 추가`} onClick={() => onChange({ ...pkg, physicalFilters: [...pkg.physicalFilters, newPhysicalFilter(pkg.physicalFilters)] })} />
          <RemoveButton label={`${pkg.name} 삭제`} onClick={onRemove} />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>물리적 필터</TableHead>
            <TableHead>측정점</TableHead>
            <TableHead>유속 (m/s)</TableHead>
            <TableHead>압력손실 (Pa)</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pkg.physicalFilters.map((physical, fi) => (
            <PhysicalRows key={physical.id} physical={physical} onChange={(next) => setPhysical(fi, next)} onRemove={() => onChange({ ...pkg, physicalFilters: removeAt(pkg.physicalFilters, fi) })} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PhysicalRows({ physical, onChange, onRemove }: { physical: PhysicalFilter; onChange: (next: PhysicalFilter) => void; onRemove: () => void }) {
  const span = Math.max(physical.points.length, 1);
  const setPoint = (index: number, patch: Partial<PhysicalFilter["points"][number]>) =>
    onChange({ ...physical, points: replaceAt(physical.points, index, { ...physical.points[index], ...patch }) });
  const nameCell = (
    <TableCell rowSpan={span} className="align-top">
      <div className="flex flex-col gap-2">
        <CellInput label={`${physical.name} 이름`} value={physical.name} onChange={(v) => onChange({ ...physical, name: v })} />
        <div className="flex gap-1">
          <Button variant="outline" size="xs" onClick={() => onChange({ ...physical, points: [...physical.points, newPoint()] })}>
            <PlusIcon /> {physical.name} 측정점 추가
          </Button>
          <RemoveButton label={`${physical.name} 삭제`} onClick={onRemove} />
        </div>
      </div>
    </TableCell>
  );
  if (physical.points.length === 0) {
    return (
      <TableRow>
        {nameCell}
        <TableCell colSpan={4} className="text-muted-foreground">
          측정점을 추가해 주세요.
        </TableCell>
      </TableRow>
    );
  }
  return (
    <>
      {physical.points.map((point, i) => (
        <TableRow key={point.id}>
          {i === 0 ? nameCell : null}
          <TableCell>{i + 1}</TableCell>
          <TableCell>
            <CellInput label={`${physical.name} 측정점 ${i + 1} 유속`} type="number" value={point.velocity} onChange={(v) => setPoint(i, { velocity: v })} />
          </TableCell>
          <TableCell>
            <CellInput label={`${physical.name} 측정점 ${i + 1} 압력손실`} type="number" value={point.pressureLoss} onChange={(v) => setPoint(i, { pressureLoss: v })} />
          </TableCell>
          <TableCell>
            <RemoveButton label={`${physical.name} 측정점 ${i + 1} 삭제`} onClick={() => onChange({ ...physical, points: removeAt(physical.points, i) })} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FilterSection({ value, onChange }: { value: OptionalConditions["filter"]; onChange: (value: OptionalConditions["filter"]) => void }) {
  const newPackage = (): FilterPackage => ({
    id: crypto.randomUUID(),
    name: `필터 ${nextIndex(value.packages.map((p) => p.name), "필터")}`,
    physicalFilters: [newPhysicalFilter([])],
  });
  return (
    <section aria-label="필터" className="flex flex-col gap-3">
      <ConditionHeading
        title="필터"
        value={value.enabled ? "use" : "none"}
        noneNote="없음"
        onChange={(state) =>
          onChange({ enabled: state === "use", packages: state === "use" && value.packages.length === 0 ? [newPackage()] : value.packages })
        }
      />
      {value.enabled ? (
        <>
          <p className="text-sm text-muted-foreground">필터 조건이 Case에서 비교하는 단위입니다. 물리적 필터나 측정점을 추가해도 Case는 늘지 않습니다.</p>
          {value.packages.map((pkg, i) => (
            <FilterTable
              key={pkg.id}
              pkg={pkg}
              onChange={(next) => onChange({ ...value, packages: replaceAt(value.packages, i, next) })}
              onRemove={() => onChange({ ...value, packages: removeAt(value.packages, i) })}
            />
          ))}
          <div>
            <AddButton label="필터 조건 추가" onClick={() => onChange({ ...value, packages: [...value.packages, newPackage()] })} />
          </div>
        </>
      ) : null}
    </section>
  );
}

export function ConditionsStep({
  request,
  onOperatingChange,
  onConditionsChange,
}: {
  request: AirflowRequest;
  onOperatingChange: (operating: OperatingPackage[]) => void;
  onConditionsChange: (conditions: OptionalConditions) => void;
}) {
  const { conditions } = request;
  return (
    <div className="flex flex-col gap-8">
      <OperatingSection operating={request.operating} onChange={onOperatingChange} />
      <div className="flex flex-col gap-6">
        <PressureSection value={conditions.spacePressure} onChange={(spacePressure) => onConditionsChange({ ...conditions, spacePressure })} />
        <ExchangerSection value={conditions.heatExchanger} onChange={(heatExchanger) => onConditionsChange({ ...conditions, heatExchanger })} />
        <FilterSection value={conditions.filter} onChange={(filter) => onConditionsChange({ ...conditions, filter })} />
      </div>
    </div>
  );
}
