import type {
  CaseRow,
  FilterPackage,
  HeatExchangerPackage,
  OperatingPackage,
  PressurePackage,
  Product,
  RequestContent,
  SubmissionIssue,
} from "./model";

/** Case 열에서 고를 수 있는 값. 선택 조건은 사용 중일 때만 배열이고, 아니면 null(열 없음)이다. */
export type CaseSources = {
  products: Product[];
  operating: OperatingPackage[];
  pressures: PressurePackage[] | null;
  heatExchangers: HeatExchangerPackage[] | null;
  filters: FilterPackage[] | null;
};

export function caseSources(content: Pick<RequestContent, "base" | "comparisons" | "operating" | "conditions">): CaseSources {
  const { spacePressure, heatExchanger, filter } = content.conditions;
  return {
    products: [content.base, ...content.comparisons],
    operating: content.operating,
    pressures: spacePressure.state === "use" ? spacePressure.packages : null,
    heatExchangers: heatExchanger.state === "use" ? heatExchanger.packages : null,
    filters: filter.enabled ? filter.packages : null,
  };
}

export function defaultCaseRow(productId: string): CaseRow {
  return { id: `case-${productId}`, productId, operatingId: "", pressureId: "", heatExchangerId: "", filterId: "" };
}

const keepIf = (id: string, list: { id: string }[] | null) => (list !== null && list.some((item) => item.id === id) ? id : "");

/** 없어진 형상의 행은 지우고, 없어진 선택과 사용하지 않는 조건의 열은 비우고, 행이 없는 형상에는 기본 행을 더한다. */
export function reconcileCases(rows: CaseRow[], sources: CaseSources): CaseRow[] {
  const productIds = new Set(sources.products.map((p) => p.id));
  const kept = rows
    .filter((row) => row.productId === "" || productIds.has(row.productId))
    .map((row) => ({
      ...row,
      operatingId: keepIf(row.operatingId, sources.operating),
      pressureId: keepIf(row.pressureId, sources.pressures),
      heatExchangerId: keepIf(row.heatExchangerId, sources.heatExchangers),
      filterId: keepIf(row.filterId, sources.filters),
    }));
  const covered = new Set(kept.map((row) => row.productId));
  const added = sources.products.filter((p) => !covered.has(p.id)).map((p) => defaultCaseRow(p.id));
  return [...kept, ...added];
}

type Column = {
  label: string;
  josa: string;
  list: { id: string; name: string }[];
  pick: (row: CaseRow) => string;
};

export function validateCases(rows: CaseRow[], sources: CaseSources): SubmissionIssue[] {
  const issues: SubmissionIssue[] = [];
  const add = (message: string) => issues.push({ step: "cases", message });

  const columns: Column[] = [
    { label: "운전 조건", josa: "을", list: sources.operating, pick: (r) => r.operatingId },
    ...(sources.pressures ? [{ label: "공간 압력", josa: "을", list: sources.pressures, pick: (r: CaseRow) => r.pressureId }] : []),
    ...(sources.heatExchangers ? [{ label: "열교환기", josa: "를", list: sources.heatExchangers, pick: (r: CaseRow) => r.heatExchangerId }] : []),
    ...(sources.filters ? [{ label: "필터", josa: "를", list: sources.filters, pick: (r: CaseRow) => r.filterId }] : []),
  ];
  const nameOf = (list: { id: string; name: string }[], id: string) => list.find((item) => item.id === id)?.name ?? "";
  const productName = (id: string) => sources.products.find((p) => p.id === id)?.displayName ?? "";

  if (rows.length === 0) add("Case를 1행 이상 만들어야 합니다.");
  rows.forEach((row, index) => {
    if (!sources.products.some((p) => p.id === row.productId)) add(`Case ${index + 1}의 형상을 선택해야 합니다.`);
    for (const column of columns) {
      if (!column.list.some((item) => item.id === column.pick(row))) {
        add(`Case ${index + 1}의 ${column.label}${column.josa} 선택해야 합니다.`);
      }
    }
  });

  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const row of rows) {
    const complete = row.productId && columns.every((column) => column.pick(row));
    if (!complete) continue;
    const key = [row.productId, ...columns.map((column) => column.pick(row))].join("|");
    if (seen.has(key) && !reported.has(key)) {
      const names = [productName(row.productId), ...columns.map((c) => nameOf(c.list, c.pick(row)))];
      add(`${names.join(" + ")} 조합이 중복됩니다.`);
      reported.add(key);
    }
    seen.add(key);
  }

  for (const product of sources.products) {
    if (!rows.some((row) => row.productId === product.id)) add(`${product.displayName}이(가) 어떤 Case에서도 쓰이지 않습니다.`);
  }
  for (const column of columns) {
    for (const item of column.list) {
      if (!rows.some((row) => column.pick(row) === item.id)) add(`${item.name}이(가) 어떤 Case에서도 쓰이지 않습니다.`);
    }
  }
  return issues;
}
