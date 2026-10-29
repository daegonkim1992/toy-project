import { describe, expect, it } from "vitest";

import { kase, messages, rpmPackage, submittable } from "./fixtures";
import {
  confirmCases,
  editRequest,
  heatExchangerCatalog,
  parseRequests,
  validateSubmission,
  type AirflowRequest,
  type FilterPackage,
  type HeatExchangerPackage,
  type OptionalConditions,
  type PressurePackage,
} from "./index";

const catalogSpec = heatExchangerCatalog[0];

// Case 열 선택은 따로 검사하므로, 조건 입력 자체의 제출 조건만 본다.
const conditionIssues = (request: AirflowRequest) =>
  validateSubmission(request).filter((i) => i.step === "operating").map((i) => i.message);

const pressure = (overrides: Partial<PressurePackage> = {}): PressurePackage => ({
  id: "p1",
  name: "공간 압력 1",
  inlet: "10",
  outlet: "0",
  ...overrides,
});

const exchanger = (overrides: Partial<HeatExchangerPackage> = {}): HeatExchangerPackage => ({
  id: "h1",
  name: "열교환기 1",
  type: catalogSpec.type,
  tubeDiameter: catalogSpec.tubeDiameter,
  finType: catalogSpec.finType,
  rowCount: catalogSpec.rowCount,
  fpi: catalogSpec.fpi,
  ...overrides,
});

const filter = (overrides: Partial<FilterPackage> = {}): FilterPackage => ({
  id: "f1",
  name: "필터 1",
  physicalFilters: [{ id: "pf1", name: "필터 A", points: [{ id: "m1", velocity: "1.5", pressureLoss: "20" }] }],
  ...overrides,
});

function withConditions(patch: Partial<OptionalConditions>, request: AirflowRequest = submittable()) {
  return editRequest(request, { conditions: { ...request.conditions, ...patch } });
}

describe("공간 압력", () => {
  it("값도 없음도 고르지 않은 빈 상태로는 제출할 수 없다", () => {
    const request = withConditions({ spacePressure: { state: "", packages: [] } });
    expect(messages(request)).toContain("공간 압력: 값을 입력하거나 '없음'을 선택해야 합니다.");
  });

  it("사용하기로 하면 입구와 출구 압력을 모두 입력해야 한다", () => {
    const empty = withConditions({ spacePressure: { state: "use", packages: [pressure({ inlet: "", outlet: "" })] } });
    expect(messages(empty)).toEqual(
      expect.arrayContaining(["공간 압력 1: 입구 압력을 입력해야 합니다.", "공간 압력 1: 출구 압력을 입력해야 합니다."]),
    );
    expect(messages(withConditions({ spacePressure: { state: "use", packages: [] } }))).toContain(
      "공간 압력 조건을 1개 이상 입력해야 합니다.",
    );
  });

  it("같은 내용의 공간 압력 패키지는 중복될 수 없다", () => {
    const request = withConditions({
      spacePressure: { state: "use", packages: [pressure(), pressure({ id: "p2", name: "공간 압력 2" })] },
    });
    expect(messages(request)).toContain("공간 압력 1과(와) 공간 압력 2의 내용이 같습니다.");
  });
});

describe("열교환기", () => {
  it("사양을 입력하지도 없음을 고르지도 않으면 제출할 수 없다", () => {
    const request = withConditions({ heatExchanger: { state: "", packages: [] } });
    expect(messages(request)).toContain("열교환기: 사양을 입력하거나 '열교환기 없음'을 선택해야 합니다.");
  });

  it("Catalog에 있는 사양 조합이면 제출할 수 있다", () => {
    const request = withConditions({ heatExchanger: { state: "use", packages: [exchanger()] } });
    expect(conditionIssues(request)).toEqual([]);
  });

  it("Catalog에 없는 사양 조합은 제출할 수 없다", () => {
    const request = withConditions({ heatExchanger: { state: "use", packages: [exchanger({ fpi: "999" })] } });
    expect(messages(request)).toContain("열교환기 1: 열교환기 Catalog에 없는 사양 조합입니다.");
  });

  it("사양을 비워 두면 제출할 수 없다", () => {
    const request = withConditions({ heatExchanger: { state: "use", packages: [exchanger({ tubeDiameter: "" })] } });
    expect(messages(request)).toContain("열교환기 1: 사양을 모두 입력해야 합니다.");
  });

  it("열교환기 없음을 고르면 사양을 요구하지 않고, 이미 입력한 값도 보존된다", () => {
    const used = withConditions({ heatExchanger: { state: "use", packages: [exchanger({ fpi: "999" })] } });
    const none = withConditions({ heatExchanger: { ...used.conditions.heatExchanger, state: "none" } }, used);
    expect(conditionIssues(none)).toEqual([]);
    expect(none.conditions.heatExchanger.packages).toHaveLength(1);
  });

  it("같은 사양의 열교환기 패키지는 중복될 수 없다", () => {
    const request = withConditions({
      heatExchanger: { state: "use", packages: [exchanger(), exchanger({ id: "h2", name: "열교환기 2" })] },
    });
    expect(messages(request)).toContain("열교환기 1과(와) 열교환기 2의 내용이 같습니다.");
  });
});

describe("필터", () => {
  it("제품에 필터가 있음을 체크하지 않으면 필터를 요구하지 않는다", () => {
    expect(conditionIssues(withConditions({ filter: { enabled: false, packages: [] } }))).toEqual([]);
  });

  it("체크하면 필터 패키지, 물리적 필터, 측정점이 1개 이상 있어야 한다", () => {
    expect(messages(withConditions({ filter: { enabled: true, packages: [] } }))).toContain("필터 조건을 1개 이상 입력해야 합니다.");
    const noPhysical = withConditions({ filter: { enabled: true, packages: [filter({ physicalFilters: [] })] } });
    expect(messages(noPhysical)).toContain("필터 1: 물리적 필터를 1개 이상 입력해야 합니다.");
    const noPoint = withConditions({
      filter: { enabled: true, packages: [filter({ physicalFilters: [{ id: "pf1", name: "필터 A", points: [] }] })] },
    });
    expect(messages(noPoint)).toContain("필터 1의 필터 A: 측정점을 1개 이상 입력해야 합니다.");
  });

  it("측정점의 유속과 압력손실은 숫자여야 한다", () => {
    const bad = withConditions({
      filter: {
        enabled: true,
        packages: [filter({ physicalFilters: [{ id: "pf1", name: "필터 A", points: [{ id: "m1", velocity: "", pressureLoss: "abc" }] }] })],
      },
    });
    expect(messages(bad)).toEqual(
      expect.arrayContaining(["필터 1의 필터 A: 측정점 1의 유속을 입력해야 합니다.", "필터 1의 필터 A: 측정점 1의 압력손실을 입력해야 합니다."]),
    );
  });

  it("체크를 해제하면 입력한 필터 값이 보존된다", () => {
    const on = withConditions({ filter: { enabled: true, packages: [filter()] } });
    const off = withConditions({ filter: { ...on.conditions.filter, enabled: false } }, on);
    expect(off.conditions.filter.packages).toHaveLength(1);
  });

  it("같은 구성의 필터 패키지는 중복될 수 없다", () => {
    const request = withConditions({
      filter: { enabled: true, packages: [filter(), filter({ id: "f2", name: "필터 2" })] },
    });
    expect(messages(request)).toContain("필터 1과(와) 필터 2의 내용이 같습니다.");
  });
});

describe("Case의 선택 조건 열", () => {
  const withPressureColumn = () => {
    const base = submittable();
    return editRequest(base, {
      conditions: { ...base.conditions, spacePressure: { state: "use", packages: [pressure()] } },
    });
  };

  it("선택지가 하나뿐인 조건은 운전 조건을 고른 Case에 자동으로 들어간다", () => {
    const request = withPressureColumn();
    expect(request.cases.every((row) => row.pressureId === "p1")).toBe(true);
    expect(confirmCases(request).ok).toBe(true);
  });

  it("선택지가 둘 이상인 활성 조건의 열은 모두 선택해야 한다", () => {
    const base = withPressureColumn();
    const two = editRequest(base, {
      conditions: { ...base.conditions, spacePressure: { state: "use", packages: [pressure(), pressure({ id: "p2", name: "공간 압력 2", inlet: "20" })] } },
      cases: base.cases.map((row) => ({ ...row, pressureId: "" })),
    });
    const result = confirmCases(two);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.message)).toContain("Case 1의 공간 압력을 선택해야 합니다.");
  });

  it("미사용이거나 없음인 조건은 열이 활성화되지 않아 선택을 요구하지 않는다", () => {
    expect(confirmCases(submittable()).ok).toBe(true);
  });

  it("활성 열을 모두 선택하면 확인할 수 있다", () => {
    const request = withPressureColumn();
    const selected = editRequest(request, {
      cases: request.cases.map((row) => ({ ...row, pressureId: "p1" })),
    });
    expect(confirmCases(selected).ok).toBe(true);
  });

  it("선택 조건까지 모두 같은 Case는 중복이고, 하나라도 다르면 중복이 아니다", () => {
    const request = editRequest(withPressureColumn(), {
      conditions: {
        ...withPressureColumn().conditions,
        spacePressure: { state: "use", packages: [pressure(), pressure({ id: "p2", name: "공간 압력 2", inlet: "20" })] },
      },
    });
    const sameCase = editRequest(request, {
      cases: [kase("k1", "base", "op1", { pressureId: "p1" }), kase("k2", "c1", "op1", { pressureId: "p1" }), kase("k3", "c1", "op1", { pressureId: "p1" })],
    });
    const dup = confirmCases(sameCase);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.issues.map((i) => i.message)).toContain("형상 2 + 운전 1 + 공간 압력 1 조합이 중복됩니다.");

    const different = editRequest(request, {
      cases: [kase("k1", "base", "op1", { pressureId: "p1" }), kase("k2", "c1", "op1", { pressureId: "p1" }), kase("k3", "c1", "op1", { pressureId: "p2" })],
    });
    expect(confirmCases(different).ok).toBe(true);
  });

  it("입력한 활성 패키지는 최소 한 Case에서 쓰여야 한다", () => {
    const request = withPressureColumn();
    const unused = editRequest(request, {
      conditions: {
        ...request.conditions,
        spacePressure: { state: "use", packages: [pressure(), pressure({ id: "p2", name: "공간 압력 2", inlet: "20" })] },
      },
      cases: request.cases.map((row) => ({ ...row, pressureId: "p1" })),
    });
    const result = confirmCases(unused);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.message)).toContain("공간 압력 2이(가) 어떤 Case에서도 쓰이지 않습니다.");
  });

  it("조건을 없음으로 바꾸면 Case의 선택이 비워지고 Case 재확인이 필요하며 값은 보존된다", () => {
    const request = withPressureColumn();
    const selected = editRequest(request, { cases: request.cases.map((row) => ({ ...row, pressureId: "p1" })) });
    const none = editRequest(selected, {
      conditions: { ...selected.conditions, spacePressure: { ...selected.conditions.spacePressure, state: "none" } },
    });
    expect(none.cases.every((row) => row.pressureId === "")).toBe(true);
    expect(none.casesConfirmed).toBe(false);
    expect(none.conditions.spacePressure.packages).toHaveLength(1);
  });

  it("필터 안의 물리적 필터나 측정점을 추가해도 Case 행은 늘지 않는다", () => {
    const base = submittable();
    const withFilter = editRequest(base, { conditions: { ...base.conditions, filter: { enabled: true, packages: [filter()] } } });
    const selected = editRequest(withFilter, { cases: withFilter.cases.map((row) => ({ ...row, filterId: "f1" })) });
    const extended = editRequest(selected, {
      conditions: {
        ...selected.conditions,
        filter: {
          enabled: true,
          packages: [
            filter({
              physicalFilters: [
                { id: "pf1", name: "필터 A", points: [{ id: "m1", velocity: "1.5", pressureLoss: "20" }, { id: "m2", velocity: "2", pressureLoss: "30" }] },
                { id: "pf2", name: "필터 B", points: [{ id: "m3", velocity: "1", pressureLoss: "10" }] },
              ],
            }),
          ],
        },
      },
    });
    expect(extended.cases).toHaveLength(selected.cases.length);
    expect(extended.cases.every((row) => row.filterId === "f1")).toBe(true);
  });

  it("사라진 패키지를 고른 Case의 선택은 비워지고, 남은 선택지가 하나뿐이면 그것으로 채워진다", () => {
    const request = editRequest(withPressureColumn(), {
      conditions: {
        ...withPressureColumn().conditions,
        spacePressure: { state: "use", packages: [pressure(), pressure({ id: "p2", name: "공간 압력 2", inlet: "20" })] },
      },
    });
    const selected = editRequest(request, { cases: request.cases.map((row) => ({ ...row, pressureId: "p1" })) });
    const twoLeft = editRequest(selected, {
      conditions: {
        ...selected.conditions,
        spacePressure: { state: "use", packages: [pressure({ id: "p8", name: "공간 압력 8" }), pressure({ id: "p9", name: "공간 압력 9", inlet: "30" })] },
      },
    });
    expect(twoLeft.cases.every((row) => row.pressureId === "")).toBe(true);
    const oneLeft = editRequest(twoLeft, {
      conditions: { ...twoLeft.conditions, spacePressure: { state: "use", packages: [pressure({ id: "p9", name: "공간 압력 9" })] } },
    });
    expect(oneLeft.cases.every((row) => row.pressureId === "p9")).toBe(true);
  });
});

describe("이전 형식으로 저장된 의뢰서", () => {
  it("선택 조건이 없던 의뢰서를 불러오면 빈 선택 조건과 Case 열이 채워진다", () => {
    const old = submittable();
    const legacy = {
      ...old,
      conditions: undefined,
      cases: old.cases.map((row) => ({ id: row.id, productId: row.productId, operatingId: row.operatingId })),
    };
    const [loaded] = parseRequests(JSON.stringify([legacy]));
    expect(loaded.conditions).toEqual({
      spacePressure: { state: "", packages: [] },
      heatExchanger: { state: "", packages: [] },
      filter: { enabled: false, packages: [] },
    });
    expect(loaded.cases[0]).toMatchObject({ pressureId: "", heatExchangerId: "", filterId: "" });
  });
});

describe("운전 조건과 함께 쓰는 제출", () => {
  it("선택 조건이 모두 없음이면 이전과 같이 제출할 수 있다", () => {
    expect(validateSubmission(submittable())).toEqual([]);
    expect(rpmPackage().name).toBe("운전 1");
  });
});
