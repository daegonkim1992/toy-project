"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABEL, findUser, type SessionUser } from "@/features/people";
import { useCurrentUser } from "@/features/people/current-user";

import { STATUS_LABEL, type AirflowRequest } from "../model";
import { createDraft, visibleRequests } from "../request";
import { todoRequests } from "../review";
import { useRequests } from "../use-requests";

function RequestTable({ requests, empty }: { requests: AirflowRequest[]; empty: string }) {
  if (requests.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>의뢰번호</TableHead>
          <TableHead>모델명</TableHead>
          <TableHead>요청자</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>희망 완료일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>
              <Link href={`/requests/${request.id}`} className="font-medium underline underline-offset-4">
                {request.requestNo || "미확정(작성 중)"}
              </Link>
            </TableCell>
            <TableCell>{request.info.modelSuffix || "-"}</TableCell>
            <TableCell>{findUser(request.ownerId)?.name ?? "-"}</TableCell>
            <TableCell>
              <Badge variant="secondary">{STATUS_LABEL[request.status]}</Badge>
            </TableCell>
            <TableCell>{request.info.desiredDate || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TodoSection({ user, requests }: { user: SessionUser; requests: AirflowRequest[] }) {
  const todo = todoRequests(user, requests);
  return (
    <section className="flex flex-col gap-3" aria-label="할 일">
      <h2 className="font-heading text-lg font-medium">할 일</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {todo.statuses.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle>{STATUS_LABEL[status]}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{todo.counts[status] ?? 0}건</CardContent>
          </Card>
        ))}
      </div>
      <RequestTable requests={todo.requests} empty="지금 처리할 의뢰가 없습니다." />
    </section>
  );
}

export function HomePage() {
  const { user } = useCurrentUser();
  const { requests, commit } = useRequests();
  const router = useRouter();

  if (requests === null) return <p className="text-sm text-muted-foreground">불러오는 중입니다.</p>;

  const visible = visibleRequests(user, requests);

  if (user.role !== "requester") {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{ROLE_LABEL[user.role]} 업무</h1>
        <TodoSection user={user} requests={requests} />
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">{user.role === "manager" ? "제출된 전체 의뢰" : "배정된 의뢰"}</h2>
          <RequestTable requests={visible} empty="조회할 수 있는 의뢰가 없습니다." />
        </section>
      </div>
    );
  }

  const mine = visible.filter((r) => r.ownerId === user.id);
  const sameDepartment = visible.filter((r) => r.ownerId !== user.id);

  const startRequest = () => {
    const draft = createDraft(user, new Date(), crypto.randomUUID());
    commit((all) => [...all, draft]);
    router.push(`/requests/${draft.id}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">내 의뢰</h1>
        <Button onClick={startRequest}>새 의뢰 작성</Button>
      </div>

      <TodoSection user={user} requests={requests} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">내가 만든 의뢰</h2>
        <RequestTable requests={mine} empty="아직 만든 의뢰가 없습니다. 새 의뢰를 작성해 보세요." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">같은 부서 의뢰 (조회만 가능)</h2>
        <RequestTable requests={sameDepartment} empty="같은 부서에서 제출한 의뢰가 없습니다." />
      </section>
    </div>
  );
}
