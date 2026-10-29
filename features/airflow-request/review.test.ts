import { describe, expect, it } from "vitest";

import { sampleUsers } from "@/features/people";

import { kim, lee, manager, now, submittable } from "./fixtures";
import {
  REVIEW_REASONS,
  acceptRequest,
  allowedActions,
  cancelRequest,
  changedItems,
  confirmCases,
  createDraft,
  editRequest,
  requestRevision,
  submitRequest,
  todoRequests,
  visibleRequests,
  type AirflowRequest,
} from "./index";

const analyst = sampleUsers.find((u) => u.role === "analyst")!;
const later = new Date(2026, 9, 30, 9, 0, 0);

function underReview(id = "r1", user = kim): AirflowRequest {
  const result = submitRequest(submittable(user, id), user, now);
  if (!result.ok) throw new Error(result.issues[0].message);
  return result.request;
}

function revisionNeeded(id = "r1"): AirflowRequest {
  const result = requestRevision(underReview(id), manager, { code: "INFO_MISSING", note: "희망 일정 근거가 필요합니다." }, later);
  if (!result.ok) throw new Error(result.message);
  return result.request;
}

function accepted(id = "r1"): AirflowRequest {
  const result = acceptRequest(underReview(id), manager, analyst.id, later);
  if (!result.ok) throw new Error(result.message);
  return result.request;
}

describe("보완 요청 (검토 단계)", () => {
  it("해석관리자가 사유 코드와 설명으로 요청하면 보완 필요 상태가 되고 이력에 남는다", () => {
    const result = requestRevision(underReview(), manager, { code: "INFO_MISSING", note: "희망 일정 근거가 필요합니다." }, later);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("revision_needed");
    expect(result.request.history.at(-1)).toMatchObject({
      type: "revision_requested",
      from: "under_review",
      to: "revision_needed",
      actorId: manager.id,
      reasonCode: "INFO_MISSING",
      note: "희망 일정 근거가 필요합니다.",
    });
  });

  it("사유 코드는 7개다", () => {
    expect(REVIEW_REASONS).toHaveLength(7);
  });

  it("사유 코드와 설명 중 하나라도 없으면 요청할 수 없다", () => {
    expect(requestRevision(underReview(), manager, { code: "", note: "설명" }, later).ok).toBe(false);
    expect(requestRevision(underReview(), manager, { code: "INFO_MISSING", note: "  " }, later).ok).toBe(false);
    expect(requestRevision(underReview(), manager, { code: "없는코드", note: "설명" }, later).ok).toBe(false);
  });

  it("해석관리자가 아니거나 검토 중이 아니면 요청할 수 없다", () => {
    expect(requestRevision(underReview(), kim, { code: "OTHER", note: "x" }, later).ok).toBe(false);
    expect(requestRevision(revisionNeeded(), manager, { code: "OTHER", note: "x" }, later).ok).toBe(false);
  });
});

describe("접수와 배정", () => {
  it("담당자를 지정해 접수하면 해석 진행 중이 되고 이력에 남는다", () => {
    const result = acceptRequest(underReview(), manager, analyst.id, later);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("in_progress");
    expect(result.request.assigneeId).toBe(analyst.id);
    expect(result.request.history.at(-1)).toMatchObject({ type: "accepted", from: "under_review", to: "in_progress", actorId: manager.id });
  });

  it("해석담당자가 아닌 사용자를 지정하거나 담당자를 비우면 접수할 수 없다", () => {
    expect(acceptRequest(underReview(), manager, "", later).ok).toBe(false);
    expect(acceptRequest(underReview(), manager, kim.id, later).ok).toBe(false);
    expect(acceptRequest(underReview(), manager, "없는사용자", later).ok).toBe(false);
  });

  it("해석관리자가 아니거나 검토 중이 아니면 접수할 수 없다", () => {
    expect(acceptRequest(underReview(), kim, analyst.id, later).ok).toBe(false);
    expect(acceptRequest(revisionNeeded(), manager, analyst.id, later).ok).toBe(false);
  });
});

describe("재제출", () => {
  it("보완 필요 상태에서 수정해 재제출하면 검토 중이 되고 revision이 하나 늘어난다", () => {
    const needed = revisionNeeded();
    const edited = editRequest(needed, { info: { ...needed.info, desiredDate: "2026-12-15" } });
    const result = submitRequest(edited, kim, later);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe("under_review");
    expect(result.request.revisions.map((r) => r.no)).toEqual([1, 2]);
    expect(result.request.history.at(-1)).toMatchObject({ type: "resubmitted", from: "revision_needed", to: "under_review", actorId: kim.id });
  });

  it("보완 필요 상태에서만 의뢰서를 수정할 수 있다", () => {
    const review = underReview();
    expect(editRequest(review, { info: { ...review.info, background: "바꿈" } }).info.background).toBe(review.info.background);
    const needed = revisionNeeded();
    expect(editRequest(needed, { info: { ...needed.info, background: "바꿈" } }).info.background).toBe("바꿈");
  });

  it("재제출도 제출 조건을 충족해야 하고 작성자만 할 수 있다", () => {
    const needed = revisionNeeded();
    const broken = editRequest(needed, { base: { ...needed.base, drawingNo: "" } });
    expect(submitRequest(broken, kim, later).ok).toBe(false);
    expect(submitRequest(needed, lee, later).ok).toBe(false);
  });

  it("검토 중이거나 접수된 의뢰는 다시 제출할 수 없다", () => {
    expect(submitRequest(underReview(), kim, later).ok).toBe(false);
    expect(submitRequest(accepted(), kim, later).ok).toBe(false);
  });

  it("이전 revision 대비 달라진 항목을 알려 준다", () => {
    const needed = revisionNeeded();
    const edited = editRequest(needed, {
      info: { ...needed.info, desiredDate: "2026-12-15", background: "배경 수정" },
      comparisons: [{ ...needed.comparisons[0], difference: "팬 날개 수 변경" }],
    });
    const confirmed = confirmCases(edited);
    if (!confirmed.ok) throw new Error("Case 확인 실패");
    const result = submitRequest(confirmed.request, kim, later);
    if (!result.ok) throw new Error("재제출 실패");
    const [first, second] = result.request.revisions;
    expect(changedItems(first.snapshot, second.snapshot)).toEqual(
      expect.arrayContaining(["의뢰 내용: 희망 완료일", "의뢰 내용: 해석을 요청하게 된 배경", "해석 제품: 형상 2 변경"]),
    );
  });

  it("달라진 것이 없으면 빈 목록이다", () => {
    const review = underReview();
    expect(changedItems(review.revisions[0].snapshot, review.revisions[0].snapshot)).toEqual([]);
  });
});

describe("취소", () => {
  it("작성 중, 검토 중, 보완 필요 상태에서 작성자가 취소할 수 있다", () => {
    const draft = editRequest(createDraft(kim, now, "d1"), {});
    for (const request of [draft, underReview("r2"), revisionNeeded("r3")]) {
      const result = cancelRequest(request, kim, later);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.request.status).toBe("cancelled");
      expect(result.request.history.at(-1)).toMatchObject({ type: "cancelled", to: "cancelled", actorId: kim.id });
    }
  });

  it("접수된 이후에는 취소할 수 없다", () => {
    expect(cancelRequest(accepted(), kim, later).ok).toBe(false);
  });

  it("작성자가 아니면 취소할 수 없다", () => {
    expect(cancelRequest(underReview(), lee, later).ok).toBe(false);
    expect(cancelRequest(underReview(), manager, later).ok).toBe(false);
  });

  it("취소된 의뢰는 수정, 제출, 접수, 재취소가 모두 막힌다", () => {
    const result = cancelRequest(underReview(), kim, later);
    if (!result.ok) throw new Error("취소 실패");
    const cancelled = result.request;
    expect(editRequest(cancelled, { info: { ...cancelled.info, background: "x" } }).info.background).toBe(cancelled.info.background);
    expect(submitRequest(cancelled, kim, later).ok).toBe(false);
    expect(acceptRequest(cancelled, manager, analyst.id, later).ok).toBe(false);
    expect(cancelRequest(cancelled, kim, later).ok).toBe(false);
    expect(allowedActions(kim, cancelled)).toEqual([]);
    expect(allowedActions(manager, cancelled)).toEqual([]);
  });
});

describe("상태별로 보이는 기능", () => {
  it("의뢰자는 상태에 따라 수정, 제출, 재제출, 취소 메뉴를 본다", () => {
    expect(allowedActions(kim, createDraft(kim, now, "d1"))).toEqual(["edit", "submit", "cancel"]);
    expect(allowedActions(kim, underReview())).toEqual(["cancel"]);
    expect(allowedActions(kim, revisionNeeded())).toEqual(["edit", "resubmit", "cancel"]);
    expect(allowedActions(kim, accepted())).toEqual([]);
  });

  it("같은 부서 사용자에게는 어떤 기능도 보이지 않는다", () => {
    expect(allowedActions(lee, underReview())).toEqual([]);
    expect(allowedActions(lee, revisionNeeded())).toEqual([]);
  });

  it("해석관리자는 검토 중인 의뢰에서만 접수와 보완 요청 메뉴를 본다", () => {
    expect(allowedActions(manager, underReview())).toEqual(["accept", "request_revision"]);
    expect(allowedActions(manager, revisionNeeded())).toEqual([]);
    expect(allowedActions(manager, accepted())).toEqual([]);
  });

  it("해석담당자에게는 이 작업의 기능이 보이지 않는다", () => {
    expect(allowedActions(analyst, accepted())).toEqual([]);
  });
});

describe("조회 범위와 할 일 목록", () => {
  const review = underReview("r-review");
  const needed = revisionNeeded("r-needed");
  const acceptedRequest = accepted("r-accepted");
  const draft = { ...createDraft(kim, now, "r-draft") };
  const all = [draft, review, needed, acceptedRequest];

  it("해석담당자는 자기에게 배정된 의뢰만 본다", () => {
    expect(visibleRequests(analyst, all).map((r) => r.id)).toEqual(["r-accepted"]);
    const other = sampleUsers.filter((u) => u.role === "analyst").length;
    expect(other).toBeGreaterThan(0);
  });

  it("의뢰자의 할 일은 작성 중과 보완 필요 의뢰다", () => {
    const todo = todoRequests(kim, all);
    expect(todo.statuses).toEqual(["draft", "revision_needed"]);
    expect(todo.requests.map((r) => r.id)).toEqual(["r-draft", "r-needed"]);
    expect(todo.counts).toEqual({ draft: 1, revision_needed: 1 });
  });

  it("해석관리자의 할 일은 검토 중인 의뢰다", () => {
    const todo = todoRequests(manager, all);
    expect(todo.requests.map((r) => r.id)).toEqual(["r-review"]);
    expect(todo.counts).toEqual({ under_review: 1 });
  });

  it("해석담당자의 할 일은 본인에게 배정된 해석 진행 중 의뢰다", () => {
    const todo = todoRequests(analyst, all);
    expect(todo.requests.map((r) => r.id)).toEqual(["r-accepted"]);
    expect(todo.counts).toEqual({ in_progress: 1 });
  });

  it("같은 부서 사용자의 할 일에는 다른 사람의 의뢰가 들어가지 않는다", () => {
    expect(todoRequests(lee, all).requests).toEqual([]);
  });
});
