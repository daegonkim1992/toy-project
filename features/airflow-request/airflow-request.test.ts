import { describe, expect, it } from "vitest";

import {
  completeDraft,
  kase,
  kim,
  lee,
  lockedDraft,
  manager,
  messages,
  now,
  park,
  rpmPackage,
  submittable,
} from "./fixtures";

import {
  allowedActions,
  confirmCases,
  createDraft,
  editRequest,
  lockTarget,
  submitRequest,
  validateSubmission,
  visibleRequests,
  type OperatingPackage,
} from "./index";

describe("의뢰번호", () => {
  it("의뢰 대상을 확정하면 CFD-YYYYMMDD-NNN 형식으로 발급된다", () => {
    expect(lockedDraft().requestNo).toBe("CFD-20261029-001");
  });

  it("같은 날 두 번째 의뢰는 다른 번호를 받는다", () => {
    const first = lockedDraft(kim, "r1");
    const second = lockedDraft(lee, "r2", [first]);
    expect(second.requestNo).toBe("CFD-20261029-002");
  });

  it("취소된 의뢰의 번호는 다시 쓰이지 않는다", () => {
    const cancelled = { ...lockedDraft(kim, "r1"), status: "cancelled" as const };
    expect(lockedDraft(lee, "r2", [cancelled]).requestNo).toBe("CFD-20261029-002");
  });

  it("등록되지 않은 제품 분류 조합은 확정할 수 없다", () => {
    const draft = createDraft(kim, now, "r1");
    const result = lockTarget(
      editRequest(draft, { target: { ...draft.target, division: "SAC", lineup: "없는 라인업" } }),
      [],
      now,
    );
    expect(result.ok).toBe(false);
  });

  it("RAC Window는 해석 범위를 골라야 확정할 수 있다", () => {
    const draft = createDraft(park, now, "r1");
    const window = { ...draft.target, division: "RAC", lineup: "Window", platform: "Window", chassis: "" };
    expect(lockTarget(editRequest(draft, { target: window }), [], now).ok).toBe(false);
    expect(lockTarget(editRequest(draft, { target: { ...window, scope: "both" } }), [], now).ok).toBe(true);
  });

  it("통합형 제품은 운전 구분을 골라야 확정할 수 있다", () => {
    const draft = createDraft(kim, now, "r1");
    const unified = { ...draft.target, division: "Air Care", lineup: "Air Purifier", platform: "Integrated", chassis: "" };
    expect(lockTarget(editRequest(draft, { target: unified }), [], now).ok).toBe(false);
    expect(lockTarget(editRequest(draft, { target: { ...unified, operationMode: "indoor" } }), [], now).ok).toBe(true);
  });
});

describe("의뢰 내용 제출 조건", () => {
  it("완성된 의뢰서는 제출 조건을 모두 충족한다", () => {
    expect(validateSubmission(submittable())).toEqual([]);
  });

  it("의뢰 대상을 확정하지 않으면 제출할 수 없다", () => {
    const draft = createDraft(kim, now, "r1");
    expect(validateSubmission(draft).some((i) => i.step === "target")).toBe(true);
  });

  it("개발 프로젝트는 해당 사업부의 PMS 프로젝트를 골라야 한다", () => {
    const request = submittable();
    const dev = { ...request, info: { ...request.info, requestType: "개발 프로젝트" } };
    expect(messages(dev)).toContain("PMS 프로젝트를 선택해야 합니다.");
    const otherDivision = { ...dev, info: { ...dev.info, pmsProjectId: "pms-rac-1", developmentGrade: "A", npiStage: "DV" } };
    expect(messages(otherDivision)).toContain("제품 사업부(SAC)에 해당하는 PMS 프로젝트를 선택해야 합니다.");
  });

  it("PMS 프로젝트를 고르면 개발 등급과 NPI 단계가 필수가 된다", () => {
    const request = submittable();
    const dev = { ...request, info: { ...request.info, requestType: "개발 프로젝트", pmsProjectId: "pms-sac-1" } };
    expect(messages(dev)).toEqual(expect.arrayContaining(["개발 등급을 입력해야 합니다.", "NPI 단계를 입력해야 합니다."]));
    const filled = { ...dev, info: { ...dev.info, developmentGrade: "A", npiStage: "DV" } };
    expect(validateSubmission(filled)).toEqual([]);
  });

  it("개발 프로젝트가 아니면 PMS를 요구하지 않는다", () => {
    expect(validateSubmission(submittable())).toEqual([]);
  });

  it("희망 완료일이 의뢰 요청일보다 앞서면 제출할 수 없다", () => {
    const request = submittable();
    const early = { ...request, info: { ...request.info, desiredDate: "2026-10-28" } };
    expect(messages(early)).toContain("희망 완료일은 의뢰 요청일(2026-10-29)보다 앞설 수 없습니다.");
    const same = { ...request, info: { ...request.info, desiredDate: "2026-10-29" } };
    expect(validateSubmission(same)).toEqual([]);
  });

  it("자유 입력은 200자를 넘을 수 없다", () => {
    const request = submittable();
    const long = { ...request, info: { ...request.info, background: "가".repeat(201) } };
    expect(messages(long)).toContain("해석을 요청하게 된 배경은 200자를 넘을 수 없습니다.");
    const ok = { ...request, info: { ...request.info, background: "가".repeat(200) } };
    expect(validateSubmission(ok)).toEqual([]);
  });
});

describe("해석 제품 제출 조건", () => {
  it("모든 제품에 도면번호가 있어야 한다", () => {
    const request = submittable();
    const noDrawing = { ...request, base: { ...request.base, drawingNo: "" } };
    expect(messages(noDrawing)).toContain("Base 제품의 도면번호를 입력해야 합니다.");
  });

  it("도면번호는 영문, 숫자, 하이픈만 쓸 수 있다", () => {
    const request = submittable();
    const bad = { ...request, base: { ...request.base, drawingNo: "도면 001" } };
    expect(messages(bad)).toContain("Base 제품의 도면번호는 영문, 숫자, 하이픈만 쓸 수 있습니다.");
  });

  it("제품끼리 도면번호가 중복될 수 없다", () => {
    const request = submittable();
    const dup = { ...request, comparisons: [{ ...request.comparisons[0], drawingNo: "base-001" }] };
    expect(messages(dup)).toContain("도면번호 base-001이(가) 다른 제품과 중복됩니다.");
  });

  it("비교 제품에는 Base 대비 차이 설명이 있어야 한다", () => {
    const request = submittable();
    const noDiff = { ...request, comparisons: [{ ...request.comparisons[0], difference: "  " }] };
    expect(messages(noDiff)).toContain("형상 2의 Base 대비 차이를 입력해야 합니다.");
  });
});

describe("운전 조건 제출 조건", () => {
  const withOperating = (operating: OperatingPackage[]) => {
    const request = submittable();
    return { ...request, operating };
  };

  it("팬 개수는 1~10이어야 한다", () => {
    expect(messages(withOperating([rpmPackage({ fanCount: "0" })]))).toContain("운전 1: 팬 개수는 1~10 사이의 정수여야 합니다.");
    expect(messages(withOperating([rpmPackage({ fanCount: "11" })]))).toContain("운전 1: 팬 개수는 1~10 사이의 정수여야 합니다.");
  });

  it("팬별 설정이면 팬마다 회전수와 팬 위치가 필요하다", () => {
    const individual = rpmPackage({
      fanCount: "2",
      rpmMode: "individual",
      fans: [{ rpm: "800", location: "좌측" }, { rpm: "", location: "" }],
    });
    const result = messages(withOperating([individual]));
    expect(result).toContain("운전 1: 팬 2의 팬 위치를 입력해야 합니다.");
    expect(result).toContain("운전 1: 모든 팬의 회전수를 입력해야 합니다.");
  });

  it("풍량을 입력하면 풍량 활용 목적이 필수가 된다", () => {
    const result = messages(withOperating([rpmPackage({ airflow: "120" })]));
    expect(result).toContain("운전 1: 풍량 활용 목적을 선택해야 합니다.");
  });

  it("회전수 없이 풍량만 있고 활용 목적이 참고 정보이면 제출할 수 없다", () => {
    const pkg = rpmPackage({ commonRpm: "", airflow: "120", airflowPurpose: "reference" });
    expect(messages(withOperating([pkg]))).toContain("운전 1: 풍량을 참고 정보로 줄 때는 회전수를 입력해야 합니다.");
  });

  it("회전수 없이 풍량을 해석에 반영하는 조합은 허용한다", () => {
    const pkg = rpmPackage({ commonRpm: "", airflow: "120", airflowPurpose: "reflect" });
    expect(validateSubmission(withOperating([pkg]))).toEqual([]);
  });

  it("회전수도 풍량도 없으면 제출할 수 없다", () => {
    expect(messages(withOperating([rpmPackage({ commonRpm: "" })]))).toContain("운전 1: 회전수 또는 풍량을 입력해야 합니다.");
  });

  it("운전 조건 패키지가 하나도 없으면 제출할 수 없다", () => {
    expect(messages(withOperating([]))).toContain("운전 조건을 1개 이상 입력해야 합니다.");
  });

  it("같은 내용의 운전 조건 패키지는 중복될 수 없다", () => {
    const dup = [rpmPackage(), rpmPackage({ id: "op2", name: "운전 2" })];
    expect(messages(withOperating(dup))).toContain("운전 1과(와) 운전 2의 내용이 같습니다.");
  });
});

describe("Case 구성", () => {
  it("의뢰서를 만들면 형상마다 기본 Case 1행이 생기고 운전은 선택되지 않은 상태다", () => {
    const draft = lockedDraft();
    expect(draft.cases).toHaveLength(1);
    expect(draft.cases[0]).toMatchObject({ productId: draft.base.id, operatingId: "" });
  });

  it("활성 열을 모두 선택해야 한다", () => {
    const request = completeDraft();
    const unselected = editRequest(request, { cases: [...request.cases.slice(0, 1), kase("k2", "c1", "")] });
    expect(confirmCases(unselected).ok).toBe(false);
  });

  it("같은 형상과 운전 조합의 Case는 중복될 수 없다", () => {
    const request = completeDraft();
    const dup = editRequest(request, { cases: [...request.cases, kase("k3", "c1", "op1")] });
    const result = confirmCases(dup);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.message)).toContain("형상 2 + 운전 1 조합이 중복됩니다.");
  });

  it("입력한 형상과 운전 조건은 최소 한 Case에서 쓰여야 한다", () => {
    const request = completeDraft();
    const unused = editRequest(request, { operating: [...request.operating, rpmPackage({ id: "op2", name: "운전 2", commonRpm: "700" })] });
    const result = confirmCases(unused);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.message)).toContain("운전 2이(가) 어떤 Case에서도 쓰이지 않습니다.");
  });

  it("Case 구성을 확인하지 않으면 제출할 수 없다", () => {
    expect(messages(completeDraft())).toContain("Case 구성을 확인해야 합니다.");
  });

  it("제품이나 조건을 바꾸면 사라진 선택이 비워지고 Case 재확인이 필요하다", () => {
    const confirmed = submittable();
    const replaced = editRequest(confirmed, { operating: [rpmPackage({ id: "op9", name: "운전 9", commonRpm: "500" })] });
    expect(replaced.cases.every((row) => row.operatingId === "")).toBe(true);
    expect(replaced.casesConfirmed).toBe(false);
  });

  it("아직 선택하지 않은 빈 Case 행도 추가할 수 있다", () => {
    const request = completeDraft();
    const added = editRequest(request, { cases: [...request.cases, kase("k9", "", "")] });
    expect(added.cases).toHaveLength(3);
  });

  it("제품을 삭제하면 그 형상의 Case가 사라지고, 추가하면 기본 행이 생긴다", () => {
    const confirmed = submittable();
    const withoutComparison = editRequest(confirmed, { comparisons: [] });
    expect(withoutComparison.cases.map((row) => row.productId)).toEqual([confirmed.base.id]);
    const added = editRequest(withoutComparison, {
      comparisons: [{ id: "c9", drawingNo: "NEW-009", displayName: "형상 2", difference: "변경" }],
    });
    expect(added.cases.map((row) => row.productId)).toEqual([confirmed.base.id, "c9"]);
  });
});

describe("제출", () => {
  it("제출하면 검토 중이 되고 revision 1과 이력이 남는다", () => {
    const result = submitRequest(submittable(), kim, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("under_review");
    expect(result.request.revisions).toHaveLength(1);
    expect(result.request.revisions[0]).toMatchObject({ no: 1, submittedBy: kim.id });
    expect(result.request.history.at(-1)).toMatchObject({ type: "submitted", from: "draft", to: "under_review", actorId: kim.id });
  });

  it("제출 조건을 어기면 제출되지 않고 위치가 돌아온다", () => {
    const base = submittable();
    const request = editRequest(base, { base: { ...base.base, drawingNo: "" } });
    const result = submitRequest(request, kim, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].step).toBe("products");
  });

  it("다른 사용자는 제출할 수 없다", () => {
    expect(submitRequest(submittable(), lee, now).ok).toBe(false);
  });

  it("검토 중에는 의뢰서 내용을 수정할 수 없다", () => {
    const result = submitRequest(submittable(), kim, now);
    if (!result.ok) throw new Error("제출 실패");
    const edited = editRequest(result.request, { info: { ...result.request.info, background: "바꿈" } });
    expect(edited.info.background).toBe(result.request.info.background);
  });
});

describe("조회 범위와 가능한 기능", () => {
  const kimDraft = lockedDraft(kim, "r-kim");
  const kimSubmitted = { ...lockedDraft(kim, "r-kim2"), status: "under_review" as const };
  const parkDraft = lockedDraft(park, "r-park");
  const all = [kimDraft, kimSubmitted, parkDraft];

  it("의뢰자는 같은 부서 사용자가 제출한 의뢰를 본다", () => {
    expect(visibleRequests(lee, all).map((r) => r.id)).toEqual(["r-kim2"]);
  });

  it("작성 중인 의뢰는 작성자만 본다", () => {
    expect(visibleRequests(kim, all).map((r) => r.id)).toEqual(["r-kim", "r-kim2"]);
  });

  it("다른 부서 사용자의 의뢰는 보이지 않는다", () => {
    expect(visibleRequests(park, all).map((r) => r.id)).toEqual(["r-park"]);
  });

  it("작성자만 작성 중 의뢰를 수정하고 제출하는 메뉴를 본다", () => {
    expect(allowedActions(kim, kimDraft)).toEqual(["edit", "submit"]);
    expect(allowedActions(lee, kimSubmitted)).toEqual([]);
    expect(allowedActions(kim, kimSubmitted)).toEqual([]);
  });

  it("해석관리자는 작성 중이 아닌 의뢰를 모두 본다", () => {
    expect(visibleRequests(manager, all).map((r) => r.id)).toEqual(["r-kim2"]);
  });
});
