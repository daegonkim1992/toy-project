import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, label: string | RegExp, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
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
  await page.getByRole("button", { name: "의뢰 대상 확정" }).click();
  await expect(page.getByRole("heading", { name: /CFD-\d{8}-\d{3}/ })).toBeVisible();
}

async function fillCompleteRequest(page: Page) {
  await choose(page, "의뢰 유형", "품질 개선");
  await page.getByLabel("모델명 (Model Suffix)").fill("ABC.AKOR");
  await page.getByLabel("희망 완료일").fill("2099-12-31");
  await page.getByLabel("해석을 요청하게 된 배경").fill("실외기 팬이 변경됨");
  await page.getByLabel("해석으로 확인하고 싶은 내용").fill("풍량 변화");

  await page.getByRole("button", { name: "3. 해석 제품" }).click();
  await page.getByLabel("Base 제품 도면번호").fill("BASE-001");
  await page.getByRole("button", { name: "비교 제품 추가" }).click();
  await page.getByLabel("형상 2 도면번호").fill("NEW-002");
  await page.getByLabel("형상 2 Base 대비 차이").fill("팬 직경 변경");

  await page.getByRole("button", { name: "4. 운전 조건" }).click();
  await page.getByRole("button", { name: "운전 조건 추가" }).click();
  await page.getByLabel("운전 1 팬 회전수 (rpm)").fill("900");

  await page.getByRole("button", { name: "5. Case" }).click();
  await choose(page, "Case 1 운전 조건", "운전 1");
  await choose(page, "Case 2 운전 조건", "운전 1");
  await page.getByRole("button", { name: "Case 구성 확인" }).click();
  await expect(page.getByText("Case 구성이 확인되었습니다.")).toBeVisible();
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
  await expect(page.getByText("제출하려면 아래 항목을 고쳐야 합니다.")).toBeVisible();
  await expect(page.getByText("Base 제품의 도면번호를 입력해야 합니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "제출", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "해석 제품 단계로 이동" }).first().click();
  await expect(page.getByLabel("Base 제품 도면번호")).toBeVisible();
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
