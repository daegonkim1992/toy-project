// 임시 샘플 기준 데이터. 실제 파일(제품 분류, PMS 목록)이 생기면 이 파일의 값만 교체한다.
import type { RequestTarget } from "./model";

export type ClassificationRow = {
  division: string;
  lineup: string;
  platform: string;
  chassis: string;
  /** RAC Window 제품: 해석 범위(실내측/실외측/모두)를 고른다. */
  windowScope: boolean;
  /** 통합형 제품: 운전 구분(실내/실외/동시운전)을 고른다. */
  unified: boolean;
};

const row = (
  division: string,
  lineup: string,
  platform: string,
  chassis: string,
  flags: Partial<Pick<ClassificationRow, "windowScope" | "unified">> = {},
): ClassificationRow => ({ division, lineup, platform, chassis, windowScope: false, unified: false, ...flags });

export const classification: ClassificationRow[] = [
  row("SAC", "Multi V", "Cassette", "4Way"),
  row("SAC", "Multi V", "Duct", "NA"),
  row("SAC", "Single CAC", "Duct", "NA"),
  row("RAC", "Window", "Window", "", { windowScope: true }),
  row("RAC", "Wall Mount", "Wall Mount", ""),
  row("Air Care", "Air Purifier", "Integrated", "", { unified: true }),
  row("Chiller", "Screw", "Air Cooled", ""),
  row("AIDC", "CRAC", "", ""),
];

const unique = (values: string[]) => [...new Set(values)];

export const divisionOptions = () => unique(classification.map((r) => r.division));

export const lineupOptions = (division: string) =>
  unique(classification.filter((r) => r.division === division).map((r) => r.lineup));

export const platformOptions = (division: string, lineup: string) =>
  unique(classification.filter((r) => r.division === division && r.lineup === lineup).map((r) => r.platform));

export const chassisOptions = (division: string, lineup: string, platform: string) =>
  unique(
    classification
      .filter((r) => r.division === division && r.lineup === lineup && r.platform === platform)
      .map((r) => r.chassis),
  );

export function findClassification(
  target: Pick<RequestTarget, "division" | "lineup" | "platform" | "chassis">,
): ClassificationRow | undefined {
  return classification.find(
    (r) =>
      r.division === target.division &&
      r.lineup === target.lineup &&
      r.platform === target.platform &&
      r.chassis === target.chassis,
  );
}

export type PmsProject = { id: string; division: string; name: string; code: string; region: string };

export const pmsProjects: PmsProject[] = [
  { id: "pms-sac-1", division: "SAC", name: "Multi V 신규 실외기 개발", code: "SAC-2601", region: "KR" },
  { id: "pms-rac-1", division: "RAC", name: "윈도우 에어컨 신모델", code: "RAC-2602", region: "NA" },
  { id: "pms-ac-1", division: "Air Care", name: "통합형 공기청정기", code: "AC-2603", region: "KR" },
  { id: "pms-ch-1", division: "Chiller", name: "스크류 칠러 효율 개선", code: "CH-2604", region: "EU" },
];

export const findPmsProject = (id: string) => pmsProjects.find((p) => p.id === id);

export const REQUESTER_DIVISIONS = ["SAC", "RAC", "Aircare", "Chiller", "연구소"];
export const RANKS = ["책임연구원", "선임연구원", "연구원"];
export const REQUEST_TYPES = ["개발 프로젝트", "품질 개선", "필드 이슈", "선행 검토"];
export const DEV_PROJECT_TYPE = "개발 프로젝트";
export const DEVELOPMENT_GRADES = ["A", "B", "Ca", "Cb", "D", "JDM", "ODM"];
export const NPI_STAGES = ["CP", "DV", "PV", "MQ", "MP", "Pre MP", "미정"];

export const DECISION_USES = [
  { value: "problem_analysis", label: "문제 분석" },
  { value: "design_review", label: "설계 검토" },
  { value: "performance_validation", label: "성능 검증" },
  { value: "other", label: "기타" },
  { value: "undecided", label: "미정" },
];

export const SCOPE_OPTIONS = [
  { value: "indoor", label: "실내측" },
  { value: "outdoor", label: "실외측" },
  { value: "both", label: "실내·실외 모두" },
] as const;

export const OPERATION_MODE_OPTIONS = [
  { value: "indoor", label: "실내" },
  { value: "outdoor", label: "실외" },
  { value: "simultaneous", label: "동시운전" },
] as const;

export type HeatExchangerSpec = {
  type: "Fin&Tube" | "Micro-Channel";
  tubeDiameter: string;
  finType: string;
  rowCount: string;
  fpi: string;
};

const spec = (
  type: HeatExchangerSpec["type"],
  tubeDiameter: string,
  finType: string,
  rowCount: string,
  fpi: string,
): HeatExchangerSpec => ({ type, tubeDiameter, finType, rowCount, fpi });

// 임시 샘플 열교환기 Catalog. 관 직경이 W로 시작하면 Micro-Channel이고 Fin type은 Flat이다.
export const heatExchangerCatalog: HeatExchangerSpec[] = [
  spec("Fin&Tube", "7", "Slit", "2", "14"),
  spec("Fin&Tube", "7", "Slit", "2", "16"),
  spec("Fin&Tube", "7", "Louver", "3", "14"),
  spec("Fin&Tube", "9.52", "Slit", "2", "12"),
  spec("Fin&Tube", "9.52", "Slit", "3", "14"),
  spec("Fin&Tube", "9.52", "Louver", "4", "16"),
  spec("Micro-Channel", "W16", "Flat", "1", "18"),
  spec("Micro-Channel", "W16", "Flat", "1", "20"),
  spec("Micro-Channel", "W22", "Flat", "1", "18"),
];

export function findCatalogSpec(candidate: HeatExchangerSpec): HeatExchangerSpec | undefined {
  return heatExchangerCatalog.find(
    (s) =>
      s.type === candidate.type &&
      s.tubeDiameter === candidate.tubeDiameter &&
      s.finType === candidate.finType &&
      s.rowCount === candidate.rowCount &&
      s.fpi === candidate.fpi,
  );
}

/** 앞에서 고른 값과 맞는 Catalog 항목에서 한 필드의 선택지를 뽑는다. */
export function catalogOptions(field: keyof HeatExchangerSpec, chosen: Partial<HeatExchangerSpec>): string[] {
  const matches = heatExchangerCatalog.filter((s) =>
    (Object.keys(chosen) as (keyof HeatExchangerSpec)[]).every((key) => !chosen[key] || s[key] === chosen[key]),
  );
  return [...new Set(matches.map((s) => s[field]))];
}
