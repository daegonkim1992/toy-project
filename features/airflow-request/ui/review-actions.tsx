"use client";

import { useState } from "react";

import { SimpleSelect } from "@/components/select-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { sampleUsers } from "@/features/people";

import { REVIEW_REASONS } from "../review";

function Message({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}

export function ManagerActions({
  onAccept,
  onRequestRevision,
}: {
  onAccept: (analystId: string) => string;
  onRequestRevision: (code: string, note: string) => string;
}) {
  const [analystId, setAnalystId] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [acceptMessage, setAcceptMessage] = useState("");
  const [revisionMessage, setRevisionMessage] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>접수·배정</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel>해석담당자</FieldLabel>
            <SimpleSelect
              ariaLabel="해석담당자"
              value={analystId}
              onChange={setAnalystId}
              options={sampleUsers.filter((u) => u.role === "analyst").map((u) => ({ value: u.id, label: `${u.name} · ${u.department}` }))}
            />
          </Field>
          <Message text={acceptMessage} />
          <div>
            <Button onClick={() => setAcceptMessage(onAccept(analystId))}>접수·배정</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>보완 요청</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel>사유 코드</FieldLabel>
            <SimpleSelect
              ariaLabel="사유 코드"
              value={code}
              onChange={setCode}
              options={REVIEW_REASONS.map((r) => ({ value: r.code, label: r.label }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="revision-note">보완이 필요한 내용</FieldLabel>
            <Textarea id="revision-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Message text={revisionMessage} />
          <div>
            <Button variant="outline" onClick={() => setRevisionMessage(onRequestRevision(code, note))}>
              보완 요청
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CancelAction({ onCancel }: { onCancel: () => string }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  if (!confirming) {
    return (
      <div>
        <Button variant="outline" onClick={() => setConfirming(true)}>
          의뢰 취소
        </Button>
      </div>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-col gap-3">
        <span>취소하면 이후에는 조회만 할 수 있고 의뢰번호는 다시 쓰이지 않습니다.</span>
        {message ? <span>{message}</span> : null}
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setMessage(onCancel())}>
            취소 확정
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            돌아가기
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
