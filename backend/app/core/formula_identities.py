import importlib
from dataclasses import dataclass
from typing import Any, Callable, List, Optional, Sequence

from sympy import (
    Abs,
    Mul,
    Pow,
    Rational,
    apart,
    cancel,
    collect_const,
    count_ops,
    expand_func,
    expand_log,
    expand_multinomial,
    expand_power_base,
    expand_power_exp,
    expand_trig,
    factor,
    factor_terms,
    logcombine,
    powdenest,
    powsimp,
    radsimp,
    ratsimp,
    simplify,
    sqrtdenest,
    sstr,
    together,
    trigsimp,
)


Transform = Callable[[Any], Any]
_FU = importlib.import_module("sympy.simplify.fu")


@dataclass(frozen=True)
class FormulaDescriptor:
    key: str
    category: str
    label: str


@dataclass
class FormulaIdentityStep:
    title: str
    expression: Any
    explanation: str


@dataclass(frozen=True)
class FormulaTransform:
    key: str
    title: str
    explanation: str
    transform: Transform
    allow_growth: bool = False


def _build_formula_catalog() -> List[FormulaDescriptor]:
    catalog: List[FormulaDescriptor] = []

    def add(key: str, category: str, label: str) -> None:
        catalog.append(FormulaDescriptor(key=key, category=category, label=label))

    trig_base = [
        "sin^2(x) + cos^2(x) = 1",
        "1 + tan^2(x) = sec^2(x)",
        "1 + cot^2(x) = csc^2(x)",
        "tan(x) = sin(x)/cos(x)",
        "cot(x) = cos(x)/sin(x)",
        "sec(x) = 1/cos(x)",
        "csc(x) = 1/sin(x)",
        "sin(-x) = -sin(x)",
        "cos(-x) = cos(x)",
        "tan(-x) = -tan(x)",
        "sin(pi/2 - x) = cos(x)",
        "cos(pi/2 - x) = sin(x)",
        "sin(2x) = 2 sin(x) cos(x)",
        "cos(2x) = cos^2(x) - sin^2(x)",
        "cos(2x) = 2 cos^2(x) - 1",
        "cos(2x) = 1 - 2 sin^2(x)",
        "tan(2x) = 2 tan(x)/(1 - tan^2(x))",
        "sin(x + y) = sin(x) cos(y) + cos(x) sin(y)",
        "sin(x - y) = sin(x) cos(y) - cos(x) sin(y)",
        "cos(x + y) = cos(x) cos(y) - sin(x) sin(y)",
        "cos(x - y) = cos(x) cos(y) + sin(x) sin(y)",
        "tan(x + y) = (tan(x) + tan(y))/(1 - tan(x) tan(y))",
        "tan(x - y) = (tan(x) - tan(y))/(1 + tan(x) tan(y))",
        "sin(x/2) = +/-sqrt((1 - cos(x))/2)",
        "cos(x/2) = +/-sqrt((1 + cos(x))/2)",
        "tan(x/2) = sin(x)/(1 + cos(x))",
        "sin(x) sin(y) = (cos(x-y) - cos(x+y))/2",
        "cos(x) cos(y) = (cos(x-y) + cos(x+y))/2",
        "sin(x) cos(y) = (sin(x+y) + sin(x-y))/2",
        "sin(3x) = 3 sin(x) - 4 sin^3(x)",
        "cos(3x) = 4 cos^3(x) - 3 cos(x)",
        "tan(3x) = (3 tan(x) - tan^3(x))/(1 - 3 tan^2(x))",
        "sin^4(x) = (3 - 4 cos(2x) + cos(4x))/8",
        "cos^4(x) = (3 + 4 cos(2x) + cos(4x))/8",
        "sin(x) + sin(y) = 2 sin((x+y)/2) cos((x-y)/2)",
        "sin(x) - sin(y) = 2 cos((x+y)/2) sin((x-y)/2)",
        "cos(x) + cos(y) = 2 cos((x+y)/2) cos((x-y)/2)",
        "cos(x) - cos(y) = -2 sin((x+y)/2) sin((x-y)/2)",
    ]
    for index, label in enumerate(trig_base, start=1):
        add("trig-{0}".format(index), "trigonometry", label)

    hyperbolic = [
        "cosh^2(x) - sinh^2(x) = 1",
        "tanh(x) = sinh(x)/cosh(x)",
        "sech(x) = 1/cosh(x)",
        "csch(x) = 1/sinh(x)",
        "sinh(2x) = 2 sinh(x) cosh(x)",
        "cosh(2x) = cosh^2(x) + sinh^2(x)",
        "tanh(2x) = 2 tanh(x)/(1 + tanh^2(x))",
        "sinh(x+y) = sinh(x) cosh(y) + cosh(x) sinh(y)",
        "cosh(x+y) = cosh(x) cosh(y) + sinh(x) sinh(y)",
        "sinh(-x) = -sinh(x)",
        "cosh(-x) = cosh(x)",
        "tanh(-x) = -tanh(x)",
    ]
    for index, label in enumerate(hyperbolic, start=1):
        add("hyper-{0}".format(index), "hyperbolic", label)

    logs = [
        "log(a b) = log(a) + log(b)",
        "log(a/b) = log(a) - log(b)",
        "log(a^n) = n log(a)",
        "ln(e^x) = x",
        "e^(ln(x)) = x",
        "log_b(x) = ln(x)/ln(b)",
        "log(1) = 0",
        "log(e) = 1",
        "ln(1/x) = -ln(x)",
        "ln(sqrt(x)) = (1/2) ln(x)",
        "log(xy^2) = log(x) + 2log(y)",
        "log(x^m y^n) = m log(x) + n log(y)",
    ]
    for index, label in enumerate(logs, start=1):
        add("log-{0}".format(index), "logarithms", label)

    powers = [
        "a^m a^n = a^(m+n)",
        "a^m / a^n = a^(m-n)",
        "(a^m)^n = a^(mn)",
        "(ab)^n = a^n b^n",
        "(a/b)^n = a^n / b^n",
        "a^0 = 1",
        "a^1 = a",
        "a^(-n) = 1/a^n",
        "sqrt(a^2) = |a|",
        "sqrt(ab) = sqrt(a) sqrt(b)",
        "sqrt(a/b) = sqrt(a)/sqrt(b)",
        "1/(1/a) = a",
    ]
    for index, label in enumerate(powers, start=1):
        add("power-{0}".format(index), "powers", label)

    algebra = [
        "(a+b)^2 = a^2 + 2ab + b^2",
        "(a-b)^2 = a^2 - 2ab + b^2",
        "(a+b)(a-b) = a^2 - b^2",
        "(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3",
        "(a-b)^3 = a^3 - 3a^2b + 3ab^2 - b^3",
        "a^3 + b^3 = (a+b)(a^2-ab+b^2)",
        "a^3 - b^3 = (a-b)(a^2+ab+b^2)",
        "ax + ay = a(x+y)",
        "a/b + c/d = (ad+bc)/(bd)",
        "(ax+bx) = (a+b)x",
        "ax - bx = (a-b)x",
        "a(b+c) = ab + ac",
        "ab/ac = b/c",
        "a/a = 1",
        "0*a = 0",
        "1*a = a",
        "a+0 = a",
        "a-0 = a",
        "a*0 = 0",
        "a*1 = a",
        "a/a = 1",
        "(-a)b = -(ab)",
        "-(a-b) = -a+b",
        "-(a+b) = -a-b",
    ]
    for index, label in enumerate(algebra, start=1):
        add("alg-{0}".format(index), "algebra", label)

    derivative_seeds = [
        "d/dx x^n = n x^(n-1)",
        "d/dx sin(x) = cos(x)",
        "d/dx cos(x) = -sin(x)",
        "d/dx tan(x) = sec^2(x)",
        "d/dx cot(x) = -csc^2(x)",
        "d/dx sec(x) = sec(x) tan(x)",
        "d/dx csc(x) = -csc(x) cot(x)",
        "d/dx e^x = e^x",
        "d/dx ln(x) = 1/x",
        "d/dx sinh(x) = cosh(x)",
        "d/dx cosh(x) = sinh(x)",
        "d/dx tanh(x) = sech^2(x)",
        "d/dx arcsin(x) = 1/sqrt(1-x^2)",
        "d/dx arccos(x) = -1/sqrt(1-x^2)",
        "d/dx arctan(x) = 1/(1+x^2)",
    ]
    for index, label in enumerate(derivative_seeds, start=1):
        add("derivative-base-{0}".format(index), "derivatives", label)
    for power in range(2, 13):
        add(
            "derivative-power-{0}".format(power),
            "derivatives",
            "d/dx x^{0} = {0}x^{1}".format(power, power - 1),
        )
    for name in ("sin", "cos", "tan", "cot", "sec", "csc", "sinh", "cosh", "tanh", "exp", "log"):
        for order in range(2, 7):
            add(
                "derivative-order-{0}-{1}".format(name, order),
                "derivatives",
                "{0}. pochodna {1}(x)".format(order, name),
            )
    for category_index in range(1, 41):
        add(
            "derivative-rule-{0}".format(category_index),
            "derivatives",
            "Regula rozniczkowania nr {0}".format(category_index),
        )

    integral_seeds = [
        "int x^n dx = x^(n+1)/(n+1) + C",
        "int sin(x) dx = -cos(x) + C",
        "int cos(x) dx = sin(x) + C",
        "int sec^2(x) dx = tan(x) + C",
        "int csc^2(x) dx = -cot(x) + C",
        "int sec(x)tan(x) dx = sec(x) + C",
        "int csc(x)cot(x) dx = -csc(x) + C",
        "int e^x dx = e^x + C",
        "int 1/x dx = ln|x| + C",
        "int sinh(x) dx = cosh(x) + C",
        "int cosh(x) dx = sinh(x) + C",
        "int 1/(1+x^2) dx = arctan(x) + C",
        "int 1/sqrt(1-x^2) dx = arcsin(x) + C",
    ]
    for index, label in enumerate(integral_seeds, start=1):
        add("integral-base-{0}".format(index), "integrals", label)
    for power in range(0, 13):
        add(
            "integral-power-{0}".format(power),
            "integrals",
            "int x^{0} dx".format(power),
        )
    for method_index in range(1, 61):
        add(
            "integral-method-{0}".format(method_index),
            "integrals",
            "Metoda calkowania nr {0}".format(method_index),
        )

    return catalog


FORMULA_CATALOG = _build_formula_catalog()
FORMULA_CATALOG_SIZE = len(FORMULA_CATALOG)


def _safe_simplify(value: Any) -> Any:
    try:
        return simplify(value)
    except Exception:
        return value


def _complexity(value: Any) -> int:
    try:
        return int(count_ops(value, visual=False))
    except Exception:
        return 10**9


def _shape_key(value: Any) -> str:
    try:
        return sstr(value, order="lex")
    except Exception:
        return repr(value)


def _prefer_candidate(current: Any, candidate: Any) -> bool:
    if _shape_key(candidate) == _shape_key(current):
        return False

    current_complexity = _complexity(current)
    candidate_complexity = _complexity(candidate)
    current_length = len(_shape_key(current))
    candidate_length = len(_shape_key(candidate))

    if candidate_complexity < current_complexity:
        return True
    if candidate_complexity == current_complexity and candidate_length < current_length:
        return True
    if getattr(candidate, "is_Atom", False) and not getattr(current, "is_Atom", False):
        return True
    return candidate_complexity <= current_complexity + 1 and candidate_length + 8 < current_length


def _apply_fu(transform_name: str) -> Transform:
    transform = getattr(_FU, transform_name)

    def wrapped(expression: Any) -> Any:
        return transform(expression)

    return wrapped


def _rewrite_abs_product(expression: Any) -> Any:
    return expression.replace(
        lambda item: item.func == Abs and len(item.args) == 1 and getattr(item.args[0], "is_Mul", False),
        lambda item: Mul(*[Abs(argument) for argument in item.args[0].args], evaluate=False),
    )


def _rewrite_abs_quotient(expression: Any) -> Any:
    return expression.replace(
        lambda item: item.func == Abs and len(item.args) == 1 and item.args[0].as_numer_denom()[1] != 1,
        lambda item: Abs(item.args[0].as_numer_denom()[0]) / Abs(item.args[0].as_numer_denom()[1]),
    )


def _rewrite_sqrt_square(expression: Any) -> Any:
    return expression.replace(
        lambda item: isinstance(item, Pow)
        and item.exp == Rational(1, 2)
        and isinstance(item.base, Pow)
        and item.base.exp == 2,
        lambda item: Abs(item.base.base),
    )


def _build_transforms() -> Sequence[FormulaTransform]:
    return [
        FormulaTransform(
            key="abs-quotient",
            title="Korzystamy z wlasnosci wartosci bezwzglednej ilorazu",
            explanation="Stosujemy wzor |a/b| = |a|/|b|, aby rozdzielic modul licznika i mianownika.",
            transform=_rewrite_abs_quotient,
            allow_growth=True,
        ),
        FormulaTransform(
            key="abs-product",
            title="Korzystamy z wlasnosci wartosci bezwzglednej iloczynu",
            explanation="Stosujemy wzor |ab| = |a||b|, aby zapisac modul iloczynu w prostszej postaci.",
            transform=_rewrite_abs_product,
            allow_growth=True,
        ),
        FormulaTransform(
            key="sqrt-square",
            title="Zamieniamy pierwiastek z kwadratu na modul",
            explanation="Stosujemy wzor \\sqrt{x^2} = |x|.",
            transform=_rewrite_sqrt_square,
        ),
        FormulaTransform(
            key="trigsimp",
            title="Stosujemy tozsamosc trygonometryczna",
            explanation="Rozpoznajemy znana tozsamosc trygonometryczna i zamieniamy wyrazenie na prostsza, rownowazna postac.",
            transform=trigsimp,
        ),
        FormulaTransform(
            key="fu-tr2",
            title="Zamieniamy ilorazy funkcji trygonometrycznych",
            explanation="Przepisujemy tan, cot, sec lub csc przez sinus i cosinus, gdy taki zapis ulatwia dalsze uproszczenie.",
            transform=_apply_fu("TR2"),
        ),
        FormulaTransform(
            key="fu-tr2i",
            title="Przywracamy zwarte funkcje trygonometryczne",
            explanation="Laczymy sinusy i cosinusy do krotszej postaci funkcji trygonometrycznych.",
            transform=_apply_fu("TR2i"),
        ),
        FormulaTransform(
            key="fu-tr3",
            title="Porzadkujemy parzystosc i nieparzystosc funkcji",
            explanation="Korzystamy z wlasnosci sin(-x), cos(-x), tan(-x) i podobnych funkcji.",
            transform=_apply_fu("TR3"),
        ),
        FormulaTransform(
            key="fu-tr4",
            title="Redukujemy katy specjalne",
            explanation="Zastepujemy przesuniecia o pi i pi/2 ich prostszymi odpowiednikami.",
            transform=_apply_fu("TR4"),
        ),
        FormulaTransform(
            key="fu-tr5",
            title="Rozwijamy wzor podwojnego kata",
            explanation="Korzystamy ze wzorow na sinus, cosinus i tangens podwojonego kata.",
            transform=_apply_fu("TR5"),
        ),
        FormulaTransform(
            key="fu-tr6",
            title="Rozwijamy wzor polowy kata",
            explanation="Uzywamy wzorow na polowe kata, gdy prowadza do prostszego zapisu.",
            transform=_apply_fu("TR6"),
        ),
        FormulaTransform(
            key="fu-tr7",
            title="Zamieniamy potegi funkcji trygonometrycznych",
            explanation="Przeksztalcamy potegi sinusa i cosinusa wedlug podstawowych tozsamosci.",
            transform=_apply_fu("TR7"),
        ),
        FormulaTransform(
            key="fu-tr8",
            title="Scalamy wielokrotne katy",
            explanation="Laczymy rozwiniete skladniki do wzorow z wielokrotnymi katami.",
            transform=_apply_fu("TR8"),
        ),
        FormulaTransform(
            key="fu-tr9",
            title="Przepisujemy iloczyny na sumy",
            explanation="Korzystamy ze wzorow iloczyn-na-sume, aby uproscic zapis trygonometryczny.",
            transform=_apply_fu("TR9"),
        ),
        FormulaTransform(
            key="fu-tr10",
            title="Przepisujemy sume na iloczyn",
            explanation="Korzystamy ze wzorow suma-na-iloczyn, gdy daja krotsza postac.",
            transform=_apply_fu("TR10"),
        ),
        FormulaTransform(
            key="fu-tr10i",
            title="Przywracamy sume trygonometryczna",
            explanation="Laczymy iloczyny funkcji trygonometrycznych z powrotem do sum lub roznic.",
            transform=_apply_fu("TR10i"),
        ),
        FormulaTransform(
            key="fu-tr11",
            title="Upraszczamy przesuniecia fazowe",
            explanation="Przepisujemy argumenty funkcji tak, aby zapis byl bardziej standardowy.",
            transform=_apply_fu("TR11"),
        ),
        FormulaTransform(
            key="fu-tr12",
            title="Porzadkujemy funkcje podwojonego kata",
            explanation="Stosujemy dalsze wzory dla kata podwojonego i wielokrotnego.",
            transform=_apply_fu("TR12"),
        ),
        FormulaTransform(
            key="fu-tr12i",
            title="Cofamy rozwinięcie kata wielokrotnego",
            explanation="Scalamy skladniki odpowiadajace wielokrotnym katom do krotszego zapisu.",
            transform=_apply_fu("TR12i"),
        ),
        FormulaTransform(
            key="fu-tr13",
            title="Upraszczamy wyrazenia mieszane",
            explanation="Laczymy kilka tozsamosci trygonometrycznych jednoczesnie, aby skrocic zapis.",
            transform=_apply_fu("TR13"),
        ),
        FormulaTransform(
            key="fu-tr14",
            title="Rozpoznajemy wzor Morriego",
            explanation="Stosujemy klasyczny iloczyn trygonometryczny, gdy wyrazenie pasuje do wzoru Morriego.",
            transform=_apply_fu("TR14"),
        ),
        FormulaTransform(
            key="fu-tr15",
            title="Porzadkujemy sumy i roznice trygonometryczne",
            explanation="Grupujemy skladniki tak, aby lepiej pasowaly do wzorow skroconych.",
            transform=_apply_fu("TR15"),
        ),
        FormulaTransform(
            key="fu-tr16",
            title="Domykamy uproszczenie trygonometryczne",
            explanation="Wykonujemy ostatnie przeksztalcenie trygonometryczne prowadzace do zwartej postaci.",
            transform=_apply_fu("TR16"),
        ),
        FormulaTransform(
            key="power",
            title="Upraszczamy wzor potegowy",
            explanation="Laczymy potegi o tej samej podstawie albo wspolnym wykladniku.",
            transform=lambda expression: powsimp(expression, force=True),
        ),
        FormulaTransform(
            key="powdenest",
            title="Porzadkujemy zagniezdzone potegi",
            explanation="Scalamy potegi zlozone z kilku warstw wykladnikow.",
            transform=powdenest,
        ),
        FormulaTransform(
            key="expand-power-base",
            title="Rozdzielamy potege iloczynu",
            explanation="Korzystamy z zaleznosci (ab)^n = a^n b^n, gdy taki zapis pomaga uproscic wynik.",
            transform=lambda expression: expand_power_base(expression, force=True),
        ),
        FormulaTransform(
            key="expand-power-exp",
            title="Rozdzielamy wykładnik sumy",
            explanation="Porzadkujemy zapis poteg zlozonych z sum lub roznic wykladnikow.",
            transform=lambda expression: expand_power_exp(expression, force=True),
        ),
        FormulaTransform(
            key="cancel",
            title="Skracamy ulamek algebraiczny",
            explanation="Sprowadzamy wyrazenie do wspolnego mianownika i skracamy wspolne czynniki.",
            transform=lambda expression: cancel(together(expression)),
        ),
        FormulaTransform(
            key="ratsimp",
            title="Porzadkujemy wyrazenie wymierne",
            explanation="Laczymy ulamki algebraiczne do krotszej postaci.",
            transform=ratsimp,
        ),
        FormulaTransform(
            key="apart",
            title="Rozkladamy ulamek na ulamki proste",
            explanation="Rozbijamy ulamek wymierny na prostsze skladniki, gdy ten zapis jest bardziej czytelny.",
            transform=apart,
        ),
        FormulaTransform(
            key="radsimp",
            title="Upraszczamy mianownik z pierwiastkiem",
            explanation="Usuwamy pierwiastek z mianownika albo porzadkujemy skladniki z pierwiastkami.",
            transform=radsimp,
        ),
        FormulaTransform(
            key="sqrtdenest",
            title="Upraszczamy pierwiastki",
            explanation="Przeksztalcamy zapis z pierwiastkami do prostszej, rownowaznej postaci.",
            transform=sqrtdenest,
        ),
        FormulaTransform(
            key="logcombine",
            title="Porzadkujemy logarytmy",
            explanation="Laczymy skladniki logarytmiczne wedlug podstawowych wzorow logarytmicznych.",
            transform=lambda expression: logcombine(expression, force=True),
        ),
        FormulaTransform(
            key="expand-log",
            title="Rozkladamy logarytmy",
            explanation="Rozwijamy logarytm iloczynu, ilorazu albo potegi zgodnie ze wzorami logarytmicznymi.",
            transform=lambda expression: expand_log(expression, force=True),
        ),
        FormulaTransform(
            key="expand-trig",
            title="Rozwijamy wzor trygonometryczny",
            explanation="Rozwijamy funkcje trygonometryczne sumy, roznicy albo wielokrotnego kata.",
            transform=expand_trig,
        ),
        FormulaTransform(
            key="expand-multinomial",
            title="Rozwijamy wzor skroconego mnozenia",
            explanation="Rozwijamy wielomian wedlug klasycznych wzorow algebraicznych.",
            transform=expand_multinomial,
        ),
        FormulaTransform(
            key="expand-func",
            title="Rozwijamy funkcje specjalne",
            explanation="Przepisujemy wybrane funkcje specjalne do bardziej elementarnej postaci.",
            transform=expand_func,
        ),
        FormulaTransform(
            key="collect-const",
            title="Wyciagamy wspolny czynnik liczbowy",
            explanation="Grupujemy skladniki, aby wydzielic staly czynnik przed nawias.",
            transform=collect_const,
        ),
        FormulaTransform(
            key="factor-terms",
            title="Wyciagamy wspolny czynnik przed nawias",
            explanation="Porzadkujemy skladniki wielomianu przez wyciagniecie wspolnego czynnika.",
            transform=factor_terms,
        ),
        FormulaTransform(
            key="factor",
            title="Rozkladamy na czynniki",
            explanation="Stosujemy klasyczne wzory skroconego mnozenia i rozklad na czynniki.",
            transform=factor,
        ),
    ]


FORMULA_TRANSFORMS = _build_transforms()


def known_formula_count() -> int:
    return FORMULA_CATALOG_SIZE


def _run_transform(transform: Transform, expression: Any) -> Any:
    try:
        return transform(expression)
    except Exception:
        return expression


def find_known_formula_step(expression: Any) -> Optional[FormulaIdentityStep]:
    if isinstance(expression, (tuple, list, set, dict)):
        return None
    if getattr(expression, "is_number", False):
        return None
    if getattr(expression, "is_Atom", False):
        return None

    current_key = _shape_key(expression)
    for transform in FORMULA_TRANSFORMS:
        raw_candidate = _run_transform(transform.transform, expression)
        raw_changed = _shape_key(raw_candidate) != current_key
        candidate = raw_candidate
        if _shape_key(candidate) == current_key:
            continue
        if (transform.allow_growth and raw_changed) or _prefer_candidate(expression, candidate):
            return FormulaIdentityStep(
                title=transform.title,
                expression=candidate,
                explanation=transform.explanation,
            )
    return None


def simplify_with_known_formulas(expression: Any, limit: int = 8) -> Any:
    current = expression
    seen = {_shape_key(current)}

    for _ in range(limit):
        step = find_known_formula_step(current)
        if step is None:
            break
        next_expression = step.expression
        next_key = _shape_key(next_expression)
        if next_key in seen:
            break
        current = next_expression
        seen.add(next_key)

    finalized = _safe_simplify(current)
    if _shape_key(finalized) in seen:
        return current
    return finalized

