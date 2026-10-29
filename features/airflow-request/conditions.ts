import type {
  HeatExchangerPackage,
  OptionalConditions,
  PressurePackage,
} from "./model";
import { findCatalogSpec, type HeatExchangerSpec } from "./reference-data";

export const emptyConditions = (): OptionalConditions => ({
  spacePressure: { state: "", packages: [] },
  heatExchanger: { state: "", packages: [] },
  filter: { enabled: false, packages: [] },
});

const isNumber = (value: string) => value.trim() !== "" && Number.isFinite(Number(value));

function duplicates<T extends { name: string }>(items: T[], signature: (item: T) => string): string[] {
  const seen = new Map<string, string>();
  const messages: string[] = [];
  for (const item of items) {
    const key = signature(item);
    const first = seen.get(key);
    if (first) messages.push(`${first}과(와) ${item.name}의 내용이 같습니다.`);
    else seen.set(key, item.name);
  }
  return messages;
}

const pressureSignature = (p: PressurePackage) => JSON.stringify([p.inlet.trim(), p.outlet.trim()]);
const exchangerSignature = (h: HeatExchangerPackage) =>
  JSON.stringify([h.type, h.tubeDiameter, h.finType, h.rowCount, h.fpi]);

/** 사용하기로 한 선택 조건의 제출 조건을 검사한다. 없음·미사용이면 입력값이 있어도 검사하지 않는다. */
export function validateConditions(conditions: OptionalConditions): string[] {
  const issues: string[] = [];
  const { spacePressure, heatExchanger, filter } = conditions;

  if (spacePressure.state === "") issues.push("공간 압력: 값을 입력하거나 '없음'을 선택해야 합니다.");
  if (spacePressure.state === "use") {
    if (spacePressure.packages.length === 0) issues.push("공간 압력 조건을 1개 이상 입력해야 합니다.");
    for (const p of spacePressure.packages) {
      if (!isNumber(p.inlet)) issues.push(`${p.name}: 입구 압력을 입력해야 합니다.`);
      if (!isNumber(p.outlet)) issues.push(`${p.name}: 출구 압력을 입력해야 합니다.`);
    }
    issues.push(...duplicates(spacePressure.packages, pressureSignature));
  }

  if (heatExchanger.state === "") issues.push("열교환기: 사양을 입력하거나 '열교환기 없음'을 선택해야 합니다.");
  if (heatExchanger.state === "use") {
    if (heatExchanger.packages.length === 0) issues.push("열교환기 조건을 1개 이상 입력해야 합니다.");
    for (const h of heatExchanger.packages) {
      if ([h.type, h.tubeDiameter, h.finType, h.rowCount, h.fpi].some((v) => v.trim() === "")) {
        issues.push(`${h.name}: 사양을 모두 입력해야 합니다.`);
      } else if (!findCatalogSpec(h as HeatExchangerSpec)) {
        issues.push(`${h.name}: 열교환기 Catalog에 없는 사양 조합입니다.`);
      }
    }
    issues.push(...duplicates(heatExchanger.packages, exchangerSignature));
  }

  if (filter.enabled) {
    if (filter.packages.length === 0) issues.push("필터 조건을 1개 이상 입력해야 합니다.");
    for (const pkg of filter.packages) {
      if (pkg.physicalFilters.length === 0) issues.push(`${pkg.name}: 물리적 필터를 1개 이상 입력해야 합니다.`);
      for (const physical of pkg.physicalFilters) {
        const where = `${pkg.name}의 ${physical.name}`;
        if (physical.points.length === 0) issues.push(`${where}: 측정점을 1개 이상 입력해야 합니다.`);
        physical.points.forEach((point, i) => {
          if (!isNumber(point.velocity) || Number(point.velocity) < 0) issues.push(`${where}: 측정점 ${i + 1}의 유속을 입력해야 합니다.`);
          if (!isNumber(point.pressureLoss) || Number(point.pressureLoss) < 0) {
            issues.push(`${where}: 측정점 ${i + 1}의 압력손실을 입력해야 합니다.`);
          }
        });
      }
    }
    issues.push(
      ...duplicates(filter.packages, (pkg) =>
        JSON.stringify(pkg.physicalFilters.map((f) => f.points.map((m) => [m.velocity.trim(), m.pressureLoss.trim()]))),
      ),
    );
  }
  return issues;
}
