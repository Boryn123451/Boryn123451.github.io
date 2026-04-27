import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sympy import (
    Eq,
    FiniteSet,
    ImageSet,
    Intersection,
    Lambda,
    N,
    Poly,
    S,
    Symbol,
    Union,
    cancel,
    count_ops,
    diff,
    expand_complex,
    expand_mul,
    factor_terms,
    integrate,
    linsolve,
    nonlinsolve,
    radsimp,
    ratsimp,
    roots,
    simplify,
    sin,
    solve,
    solveset,
    sqrtdenest,
    sstr,
    tan,
    pi,
    together,
    cos,
)
from sympy.calculus.util import continuous_domain
from sympy.core.sorting import default_sort_key
from sympy.matrices import MatrixBase
from sympy.sets import Integers
from sympy.sets.conditionset import ConditionSet

from .exceptions import CalculatorError
from .formula_identities import simplify_with_known_formulas
from .formatter import format_latex, plain_text
from .input_preview import analyze_preview_input
from .parsing import RESERVED_IDENTIFIERS, parse_expression
from .settings import EngineSettings


@dataclass
class EquationSolveAnalysis:
    variable: Symbol
    domain: Any
    candidates: List[Any]
    valid_solutions: List[Any]
    solution_set: Any
    classification: str
    message_latex: str
    message_plain: str
    domain_latex: str
    domain_plain: str
    complex_exists: bool = False


class CalculatorEngine:
    _TRIG_TOKENS = (
        "sin(",
        "cos(",
        "tan(",
        "cot(",
        "sec(",
        "csc(",
        "asin(",
        "acos(",
        "atan(",
        "acot(",
        "asec(",
        "acsc(",
    )

    @staticmethod
    def _complexity_key(value: Any) -> Tuple[int, int, str]:
        try:
            complexity = int(count_ops(value, visual=False))
        except Exception:
            complexity = 10**9
        try:
            shape = sstr(value, order="lex")
        except Exception:
            shape = repr(value)
        return complexity, len(shape), shape

    def _best_symbolic_form(self, value: Any) -> Any:
        candidates: List[Any] = [value]
        seen = set()

        def add_candidate(candidate: Any) -> None:
            try:
                key = sstr(candidate, order="lex")
            except Exception:
                key = repr(candidate)
            if key in seen:
                return
            seen.add(key)
            candidates.append(candidate)

        try:
            add_candidate(simplify_with_known_formulas(value))
        except Exception:
            pass

        transforms = (
            lambda expression: cancel(together(expression)),
            ratsimp,
            radsimp,
            sqrtdenest,
            factor_terms,
            expand_complex,
            simplify,
            lambda expression: simplify(radsimp(cancel(together(expression)))),
            lambda expression: simplify(factor_terms(radsimp(expression))),
        )

        for transform in transforms:
            try:
                transformed = transform(value)
            except Exception:
                continue
            add_candidate(transformed)
            try:
                add_candidate(simplify(transformed))
            except Exception:
                pass

        best = min(candidates, key=self._complexity_key)

        try:
            if not getattr(best, "free_symbols", set()) and getattr(best, "has", lambda *_: False)(S.ImaginaryUnit):
                distributed = simplify(expand_mul(best))
                if distributed != best:
                    best = distributed
        except Exception:
            pass

        return best

    def _simplify_value(self, value: Any):
        if isinstance(value, MatrixBase):
            return value.applyfunc(self._best_symbolic_form)
        if isinstance(value, dict):
            return {key: self._simplify_value(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._simplify_value(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self._simplify_value(item) for item in value)
        return self._best_symbolic_form(value)

    def _to_numeric(self, value: Any, settings: EngineSettings):
        if isinstance(value, MatrixBase):
            return value.applyfunc(lambda item: N(item, max(settings.precision + 8, 20)))
        if isinstance(value, dict):
            return {key: self._to_numeric(item, settings) for key, item in value.items()}
        if isinstance(value, list):
            return [self._to_numeric(item, settings) for item in value]
        if isinstance(value, tuple):
            return tuple(self._to_numeric(item, settings) for item in value)
        return N(value, max(settings.precision + 8, 20))

    def _validate_result(self, value: Any) -> None:
        if isinstance(value, MatrixBase):
            for item in value:
                self._validate_result(item)
            return
        if isinstance(value, dict):
            for item in value.values():
                self._validate_result(item)
            return
        if isinstance(value, (list, tuple, set)):
            for item in value:
                self._validate_result(item)
            return

        invalid_atoms = (S.NaN, S.ComplexInfinity, S.Infinity, S.NegativeInfinity)
        if value in invalid_atoms:
            raise CalculatorError("Wyrażenie prowadzi do wartości nieokreślonej albo nieskończonej.")

        has_method = getattr(value, "has", None)
        if callable(has_method):
            try:
                if value.has(*invalid_atoms):
                    raise CalculatorError("Wyrażenie prowadzi do wartości nieokreślonej albo nieskończonej.")
            except TypeError:
                pass

        if getattr(value, "is_finite", None) is False:
            raise CalculatorError("Wyrażenie prowadzi do wartości nieokreślonej albo nieskończonej.")

    def _finalize(self, value: Any, settings: EngineSettings) -> Any:
        simplified = self._simplify_value(value)
        result = simplified if settings.exact else self._to_numeric(simplified, settings)
        if (
            settings.exact
            and not isinstance(result, (MatrixBase, dict, list, tuple))
            and not getattr(result, "free_symbols", set())
            and getattr(result, "has", lambda *_: False)(sin, cos, tan)
        ):
            result = N(result, max(settings.precision + 8, 20))
        self._validate_result(result)
        return result

    def _build_angle_warnings(self, expression_text: str, settings: EngineSettings) -> List[str]:
        if settings.angle_mode == "rad":
            return []

        normalized = expression_text.lower().replace(" ", "")
        if "pi" not in normalized:
            return []
        if not any(token in normalized for token in self._TRIG_TOKENS):
            return []

        if settings.angle_mode == "deg":
            unit_label = "stopnie"
            example = "sin(60)"
        else:
            unit_label = "grady"
            example = "sin(200/3)"

        return [
            (
                "Aktywny tryb kątowy to {0}. Wyrażenie sin(pi/3) nie oznacza wtedy pi/3 radiana. "
                "Dla klasycznego wyniku sqrt(3)/2 użyj {1} albo przełącz na radiany."
            ).format(unit_label, example)
        ]

    @staticmethod
    def _preview_latex(expression_text: str, kind: str = "expression") -> str:
        analysis = analyze_preview_input(expression_text, kind=kind)
        return analysis.get("latex") or ""

    @staticmethod
    def _parse_symbol(name: str) -> Symbol:
        cleaned = name.strip()
        if not cleaned:
            raise CalculatorError("Podaj nazwę zmiennej.")
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", cleaned):
            raise CalculatorError("Nazwa zmiennej może zawierać tylko litery, cyfry i podkreślenia.")
        return Symbol(cleaned)

    @staticmethod
    def _split_system_lines(text: str) -> List[str]:
        if ";" in text:
            raise CalculatorError("Wpisz każde równanie w osobnym wierszu. Średnik nie jest obsługiwany jako separator równań.")
        rows = []
        for raw_line in re.split(r"\n+", text):
            cleaned = raw_line.strip()
            if cleaned:
                rows.append(cleaned)
        return rows

    @staticmethod
    def _parse_variable_names_text(text: str) -> List[str]:
        cleaned = text.strip()
        if not cleaned:
            return []
        if ";" in cleaned:
            raise CalculatorError("Niewiadome rozdziel przecinkami, na przykład x, y, z.")
        if re.search(r",\s*(,|$)", cleaned):
            raise CalculatorError("Lista niewiadomych nie może zawierać pustych pozycji ani kończyć się przecinkiem.")
        parts = [item.strip() for item in cleaned.split(",")]
        if any(not item for item in parts):
            raise CalculatorError("Lista niewiadomych nie może zawierać pustych pozycji.")
        return parts

    @staticmethod
    def _preferred_equation_symbols(equation_text: str, variable_name: str) -> List[str]:
        cleaned = variable_name.strip()
        if not re.fullmatch(r"[a-zA-Z]", cleaned):
            return []
        letters = sorted({character for character in equation_text if character.isalpha() and character.islower()})
        return letters

    def _normalize_solution_dict(self, solution: Dict[Any, Any], variables: Sequence[Symbol]) -> Dict[Any, Any]:
        normalized: Dict[Any, Any] = {}
        for variable in variables:
            raw_value = solution.get(variable, variable)
            normalized[variable] = self._simplify_value(raw_value)
        return normalized

    @staticmethod
    def _solution_depends_on_requested_variables(solution: Dict[Any, Any], variables: Sequence[Symbol]) -> bool:
        variable_set = set(variables)
        for variable in variables:
            value = solution.get(variable, variable)
            free_symbols = getattr(value, "free_symbols", set())
            if free_symbols & variable_set:
                return True
        return False

    def _validate_system_solution(
        self,
        equations: Sequence[Any],
        variables: Sequence[Symbol],
        solution: Dict[Any, Any],
    ) -> bool:
        if self._solution_depends_on_requested_variables(solution, variables):
            return False

        substitutions = {variable: solution.get(variable, variable) for variable in variables}
        for equation in equations:
            try:
                lhs_value = simplify_with_known_formulas(simplify(equation.lhs.subs(substitutions)))
                rhs_value = simplify_with_known_formulas(simplify(equation.rhs.subs(substitutions)))
                self._validate_result(lhs_value)
                self._validate_result(rhs_value)
            except CalculatorError:
                return False
            except Exception:
                return False

            if simplify_with_known_formulas(simplify(lhs_value - rhs_value)) != 0:
                return False
        return True

    def _deduplicate_solution_dicts(
        self,
        solutions: Sequence[Dict[Any, Any]],
        variables: Sequence[Symbol],
    ) -> List[Dict[Any, Any]]:
        unique: List[Dict[Any, Any]] = []
        seen = set()

        for solution in solutions:
            key = tuple(
                sstr(self._simplify_value(solution.get(variable, variable)), order="lex")
                for variable in variables
            )
            if key in seen:
                continue
            seen.add(key)
            unique.append(solution)

        def sort_key(solution: Dict[Any, Any]) -> Tuple[int, Tuple[str, ...]]:
            values = [solution.get(variable, variable) for variable in variables]
            non_real_count = sum(0 if getattr(value, "is_real", None) is not False else 1 for value in values)
            return non_real_count, tuple(sstr(value, order="lex") for value in values)

        return sorted(unique, key=sort_key)

    def _equation_input_latex(self, equations: Sequence[Any], settings: EngineSettings) -> str:
        rendered = [format_latex(equation, settings) for equation in equations]
        return "\\begin{aligned}" + "\\\\ ".join(rendered) + "\\end{aligned}"

    @staticmethod
    def _collect_symbols(expressions: Iterable[Any]) -> List[Symbol]:
        collected = set()
        for expression in expressions:
            collected.update(getattr(expression, "free_symbols", set()))
        return sorted(collected, key=default_sort_key)

    def _resolve_symbol(self, variable_name: str, expressions: Sequence[Any]) -> Tuple[Symbol, bool, Optional[str]]:
        detected = self._collect_symbols(expressions)
        cleaned = variable_name.strip()
        if cleaned:
            explicit_symbol = self._parse_symbol(cleaned)
            # Always respect the user-provided variable name. If the variable
            # is not present in the expression, the derivative is 0, the integral
            # is expression*variable + C — both are mathematically correct.
            return explicit_symbol, False, None

        if not detected:
            raise CalculatorError(
                "Nie wykryto żadnej zmiennej w zapisie. Podaj ją ręcznie albo wpisz równanie zawierające niewiadomą."
            )
        if len(detected) > 1:
            detected_names = ", ".join(str(item) for item in detected)
            raise CalculatorError(
                "Wykryto więcej niż jedną zmienną: {0}. Wskaż, względem której mam liczyć.".format(
                    detected_names
                )
            )
        return detected[0], True, None

    def _resolve_equation_variable(self, variable_name: str, expressions: Sequence[Any]) -> Symbol:
        detected = self._collect_symbols(expressions)
        cleaned = variable_name.strip()
        if cleaned:
            explicit_symbol = self._parse_symbol(cleaned)
            if explicit_symbol in detected or not detected:
                return explicit_symbol

        if not detected:
            return self._parse_symbol(cleaned) if cleaned else Symbol("x")

        for preferred_name in ("x", "y", "z", "t"):
            for symbol in detected:
                if str(symbol) == preferred_name:
                    return symbol

        return detected[0]

    def _compute_real_domain(self, left_expression: Any, right_expression: Any, variable: Symbol) -> Any:
        try:
            left_domain = continuous_domain(left_expression, variable, S.Reals)
        except Exception:
            left_domain = S.Reals
        try:
            right_domain = continuous_domain(right_expression, variable, S.Reals)
        except Exception:
            right_domain = S.Reals
        try:
            return Intersection(left_domain, right_domain)
        except Exception:
            return S.Reals

    @staticmethod
    def _has_nontrivial_domain(domain: Any) -> bool:
        return domain != S.Reals

    def _domain_contains_value(self, domain: Any, value: Any) -> bool:
        if domain == S.Complexes:
            return True
        try:
            contains = domain.contains(value)
            if contains is S.true or contains is True:
                return True
            if contains is S.false or contains is False:
                return False
        except Exception:
            pass

        if getattr(value, "is_real", None) is False:
            return False
        if domain == S.Reals:
            return True
        return False

    def _domain_to_latex(self, domain: Any, variable: Symbol, settings: EngineSettings) -> str:
        if domain == S.Reals:
            return "\\mathbb{R}"

        if isinstance(domain, Union):
            excluded_points: List[Any] = []
            intervals = list(domain.args)
            finite_boundaries: Dict[str, int] = {}
            only_intervals = all(getattr(item, "is_Interval", False) for item in intervals)
            if only_intervals:
                for interval in intervals:
                    if interval.left.is_finite:
                        key = sstr(interval.left, order="lex")
                        finite_boundaries[key] = finite_boundaries.get(key, 0) + 1
                    if interval.right.is_finite:
                        key = sstr(interval.right, order="lex")
                        finite_boundaries[key] = finite_boundaries.get(key, 0) + 1
                if finite_boundaries:
                    for interval in intervals:
                        if interval.left.is_finite and finite_boundaries.get(sstr(interval.left, order="lex")) == 2:
                            excluded_points.append(interval.left)
                        if interval.right.is_finite and finite_boundaries.get(sstr(interval.right, order="lex")) == 2:
                            excluded_points.append(interval.right)
                if excluded_points:
                    unique_points = self._unique_sorted(excluded_points)
                    if len(unique_points) == 1:
                        return "{0} \\ne {1}".format(variable, format_latex(unique_points[0], settings))
                    return "{0} \\notin \\left\\{{ {1} \\right\\}}".format(
                        variable,
                        ",\\ ".join(format_latex(point, settings) for point in unique_points),
                    )

        if getattr(domain, "is_Interval", False):
            if domain.start == S.NegativeInfinity and domain.end.is_finite:
                operator = "<" if domain.right_open else "\\le"
                return "{0} {1} {2}".format(variable, operator, format_latex(domain.end, settings))
            if domain.end == S.Infinity and domain.start.is_finite:
                operator = ">" if domain.left_open else "\\ge"
                return "{0} {1} {2}".format(variable, operator, format_latex(domain.start, settings))

        return "{0} \\in {1}".format(variable, format_latex(domain, settings))

    def _domain_to_plain(self, domain: Any, variable: Symbol, settings: EngineSettings) -> str:
        latex_domain = self._domain_to_latex(domain, variable, settings)
        return (
            latex_domain.replace("\\mathbb{R}", "R")
            .replace("\\ne", "!=")
            .replace("\\le", "<=")
            .replace("\\ge", ">=")
            .replace("\\in", "in")
            .replace("\\notin", "not in")
            .replace("\\left\\{ ", "{")
            .replace(" \\right\\}", "}")
        )

    @staticmethod
    def _escape_latex_text(text: str) -> str:
        return (
            text.replace("\\", r"\\")
            .replace("{", r"\{")
            .replace("}", r"\}")
            .replace("_", r"\_")
        )

    def _validate_equation_candidate(
        self,
        left_expression: Any,
        right_expression: Any,
        variable: Symbol,
        candidate: Any,
        domain: Any,
    ) -> bool:
        if not self._domain_contains_value(domain, candidate):
            return False

        try:
            left_value = simplify_with_known_formulas(simplify(left_expression.subs(variable, candidate)))
            right_value = simplify_with_known_formulas(simplify(right_expression.subs(variable, candidate)))
            self._validate_result(left_value)
            self._validate_result(right_value)
        except CalculatorError:
            return False
        except Exception:
            return False

        try:
            relation = Eq(left_value, right_value)
            if relation is S.true:
                return True
            if relation is S.false:
                return False
        except Exception:
            pass

        try:
            difference = simplify_with_known_formulas(simplify(left_value - right_value))
            if difference == 0:
                return True
            if getattr(difference, "is_zero", None) is True:
                return True
            if not difference.free_symbols:
                return abs(complex(N(difference, 30))) < 1e-12
        except Exception:
            return False

        return False

    def _has_complex_solutions(self, expression: Any, variable: Symbol) -> bool:
        try:
            direct_solutions = solve(expression, variable, dict=False)
            if direct_solutions:
                return True
        except Exception:
            pass

        try:
            complex_solution_set = solveset(expression, variable, domain=S.Complexes)
            return complex_solution_set not in {S.EmptySet, ConditionSet(variable, expression, S.Complexes)}
        except Exception:
            return False

    def _build_equation_message(
        self,
        analysis: EquationSolveAnalysis,
        settings: EngineSettings,
    ) -> Tuple[str, str]:
        lines_latex: List[str] = []
        lines_plain: List[str] = []
        rendered_solutions = analysis.valid_solutions
        if analysis.valid_solutions and not settings.exact:
            rendered_solutions = [self._to_numeric(solution, settings) for solution in analysis.valid_solutions]

        if self._has_nontrivial_domain(analysis.domain):
            lines_latex.append("\\text{Dziedzina: } " + analysis.domain_latex)
            lines_plain.append("Dziedzina: " + analysis.domain_plain)

        variable_latex = format_latex(analysis.variable, settings)
        variable_plain = plain_text(analysis.variable, settings)

        if analysis.classification == "one_solution":
            solution = rendered_solutions[0]
            lines_latex.append("{0} = {1}".format(variable_latex, format_latex(solution, settings)))
            lines_plain.append("{0} = {1}".format(variable_plain, plain_text(solution, settings)))
        elif analysis.classification == "many_solutions":
            rendered_set_latex = "\\left\\{ " + ",\\ ".join(
                format_latex(solution, settings) for solution in rendered_solutions
            ) + " \\right\\}"
            rendered_set_plain = "{" + ", ".join(plain_text(solution, settings) for solution in rendered_solutions) + "}"
            lines_latex.append("{0} \\in {1}".format(variable_latex, rendered_set_latex))
            lines_plain.append("{0} in {1}".format(variable_plain, rendered_set_plain))
        elif analysis.classification == "infinite_solutions":
            if analysis.solution_set is not None and analysis.solution_set != analysis.domain:
                lines_latex.append("{0} \\in {1}".format(variable_latex, format_latex(analysis.solution_set, settings)))
                lines_plain.append("{0} in {1}".format(variable_plain, plain_text(analysis.solution_set, settings)))
            elif self._has_nontrivial_domain(analysis.domain):
                lines_latex.append(analysis.domain_latex)
                lines_plain.append(analysis.domain_plain)
            else:
                lines_latex.append("\\text{Nieskończenie wiele rozwiązań}")
                lines_plain.append("Nieskończenie wiele rozwiązań")
        elif analysis.classification == "no_real_solutions":
            lines_latex.append("\\text{Brak rozwiązań rzeczywistych}")
            lines_plain.append("Brak rozwiązań rzeczywistych")
            if analysis.complex_exists:
                lines_latex.append("\\text{Rozwiązania istnieją tylko w } \\mathbb{C}")
                lines_plain.append("Rozwiązania istnieją tylko w C")
        elif analysis.classification == "syntax_error":
            lines_latex.append("\\text{Błąd: " + self._escape_latex_text(analysis.message_plain) + "}")
            lines_plain.append("Błąd: " + analysis.message_plain)
        elif analysis.classification == "math_error":
            lines_latex.append("\\text{Błąd: " + self._escape_latex_text(analysis.message_plain) + "}")
            lines_plain.append("Błąd: " + analysis.message_plain)
        else:
            lines_latex.append("\\text{Brak rozwiązań}")
            lines_plain.append("Brak rozwiązań")

        if len(lines_latex) == 1:
            return lines_latex[0], lines_plain[0]

        latex_body = "\\\\ ".join(line.replace("&", "\\&") for line in lines_latex)
        plain_body = "\n".join(lines_plain)
        return "\\begin{aligned}" + latex_body + "\\end{aligned}", plain_body

    def _solve_simple_trigonometric_equation(
        self,
        left_expression: Any,
        right_expression: Any,
        variable: Symbol,
    ) -> Optional[Any]:
        normalized_left = simplify(left_expression)
        normalized_right = simplify(right_expression)

        function_side = None
        constant_side = None
        if getattr(normalized_left, "free_symbols", set()) == {variable} and not normalized_right.has(variable):
            function_side = normalized_left
            constant_side = simplify(normalized_right)
        elif getattr(normalized_right, "free_symbols", set()) == {variable} and not normalized_left.has(variable):
            function_side = normalized_right
            constant_side = simplify(normalized_left)

        if function_side is None or constant_side is None:
            return None

        k = Symbol("k", integer=True)
        if function_side == sin(variable):
            if constant_side == 0:
                return ImageSet(Lambda(k, k * pi), Integers)
            if constant_side == 1:
                return ImageSet(Lambda(k, pi / 2 + 2 * k * pi), Integers)
            if constant_side == S.Half:
                return Union(
                    ImageSet(Lambda(k, pi / 6 + 2 * k * pi), Integers),
                    ImageSet(Lambda(k, 5 * pi / 6 + 2 * k * pi), Integers),
                )
            if getattr(constant_side, "is_real", None) is True and (constant_side > 1 or constant_side < -1):
                return S.EmptySet

        if function_side == cos(variable):
            if constant_side == 1:
                return ImageSet(Lambda(k, 2 * k * pi), Integers)
            if constant_side == 0:
                return ImageSet(Lambda(k, pi / 2 + k * pi), Integers)
            if getattr(constant_side, "is_real", None) is True and (constant_side > 1 or constant_side < -1):
                return S.EmptySet

        if function_side == tan(variable):
            if constant_side == 0:
                return ImageSet(Lambda(k, k * pi), Integers)
            if constant_side == 1:
                return ImageSet(Lambda(k, pi / 4 + k * pi), Integers)

        return None

    def _resolve_system_variables(
        self,
        variables_text: str,
        expressions: Sequence[Any],
    ) -> Tuple[List[Symbol], bool, Optional[str]]:
        detected = self._collect_symbols(expressions)
        variable_names = self._parse_variable_names_text(variables_text)
        if not variable_names:
            raise CalculatorError("Podaj niewiadome rozdzielone przecinkami, na przykład x, y, z.")
        if variable_names:
            if len(variable_names) > 5:
                raise CalculatorError("Układ równań obsługuje maksymalnie 5 niewiadomych.")
            if len(set(variable_names)) != len(variable_names):
                raise CalculatorError("Lista niewiadomych zawiera duplikaty.")

            explicit_symbols = [self._parse_symbol(name) for name in variable_names]
            explicit_set = set(explicit_symbols)
            detected_set = set(detected)
            if detected and explicit_set != detected_set:
                if explicit_set.issubset(detected_set):
                    return explicit_symbols, False, None
                if len(detected) <= 5:
                    warning = (
                        "Podane niewiadome nie zgadzają się z układem, więc używam wykrytych zmiennych: {0}."
                    ).format(", ".join(str(item) for item in detected))
                    return detected, True, warning
                raise CalculatorError(
                    "Podane niewiadome nie zgadzają się z układem. Wykryte zmienne: {0}.".format(
                        ", ".join(str(item) for item in detected) or "brak"
                    )
                )

            return explicit_symbols, False, None

    def _guess_system_variable_names(self, equation_lines: Sequence[str], variables_text: str) -> List[str]:
        explicit_names = self._parse_variable_names_text(variables_text)

        guessed_names: List[str] = []
        for token in re.findall(r"[A-Za-z_][A-Za-z0-9_]*", "\n".join(equation_lines)):
            if token in RESERVED_IDENTIFIERS:
                continue
            if token.isalpha() and len(token) > 1:
                guessed_names.extend(character for character in token if character.isalpha())
            else:
                guessed_names.append(token)

        unique_names: List[str] = []
        for name in [*explicit_names, *guessed_names]:
            if name in RESERVED_IDENTIFIERS or name in unique_names:
                continue
            unique_names.append(name)
        return unique_names[:5]

    def _derive_symbolic_system_family(
        self,
        equations: Sequence[Any],
        expressions: Sequence[Any],
        variables: Sequence[Symbol],
        settings: EngineSettings,
    ) -> Optional[Dict[str, Any]]:
        variable_set = set(variables)
        assignment_candidates: List[Tuple[Symbol, Any]] = []
        for equation in equations:
            if isinstance(equation.lhs, Symbol) and equation.lhs in variable_set and not equation.rhs.has(equation.lhs):
                assignment_candidates.append((equation.lhs, self._simplify_value(equation.rhs)))
            if isinstance(equation.rhs, Symbol) and equation.rhs in variable_set and not equation.lhs.has(equation.rhs):
                assignment_candidates.append((equation.rhs, self._simplify_value(equation.lhs)))

        assignment_candidates.sort(
            key=lambda item: (
                len(getattr(item[1], "free_symbols", set()) & variable_set),
                *self._complexity_key(item[1]),
            )
        )

        assignments: Dict[Symbol, Any] = {}
        for variable, expression in assignment_candidates:
            substituted = self._simplify_value(expression.subs(assignments))
            if variable in getattr(substituted, "free_symbols", set()):
                continue
            assignments[variable] = substituted

        free_variables = [variable for variable in variables if variable not in assignments]
        if not assignments and len(free_variables) == len(variables):
            return None

        reduced_expressions: List[Any] = []
        for expression in expressions:
            reduced = self._simplify_value(simplify_with_known_formulas(simplify(expression.subs(assignments))))
            if reduced == 0 or getattr(reduced, "is_zero", None) is True:
                continue
            reduced_expressions.append(reduced)

        if not free_variables:
            if reduced_expressions:
                return {"kind": "empty"}
            solution = {variable: self._simplify_value(assignments.get(variable, variable)) for variable in variables}
            return {"kind": "finite", "solutions": [solution]}

        if len(free_variables) != 1:
            return None

        parameter = free_variables[0]
        parameter_domain: Any = S.Complexes if settings.complex_solutions else S.Reals

        for reduced in reduced_expressions:
            if not reduced.has(parameter):
                try:
                    self._validate_result(reduced)
                except CalculatorError:
                    return {"kind": "empty"}
                if reduced != 0:
                    return {"kind": "empty"}
                continue

            try:
                solution_set = solveset(reduced, parameter, domain=parameter_domain)
            except Exception:
                return None

            if solution_set == S.EmptySet:
                return {"kind": "empty"}
            parameter_domain = Intersection(parameter_domain, solution_set)
            if parameter_domain == S.EmptySet:
                return {"kind": "empty"}

        if isinstance(parameter_domain, FiniteSet):
            solutions: List[Dict[Any, Any]] = []
            for parameter_value in parameter_domain:
                candidate_solution: Dict[Any, Any] = {}
                for variable in variables:
                    if variable in assignments:
                        candidate_solution[variable] = self._simplify_value(
                            assignments[variable].subs({parameter: parameter_value})
                        )
                    elif variable == parameter:
                        candidate_solution[variable] = self._simplify_value(parameter_value)
                    else:
                        candidate_solution[variable] = variable
                solutions.append(candidate_solution)
            return {"kind": "finite", "solutions": solutions}

        family_mapping: Dict[Any, Any] = {}
        substitutions = dict(assignments)
        for variable in variables:
            if variable in assignments:
                family_mapping[variable] = self._simplify_value(assignments[variable].subs(substitutions))
            elif variable == parameter:
                family_mapping[variable] = parameter
            else:
                family_mapping[variable] = variable

        return {
            "kind": "family",
            "mapping": family_mapping,
            "parameter": parameter,
            "domain": parameter_domain,
        }

    def _format_system_family(self, family: Dict[str, Any], settings: EngineSettings) -> Tuple[str, str]:
        mapping = family["mapping"]
        parameter = family["parameter"]
        parameter_domain = family["domain"]

        latex_entries = [
            "{0} = {1}".format(format_latex(variable, settings), format_latex(value, settings))
            for variable, value in mapping.items()
        ]
        plain_entries = [
            "{0} = {1}".format(plain_text(variable, settings), plain_text(value, settings))
            for variable, value in mapping.items()
        ]

        if parameter_domain not in {S.Reals, S.Complexes}:
            latex_entries.append(
                "{0} \\in {1}".format(format_latex(parameter, settings), format_latex(parameter_domain, settings))
            )
            plain_entries.append(
                "{0} in {1}".format(plain_text(parameter, settings), plain_text(parameter_domain, settings))
            )

        return (
            "\\left\\{ " + ",\\ ".join(latex_entries) + " \\right\\}",
            "{" + ", ".join(plain_entries) + "}",
        )

    @staticmethod
    def _unique_sorted(values: Iterable[Any]) -> List[Any]:
        unique = []
        seen = set()
        for value in values:
            key = str(simplify(value))
            if key in seen:
                continue
            seen.add(key)
            unique.append(simplify(value))
        return sorted(unique, key=default_sort_key)

    def _extract_finite_candidates(self, solution_set: Any) -> List[Any]:
        if isinstance(solution_set, FiniteSet):
            return self._unique_sorted(list(solution_set))
        if isinstance(solution_set, Intersection):
            finite_parts = [item for item in solution_set.args if isinstance(item, FiniteSet)]
            if finite_parts and all(isinstance(item, FiniteSet) or item in {S.Reals, S.Complexes} for item in solution_set.args):
                extracted: List[Any] = []
                for item in finite_parts:
                    extracted.extend(list(item))
                return self._unique_sorted(extracted)
        return []

    def _solve_complex_equation_candidates(self, expression: Any, variable: Symbol) -> Tuple[List[Any], Any]:
        try:
            complex_solution_set = solveset(expression, variable, domain=S.Complexes)
        except Exception:
            complex_solution_set = ConditionSet(variable, expression, S.Complexes)

        candidates = self._extract_finite_candidates(complex_solution_set)


        if not candidates:
            try:
                direct_candidates = solve(expression, variable, dict=False)
            except Exception:
                direct_candidates = []
            if direct_candidates:
                candidates = self._unique_sorted([self._simplify_value(item) for item in direct_candidates])

        symbolic_family = None
        if not candidates and complex_solution_set not in {S.EmptySet, S.Complexes} and not isinstance(complex_solution_set, ConditionSet):
            symbolic_family = complex_solution_set

        return candidates, symbolic_family

    def _solve_symbolic_equation(self, expression: Any, variable: Symbol) -> Dict[str, Any]:
        degree = None

        try:
            polynomial = Poly(expression, variable, extension=True)
            if polynomial.is_univariate:
                degree = polynomial.degree()
                if degree <= 4:
                    root_map = roots(
                        expression,
                        variable,
                        multiple=False,
                        cubics=True,
                        quartics=True,
                        filter="C",
                    )
                    if root_map:
                        exact_roots: List[Any] = []
                        for root_value, multiplicity in root_map.items():
                            exact_roots.extend([simplify(root_value)] * multiplicity)
                        return {
                            "solutions": self._unique_sorted(exact_roots),
                            "degree": degree,
                            "symbolic_family": None,
                            "warnings": [],
                        }
        except Exception:
            degree = None

        solution_set = solveset(expression, variable, domain=S.Complexes)
        if isinstance(solution_set, FiniteSet):
            return {
                "solutions": self._unique_sorted(list(solution_set)),
                "degree": degree,
                "symbolic_family": None,
                "warnings": [],
            }

        if solution_set not in {S.EmptySet, S.Complexes} and not isinstance(solution_set, ConditionSet):
            return {
                "solutions": [],
                "degree": degree,
                "symbolic_family": solution_set,
                "warnings": [],
            }

        direct_solutions = solve(expression, variable, dict=False)
        if direct_solutions:
            return {
                "solutions": self._unique_sorted(direct_solutions),
                "degree": degree,
                "symbolic_family": None,
                "warnings": [],
            }

        try:
            polynomial = Poly(expression, variable, extension=True)
            numeric_roots = [simplify(root) for root in polynomial.nroots(n=30)]
            return {
                "solutions": self._unique_sorted(numeric_roots),
                "degree": polynomial.degree(),
                "symbolic_family": None,
                "warnings": [
                    "Nie znaleziono zwartej postaci symbolicznej, dlatego pokazano numeryczne przybliżenia pierwiastków."
                ],
            }
        except Exception:
            pass

        raise CalculatorError(
            "Nie udało się rozwiązać tego równania automatycznie. Spróbuj wskazać inną zmienną, uprościć zapis albo skorzystać z trybu Approx."
        )

    def evaluate(self, expression_text: str, settings: EngineSettings) -> Dict[str, Any]:
        expression = parse_expression(expression_text, settings)
        result = self._finalize(expression, settings)
        preview_latex = self._preview_latex(expression_text)
        return {
            "operation": "evaluate",
            "inputLatex": preview_latex,
            "resultLatex": format_latex(result, settings),
            "resultPlain": plain_text(result, settings),
            "warnings": self._build_angle_warnings(expression_text, settings),
        }

    def preview_input(self, expression_text: str, settings: EngineSettings, kind: str = "expression") -> Dict[str, Any]:
        preview = analyze_preview_input(expression_text, kind=kind)
        return {
            "operation": "preview",
            "status": preview["status"],
            "latex": preview["latex"],
            "plain": preview["plain"],
            "message": preview.get("message"),
            "suggestion": preview.get("suggestion"),
            "warnings": self._build_angle_warnings(expression_text, settings),
        }

    def _analyze_equation(
        self,
        equation_text: str,
        variable_name: str,
        settings: EngineSettings,
    ) -> EquationSolveAnalysis:
        try:
            fallback_variable = self._parse_symbol(variable_name) if variable_name.strip() else Symbol("x")
        except CalculatorError:
            fallback_variable = Symbol("x")
        default_domain = S.Reals
        default_domain_latex = "\\mathbb{R}"
        default_domain_plain = "R"

        if "=" not in equation_text:
            return EquationSolveAnalysis(
                variable=fallback_variable,
                domain=default_domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="syntax_error",
                message_latex="",
                message_plain="Podaj równanie w postaci lewa = prawa.",
                domain_latex=default_domain_latex,
                domain_plain=default_domain_plain,
            )

        left_text, right_text = equation_text.split("=", 1)
        if not left_text.strip() or not right_text.strip():
            return EquationSolveAnalysis(
                variable=fallback_variable,
                domain=default_domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="syntax_error",
                message_latex="",
                message_plain="Każda strona równania musi zawierać poprawne wyrażenie.",
                domain_latex=default_domain_latex,
                domain_plain=default_domain_plain,
            )

        preferred_symbols = self._preferred_equation_symbols(equation_text, variable_name)

        try:
            left_expression_raw = parse_expression(
                left_text,
                settings,
                evaluate=False,
                preferred_symbols=preferred_symbols,
            )
            right_expression_raw = parse_expression(
                right_text,
                settings,
                evaluate=False,
                preferred_symbols=preferred_symbols,
            )
            left_expression = parse_expression(left_text, settings, preferred_symbols=preferred_symbols)
            right_expression = parse_expression(right_text, settings, preferred_symbols=preferred_symbols)
        except CalculatorError as exc:
            return EquationSolveAnalysis(
                variable=fallback_variable,
                domain=default_domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="syntax_error",
                message_latex="",
                message_plain=str(exc),
                domain_latex=default_domain_latex,
                domain_plain=default_domain_plain,
            )

        try:
            variable = self._resolve_equation_variable(
                variable_name,
                [left_expression, right_expression, left_expression_raw, right_expression_raw],
            )
        except CalculatorError as exc:
            return EquationSolveAnalysis(
                variable=fallback_variable,
                domain=default_domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="syntax_error",
                message_latex="",
                message_plain=str(exc),
                domain_latex=default_domain_latex,
                domain_plain=default_domain_plain,
            )
        domain = self._compute_real_domain(left_expression_raw, right_expression_raw, variable)
        domain_latex = self._domain_to_latex(domain, variable, settings)
        domain_plain = self._domain_to_plain(domain, variable, settings)

        try:
            self._validate_result(left_expression_raw)
            self._validate_result(right_expression_raw)
            self._validate_result(left_expression)
            self._validate_result(right_expression)
        except CalculatorError as exc:
            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="math_error",
                message_latex="",
                message_plain=str(exc),
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        reduced_expression = simplify_with_known_formulas(simplify(left_expression - right_expression))

        if reduced_expression == 0 or getattr(reduced_expression, "is_zero", None) is True:
            if domain == S.EmptySet:
                return EquationSolveAnalysis(
                    variable=variable,
                    domain=domain,
                    candidates=[],
                    valid_solutions=[],
                    solution_set=None,
                    classification="no_solutions",
                    message_latex="",
                    message_plain="Brak rozwiązań",
                    domain_latex=domain_latex,
                    domain_plain=domain_plain,
                )

            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=[],
                valid_solutions=[],
                solution_set=domain,
                classification="infinite_solutions",
                message_latex="",
                message_plain="Nieskończenie wiele rozwiązań",
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        if not reduced_expression.has(variable):
            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=[],
                valid_solutions=[],
                solution_set=None,
                classification="no_solutions",
                message_latex="",
                message_plain="Brak rozwiązań",
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        trig_solution_set = self._solve_simple_trigonometric_equation(left_expression, right_expression, variable)
        if trig_solution_set is not None:
            if trig_solution_set == S.EmptySet:
                complex_exists = self._has_complex_solutions(reduced_expression, variable)
                return EquationSolveAnalysis(
                    variable=variable,
                    domain=domain,
                    candidates=[],
                    valid_solutions=[],
                    solution_set=None,
                    classification="no_real_solutions" if complex_exists else "no_solutions",
                    message_latex="",
                    message_plain="Brak rozwiązań rzeczywistych" if complex_exists else "Brak rozwiązań",
                    domain_latex=domain_latex,
                    domain_plain=domain_plain,
                    complex_exists=complex_exists,
                )

            return EquationSolveAnalysis(
                variable=variable,
                domain=S.Reals,
                candidates=[],
                valid_solutions=[],
                solution_set=trig_solution_set,
                classification="infinite_solutions",
                message_latex="",
                message_plain="Nieskończenie wiele rozwiązań",
                domain_latex="\\mathbb{R}",
                domain_plain="R",
            )

        real_solution_set: Any
        try:
            real_solution_set = solveset(reduced_expression, variable, domain=S.Reals)
        except Exception:
            real_solution_set = ConditionSet(variable, Eq(left_expression, right_expression), S.Reals)

        candidates: List[Any] = []
        if isinstance(real_solution_set, FiniteSet):
            candidates = self._unique_sorted(list(real_solution_set))
        elif isinstance(real_solution_set, Intersection):
            finite_parts = [item for item in real_solution_set.args if isinstance(item, FiniteSet)]
            if finite_parts and all(isinstance(item, FiniteSet) or item == S.Reals for item in real_solution_set.args):
                extracted: List[Any] = []
                for item in finite_parts:
                    extracted.extend(list(item))
                candidates = self._unique_sorted(extracted)
            else:
                return EquationSolveAnalysis(
                    variable=variable,
                    domain=domain,
                    candidates=[],
                    valid_solutions=[],
                    solution_set=real_solution_set,
                    classification="infinite_solutions",
                    message_latex="",
                    message_plain="Nieskończenie wiele rozwiązań",
                    domain_latex=domain_latex,
                    domain_plain=domain_plain,
                )
        elif real_solution_set == S.EmptySet:
            candidates = []
        elif isinstance(real_solution_set, (ImageSet, Union)) or real_solution_set == S.Reals:
            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=[],
                valid_solutions=[],
                solution_set=real_solution_set if real_solution_set != S.Reals else domain,
                classification="infinite_solutions",
                message_latex="",
                message_plain="Nieskończenie wiele rozwiązań",
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        elif real_solution_set not in {None, S.Complexes} and not isinstance(real_solution_set, ConditionSet):
            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=[],
                valid_solutions=[],
                solution_set=real_solution_set,
                classification="infinite_solutions",
                message_latex="",
                message_plain="Nieskoczenie wiele rozwiza",
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        if not candidates:
            try:
                direct_candidates = solve(Eq(left_expression, right_expression), variable, dict=False)
            except Exception:
                direct_candidates = []
            if direct_candidates:
                candidates = self._unique_sorted([self._simplify_value(item) for item in direct_candidates])

        valid_solutions = [
            self._simplify_value(candidate)
            for candidate in candidates
            if self._validate_equation_candidate(left_expression_raw, right_expression_raw, variable, candidate, domain)
        ]
        valid_solutions = self._unique_sorted(valid_solutions)

        if settings.complex_solutions:
            complex_candidates, complex_symbolic_family = self._solve_complex_equation_candidates(
                reduced_expression,
                variable,
            )
            valid_complex_solutions = [
                self._simplify_value(candidate)
                for candidate in complex_candidates
                if self._validate_equation_candidate(
                    left_expression_raw,
                    right_expression_raw,
                    variable,
                    candidate,
                    S.Complexes,
                )
            ]
            valid_complex_solutions = self._unique_sorted(valid_complex_solutions)

            if valid_complex_solutions:
                return EquationSolveAnalysis(
                    variable=variable,
                    domain=S.Complexes,
                    candidates=complex_candidates,
                    valid_solutions=valid_complex_solutions,
                    solution_set=FiniteSet(*valid_complex_solutions),
                    classification="one_solution" if len(valid_complex_solutions) == 1 else "many_solutions",
                    message_latex="",
                    message_plain="",
                    domain_latex="\\mathbb{C}",
                    domain_plain="C",
                )

            if complex_symbolic_family is not None:
                return EquationSolveAnalysis(
                    variable=variable,
                    domain=S.Complexes,
                    candidates=[],
                    valid_solutions=[],
                    solution_set=complex_symbolic_family,
                    classification="infinite_solutions",
                    message_latex="",
                    message_plain="Nieskończenie wiele rozwiązań",
                    domain_latex="\\mathbb{C}",
                    domain_plain="C",
                )

        if valid_solutions:
            return EquationSolveAnalysis(
                variable=variable,
                domain=domain,
                candidates=candidates,
                valid_solutions=valid_solutions,
                solution_set=FiniteSet(*valid_solutions),
                classification="one_solution" if len(valid_solutions) == 1 else "many_solutions",
                message_latex="",
                message_plain="",
                domain_latex=domain_latex,
                domain_plain=domain_plain,
            )

        complex_exists = self._has_complex_solutions(reduced_expression, variable)
        # For equations involving real-constrained functions (sqrt, Abs, log),
        # "no solutions" effectively means "no real solutions" since the equation
        # is meaningful only in the real domain.
        expression_text_lower = sstr(reduced_expression).lower()
        involves_real_constrained = any(
            token in expression_text_lower
            for token in ("sqrt", "abs", "log", "asin", "acos")
        )
        if not complex_exists and involves_real_constrained:
            complex_exists = True  # treat as "no real solutions"
        classification = "no_real_solutions" if complex_exists else "no_solutions"
        return EquationSolveAnalysis(
            variable=variable,
            domain=domain,
            candidates=candidates,
            valid_solutions=[],
            solution_set=None,
            classification=classification,
            message_latex="",
            message_plain="Brak rozwiązań rzeczywistych" if complex_exists else "Brak rozwiązań",
            domain_latex=domain_latex,
            domain_plain=domain_plain,
            complex_exists=complex_exists,
        )

    def solve_equation(self, equation_text: str, variable_name: str, settings: EngineSettings) -> Dict[str, Any]:
        analysis = self._analyze_equation(equation_text, variable_name, settings)
        result_latex, result_plain = self._build_equation_message(analysis, settings)

        return {
            "operation": "solve",
            "inputLatex": self._preview_latex(equation_text, kind="equation"),
            "resultLatex": result_latex,
            "resultPlain": result_plain,
            "degree": None,
            "warnings": [],
        }

    def solve_equation_detailed(
        self,
        equation_text: str,
        variable_name: str,
        settings: EngineSettings,
    ) -> EquationSolveAnalysis:
        return self._analyze_equation(equation_text, variable_name, settings)

    def solve_system(self, equations_text: str, variables_text: str, settings: EngineSettings) -> Dict[str, Any]:
        if ";" in equations_text:
            raise CalculatorError("Wpisz każde równanie w osobnym wierszu. Średnik nie jest obsługiwany jako separator równań.")
        equation_lines = self._split_system_lines(equations_text)
        if not equation_lines:
            raise CalculatorError("Wpisz co najmniej jedno równanie w osobnym wierszu.")
        if len(equation_lines) > 5:
            raise CalculatorError("Jednocześnie można rozwiązać najwyżej 5 równań.")

        preferred_variable_names = self._guess_system_variable_names(equation_lines, variables_text)

        equations = []
        expressions = []
        for line in equation_lines:
            if "=" not in line:
                raise CalculatorError(
                    "Każdy wiersz układu musi mieć postać 'lewa strona = prawa strona'."
                )
            left_text, right_text = line.split("=", 1)
            left_expression = parse_expression(left_text, settings, preferred_symbols=preferred_variable_names)
            right_expression = parse_expression(right_text, settings, preferred_symbols=preferred_variable_names)
            equations.append(Eq(left_expression, right_expression, evaluate=False))
            expressions.append(
                self._simplify_value(simplify_with_known_formulas(simplify(left_expression - right_expression)))
            )

        variables, variables_detected, variables_warning = self._resolve_system_variables(
            variables_text,
            expressions,
        )

        warnings: List[str] = []
        if variables_warning:
            warnings.append(variables_warning)
        active_equations: List[Any] = []
        active_expressions: List[Any] = []
        contradiction_detected = False
        requires_real_domain_hint = False

        for equation, expression in zip(equations, expressions):
            expression_text = sstr(expression, order="lex").lower()
            if any(token in expression_text for token in ("sqrt", "abs", "log", "asin", "acos")):
                requires_real_domain_hint = True

            try:
                self._validate_result(expression)
            except CalculatorError:
                contradiction_detected = True
                continue

            if expression == 0 or getattr(expression, "is_zero", None) is True:
                continue

            if not getattr(expression, "free_symbols", set()):
                contradiction_detected = True
                continue

            active_equations.append(equation)
            active_expressions.append(expression)

        normalized_solutions: List[Dict[Any, Any]] = []
        symbolic_family = None

        if contradiction_detected:
            result_plain = "Brak rozwiązań rzeczywistych" if requires_real_domain_hint and not settings.complex_solutions else "Brak rozwiązań"
            result_latex = "\\text{Brak rozwiązań rzeczywistych}" if requires_real_domain_hint and not settings.complex_solutions else "\\text{Brak rozwiązań}"
            return {
                "operation": "solve_system",
                "inputLatex": self._preview_latex(equations_text, kind="system"),
                "resultLatex": result_latex,
                "resultPlain": result_plain,
                "warnings": warnings,
            }

        if not active_expressions:
            return {
                "operation": "solve_system",
                "inputLatex": self._preview_latex(equations_text, kind="system"),
                "resultLatex": "\\text{Nieskończenie wiele rozwiązań}",
                "resultPlain": "Nieskończenie wiele rozwiązań",
                "warnings": warnings,
            }

        is_linear = True
        for expression in active_expressions:
            try:
                polynomial = Poly(expression, *variables, extension=True)
                if polynomial.total_degree() > 1:
                    is_linear = False
                    break
            except Exception:
                is_linear = False
                break
        if is_linear:
            try:
                linear_solution = linsolve(active_expressions, tuple(variables))
            except Exception:
                linear_solution = None
            if isinstance(linear_solution, FiniteSet):
                for solution_tuple in linear_solution:
                    candidate_solution = {
                        variable: self._simplify_value(value)
                        for variable, value in zip(variables, list(solution_tuple))
                    }
                    if self._solution_depends_on_requested_variables(candidate_solution, variables):
                        symbolic_family = linear_solution
                        break
                    normalized_solutions.append(candidate_solution)
            elif linear_solution == S.EmptySet:
                linear_solution = None
            elif linear_solution not in {None, S.EmptySet}:
                symbolic_family = linear_solution

        if not normalized_solutions:
            try:
                raw_solutions = solve(active_equations, tuple(variables), dict=True)
            except Exception:
                raw_solutions = []

            if raw_solutions:
                for solution in raw_solutions:
                    normalized_solution = self._normalize_solution_dict(solution, variables)
                    if self._solution_depends_on_requested_variables(normalized_solution, variables):
                        symbolic_family = raw_solutions
                        break
                    normalized_solutions.append(normalized_solution)

        if not normalized_solutions and symbolic_family is None:
            try:
                non_linear = nonlinsolve(active_expressions, tuple(variables))
            except Exception:
                non_linear = None

            if isinstance(non_linear, FiniteSet):
                for solution_tuple in non_linear:
                    candidate_solution = {
                        variable: self._simplify_value(value)
                        for variable, value in zip(variables, list(solution_tuple))
                    }
                    if self._solution_depends_on_requested_variables(candidate_solution, variables):
                        symbolic_family = non_linear
                        break
                    normalized_solutions.append(candidate_solution)
            elif non_linear not in {None, S.EmptySet}:
                symbolic_family = non_linear

        normalized_solutions = [
            solution
            for solution in normalized_solutions
            if self._validate_system_solution(equations, variables, solution)
        ]
        if not normalized_solutions:
            derived_family = self._derive_symbolic_system_family(active_equations, active_expressions, variables, settings)
            if derived_family is not None:
                if derived_family.get("kind") == "finite":
                    normalized_solutions.extend(derived_family.get("solutions", []))
                    symbolic_family = None
                elif derived_family.get("kind") == "empty":
                    symbolic_family = None
                else:
                    symbolic_family = derived_family

        if not normalized_solutions and symbolic_family is None:
            no_real_message = {
                "operation": "solve_system",
                "inputLatex": self._preview_latex(equations_text, kind="system"),
                "resultLatex": "\\text{Brak rozwiązań}",
                "resultPlain": "Brak rozwiązań",
                "warnings": warnings,
            }
            if requires_real_domain_hint and not settings.complex_solutions:
                no_real_message["resultLatex"] = "\\text{Brak rozwiązań rzeczywistych}"
                no_real_message["resultPlain"] = "Brak rozwiązań rzeczywistych"
            if settings.complex_solutions:
                return no_real_message
            return no_real_message

        normalized_solutions = self._deduplicate_solution_dicts(normalized_solutions, variables)
        real_solutions = [
            solution
            for solution in normalized_solutions
            if all(getattr(solution.get(variable), "is_real", None) is not False for variable in variables)
        ]

        if symbolic_family is not None and not normalized_solutions:
            if isinstance(symbolic_family, dict) and symbolic_family.get("kind") == "family":
                family_latex, family_plain = self._format_system_family(symbolic_family, settings)
            else:
                family_latex = format_latex(symbolic_family, settings)
                family_plain = plain_text(symbolic_family, settings)
            return {
                "operation": "solve_system",
                "inputLatex": self._preview_latex(equations_text, kind="system"),
                "resultLatex": "\\begin{aligned}\\text{Nieskończenie wiele rozwiązań}\\\\ " + family_latex + "\\end{aligned}",
                "resultPlain": "Nieskończenie wiele rozwiązań\n" + family_plain,
                "warnings": warnings,
            }

        selected_solutions = normalized_solutions if settings.complex_solutions else real_solutions
        if not selected_solutions:
            return {
                "operation": "solve_system",
                "inputLatex": self._preview_latex(equations_text, kind="system"),
                "resultLatex": "\\begin{aligned}\\text{Brak rozwiązań rzeczywistych}\\\\ \\text{Rozwiązania istnieją tylko w } \\mathbb{C}\\end{aligned}",
                "resultPlain": "Brak rozwiązań rzeczywistych\nRozwiązania istnieją tylko w C",
                "warnings": warnings,
            }

        finalized = selected_solutions if settings.exact else self._to_numeric(selected_solutions, settings)
        result_value: Any
        if len(finalized) == 1:
            result_value = finalized[0]
        else:
            result_value = finalized
            warnings.append(
                "Układ ma więcej niż jedno rozwiązanie. Wyniki pokazano jako listę możliwych przypisań zmiennych."
            )

        return {
            "operation": "solve_system",
            "inputLatex": self._preview_latex(equations_text, kind="system"),
            "resultLatex": format_latex(result_value, settings),
            "resultPlain": plain_text(result_value, settings),
            "warnings": warnings,
        }

    def differentiate(
        self,
        expression_text: str,
        variable_name: str,
        settings: EngineSettings,
        order: int = 1,
    ) -> Dict[str, Any]:
        if order < 0:
            raise CalculatorError("Rząd pochodnej musi być nieujemną liczbą całkowitą.")
        if not variable_name.strip():
            raise CalculatorError("Podaj zmienną, względem której mam liczyć pochodną.")
        expression = parse_expression(expression_text, settings)
        variable, variable_detected, variable_warning = self._resolve_symbol(variable_name, [expression])
        derivative = diff(expression, variable, order)
        result = self._finalize(derivative, settings)

        return {
            "operation": "differentiate",
            "inputLatex": self._preview_latex(expression_text),
            "resultLatex": format_latex(result, settings),
            "resultPlain": plain_text(result, settings),
            "warnings": [variable_warning] if variable_warning else [],
        }

    def integrate_expression(
        self,
        expression_text: str,
        variable_name: str,
        settings: EngineSettings,
        lower_bound: Optional[str] = None,
        upper_bound: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not variable_name.strip():
            raise CalculatorError("Podaj zmienną, względem której mam liczyć całkę.")
        expression = parse_expression(expression_text, settings)
        variable, variable_detected, variable_warning = self._resolve_symbol(variable_name, [expression])
        is_definite = bool(lower_bound is not None and upper_bound is not None)

        if is_definite:
            lower_expression = parse_expression(lower_bound or "0", settings)
            upper_expression = parse_expression(upper_bound or "0", settings)
            integral = simplify(integrate(expression, (variable, lower_expression, upper_expression)))
        else:
            antiderivative = integrate(expression, variable)
            integral = antiderivative + Symbol("C")
        result = self._finalize(integral, settings)
        warnings: List[str] = [variable_warning] if variable_warning else []

        return {
            "operation": "integrate",
            "inputLatex": self._preview_latex(expression_text),
            "resultLatex": format_latex(result, settings),
            "resultPlain": plain_text(result, settings),
            "isDefinite": is_definite,
            "warnings": warnings,
        }

