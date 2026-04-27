import { useMemo, useState } from "react";

import { FORMULA_SHEET_PAGES } from "../data/formulas";
import { LatexBlock } from "./LatexBlock";
import { SectionCard } from "./SectionCard";

type VisibleFormulaGroup = {
  category: string;
  formulas: {
    id: string;
    category: string;
    title: string;
    latex: string;
    plain: string;
    keywords: string[];
  }[];
};

type VisiblePage = {
  page: number;
  displayPage: number;
  displayHeading: string;
  formulas: VisibleFormulaGroup["formulas"];
  groups: VisibleFormulaGroup[];
};

type FormulaCardItem = VisibleFormulaGroup["formulas"][number];

type LegendEntry = {
  key: string;
  label: string;
  description: string;
};

function joinLabels(labels: string[]) {
  if (labels.length <= 2) {
    return labels.join(" • ");
  }
  return `${labels.slice(0, 2).join(" • ")} • i więcej`;
}

function normalizeLatexTokens(text: string) {
  return text
    .replace(/\\alpha/g, " alpha ")
    .replace(/\\beta/g, " beta ")
    .replace(/\\gamma/g, " gamma ")
    .replace(/\\delta/g, " delta ")
    .replace(/\\theta/g, " theta ")
    .replace(/\\phi/g, " phi ")
    .replace(/\\varphi/g, " varphi ")
    .replace(/\\omega/g, " omega ")
    .replace(/\\Omega/g, " Omega ")
    .replace(/\\Delta/g, " Delta ")
    .replace(/\\pi/g, " pi ")
    .replace(/\\sigma/g, " sigma ")
    .replace(/\\bar\{x\}/g, " xbar ")
    .replace(/\\operatorname\{Me\}/g, " Me ")
    .replace(/\\[A-Za-z]+/g, " ");
}

function extractTokens(item: FormulaCardItem) {
  const source = normalizeLatexTokens(`${item.title} ${item.plain} ${item.latex}`);
  const tokens = source.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [];
  return Array.from(new Set(tokens));
}

function buildFormulaLegend(item: FormulaCardItem): LegendEntry[] {
  const rawTokens = extractTokens(item);
  const tokenSet = new Set(rawTokens);
  const contextText = `${item.category} ${item.title}`.toLowerCase();
  const entries: LegendEntry[] = [];

  const isGeometry =
    /(geometr|planimetria|czworokaty|stereometria|tr[óo]jkat|okrag|ko[lł]o|podobienstwo)/.test(
      contextText,
    );
  const isTrigonometry = /(tryg|wartosci szczegolne)/.test(contextText);
  const isSequences = /(ciagi|procent skladany)/.test(contextText);
  const isProbability = /prawdopodob/.test(contextText);
  const isStatistics = /statystyka/.test(contextText);
  const isCalculus = /(pochodne|calki)/.test(contextText);
  const isQuadratic = /funkcja kwadratowa/.test(contextText);
  const isMatrixOrComplex = /(macierze|zespolone)/.test(contextText);
  const isLogarithm = /logarytm/.test(contextText);
  const isCombinatorics =
    /(kombinatoryka|silnia i dwumian|dwumian|wzor newtona|newton)/.test(contextText);

  const push = (key: string, label: string, description: string) => {
    if (!description || entries.some((entry) => entry.key === key)) {
      return;
    }
    entries.push({ key, label, description });
  };

  if (["alpha", "beta", "gamma", "phi", "varphi", "theta"].some((token) => tokenSet.has(token))) {
    push("angles", "α, β, γ, φ, θ", "miary kątów lub argumenty funkcji trygonometrycznych");
  }

  if (tokenSet.has("x1") || tokenSet.has("x_1") || tokenSet.has("x2") || tokenSet.has("x_2")) {
    push("roots", "x₁, x₂", "pierwiastki lub rozwiązania równania");
  }

  if (tokenSet.has("xw") || tokenSet.has("yw")) {
    push("vertex", "x_w, y_w", "współrzędne wierzchołka paraboli");
  }

  if (tokenSet.has("x0") || tokenSet.has("y0")) {
    push("point0", "x₀, y₀", "współrzędne punktu odniesienia");
  }

  if (
    tokenSet.has("xA") ||
    tokenSet.has("yA") ||
    tokenSet.has("xB") ||
    tokenSet.has("yB") ||
    tokenSet.has("xC") ||
    tokenSet.has("yC")
  ) {
    push("coords", "x_A, y_A, x_B, y_B, x_C, y_C", "współrzędne punktów A, B i C");
  }

  if (tokenSet.has("a_1") || tokenSet.has("a1")) {
    push("a1", "a₁", "pierwszy wyraz ciągu");
  }
  if (tokenSet.has("a_n") || tokenSet.has("an")) {
    push("an", "aₙ", "n-ty wyraz ciągu");
  }
  if (tokenSet.has("S_n") || tokenSet.has("Sn")) {
    push("sn", "Sₙ", "suma pierwszych n wyrazów");
  }
  if (tokenSet.has("K_0") || tokenSet.has("K0") || tokenSet.has("K_n") || tokenSet.has("Kn")) {
    push("capital", "K₀, Kₙ", "kapitał początkowy i kapitał po n okresach");
  }
  if (tokenSet.has("P_p") || tokenSet.has("P_b") || tokenSet.has("P_c") || tokenSet.has("O_p")) {
    push(
      "solid-areas",
      "P_p, P_b, P_c, O_p",
      "pole podstawy, pole boczne, pole całkowite oraz obwód podstawy",
    );
  }
  if (tokenSet.has("sigma") || tokenSet.has("xbar") || tokenSet.has("Me")) {
    push("stats", "x̄, σ, Me", "średnia arytmetyczna, odchylenie standardowe i mediana");
  }
  if (tokenSet.has("Delta")) {
    push("delta", "Δ", "wyróżnik równania kwadratowego");
  }

  for (const token of rawTokens) {
    switch (token) {
      case "x":
        push("x", "x", isGeometry ? "współrzędna lub zmienna" : "zmienna lub niewiadoma");
        break;
      case "y":
        push(
          "y",
          "y",
          isGeometry ? "współrzędna lub wartość funkcji" : "zmienna lub wartość funkcji",
        );
        break;
      case "z":
        push(
          "z",
          "z",
          isMatrixOrComplex ? "liczba zespolona lub zmienna" : "zmienna lub trzecia współrzędna",
        );
        break;
      case "a":
        push(
          "a",
          "a",
          isGeometry
            ? "długość boku, krawędzi albo współczynnik kierunkowy"
            : isTrigonometry
              ? "miara kąta lub parametr pomocniczy"
              : "stała, parametr albo współczynnik",
        );
        break;
      case "b":
        push(
          "b",
          "b",
          isGeometry
            ? "długość boku, krawędzi albo wyraz wolny"
            : isTrigonometry
              ? "miara kąta lub parametr pomocniczy"
              : "stała, parametr albo współczynnik",
        );
        break;
      case "c":
        push(
          "c",
          "c",
          isCalculus
            ? "stała całkowania lub parametr pomocniczy"
            : isGeometry
              ? "długość boku lub współczynnik"
              : "stała lub współczynnik",
        );
        break;
      case "d":
        push(
          "d",
          "d",
          isGeometry ? "długość odcinka, przekątna albo współczynnik" : "stała lub współczynnik",
        );
        break;
      case "e":
        push("e", "e", isLogarithm || isCalculus ? "liczba Eulera" : "stała lub oznaczenie punktu");
        break;
      case "f":
        push(
          "f",
          "f",
          isCalculus ? "funkcja różniczkowana lub całkowana" : "funkcja albo oznaczenie punktu",
        );
        break;
      case "g":
        push(
          "g",
          "g",
          isCalculus ? "druga funkcja lub funkcja zewnętrzna" : "funkcja albo parametr pomocniczy",
        );
        break;
      case "h":
        push("h", "h", isGeometry ? "wysokość" : "parametr lub przyrost");
        break;
      case "k":
        push(
          "k",
          "k",
          isCombinatorics
            ? "liczba wybieranych elementów lub indeks sumy"
            : "indeks lub parametr pomocniczy",
        );
        break;
      case "l":
        push("l", "l", isGeometry ? "długość łuku albo tworząca stożka" : "parametr pomocniczy");
        break;
      case "m":
        push("m", "m", "liczba naturalna, wykładnik albo parametr");
        break;
      case "n":
        push(
          "n",
          "n",
          isSequences || isCombinatorics
            ? "liczba naturalna, numer wyrazu albo stopień rozwinięcia"
            : "liczba naturalna lub parametr",
        );
        break;
      case "p":
        push(
          "p",
          "p",
          isProbability
            ? "prawdopodobieństwo zdarzenia"
            : isSequences
              ? "oprocentowanie wyrażone w procentach"
              : "parametr lub współczynnik",
        );
        break;
      case "q":
        push(
          "q",
          "q",
          isSequences
            ? "iloraz ciągu geometrycznego"
            : isProbability
              ? "prawdopodobieństwo dopełniające, zwykle q = 1-p"
              : "parametr pomocniczy",
        );
        break;
      case "r":
        push(
          "r",
          "r",
          isSequences
            ? "różnica ciągu arytmetycznego"
            : isGeometry
              ? "promień albo promień okręgu wpisanego"
              : "parametr pomocniczy",
        );
        break;
      case "R":
        push("R", "R", isGeometry ? "promień okręgu opisanego" : "parametr lub zbiór liczb rzeczywistych");
        break;
      case "s":
        push("s", "s", isGeometry ? "połowa obwodu trójkąta lub parametr pomocniczy" : "parametr pomocniczy");
        break;
      case "t":
        push("t", "t", "parametr lub zmienna pomocnicza");
        break;
      case "u":
        push(
          "u",
          "u",
          isCalculus ? "wewnętrzne wyrażenie w złożeniu funkcji" : "wektor albo wyrażenie pomocnicze",
        );
        break;
      case "v":
        push("v", "v", isGeometry ? "wektor lub parametr pomocniczy" : "parametr pomocniczy");
        break;
      case "P":
        push("P", "P", isProbability ? "prawdopodobieństwo zdarzenia" : "pole figury");
        break;
      case "V":
        push(
          "V",
          "V",
          isCombinatorics ? "liczba wariacji" : isStatistics ? "wariancja lub wartość pomocnicza" : "objętość",
        );
        break;
      case "L":
        push("L", "L", isGeometry ? "obwód albo długość" : "oznaczenie pomocnicze");
        break;
      case "S":
        push("S", "S", isGeometry ? "środek odcinka lub pole pomocnicze" : "suma lub wartość pomocnicza");
        break;
      case "W":
        push("W", "W", isQuadratic ? "wierzchołek paraboli" : "punkt albo oznaczenie pomocnicze");
        break;
      case "A":
      case "B":
      case "C":
      case "D":
      case "E":
      case "F":
      case "G":
      case "H":
      case "O":
        if (isProbability && ["A", "B", "C"].includes(token)) {
          push(`event-${token}`, token, "zdarzenie losowe");
        } else if (isGeometry) {
          push(`point-${token}`, token, "oznaczenie punktu geometrycznego");
        }
        break;
      case "Omega":
        push("omega-space", "Ω", "zbiór wszystkich wyników doświadczenia losowego");
        break;
      case "pi":
        push("pi", "π", "stała Archimedesa");
        break;
      case "sigma":
        push("sigma", "σ", "odchylenie standardowe");
        break;
      case "Me":
        push("me", "Me", "mediana");
        break;
      default:
        break;
    }
  }

  if (isCalculus && item.latex.includes("+ C")) {
    push("constant-c", "C", "stała całkowania");
  }

  if (entries.length === 0) {
    push("generic", "Symbole", "oznaczają wielkości opisane bezpośrednio w treści wzoru.");
  }

  return entries;
}

export function FormulaPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [pageFilter, setPageFilter] = useState("Wszystkie");

  const sheetPages = useMemo(
    () =>
      FORMULA_SHEET_PAGES.map((page, index) => {
        const categories = Array.from(new Set(page.formulas.map((formula) => formula.category)));
        return {
          ...page,
          displayPage: index + 1,
          displayHeading: joinLabels(categories),
        };
      }),
    [],
  );

  const sheetCategories = useMemo(
    () =>
      Array.from(
        new Set(sheetPages.flatMap((page) => page.formulas.map((formula) => formula.category))),
      ).sort((left, right) => left.localeCompare(right, "pl")),
    [sheetPages],
  );

  const visiblePages = useMemo<VisiblePage[]>(() => {
    const normalized = query.trim().toLowerCase();

    return sheetPages
      .filter((page) => pageFilter === "Wszystkie" || String(page.displayPage) === pageFilter)
      .map((page) => {
        const filteredFormulas = page.formulas.filter((formula) => {
          if (category !== "Wszystkie" && formula.category !== category) {
            return false;
          }
          if (!normalized) {
            return true;
          }

          const haystack = [
            formula.title,
            formula.category,
            formula.plain,
            formula.latex,
            ...formula.keywords,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalized);
        });

        const groups = Array.from(new Set(filteredFormulas.map((formula) => formula.category))).map(
          (groupCategory) => ({
            category: groupCategory,
            formulas: filteredFormulas.filter((formula) => formula.category === groupCategory),
          }),
        );

        return {
          page: page.page,
          displayPage: page.displayPage,
          displayHeading: page.displayHeading,
          formulas: filteredFormulas,
          groups,
        };
      })
      .filter((page) => page.formulas.length > 0);
  }, [category, pageFilter, query, sheetPages]);

  return (
    <SectionCard
      title="Karta wzorów"
      subtitle="Widok jest uporządkowany karta po karcie, z grupowaniem wzorów według działów. Każdy wzór ma sekcję „Gdzie:”, która objaśnia użyte symbole."
    >
      <div className="form-grid formula-grid--three">
        <label className="field">
          <span>Szukaj</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Na przykład: jedynka trygonometryczna, macierz, całka"
          />
        </label>

        <label className="field">
          <span>Kategoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="Wszystkie">Wszystkie</option>
            {sheetCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Karta</span>
          <select value={pageFilter} onChange={(event) => setPageFilter(event.target.value)}>
            <option value="Wszystkie">Wszystkie</option>
            {sheetPages.map((page) => (
              <option key={page.displayPage} value={String(page.displayPage)}>
                Karta {page.displayPage}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="formula-sheet" data-testid="formula-grid">
        {visiblePages.map((page) => (
          <section className="formula-page" key={`${page.displayPage}-${page.page}`}>
            <header className="formula-page__header">
              <span className="formula-page__badge">Karta {page.displayPage}</span>
              <div className="formula-page__titleblock">
                <h3>{page.displayHeading}</h3>
                <p>Źródło: strona {page.page} oryginalnego arkusza</p>
              </div>
            </header>

            <div className="formula-page__groups">
              {page.groups.map((group) => (
                <section className="formula-group" key={`${page.displayPage}-${group.category}`}>
                  <div className="formula-group__header">
                    <h4>{group.category}</h4>
                    <span>{group.formulas.length} wzorów</span>
                  </div>

                  <div className="formula-page__list">
                    {group.formulas.map((item) => (
                      <article className="formula-card" key={item.id}>
                        <h5>{item.title}</h5>
                        <div className="math-scroll">
                          <LatexBlock latex={item.latex} />
                        </div>
                        <code>{item.plain}</code>
                        <div className="formula-card__legend">
                          <div className="formula-card__legend-title">Gdzie:</div>
                          <ul className="formula-card__legend-list">
                            {buildFormulaLegend(item).map((entry) => (
                              <li className="formula-card__legend-item" key={`${item.id}-${entry.key}`}>
                                <strong>{entry.label}</strong> — {entry.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SectionCard>
  );
}
