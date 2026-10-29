"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/people/current-user";

import type { AirflowRequest, SubmissionIssue } from "../model";
import { allowedActions, confirmCases, editRequest, lockTarget, submitRequest, visibleRequests, type RequestPatch } from "../request";
import { acceptRequest, cancelRequest, latestRevisionRequest, requestRevision, type ActionResult } from "../review";
import { useRequests } from "../use-requests";
import { RequestEditor } from "./request-editor";
import { CancelAction, ManagerActions } from "./review-actions";
import { RequestSummary } from "./request-summary";

export function RequestPage({ id }: { id: string }) {
  const { user } = useCurrentUser();
  const { requests, commit } = useRequests();
  const router = useRouter();

  if (requests === null) return <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>;

  const request = requests.find((r) => r.id === id);
  if (!request || visibleRequests(user, [request]).length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>이 의뢰를 볼 수 없습니다. 의뢰가 없거나 현재 사용자에게 조회 권한이 없습니다.</AlertDescription>
        </Alert>
        <div>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  const replace = (next: AirflowRequest) => commit((all) => all.map((r) => (r.id === next.id ? next : r)));

  const actions = allowedActions(user, request);
  // 성공하면 빈 문자열, 실패하면 화면에 보일 메시지를 돌려준다.
  const apply = (result: ActionResult) => {
    if (!result.ok) return result.message;
    replace(result.request);
    return "";
  };
  const cancel = () => apply(cancelRequest(request, user, new Date()));

  if (!actions.includes("edit")) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
            ← 목록
          </Button>
        </div>
        <RequestSummary request={request} />
        {actions.includes("accept") ? (
          <ManagerActions
            onAccept={(analystId) => apply(acceptRequest(request, user, analystId, new Date()))}
            onRequestRevision={(code, note) => apply(requestRevision(request, user, { code, note }, new Date()))}
          />
        ) : null}
        {actions.includes("cancel") ? <CancelAction onCancel={cancel} /> : null}
      </div>
    );
  }

  return (
    <RequestEditor
      key={request.id}
      request={request}
      revisionNote={request.status === "revision_needed" ? latestRevisionRequest(request) : undefined}
      onCancel={cancel}
      onEdit={(patch: RequestPatch) => replace(editRequest(request, patch))}
      onLock={() => {
        const result = lockTarget(request, requests, new Date());
        if (!result.ok) return result.message;
        replace(result.request);
        return "";
      }}
      onConfirmCases={(): SubmissionIssue[] => {
        const result = confirmCases(request);
        if (!result.ok) return result.issues;
        replace(result.request);
        return [];
      }}
      onSubmit={(): SubmissionIssue[] => {
        const result = submitRequest(request, user, new Date());
        if (!result.ok) return result.issues;
        replace(result.request);
        router.refresh();
        return [];
      }}
    />
  );
}
