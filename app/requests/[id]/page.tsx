"use client";

import { use } from "react";

import { RequestPage } from "@/features/airflow-request/ui/request-page";

export default function RequestRoute({ params }: PageProps<"/requests/[id]">) {
  const { id } = use(params);
  return <RequestPage id={id} />;
}
