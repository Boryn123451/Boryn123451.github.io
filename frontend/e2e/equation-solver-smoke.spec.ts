import { expect, test, type Page } from "@playwright/test";

async function openFreshPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Kalkulator naukowy Exact \+ Approx/i })).toBeVisible();
  await page.getByTestId("main-tab-algebra").click();
}

async function solveEquationAndShowPlain(
  page: Page,
  equation: string,
  variable = "x",
) {
  await page.getByTestId("equation-input").fill(equation);
  await page.getByTestId("equation-variable-input").fill(variable);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/solve") &&
        response.request().method() === "POST" &&
        response.ok(),
    ),
    page.getByTestId("equation-submit").click(),
  ]);
  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  await page.getByTestId("result-toggle-plain").click();
  await expect(page.getByTestId("result-plain-text")).toBeVisible();
}

test("solver rownan pokazuje poprawne rozwiazania reprezentatywnych przypadkow", async ({ page }) => {
  const cases = [
    { equation: "x+2=5", expected: "x = 3" },
    { equation: "x^2-5x+6=0", expected: "x in {2, 3}" },
    { equation: "abs(x)=3", expected: "x in {-3, 3}" },
    { equation: "log(x-1,10)=1", expected: "x = 11" },
    { equation: "ax=b", expected: "x = b/a" },
  ];

  for (const { equation, expected } of cases) {
    await openFreshPage(page);
    await solveEquationAndShowPlain(page, equation);
    await expect(page.getByTestId("result-plain-text")).toContainText(expected);
  }
});

test("solver rownan klasyfikuje tozsamosci, sprzecznosci, dziedzine i brak rozwiazan rzeczywistych", async ({
  page,
}) => {
  const cases = [
    { equation: "x=x", expected: /Niesko.*wiele/i },
    { equation: "x+1=x+2", expected: /Brak rozw/i },
    { equation: "1/(x-2)=1/(x-2)", expected: "Dziedzina: x != 2" },
    { equation: "10^x=-1", expected: /Brak rozw.*rzeczywist/i, expectedExtra: /istniej.*C/i },
  ];

  for (const { equation, expected, expectedExtra } of cases) {
    await openFreshPage(page);
    await solveEquationAndShowPlain(page, equation);
    await expect(page.getByTestId("result-plain-text")).toContainText(expected);
    if (expectedExtra) {
      await expect(page.getByTestId("result-plain-text")).toContainText(expectedExtra);
    }
  }
});

test("solver rownan pokazuje rodziny rozwiazan trygonometrycznych i bledy matematyczne", async ({ page }) => {
  await openFreshPage(page);

  await solveEquationAndShowPlain(page, "sin(x)=0");
  await expect(page.getByTestId("result-plain-text")).toContainText("pi*n");

  await openFreshPage(page);
  await solveEquationAndShowPlain(page, "1/(x-1)=1/0");
  await expect(page.getByTestId("result-plain-text")).toContainText(/Błąd|Blad/i);
  await expect(page.getByTestId("result-plain-text")).toContainText(/niezdefini|nieokre/i);
});
