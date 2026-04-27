import re
from typing import Dict, Iterable, Sequence, Set

from sympy import (
    Abs,
    Add,
    E,
    Float,
    S,
    I,
    Integer,
    Matrix,
    Mul,
    Pow,
    Rational,
    Symbol,
    Max,
    Min,
    binomial,
    ceiling,
    conjugate,
    root,
    factorial,
    floor,
    gamma,
    acos,
    acosh,
    acot,
    acoth,
    acsc,
    acsch,
    asec,
    asech,
    asin,
    asinh,
    atan,
    atanh,
    cos,
    cosh,
    cot,
    coth,
    csc,
    csch,
    exp,
    log,
    pi,
    sec,
    sech,
    sin,
    sinh,
    sign,
    sqrt,
    tan,
    tanh,
    nan,
    oo,
    zoo,
    arg,
)
from sympy.matrices import MatrixBase
from sympy.matrices.exceptions import ShapeError
from sympy.parsing.sympy_parser import (
    convert_xor,
    function_exponentiation,
    implicit_multiplication_application,
    factorial_notation,
    parse_expr,
    rationalize,
    standard_transformations,
)

from .exceptions import CalculatorError
from .input_preview import analyze_preview_input, normalize_preview_text
from .settings import EngineSettings


TRANSFORMATIONS = standard_transformations + (
    convert_xor,
    implicit_multiplication_application,
    function_exponentiation,
    factorial_notation,
    rationalize,
)

SAFE_GLOBALS = {
    "__builtins__": {},
    "Add": Add,
    "Mul": Mul,
    "Pow": Pow,
    "Integer": Integer,
    "Float": Float,
    "Rational": Rational,
    "Symbol": Symbol,
}

RESERVED_IDENTIFIERS: Set[str] = {
    "pi",
    "e",
    "E",
    "i",
    "I",
    "sqrt",
    "exp",
    "log",
    "ln",
    "log_base",
    "abs",
    "Abs",
    "Matrix",
    "matrix",
    "binomial",
    "choose",
    "nCr",
    "C",
    "factorial",
    "gamma",
    "floor",
    "ceiling",
    "sign",
    "Min",
    "Max",
    "min_func",
    "max_func",
    "conjugate",
    "arg",
    "root",
    "det",
    "trace",
    "transpose",
    "inv",
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "csc",
    "asin",
    "acos",
    "atan",
    "acot",
    "asec",
    "acsc",
    "sinh",
    "cosh",
    "tanh",
    "coth",
    "sech",
    "csch",
    "asinh",
    "acosh",
    "atanh",
    "acoth",
    "asech",
    "acsch",
    "undefined",
    "oo",
    "zoo",
    "nan",
}


def normalize_input(expression: str, preferred_symbols: Sequence[str] = ()) -> str:
    normalized = normalize_preview_text(expression).strip()
    if not normalized:
        raise CalculatorError("Wpisz wyrażenie matematyczne.")

    if re.search(r"(?<![eE])\+\s*\+", normalized):
        raise CalculatorError(
            "Zapis zawiera dwa plusy obok siebie. Wstaw brakujący składnik albo popraw operator."
        )

    if re.search(r"(?<![A-Za-z_0-9.])\d+(?:\.\d+)?\s+\d+(?:\.\d+)?(?![A-Za-z_0-9.(])", normalized):
        raise CalculatorError(
            "Dwie liczby nie mogą stać obok siebie bez operatora. Wstaw znak działania, na przykład * albo +."
        )

    normalized = re.sub(r"\bmatrix\b", "Matrix", normalized)
    normalized = re.sub(r"\bMin\s*\(", "min_func(", normalized)
    normalized = re.sub(r"\bMax\s*\(", "max_func(", normalized)
    unknown_functions = [
        match.group(1)
        for match in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", normalized)
        if (
            match.group(1) not in RESERVED_IDENTIFIERS
            and match.group(1) not in preferred_symbols
            and len(match.group(1)) > 1
            and not _is_expandable_compound_name(match.group(1), preferred_symbols)
        )
    ]
    if unknown_functions:
        raise CalculatorError(
            "Nieznana funkcja: {0}. Użyj obsługiwanej funkcji albo popraw nazwę.".format(unknown_functions[0])
        )
    if re.search(r"\bundefined\b", normalized, flags=re.IGNORECASE):
        raise CalculatorError("Zapis zawiera nieznaną wartość 'undefined'.")
    return normalized


def _angle_to_radians(value, angle_mode: str):
    if angle_mode == "deg":
        return value * pi / 180
    if angle_mode == "grad":
        return value * pi / 200
    return value


def _radians_to_angle(value, angle_mode: str):
    if angle_mode == "deg":
        return value * 180 / pi
    if angle_mode == "grad":
        return value * 200 / pi
    return value


def _matrix_inverse(value):
    if not isinstance(value, MatrixBase):
        raise CalculatorError("inv() działa wyłącznie na macierzach.")
    return value.inv()


def _matrix_determinant(value):
    if not isinstance(value, MatrixBase):
        raise CalculatorError("det() działa wyłącznie na macierzach.")
    return value.det()


def _matrix_trace(value):
    if not isinstance(value, MatrixBase):
        raise CalculatorError("trace() działa wyłącznie na macierzach.")
    return value.trace()


def _matrix_transpose(value):
    if not isinstance(value, MatrixBase):
        raise CalculatorError("transpose() działa wyłącznie na macierzach.")
    return value.T


def _nth_root(degree, value):
    return root(value, degree)


def _safe_matrix(*args):
    if len(args) != 1:
        return Matrix(*args)

    data = args[0]
    if isinstance(data, (list, tuple)):
        if not data:
            return Matrix([])
        nested_rows = [isinstance(row, (list, tuple)) for row in data]
        if any(nested_rows) and not all(nested_rows):
            raise CalculatorError("Wiersze macierzy muszą mieć tę samą długość.")
        if all(nested_rows):
            widths = {len(row) for row in data}
            if len(widths) != 1:
                raise CalculatorError("Wiersze macierzy muszą mieć tę samą długość.")
    return Matrix(*args)


def _raise_if_numeric_outside_unit_interval(value, function_name: str):
    if getattr(value, "is_number", False) and getattr(value, "is_real", None) is True:
        try:
            if value < -1 or value > 1:
                raise CalculatorError(
                    f"{function_name}() nie jest określona dla liczb rzeczywistych poza przedziałem [-1, 1]."
                )
        except TypeError:
            pass
    return value


def _raise_if_zero(value, function_name: str):
    if getattr(value, "is_zero", None) is True:
        raise CalculatorError(f"{function_name}() nie jest określona dla argumentu 0.")
    return value


def _raise_if_not_real_numeric(value, function_name: str):
    if getattr(value, "is_number", False) and getattr(value, "is_real", None) is not True:
        raise CalculatorError(f"{function_name}() nie jest określona dla liczb zespolonych.")
    return value


def _raise_if_trig_singularity(value, zero_test, function_name: str):
    try:
        if getattr(zero_test(value), "is_zero", None) is True:
            raise CalculatorError(f"{function_name}() nie jest określona dla tego argumentu.")
    except CalculatorError:
        raise
    except Exception:
        pass
    return value


def _safe_log(*args):
    if len(args) == 1:
        value = args[0]
        _raise_if_zero(value, "log")
        return log(value, 10)
    if len(args) == 2:
        value, base = args
        _raise_if_zero(value, "log")
        if getattr(base, "is_zero", None) is True or base == 1:
            raise CalculatorError("Podstawa logarytmu musi być dodatnia i różna od 1.")
        return log(value, base)
    raise CalculatorError("Użyj log(x) albo log(x, podstawa).")


def _safe_ln(value):
    _raise_if_zero(value, "ln")
    return log(value)


def _safe_tan(value, angle_mode: str):
    radians = _angle_to_radians(value, angle_mode)
    _raise_if_trig_singularity(radians, cos, "tan")
    return tan(radians)


def _safe_cot(value, angle_mode: str):
    radians = _angle_to_radians(value, angle_mode)
    _raise_if_trig_singularity(radians, sin, "cot")
    return cot(radians)


def _safe_sec(value, angle_mode: str):
    radians = _angle_to_radians(value, angle_mode)
    _raise_if_trig_singularity(radians, cos, "sec")
    return sec(radians)


def _safe_csc(value, angle_mode: str):
    radians = _angle_to_radians(value, angle_mode)
    _raise_if_trig_singularity(radians, sin, "csc")
    return csc(radians)


def _ignore_parser_kwargs(function):
    def wrapped(*args, **kwargs):
        kwargs.pop("evaluate", None)
        return function(*args, **kwargs)

    return wrapped


def _is_expandable_compound_name(name: str, preferred_symbols: Sequence[str]) -> bool:
    preferred_single_letter = {
        symbol
        for symbol in preferred_symbols
        if len(symbol) == 1 and symbol.isalpha() and symbol.lower() == symbol
    }
    if len(name) <= 1 or not preferred_single_letter:
        return False
    return all(character in preferred_single_letter for character in name)


def _discover_symbols(expression: str, preferred_symbols: Sequence[str] = ()) -> Dict[str, Symbol]:
    discovered: Dict[str, Symbol] = {}
    for name in re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", expression):
        if name in RESERVED_IDENTIFIERS or name.isupper():
            continue
        if _is_expandable_compound_name(name, preferred_symbols):
            continue
        discovered.setdefault(name, Symbol(name))
    return discovered


def build_parser_scope(
    settings: EngineSettings,
    extra_symbols: Iterable[str] = (),
    *,
    preserve_structure: bool = False,
) -> Dict[str, object]:
    angle_mode = settings.angle_mode
    binomial_function = (
        _ignore_parser_kwargs(lambda n, k: binomial(n, k, evaluate=False))
        if preserve_structure
        else binomial
    )

    scope: Dict[str, object] = {}
    for name in extra_symbols:
        if name and name not in RESERVED_IDENTIFIERS:
            scope[name] = Symbol(name)

    scope.update(
        {
            "pi": pi,
            "e": E,
            "E": E,
            "i": I,
            "I": I,
            "sqrt": sqrt,
            "exp": exp,
            "log": _ignore_parser_kwargs(_safe_log),
            "log_base": _ignore_parser_kwargs(lambda base, value: _safe_log(value, base)),
            "ln": _ignore_parser_kwargs(_safe_ln),
            "abs": Abs,
            "Abs": Abs,
            "Matrix": _ignore_parser_kwargs(_safe_matrix),
            "matrix": _ignore_parser_kwargs(_safe_matrix),
            "binomial": binomial_function,
            "choose": binomial_function,
            "nCr": binomial_function,
            "C": binomial_function,
            "factorial": _ignore_parser_kwargs(factorial),
            "gamma": _ignore_parser_kwargs(gamma),
            "floor": _ignore_parser_kwargs(lambda arg: floor(_raise_if_not_real_numeric(arg, "floor"))),
            "ceiling": _ignore_parser_kwargs(lambda arg: ceiling(_raise_if_not_real_numeric(arg, "ceiling"))),
            "sign": _ignore_parser_kwargs(lambda arg: sign(_raise_if_not_real_numeric(arg, "sign"))),
            "Min": _ignore_parser_kwargs(Min),
            "Max": _ignore_parser_kwargs(Max),
            "min_func": _ignore_parser_kwargs(Min),
            "max_func": _ignore_parser_kwargs(Max),
            "conjugate": _ignore_parser_kwargs(conjugate),
            "arg": _ignore_parser_kwargs(arg),
            "root": _ignore_parser_kwargs(_nth_root),
            "det": _ignore_parser_kwargs(_matrix_determinant),
            "trace": _ignore_parser_kwargs(_matrix_trace),
            "transpose": _ignore_parser_kwargs(_matrix_transpose),
            "inv": _ignore_parser_kwargs(_matrix_inverse),
            "oo": oo,
            "zoo": zoo,
            "nan": nan,
            "sin": _ignore_parser_kwargs(lambda arg: sin(_angle_to_radians(arg, angle_mode))),
            "cos": _ignore_parser_kwargs(lambda arg: cos(_angle_to_radians(arg, angle_mode))),
            "tan": _ignore_parser_kwargs(lambda arg: _safe_tan(arg, angle_mode)),
            "cot": _ignore_parser_kwargs(lambda arg: _safe_cot(arg, angle_mode)),
            "sec": _ignore_parser_kwargs(lambda arg: _safe_sec(arg, angle_mode)),
            "csc": _ignore_parser_kwargs(lambda arg: _safe_csc(arg, angle_mode)),
            "asin": _ignore_parser_kwargs(
                lambda arg: _radians_to_angle(asin(_raise_if_numeric_outside_unit_interval(arg, "asin")), angle_mode)
            ),
            "acos": _ignore_parser_kwargs(
                lambda arg: _radians_to_angle(acos(_raise_if_numeric_outside_unit_interval(arg, "acos")), angle_mode)
            ),
            "atan": _ignore_parser_kwargs(lambda arg: _radians_to_angle(atan(arg), angle_mode)),
            "acot": _ignore_parser_kwargs(lambda arg: _radians_to_angle(acot(arg), angle_mode)),
            "asec": _ignore_parser_kwargs(lambda arg: _radians_to_angle(asec(arg), angle_mode)),
            "acsc": _ignore_parser_kwargs(lambda arg: _radians_to_angle(acsc(arg), angle_mode)),
            "sinh": sinh,
            "cosh": cosh,
            "tanh": tanh,
            "coth": coth,
            "sech": sech,
            "csch": csch,
            "asinh": asinh,
            "acosh": acosh,
            "atanh": atanh,
            "acoth": acoth,
            "asech": asech,
            "acsch": acsch,
        }
    )
    return scope


def parse_expression(
    expression: str,
    settings: EngineSettings,
    evaluate: bool = True,
    preferred_symbols: Sequence[str] = (),
):
    normalized = normalize_input(expression, preferred_symbols)
    analysis = analyze_preview_input(expression)
    if analysis["status"] == "incomplete":
        message = analysis["message"] or "Wyrażenie jest jeszcze niepełne."
        suggestion = analysis.get("suggestion")
        if suggestion:
            message = message + " " + suggestion
        raise CalculatorError(message)

    symbols = _discover_symbols(normalized, preferred_symbols)
    try:
        return parse_expr(
            normalized,
            local_dict=build_parser_scope(
                settings,
                [*preferred_symbols, *symbols.keys()],
                preserve_structure=not evaluate,
            ),
            global_dict=SAFE_GLOBALS,
            transformations=TRANSFORMATIONS,
            evaluate=evaluate,
        )
    except CalculatorError:
        raise
    except ShapeError:
        raise CalculatorError("Nie można wykonać tej operacji na macierzach o takich wymiarach.")
    except Exception:
        message = analysis.get("message") or "Nie udało się poprawnie odczytać tego zapisu."
        suggestion = analysis.get("suggestion") or (
            "Sprawdź, czy nawiasy są domknięte, a po każdym operatorze jest kolejny składnik."
        )
        raise CalculatorError(message + " " + suggestion)
