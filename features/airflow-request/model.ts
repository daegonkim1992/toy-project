export type RequestStatus =
  | "draft"
  | "under_review"
  | "revision_needed"
  | "in_progress"
  | "cancelled";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "작성 중",
  under_review: "검토 중",
  revision_needed: "보완 필요",
  in_progress: "해석 진행 중",
  cancelled: "취소",
};

export type StepKey = "target" | "info" | "products" | "operating" | "cases" | "review";

export type RequestTarget = {
  locked: boolean;
  division: string;
  lineup: string;
  platform: string;
  chassis: string;
  scope: "" | "indoor" | "outdoor" | "both";
  operationMode: "" | "indoor" | "outdoor" | "simultaneous";
};

export type RequestInfo = {
  requesterDivision: string;
  department: string;
  requesterName: string;
  rank: string;
  requestType: string;
  pmsProjectId: string;
  developmentGrade: string;
  npiStage: string;
  modelSuffix: string;
  desiredDate: string;
  background: string;
  wantedResult: string;
  decisionUse: string;
};

export type Product = {
  id: string;
  drawingNo: string;
  displayName: string;
  difference: string;
};

export type FanSetting = { rpm: string; location: string };

export type OperatingPackage = {
  id: string;
  name: string;
  fanCount: string;
  rpmMode: "common" | "individual";
  commonRpm: string;
  fans: FanSetting[];
  airflow: string;
  airflowPurpose: "" | "reflect" | "reference";
};

export type ConditionState = "" | "none" | "use";

export type PressurePackage = { id: string; name: string; inlet: string; outlet: string };

export type HeatExchangerPackage = {
  id: string;
  name: string;
  type: "" | "Fin&Tube" | "Micro-Channel";
  tubeDiameter: string;
  finType: string;
  rowCount: string;
  fpi: string;
};

export type MeasurementPoint = { id: string; velocity: string; pressureLoss: string };
export type PhysicalFilter = { id: string; name: string; points: MeasurementPoint[] };
export type FilterPackage = { id: string; name: string; physicalFilters: PhysicalFilter[] };

/** 풍량 해석에서 선택(○)인 조건. 없음·미사용이어도 입력한 패키지는 지우지 않고 보존한다. */
export type OptionalConditions = {
  spacePressure: { state: ConditionState; packages: PressurePackage[] };
  heatExchanger: { state: ConditionState; packages: HeatExchangerPackage[] };
  filter: { enabled: boolean; packages: FilterPackage[] };
};

export type CaseRow = {
  id: string;
  productId: string;
  operatingId: string;
  pressureId: string;
  heatExchangerId: string;
  filterId: string;
};

export type RequestContent = {
  target: RequestTarget;
  info: RequestInfo;
  base: Product;
  comparisons: Product[];
  operating: OperatingPackage[];
  conditions: OptionalConditions;
  cases: CaseRow[];
};

export type Revision = {
  no: number;
  snapshot: RequestContent;
  submittedBy: string;
  submittedAt: string;
};

export type HistoryEvent = {
  type: "created" | "target_locked" | "submitted";
  from: RequestStatus | null;
  to: RequestStatus;
  actorId: string;
  at: string;
  note: string;
};

export type AirflowRequest = RequestContent & {
  id: string;
  requestNo: string;
  requestDate: string;
  ownerId: string;
  ownerDepartment: string;
  status: RequestStatus;
  casesConfirmed: boolean;
  revisions: Revision[];
  history: HistoryEvent[];
};

export type SubmissionIssue = { step: StepKey; message: string };

export const FREE_TEXT_LIMIT = 200;
