import type { OperatingPackage } from "./model";

const isPositive = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;

export function validateOperatingPackage(pkg: OperatingPackage): string[] {
  const issues: string[] = [];
  const fanCount = Number(pkg.fanCount);
  const countValid = pkg.fanCount.trim() !== "" && Number.isInteger(fanCount) && fanCount >= 1 && fanCount <= 10;
  if (!countValid) issues.push("팬 개수는 1~10 사이의 정수여야 합니다.");

  if (pkg.rpmMode === "individual" && countValid) {
    for (let i = 0; i < fanCount; i += 1) {
      if ((pkg.fans[i]?.location ?? "").trim() === "") issues.push(`팬 ${i + 1}의 팬 위치를 입력해야 합니다.`);
    }
  }

  const rpmValues =
    pkg.rpmMode === "common" ? [pkg.commonRpm] : countValid ? Array.from({ length: fanCount }, (_, i) => pkg.fans[i]?.rpm ?? "") : [];
  const anyRpmEntered = rpmValues.some((v) => v.trim() !== "");
  const rpmPresent = rpmValues.length > 0 && rpmValues.every(isPositive);
  if (anyRpmEntered && !rpmPresent) {
    issues.push(pkg.rpmMode === "common" ? "회전수는 0보다 큰 숫자여야 합니다." : "모든 팬의 회전수를 입력해야 합니다.");
  }

  const airflowEntered = pkg.airflow.trim() !== "";
  if (airflowEntered && !isPositive(pkg.airflow)) issues.push("풍량은 0보다 큰 숫자여야 합니다.");
  if (airflowEntered && pkg.airflowPurpose === "") issues.push("풍량 활용 목적을 선택해야 합니다.");

  if (!rpmPresent && !anyRpmEntered && !airflowEntered) {
    issues.push("회전수 또는 풍량을 입력해야 합니다.");
  } else if (!rpmPresent && airflowEntered && pkg.airflowPurpose === "reference") {
    issues.push("풍량을 참고 정보로 줄 때는 회전수를 입력해야 합니다.");
  }
  return issues;
}

/** 이름과 id를 뺀 내용으로 만든 키. 같은 내용의 패키지를 찾는 데 쓴다. */
export function operatingSignature(pkg: OperatingPackage): string {
  const fanCount = Number(pkg.fanCount);
  const fans = pkg.rpmMode === "individual" ? pkg.fans.slice(0, Number.isInteger(fanCount) ? fanCount : 0) : [];
  return JSON.stringify([
    pkg.fanCount.trim(),
    pkg.rpmMode,
    pkg.rpmMode === "common" ? pkg.commonRpm.trim() : "",
    fans.map((f) => [f.rpm.trim(), f.location.trim()]),
    pkg.airflow.trim(),
    pkg.airflowPurpose,
  ]);
}

export function newOperatingPackage(id: string, index: number): OperatingPackage {
  return {
    id,
    name: `운전 ${index}`,
    fanCount: "1",
    rpmMode: "common",
    commonRpm: "",
    fans: [],
    airflow: "",
    airflowPurpose: "",
  };
}
