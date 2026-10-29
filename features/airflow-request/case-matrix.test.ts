import { describe, expect, it } from "vitest";

import { kase, rpmPackage, submittable } from "./fixtures";
import {
  allCombinations,
  caseSources,
  confirmCases,
  editRequest,
  isMatrixMode,
  toggleMatrixCell,
  type AirflowRequest,
  type HeatExchangerPackage,
} from "./index";

const exchanger = (id: string, fpi: string): HeatExchangerPackage => ({
  id,
  name: `열교환기 ${id}`,
  type: "Fin&Tube",
  tubeDiameter: "7",
  finType: "Slit",
  rowCount: "2",
  fpi,
});

function withExchangers(count: number, request: AirflowRequest = submittable()) {
  const packages = Array.from({ length: count }, (_, i) => exchanger(`h${i + 1}`, i === 0 ? "14" : "16"));
  return editRequest(request, { conditions: { ...request.conditions, heatExchanger: { state: "use", packages } } });
}

describe("Case 격자 사용 조건", () => {
  it("선택 조건이 모두 없음이면 형상 × 운전 조건 격자로 고른다", () => {
    expect(isMatrixMode(caseSources(submittable()))).toBe(true);
  });

  it("활성 선택 조건의 선택지가 하나뿐이면 격자로 고른다", () => {
    expect(isMatrixMode(caseSources(withExchangers(1)))).toBe(true);
  });

  it("선택지가 둘 이상인 조건이 있으면 표로 고른다", () => {
    expect(isMatrixMode(caseSources(withExchangers(2)))).toBe(false);
  });
});

describe("격자 칸 선택", () => {
  it("칸을 고르면 그 형상과 운전 조건의 Case가 생기고, 하나뿐인 선택지가 자동으로 들어간다", () => {
    const request = withExchangers(1);
    const sources = caseSources(request);
    const rows = toggleMatrixCell([], "c1", "op1", sources);
    expect(rows).toEqual([expect.objectContaining({ productId: "c1", operatingId: "op1", heatExchangerId: "h1" })]);
  });

  it("고른 칸을 다시 누르면 그 Case가 빠진다", () => {
    const sources = caseSources(submittable());
    const rows = toggleMatrixCell([kase("k1", "base", "op1"), kase("k2", "c1", "op1")], "c1", "op1", sources);
    expect(rows.map((r) => r.productId)).toEqual(["base"]);
  });

  it("아무 조합도 없던 형상의 기본 행을 첫 칸 선택에 다시 쓴다", () => {
    const sources = caseSources(submittable());
    const rows = toggleMatrixCell([kase("k1", "base", "op1"), kase("blank", "c1", "")], "c1", "op1", sources);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ id: "blank", productId: "c1", operatingId: "op1" });
  });
});

describe("전부 조합", () => {
  it("형상, 운전 조건, 활성 선택 조건의 모든 조합을 만든다", () => {
    const request = editRequest(withExchangers(2), { operating: [rpmPackage(), rpmPackage({ id: "op2", name: "운전 2", commonRpm: "700" })] });
    const rows = allCombinations(caseSources(request));
    expect(rows).toHaveLength(2 * 2 * 2);
    expect(new Set(rows.map((r) => `${r.productId}|${r.operatingId}|${r.heatExchangerId}`)).size).toBe(8);
  });

  it("만든 조합은 그대로 Case 구성 확인을 통과한다", () => {
    const request = withExchangers(2);
    const filled = editRequest(request, { cases: allCombinations(caseSources(request)) });
    expect(confirmCases(filled).ok).toBe(true);
  });

  it("업무정의서의 자동 조합 상한 200개를 넘기지 않는다", () => {
    const base = submittable();
    const many = editRequest(base, {
      comparisons: Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, drawingNo: `D-${i}`, displayName: `형상 ${i + 2}`, difference: "변경" })),
      operating: Array.from({ length: 10 }, (_, i) => rpmPackage({ id: `op${i}`, name: `운전 ${i + 1}`, commonRpm: String(500 + i) })),
    });
    expect(allCombinations(caseSources(many))).toHaveLength(200);
  });
});

describe("조합이 없는 형상 안내", () => {
  it("아무것도 고르지 않은 형상은 형상 이름으로 안내한다", () => {
    const request = editRequest(submittable(), { cases: [kase("k1", "base", "op1"), kase("blank", "c1", "")] });
    const result = confirmCases(request);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.message)).toContain("형상 2의 조합을 하나 이상 골라야 합니다.");
  });
});
