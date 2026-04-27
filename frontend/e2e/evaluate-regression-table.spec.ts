import { expect, test, type Page } from "@playwright/test";

type Mode = "exact" | "approx";
type AngleMode = "rad" | "deg" | "grad";

interface SettingsState {
  mode?: Mode;
  angle_mode?: AngleMode;
  precision?: number;
}

type ExpectedMatcher = string | RegExp | ((plain: string) => void);

async function openFreshPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Kalkulator naukowy Exact \+ Approx/i })).toBeVisible();
}

async function configureSettings(page: Page, settings: SettingsState) {
  if (settings.mode) {
    await page.getByTestId("settings-mode-select").selectOption(settings.mode);
  }
  if (settings.angle_mode) {
    await page.getByTestId("settings-angle-select").selectOption(settings.angle_mode);
  }
  if (typeof settings.precision === "number") {
    await page.getByTestId("settings-precision-input").fill(String(settings.precision));
  }
}

async function submitEvaluate(page: Page, expression: string) {
  await page.getByTestId("main-tab-evaluate").click();
  await page.getByTestId("evaluate-input").fill(expression);
  await page.getByTestId("evaluate-submit-inline").click();
}

async function expectSuccessfulResult(page: Page, expected: ExpectedMatcher) {
  await expect(page.locator(".alert--error")).toHaveCount(0);
  await expect(page.getByTestId("result-value-math").locator(".katex")).toBeVisible();
  const plainTextBlock = page.getByTestId("result-plain-text");
  if ((await plainTextBlock.count()) === 0) {
    await page.getByTestId("result-toggle-plain").click();
    await expect(plainTextBlock).toBeVisible();
  }
  const plain = ((await plainTextBlock.locator("code").textContent()) ?? "").trim();

  if (typeof expected === "string") {
    expect(plain).toBe(expected);
    return;
  }

  if (expected instanceof RegExp) {
    expect(plain).toMatch(expected);
    return;
  }

  expected(plain);
}

async function expectErrorResult(page: Page, pattern?: RegExp) {
  const errorAlert = page.locator(".alert--error");
  await expect(errorAlert).toBeVisible();
  if (pattern) {
    await expect(errorAlert).toContainText(pattern);
  }
}

async function runSuccessfulCase(
  page: Page,
  settings: SettingsState,
  expression: string,
  expected: ExpectedMatcher,
) {
  await openFreshPage(page);
  await configureSettings(page, settings);
  await submitEvaluate(page, expression);
  await expectSuccessfulResult(page, expected);
}

async function runErrorCase(
  page: Page,
  settings: SettingsState,
  expression: string,
  pattern?: RegExp,
) {
  await openFreshPage(page);
  await configureSettings(page, settings);
  await submitEvaluate(page, expression);
  await expectErrorResult(page, pattern);
}

test.describe("Tabela regresji T001-T055", () => {
  test("T001-T018: podstawowa arytmetyka, znaki i ulamki", async ({ page }) => {
    test.slow();

    const exactCases: Array<[string, string, ExpectedMatcher]> = [
      ["T001", "2+2", "4"],
      ["T002", "7-3", "4"],
      ["T003", "6*8", "48"],
      ["T004", "20/5", "4"],
      ["T005", "2+3*4", "14"],
      ["T006", "(2+3)*4", "20"],
      ["T007", "10-2*3", "4"],
      ["T008", "(10-2)*3", "24"],
      ["T009", "-5+2", "-3"],
      ["T010", "-5*-2", "10"],
      ["T011", "10-(-3)", "13"],
      ["T012", "(-2)^3", "-8"],
      ["T013", "(-2)^2", "4"],
      ["T014", "1/2+1/3", "5/6"],
    ];

    for (const [id, expression, expected] of exactCases) {
      await test.step(id, async () => {
        await runSuccessfulCase(page, { mode: "exact", angle_mode: "rad" }, expression, expected);
      });
    }

    const approxCases: Array<[string, string, ExpectedMatcher]> = [
      ["T015", "0.5+0.25", "0.75"],
      ["T016", "0.1+0.2", "0.3"],
      ["T017", "10/4", "2.5"],
      ["T018", "5.5*2", "11"],
    ];

    for (const [id, expression, expected] of approxCases) {
      await test.step(id, async () => {
        await runSuccessfulCase(
          page,
          { mode: "approx", angle_mode: "rad", precision: 12 },
          expression,
          expected,
        );
      });
    }
  });

  test("T019-T024: exact vs approx i precyzja", async ({ page }) => {
    const cases: Array<[string, SettingsState, string, ExpectedMatcher]> = [
      ["T019", { mode: "exact" }, "sqrt(2)", "sqrt(2)"],
      ["T020", { mode: "approx", precision: 4 }, "sqrt(2)", "1.4142"],
      ["T021", { mode: "exact" }, "pi", "pi"],
      ["T022", { mode: "approx", precision: 4 }, "pi", "3.1416"],
      ["T023", { mode: "exact" }, "1/3", "1/3"],
      ["T024", { mode: "approx", precision: 4 }, "1/3", "0.3333"],
    ];

    for (const [id, settings, expression, expected] of cases) {
      await test.step(id, async () => {
        await runSuccessfulCase(page, { angle_mode: "rad", ...settings }, expression, expected);
      });
    }
  });

  test("T025-T030: trygonometria i pułapki jednostek", async ({ page }) => {
    const positiveCases: Array<[string, SettingsState, string, ExpectedMatcher]> = [
      ["T025", { mode: "exact", angle_mode: "rad" }, "sin(pi/2)", "1"],
      ["T026", { mode: "exact", angle_mode: "rad" }, "cos(pi)", "-1"],
      ["T027", { mode: "exact", angle_mode: "deg" }, "sin(90)", "1"],
      ["T028", { mode: "exact", angle_mode: "deg" }, "cos(180)", "-1"],
      ["T029", { mode: "exact", angle_mode: "deg" }, "tan(45)", "1"],
      ["T030", { mode: "exact", angle_mode: "rad" }, "tan(pi/4)", "1"],
    ];

    for (const [id, settings, expression, expected] of positiveCases) {
      await test.step(id, async () => {
        await runSuccessfulCase(page, settings, expression, expected);
      });
    }

    await test.step("Pułapka: sin(90) w radianach nie daje 1", async () => {
      await runSuccessfulCase(page, { mode: "exact", angle_mode: "rad" }, "sin(90)", (plain) => {
        expect(plain).not.toBe("1");
      });
    });

    await test.step("Pułapka: sin(pi/2) w stopniach nie daje 1", async () => {
      await runSuccessfulCase(page, { mode: "exact", angle_mode: "deg" }, "sin(pi/2)", (plain) => {
        expect(plain).not.toBe("1");
      });
    });
  });

  test("T031-T038: potegi i nawiasy", async ({ page }) => {
    const cases: Array<[string, string, ExpectedMatcher]> = [
      ["T031", "2^3", "8"],
      ["T032", "9^(1/2)", "3"],
      ["T033", "sqrt(16)", "4"],
      ["T034", "sqrt(2)^2", "2"],
      ["T035", "(2^3)^2", "64"],
      ["T036", "2^(3^2)", "512"],
      ["T037", "((2+3)*4)", "20"],
      ["T038", "2*(3+(4*5))", "46"],
    ];

    for (const [id, expression, expected] of cases) {
      await test.step(id, async () => {
        await runSuccessfulCase(page, { mode: "exact", angle_mode: "rad" }, expression, expected);
      });
    }
  });

  test("T039-T044: bledy skladni i puste wejscie", async ({ page }) => {
    const cases: Array<[string, string]> = [
      ["T039", "(2+3"],
      ["T040", "2+"],
      ["T041", "*3"],
      ["T042", "2++2"],
      ["T043", "()"],
      ["T044", ""],
    ];

    for (const [id, expression] of cases) {
      await test.step(id, async () => {
        await runErrorCase(page, { mode: "exact", angle_mode: "rad" }, expression);
      });
    }
  });

  test("T045-T050: dziedzina, NaN i nieskonczonosci", async ({ page }) => {
    await test.step("T045", async () => {
      await runErrorCase(page, { mode: "exact", angle_mode: "rad" }, "1/0", /nieokreslonej|nieskonczonej/i);
    });

    await test.step("T046", async () => {
      await runErrorCase(page, { mode: "exact", angle_mode: "rad" }, "0/0", /nieokreslonej|nieskonczonej/i);
    });

    await test.step("T047", async () => {
      await runSuccessfulCase(page, { mode: "exact", angle_mode: "rad" }, "sqrt(-1)", "I");
    });

    await test.step("T048", async () => {
      await runErrorCase(page, { mode: "exact", angle_mode: "rad" }, "log(0)", /log\(\)|argumentu 0/i);
    });

    await test.step("T049", async () => {
      await runErrorCase(
        page,
        { mode: "exact", angle_mode: "rad" },
        "asin(2)",
        /asin\(\)|przedzialem \[-1, 1\]/i,
      );
    });

    await test.step("T050", async () => {
      await runErrorCase(
        page,
        { mode: "exact", angle_mode: "rad" },
        "tan(pi/2)",
        /tan\(\)|nie jest okreslona/i,
      );
    });
  });

  test("T051-T055: duze liczby i notacja naukowa", async ({ page }) => {
    const cases: Array<[string, string, ExpectedMatcher]> = [
      ["T051", "999999999*999999999", "999999998000000001"],
      ["T052", "2^50", "1125899906842624"],
      ["T053", "2^100", "1267650600228229401496703205376"],
      ["T054", "1e6+1", "1000001"],
      ["T055", "1e-6*1e-6", /^(1e-12|1\/1000000000000|0\.000000000001)$/],
    ];

    for (const [id, expression, expected] of cases) {
      await test.step(id, async () => {
        await runSuccessfulCase(page, { mode: "exact", angle_mode: "rad" }, expression, expected);
      });
    }
  });
});
