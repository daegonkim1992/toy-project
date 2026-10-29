import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 사용자 전환과 새 의뢰 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("해석의뢰");
  await expect(page.getByRole("heading", { level: 1, name: "내 의뢰" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "사용자 전환" })).toBeVisible();
  await expect(page.getByRole("button", { name: "새 의뢰 작성" })).toBeVisible();
});
