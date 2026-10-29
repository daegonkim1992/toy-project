"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SimpleSelect } from "@/components/select-field";
import { sampleUsers } from "@/features/people";
import { useCurrentUser, userLabel } from "@/features/people/current-user";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUserId } = useCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            해석의뢰
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">사용자</span>
            <SimpleSelect
              ariaLabel="사용자 전환"
              value={user.id}
              onChange={setUserId}
              options={sampleUsers.map((u) => ({ value: u.id, label: userLabel(u) }))}
              className="w-72"
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
