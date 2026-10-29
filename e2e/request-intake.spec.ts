import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, label: string | RegExp, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function chooseUsage(page: Page, condition: string, value: "있음" | "없음") {
  await page.getByRole("group", { name: `${condition} 사용 여부` }).getByRole("button", { name: value }).click();
}

async function switchUser(page: Page, name: string) {
  await choose(page, "사용자 전환", name);
}

async function startLockedRequest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "새 의뢰 작성" }).click();
  await expect(page.getByRole("heading", { name: /풍량 해석 의뢰서/ })).toBeVisible();
  await choose(page, "사업부", "SAC");
  await choose(page, "Product Line-up", "Multi V");
  await choose(page, "Platform", "Cassette");
  await page.getByRole("button", { name: "의뢰 대상 확정", exact: true }).click();
  await expect(page.getByRole("heading", { name: /CFD-\d{8}-\d{3}/ })).toBeVisible();
}

async function fillCompleteRequest(page: Page) {
  await choose(page, "의뢰 유형", "품질 개선");
  await page.getByLabel("모델명 (Model Suffix)").fill("ABC.AKOR");
  await page.getByLabel("희망 완료일").fill("2099-12-31");
  await page.getByLabel("해석을 요청하게 된 배경").fill("실외기 팬이 변경됨");
  await page.getByLabel("해석으로 확인하고 싶은 내용").fill("풍량 변화");

  await page.getByRole("button", { name: "3. 해석 제품" }).click();
  await page.getByLabel("형상 1 도면번호").fill("BASE-001");
  await page.getByRole("button", { name: "비교 제품 추가" }).click();
  await page.getByLabel("형상 2 도면번호").fill("NEW-002");
  await page.getByLabel("형상 2 Base 대비 차이").fill("팬 직경 변경");

  await page.getByRole("button", { name: "4. 해석조건" }).click();
  await page.getByRole("button", { name: "운전 조건 추가" }).click();
  await page.getByLabel("운전 1 회전수", { exact: true }).fill("900");
  await chooseUsage(page, "공간 압력", "없음");
  await chooseUsage(page, "열교환기", "없음");

  await page.getByRole("button", { name: "5. Case" }).click();
  await page.getByRole("checkbox", { name: "형상 1 + 운전 1" }).click();
  await page.getByRole("checkbox", { name: "형상 2 + 운전 1" }).click();
  await page.getByRole("button", { name: "Case 구성 확인" }).click();
  await expect(page.getByText("Case 구성이 확인되었습니다")).toBeVisible();
}

test("의뢰자가 풍량 의뢰서를 작성하고 저장·재진입한 뒤 제출한다", async ({ page }) => {
  await startLockedRequest(page);
  await page.getByLabel("모델명 (Model Suffix)").fill("RELOAD-1");
  await page.reload();
  await page.getByRole("button", { name: "2. 의뢰 내용" }).click();
  await expect(page.getByLabel("모델명 (Model Suffix)")).toHaveValue("RELOAD-1");

  await fillCompleteRequest(page);
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await expect(page.getByText("모든 제출 조건을 충족했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "제출", exact: true }).click();

  await expect(page.getByText("검토 중", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "제출", exact: true })).toHaveCount(0);
  await expect(page.getByText(/현재 revision 1/)).toBeVisible();
});

test("제출 조건을 어기면 제출이 막히고 고칠 위치가 보인다", async ({ page }) => {
  await startLockedRequest(page);
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await expect(page.getByText(/제출하려면 \d+개 항목을 더 채워야 합니다/)).toBeVisible();
  await expect(page.getByText("Base 제품의 도면번호를 입력해야 합니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "제출", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "해석 제품 수정" }).click();
  await expect(page.getByLabel("형상 1 도면번호")).toBeVisible();
});

test("같은 부서 사용자는 제출된 의뢰를 조회만 하고 다른 부서에는 보이지 않는다", async ({ page }) => {
  await startLockedRequest(page);
  await fillCompleteRequest(page);
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await page.getByRole("button", { name: "제출", exact: true }).click();
  await expect(page.getByText(/현재 revision 1/)).toBeVisible();

  await page.goto("/");
  await switchUser(page, "이서연 · 의뢰자 · 실외기설계팀");
  await expect(page.getByRole("heading", { name: "같은 부서 의뢰 (조회만 가능)" })).toBeVisible();
  await page.getByRole("link", { name: /CFD-\d{8}-\d{3}/ }).click();
  await expect(page.getByText("검토 중", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "제출", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^\d\. / })).toHaveCount(0);

  await page.goto("/");
  await switchUser(page, "박지훈 · 의뢰자 · 윈도우설계팀");
  await expect(page.getByRole("link", { name: /CFD-\d{8}-\d{3}/ })).toHaveCount(0);
});

test("다른 사용자의 작성 중 의뢰는 같은 부서여도 보이지 않는다", async ({ page }) => {
  await startLockedRequest(page);
  const url = page.url();
  await page.goto("/");
  await switchUser(page, "이서연 · 의뢰자 · 실외기설계팀");
  await expect(page.getByRole("link", { name: /미확정|CFD-/ })).toHaveCount(0);
  await page.goto(url);
  await expect(page.getByText("이 의뢰를 볼 수 없습니다.")).toBeVisible();
});

test("선택 조건을 입력해 Case 열로 비교한 뒤 제출한다", async ({ page }) => {
  await startLockedRequest(page);
  await fillCompleteRequest(page);

  await page.getByRole("button", { name: "4. 해석조건" }).click();
  await chooseUsage(page, "공간 압력", "있음");
  await page.getByLabel("공간 압력 1 입구 압력").fill("10");
  await page.getByLabel("공간 압력 1 출구 압력").fill("0");

  await chooseUsage(page, "열교환기", "있음");
  await choose(page, "열교환기 1 유형", "Fin&Tube");
  await choose(page, "열교환기 1 관 직경 / 채널 폭", "7");
  await choose(page, "열교환기 1 Fin type", "Slit");
  await choose(page, "열교환기 1 열 수", "2");
  await choose(page, "열교환기 1 FPI", "14");

  await chooseUsage(page, "필터", "있음");
  await page.getByLabel("필터 A 측정점 1 유속").fill("1.5");
  await page.getByLabel("필터 A 측정점 1 압력손실").fill("20");
  await page.getByRole("button", { name: "필터 A 측정점 추가" }).click();
  await page.getByLabel("필터 A 측정점 2 유속").fill("2");
  await page.getByLabel("필터 A 측정점 2 압력손실").fill("30");

  await page.getByRole("button", { name: "5. Case" }).click();
  await expect(page.getByText("공간 압력 1, 열교환기 1, 필터 1은(는) 선택지가 하나뿐이라 모든 Case에 자동으로 들어갑니다.")).toBeVisible();
  await page.getByRole("button", { name: "Case 구성 확인" }).click();
  await expect(page.getByText("Case 구성이 확인되었습니다")).toBeVisible();

  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await expect(page.getByText("모든 제출 조건을 충족했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "제출", exact: true }).click();
  await expect(page.getByText(/현재 revision 1/)).toBeVisible();
  await expect(page.getByText(/Case 1: 형상 1 \+ 운전 1 \+ 공간 압력 1 \+ 열교환기 1 \+ 필터 1/)).toBeVisible();
});

test("공간 압력과 열교환기를 고르지 않으면 제출이 막힌다", async ({ page }) => {
  await startLockedRequest(page);
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await expect(page.getByText("공간 압력: 값을 입력하거나 '없음'을 선택해야 합니다.")).toBeVisible();
  await expect(page.getByText("열교환기: 사양을 입력하거나 '열교환기 없음'을 선택해야 합니다.")).toBeVisible();
});

async function submitCompleteRequest(page: Page) {
  await startLockedRequest(page);
  await fillCompleteRequest(page);
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await page.getByRole("button", { name: "제출", exact: true }).click();
  await expect(page.getByText(/현재 revision 1/)).toBeVisible();
}

const KIM = "김민준 · 의뢰자 · 실외기설계팀";
const MANAGER = "최해석 · 해석관리자 · 해석팀";
const ANALYST = "정담당 · 해석담당자 · 해석팀";

test("검토 중 보완 요청, 재제출, 접수·배정까지 이어진다", async ({ page }) => {
  await submitCompleteRequest(page);

  await page.goto("/");
  await switchUser(page, MANAGER);
  await expect(page.getByRole("region", { name: "할 일" })).toContainText("1건");
  await page.getByRole("region", { name: "할 일" }).getByRole("link", { name: /CFD-/ }).click();

  await page.getByRole("button", { name: "보완 요청" }).click();
  await expect(page.getByText("사유 코드를 선택해야 합니다.")).toBeVisible();
  await choose(page, "사유 코드", "정보 누락");
  await page.getByLabel("보완이 필요한 내용").fill("희망 일정 근거가 필요합니다.");
  await page.getByRole("button", { name: "보완 요청" }).click();
  await expect(page.getByText("보완 필요", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "접수·배정" })).toHaveCount(0);

  await page.goto("/");
  await switchUser(page, KIM);
  await expect(page.getByRole("region", { name: "할 일" })).toContainText("보완 필요");
  await page.getByRole("region", { name: "할 일" }).getByRole("link", { name: /CFD-/ }).click();
  await expect(page.getByText("희망 일정 근거가 필요합니다.").first()).toBeVisible();
  await page.getByRole("button", { name: "2. 의뢰 내용" }).click();
  await page.getByLabel("모델명 (Model Suffix)").fill("CHANGED-2");
  await page.getByRole("button", { name: "6. 최종 검토" }).click();
  await page.getByRole("button", { name: "재제출", exact: true }).click();
  await expect(page.getByText(/현재 revision 2/)).toBeVisible();

  await page.goto("/");
  await switchUser(page, MANAGER);
  await page.getByRole("region", { name: "할 일" }).getByRole("link", { name: /CFD-/ }).click();
  await expect(page.getByText("의뢰 내용: 모델명")).toBeVisible();
  await page.getByRole("button", { name: "접수·배정" }).click();
  await expect(page.getByText("해석담당자를 지정해야 합니다.")).toBeVisible();
  await choose(page, "해석담당자", "정담당 · 해석팀");
  await page.getByRole("button", { name: "접수·배정" }).click();
  await expect(page.getByText("해석 진행 중", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "접수·배정" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "보완 요청" })).toHaveCount(0);

  await page.goto("/");
  await switchUser(page, KIM);
  await page.getByRole("link", { name: /CFD-/ }).first().click();
  await expect(page.getByText("해석 진행 중", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "의뢰 취소" })).toHaveCount(0);

  await page.goto("/");
  await switchUser(page, ANALYST);
  await expect(page.getByRole("region", { name: "할 일" })).toContainText("1건");
  await page.getByRole("region", { name: "할 일" }).getByRole("link", { name: /CFD-/ }).click();
  await expect(page.getByText("해석 진행 중", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "접수·배정" })).toHaveCount(0);
});

test("의뢰자는 접수 전에 의뢰를 취소할 수 있고 취소된 의뢰는 조회만 된다", async ({ page }) => {
  await submitCompleteRequest(page);
  await page.getByRole("button", { name: "의뢰 취소" }).click();
  await page.getByRole("button", { name: "취소 확정" }).click();
  await expect(page.getByText("취소", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "의뢰 취소" })).toHaveCount(0);

  await page.goto("/");
  await switchUser(page, MANAGER);
  await expect(page.getByRole("region", { name: "할 일" })).toContainText("0건");
});

test("작성 중인 의뢰도 취소할 수 있다", async ({ page }) => {
  await startLockedRequest(page);
  await page.getByRole("button", { name: "의뢰 취소" }).click();
  await page.getByRole("button", { name: "취소 확정" }).click();
  await expect(page.getByText("취소", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^\d\. / })).toHaveCount(0);
});
