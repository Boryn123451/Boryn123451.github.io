import { expect, test, type Page } from "@playwright/test";

async function openFreshPage(page: Page, localStorageState?: Record<string, string>) {
  await page.addInitScript((storage) => {
    window.localStorage.clear();
    if (!storage) {
      return;
    }
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }, localStorageState ?? null);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Kalkulator naukowy Exact \+ Approx/i })).toBeVisible();
}

test("kalkulator pokazuje wynik w LaTeX", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("3sqrt(3)-5*8-5sqrt(7)");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-testid="result-value-math"] [data-latex-source*="-40"]').first()).toBeVisible();
});

test("aplikacja dziala mimo starych lub blednych ustawien w localStorage", async ({ page }) => {
  await openFreshPage(page, {
    "cas-settings": JSON.stringify({
      mode: "wrong",
      angle_mode: null,
      fraction_display: "",
      precision: "",
    }),
  });

  await page.getByTestId("evaluate-input").fill("5sqrt(9)");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await page.getByTestId("result-toggle-plain").click();
  await expect(page.getByTestId("result-plain-text")).toContainText("15");
});

test("rownania przelaczaja sie na wykryta zmienna, gdy wpisana jest stara litera", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-algebra").click();
  await page.getByTestId("equation-input").fill("3y^2+8=3");
  await page.getByTestId("equation-variable-input").fill("x");
  await page.getByTestId("equation-submit").click();

  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await page.getByTestId("result-toggle-plain").click();
  await expect(page.getByTestId("result-plain-text")).toContainText("y");
});

test("uklad rownan do 5 niewiadomych rozwiazuje sie w prawdziwej aplikacji", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-systems").click();
  await page.getByTestId("system-equations-input").fill("x + y = 10\nx - y = 2");
  await page.getByTestId("system-variables-input").fill("x, y");
  await page.getByTestId("system-submit").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-latex-source*="x = 6"]').first()).toBeVisible();
  await expect(page.locator('[data-latex-source*="y = 4"]').first()).toBeVisible();
});

test("uklad z iloczynami zapisanymi jako xy, yz, zx nie wywoluje bledu 500", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-systems").click();
  await page
    .getByTestId("system-equations-input")
    .fill("x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36");
  await page.getByTestId("system-variables-input").fill("");
  await page.getByTestId("system-submit").click();

  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-latex-source*="x = 1"]').first()).toBeVisible();
});

test("uklad rownan uzupelnia stare niewiadome do wykrytego zestawu", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-systems").click();
  await page
    .getByTestId("system-equations-input")
    .fill("x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36");
  await page.getByTestId("system-variables-input").fill("x, y");
  await page.getByTestId("system-submit").click();

  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.locator(".alert--warning")).toContainText("używam wykrytych zmiennych: x, y, z");
  await expect(page.locator('[data-latex-source*="x = 1"]').first()).toBeVisible();
});

test("tryb zespolony pokazuje rozwiazania zespolone ukladu", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("settings-solution-domain-select").selectOption("complex");
  await page.getByTestId("main-tab-systems").click();
  await page
    .getByTestId("system-equations-input")
    .fill("x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36");
  await page.getByTestId("system-variables-input").fill("");
  await page.getByTestId("system-submit").click();

  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-collapsed-summary")).toBeVisible();
  await page.getByTestId("result-toggle-plain").click();
  await expect(page.getByTestId("result-plain-text")).toContainText("-7/2");
});

test("pochodna pokazuje wynik", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-calculus").click();
  await page.getByTestId("calculus-expression-input").fill("sin(x)^2");
  await page.getByTestId("calculus-submit-derivative").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-testid="result-value-math"] [data-latex-source*="sin"]').first()).toBeVisible();
});

test("pochodne wyzszych rzedow dzialaja w prawdziwej aplikacji", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-calculus").click();
  await page.getByTestId("calculus-expression-input").fill("sin(x)^2");
  await page.getByTestId("calculus-derivative-order-input").fill("3");
  await page.getByTestId("calculus-submit-derivative").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-testid="result-value-math"] [data-latex-source*="sin"]').first()).toBeVisible();
});

test("dwumian pokazuje symbol w podgladzie i wyniku", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("binomial(5,2)");
  await expect(page.locator('.math-preview [data-latex-source*="\\\\binom{5}{2}"]').first()).toBeVisible();
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.locator('[data-testid="result-value-math"] .katex').first()).toBeVisible();
  await expect(page.locator('[data-latex-source*="\\\\binom{5}{2}"]').first()).toBeVisible();
});

test("calkowanie pokazuje wynik", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-calculus").click();
  await page.getByTestId("calculus-expression-input").fill("x*cos(x)");
  await page.getByTestId("calculus-mode-indefinite").click();
  await page.getByTestId("calculus-submit-integral").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.locator('[data-testid="result-value-math"] [data-latex-source*="sin"]').first()).toBeVisible();
});

test("dlugi wynik naprawde sie zwija i rozwija", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-systems").click();
  await page
    .getByTestId("system-equations-input")
    .fill("x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36");
  await page.getByTestId("system-variables-input").fill("x, y, z");
  await page.getByTestId("system-submit").click();

  await expect(page.getByTestId("result-collapsed-summary")).toBeVisible();
  await expect(page.getByTestId("result-value-scroll")).toHaveCount(0);
  await page.getByTestId("result-toggle-full").click();
  await expect(page.getByTestId("result-collapsed-summary")).toHaveCount(0);
  await expect(page.getByTestId("result-value-scroll")).toBeVisible();
  await page.getByTestId("result-toggle-full").click();
  await expect(page.getByTestId("result-collapsed-summary")).toBeVisible();
  await expect(page.getByTestId("result-value-scroll")).toHaveCount(0);
});

test("kalkulator akceptuje przecinek dziesietny i pokazuje eksport", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("4/0,75");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await expect(page.getByRole("button", { name: /Eksport TXT/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Eksport PDF/i })).toBeVisible();
});

test("kalkulator akceptuje zapis wartosci bezwzglednej i pierwiastka n-tego", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("|-5| + root(3,27)");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await page.getByTestId("result-toggle-plain").click();
  await expect(page.getByTestId("result-plain-text")).toContainText("8");
});

test("zakladka wzorow pokazuje biblioteke wzorow z LaTeX-em", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("main-tab-formulas").click();
  await expect(page.getByTestId("formula-grid")).toBeVisible();
  await expect(page.getByTestId("formula-grid").locator(".katex").first()).toBeVisible();
  await expect(page.locator(".formula-page__badge").first()).toHaveText(/Karta 1/i);
  await expect(page.locator(".formula-page__titleblock").first()).toContainText(/Źródło: strona 4/i);
  await expect(page.getByText(/Wzór dwumianowy Newtona|Wzor dwumianowy Newtona/i).first()).toBeVisible();
  await expect(page.locator(".formula-card__legend-title").first()).toHaveText(/Gdzie:/i);
  await expect(page.locator(".formula-card__legend-item").first()).not.toBeEmpty();
});

test("kalkulator przekierowuje pojedyncze rownanie do zakladki Rownania", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("x^2 = 4");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.getByTestId("equation-input")).toHaveValue("x^2 = 4");
  await expect(page.locator(".alert--error")).toContainText(/przenios.*zakładki|przenios.*zakladki/i);
});

test("kalkulator przekierowuje kilka rownan do zakladki Uklady rownan", async ({ page }) => {
  await openFreshPage(page);

  await page.getByTestId("evaluate-input").fill("x + y = 10\nx - y = 2");
  await page.getByTestId("evaluate-submit-inline").click();

  await expect(page.getByTestId("system-equations-input")).toHaveValue("x + y = 10\nx - y = 2");
  await expect(page.locator(".alert--error")).toContainText(/przenios.*zakładki|przenios.*zakladki/i);
});
