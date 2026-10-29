import { findUser, type SessionUser } from "@/features/people";

import type { AirflowRequest, HistoryEvent, RequestContent, RequestInfo, RequestStatus } from "./model";
import { visibleRequests } from "./request";

export type ActionResult = { ok: true; request: AirflowRequest } | { ok: false; message: string };

const fail = (message: string): ActionResult => ({ ok: false, message });

// 보완 요청 사유 코드(검토 단계). 업무정의서 3.7의 초안을 채택했다.
export const REVIEW_REASONS = [
  { code: "INFO_MISSING", label: "정보 누락" },
  { code: "CONDITION_UNCLEAR", label: "조건 불명확" },
  { code: "CONDITION_INVALID", label: "조건 오류" },
  { code: "GEOMETRY_NOT_READY", label: "형상 미비" },
  { code: "PURPOSE_UNCLEAR", label: "목적 불명확" },
  { code: "TYPE_MISMATCH", label: "해석유형 부적합" },
  { code: "OTHER", label: "기타" },
] as const;

function withEvent(request: AirflowRequest, to: RequestStatus, event: Omit<HistoryEvent, "from" | "to">): AirflowRequest {
  return { ...request, status: to, history: [...request.history, { ...event, from: request.status, to }] };
}

export function requestRevision(
  request: AirflowRequest,
  user: SessionUser,
  reason: { code: string; note: string },
  now: Date,
): ActionResult {
  if (user.role !== "manager") return fail("해석관리자만 보완을 요청할 수 있습니다.");
  if (request.status !== "under_review") return fail("검토 중인 의뢰에서만 보완을 요청할 수 있습니다.");
  if (!REVIEW_REASONS.some((r) => r.code === reason.code)) return fail("사유 코드를 선택해야 합니다.");
  if (reason.note.trim() === "") return fail("보완이 필요한 내용을 설명해야 합니다.");
  return {
    ok: true,
    request: withEvent(request, "revision_needed", {
      type: "revision_requested",
      actorId: user.id,
      at: now.toISOString(),
      note: reason.note.trim(),
      reasonCode: reason.code,
    }),
  };
}

export function acceptRequest(request: AirflowRequest, user: SessionUser, analystId: string, now: Date): ActionResult {
  if (user.role !== "manager") return fail("해석관리자만 접수할 수 있습니다.");
  if (request.status !== "under_review") return fail("검토 중인 의뢰만 접수할 수 있습니다.");
  const analyst = findUser(analystId);
  if (!analyst || analyst.role !== "analyst") return fail("해석담당자를 지정해야 합니다.");
  const accepted = withEvent(request, "in_progress", {
    type: "accepted",
    actorId: user.id,
    at: now.toISOString(),
    note: `담당자 ${analyst.name}`,
  });
  return { ok: true, request: { ...accepted, assigneeId: analyst.id } };
}

export function cancelRequest(request: AirflowRequest, user: SessionUser, now: Date): ActionResult {
  if (request.ownerId !== user.id || user.role !== "requester") return fail("작성자만 취소할 수 있습니다.");
  if (!["draft", "under_review", "revision_needed"].includes(request.status)) {
    return fail("접수 이후에는 이 화면에서 취소할 수 없습니다.");
  }
  return { ok: true, request: withEvent(request, "cancelled", { type: "cancelled", actorId: user.id, at: now.toISOString(), note: "" }) };
}

export function latestRevisionRequest(request: AirflowRequest): HistoryEvent | undefined {
  return [...request.history].reverse().find((event) => event.type === "revision_requested");
}

const INFO_LABEL: Record<keyof RequestInfo, string> = {
  requesterDivision: "의뢰자 사업부",
  department: "부서",
  requesterName: "요청자",
  rank: "직급",
  requestType: "의뢰 유형",
  pmsProjectId: "프로젝트명(PMS)",
  developmentGrade: "개발 등급",
  npiStage: "NPI 단계",
  modelSuffix: "모델명",
  desiredDate: "희망 완료일",
  background: "해석을 요청하게 된 배경",
  wantedResult: "해석으로 확인하고 싶은 내용",
  decisionUse: "결과 활용 목적",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function diffById<T extends { id: string; name?: string; displayName?: string }>(group: string, before: T[], after: T[]): string[] {
  const label = (item: T) => item.displayName ?? item.name ?? item.id;
  const changes: string[] = [];
  for (const item of after) {
    const old = before.find((x) => x.id === item.id);
    if (!old) changes.push(`${group}: ${label(item)} 추가`);
    else if (!same(old, item)) changes.push(`${group}: ${label(item)} 변경`);
  }
  for (const old of before) {
    if (!after.some((x) => x.id === old.id)) changes.push(`${group}: ${label(old)} 삭제`);
  }
  return changes;
}

/** 이전 revision 대비 달라진 항목. 검토자가 무엇이 바뀌었는지 볼 때 쓴다. */
export function changedItems(before: RequestContent, after: RequestContent): string[] {
  const changes: string[] = [];
  for (const key of Object.keys(INFO_LABEL) as (keyof RequestInfo)[]) {
    if (before.info[key] !== after.info[key]) changes.push(`의뢰 내용: ${INFO_LABEL[key]}`);
  }
  if (before.base.drawingNo !== after.base.drawingNo) changes.push("해석 제품: Base 도면번호");
  changes.push(...diffById("해석 제품", before.comparisons, after.comparisons));
  changes.push(...diffById("운전 조건", before.operating, after.operating));
  if (!same(before.conditions.spacePressure, after.conditions.spacePressure)) changes.push("선택 조건: 공간 압력");
  if (!same(before.conditions.heatExchanger, after.conditions.heatExchanger)) changes.push("선택 조건: 열교환기");
  if (!same(before.conditions.filter, after.conditions.filter)) changes.push("선택 조건: 필터");
  if (!same(before.cases, after.cases)) changes.push("Case 구성");
  return changes;
}

const TODO_STATUSES: Record<SessionUser["role"], RequestStatus[]> = {
  requester: ["draft", "revision_needed"],
  manager: ["under_review"],
  analyst: ["in_progress"],
};

export type TodoList = {
  statuses: RequestStatus[];
  requests: AirflowRequest[];
  counts: Partial<Record<RequestStatus, number>>;
};

/** 지금 내가 처리할 의뢰. 의뢰자는 본인이 만든 의뢰만 해당한다. */
export function todoRequests(user: SessionUser, all: AirflowRequest[]): TodoList {
  const statuses = TODO_STATUSES[user.role];
  const requests = visibleRequests(user, all).filter(
    (r) => statuses.includes(r.status) && (user.role !== "requester" || r.ownerId === user.id),
  );
  const counts = Object.fromEntries(statuses.map((s) => [s, requests.filter((r) => r.status === s).length]));
  return { statuses, requests, counts };
}
