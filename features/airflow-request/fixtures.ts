// 테스트에서 쓰는 의뢰서 조립 도구. 공개 API(createDraft, lockTarget, editRequest)만 거친다.
import { sampleUsers } from "@/features/people";

import { confirmCases, createDraft, editRequest, lockTarget, validateSubmission } from "./request";
import type { AirflowRequest, CaseRow, OperatingPackage } from "./model";

export const kim = sampleUsers.find((u) => u.id === "u-kim")!;
export const lee = sampleUsers.find((u) => u.id === "u-lee")!;
export const park = sampleUsers.find((u) => u.id === "u-park")!;
export const manager = sampleUsers.find((u) => u.role === "manager")!;
export const now = new Date(2026, 9, 29, 10, 0, 0);

const sacTarget = { division: "SAC", lineup: "Multi V", platform: "Cassette", chassis: "4Way" };

export function lockedDraft(user = kim, id = "r1", existing: AirflowRequest[] = []) {
  const draft = createDraft(user, now, id);
  const result = lockTarget(editRequest(draft, { target: { ...draft.target, ...sacTarget } }), existing, now);
  if (!result.ok) throw new Error(result.message);
  return result.request;
}

export const rpmPackage = (overrides: Partial<OperatingPackage> = {}): OperatingPackage => ({
  id: "op1",
  name: "운전 1",
  fanCount: "1",
  rpmMode: "common",
  commonRpm: "900",
  fans: [],
  airflow: "",
  airflowPurpose: "",
  ...overrides,
});

export const kase = (
  id: string,
  productId: string,
  operatingId: string,
  rest: Partial<Pick<CaseRow, "pressureId" | "heatExchangerId" | "filterId">> = {},
): CaseRow => ({ id, productId, operatingId, pressureId: "", heatExchangerId: "", filterId: "", ...rest });

/** 운전 조건만 채우고 선택 조건은 모두 "없음"으로 둔 의뢰서. Case는 아직 확인하지 않았다. */
export function completeDraft(user = kim, id = "r1", existing: AirflowRequest[] = []): AirflowRequest {
  const request = lockedDraft(user, id, existing);
  const edited = editRequest(request, {
    info: {
      ...request.info,
      requestType: "품질 개선",
      modelSuffix: "ABC.AKOR",
      desiredDate: "2026-11-30",
      background: "팬이 변경됨",
      wantedResult: "풍량 변화 확인",
    },
    base: { ...request.base, drawingNo: "BASE-001" },
    comparisons: [{ id: "c1", drawingNo: "NEW-002", displayName: "형상 2", difference: "팬 직경 변경" }],
    operating: [rpmPackage()],
    conditions: {
      ...request.conditions,
      spacePressure: { state: "none", packages: [] },
      heatExchanger: { state: "none", packages: [] },
    },
  });
  return editRequest(edited, { cases: [kase("k1", edited.base.id, "op1"), kase("k2", "c1", "op1")] });
}

export function submittable(user = kim, id = "r1") {
  const confirmed = confirmCases(completeDraft(user, id));
  if (!confirmed.ok) throw new Error(confirmed.issues[0].message);
  return confirmed.request;
}

export const messages = (request: AirflowRequest) => validateSubmission(request).map((i) => i.message);
