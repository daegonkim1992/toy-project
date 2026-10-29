import type { CaseRow, OperatingPackage, Product, SubmissionIssue } from "./model";

export function defaultCaseRow(productId: string): CaseRow {
  return { id: `case-${productId}`, productId, operatingId: "" };
}

/** 없어진 형상의 행은 지우고, 없어진 운전 선택은 비우고, 행이 없는 형상에는 기본 행을 더한다. */
export function reconcileCases(rows: CaseRow[], products: Product[], operating: OperatingPackage[]): CaseRow[] {
  const productIds = new Set(products.map((p) => p.id));
  const operatingIds = new Set(operating.map((o) => o.id));
  const kept = rows
    .filter((row) => row.productId === "" || productIds.has(row.productId))
    .map((row) => (operatingIds.has(row.operatingId) ? row : { ...row, operatingId: "" }));
  const covered = new Set(kept.map((row) => row.productId));
  const added = products.filter((p) => !covered.has(p.id)).map((p) => defaultCaseRow(p.id));
  return [...kept, ...added];
}

export function validateCases(rows: CaseRow[], products: Product[], operating: OperatingPackage[]): SubmissionIssue[] {
  const issues: SubmissionIssue[] = [];
  const add = (message: string) => issues.push({ step: "cases", message });
  const productName = (id: string) => products.find((p) => p.id === id)?.displayName ?? "";
  const operatingName = (id: string) => operating.find((o) => o.id === id)?.name ?? "";

  if (rows.length === 0) add("Case를 1행 이상 만들어야 합니다.");
  rows.forEach((row, index) => {
    if (!products.some((p) => p.id === row.productId)) add(`Case ${index + 1}의 형상을 선택해야 합니다.`);
    if (!operating.some((o) => o.id === row.operatingId)) add(`Case ${index + 1}의 운전 조건을 선택해야 합니다.`);
  });

  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const row of rows) {
    if (!row.productId || !row.operatingId) continue;
    const key = `${row.productId}|${row.operatingId}`;
    if (seen.has(key) && !reported.has(key)) {
      add(`${productName(row.productId)} + ${operatingName(row.operatingId)} 조합이 중복됩니다.`);
      reported.add(key);
    }
    seen.add(key);
  }

  for (const product of products) {
    if (!rows.some((row) => row.productId === product.id)) add(`${product.displayName}이(가) 어떤 Case에서도 쓰이지 않습니다.`);
  }
  for (const pkg of operating) {
    if (!rows.some((row) => row.operatingId === pkg.id)) add(`${pkg.name}이(가) 어떤 Case에서도 쓰이지 않습니다.`);
  }
  return issues;
}
