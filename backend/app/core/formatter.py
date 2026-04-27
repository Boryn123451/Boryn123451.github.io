import re
from typing import Any, Dict, Iterable, List, Optional

from sympy import Eq, Float, Rational, S, binomial, log, simplify, sstr
from sympy.matrices import MatrixBase
from sympy.printing.latex import latex
from sympy.sets.fancysets import ImageSet
from sympy.sets.sets import FiniteSet, Union

from .settings import EngineSettings


_DECIMAL_PATTERN = re.compile(r"(<![A-Za-z])([+-]\d+\.\d+(:[eE][+-]\d+))")


def _trim_decimal_token(token: str) -> str:
    base = token
    exponent = ""

    if "e" in token.lower():
        index = token.lower().index("e")
        base = token[:index]
        exponent = token[index:]

    if "." not in base:
        return token

    sign = ""
    if base.startswith(("+", "-")):
        sign = base[0]
        base = base[1:]

    whole, fraction = base.split(".", 1)
    fraction = fraction.rstrip("0")

    if not fraction:
        normalized = whole or "0"
    else:
        normalized = "{0}.{1}".format(whole or "0", fraction)

    if normalized == "0":
        sign = ""

    return "{0}{1}{2}".format(sign, normalized, exponent)


def trim_numeric_string(text: str) -> str:
    return _DECIMAL_PATTERN.sub(lambda match: _trim_decimal_token(match.group(1)), text)


def _format_float_value(value: Float, settings: Optional[EngineSettings]) -> str:
    if settings and not settings.exact:
        precision = max(0, int(settings.precision))
        python_value = float(value)
        if python_value == 0:
            return "0"
        if abs(python_value) >= 10 ** max(precision + 4, 8) or (abs(python_value) < 10 ** (-precision) and abs(python_value) > 0):
            rendered = f"{python_value:.{precision}e}"
        else:
            rendered = f"{python_value:.{precision}f}"
        return trim_numeric_string(rendered)
    return trim_numeric_string(latex(value, full_prec=False))


def rational_to_latex(value: Rational, settings: EngineSettings) -> str:
    numerator = int(value.p)
    denominator = int(value.q)

    if denominator == 1:
        return str(numerator)

    sign = "-" if numerator < 0 else ""
    numerator = abs(numerator)

    if settings.fraction_display == "mixed" and numerator > denominator:
        whole, remainder = divmod(numerator, denominator)
        if remainder == 0:
            return "{0}{1}".format(sign, whole)
        return "{0}{1}\\;\\frac{{{2}}}{{{3}}}".format(sign, whole, remainder, denominator)

    return "{0}\\frac{{{1}}}{{{2}}}".format(sign, numerator, denominator)


def _sequence_to_latex(values: Iterable[Any], settings: EngineSettings) -> str:
    rendered = [format_latex(value, settings) for value in values]
    return "\\left[ " + ",\\ ".join(rendered) + " \\right]"


def _matrix_to_latex(matrix: MatrixBase, settings: EngineSettings) -> str:
    rows: List[str] = []
    for row_index in range(matrix.rows):
        row_values = []
        for column_index in range(matrix.cols):
            row_values.append(format_latex(matrix[row_index, column_index], settings))
        rows.append(" & ".join(row_values))
    return "\\begin{bmatrix}" + "\\\\".join(rows) + "\\end{bmatrix}"


def _mapping_to_latex(mapping: Dict[Any, Any], settings: EngineSettings) -> str:
    entries = []
    for key, value in mapping.items():
        entries.append("{0} = {1}".format(format_latex(key, settings), format_latex(value, settings)))
    return "\\left\\{ " + ",\\ ".join(entries) + " \\right\\}"


def _log_to_latex(value: Any, settings: EngineSettings) -> str:
    if len(value.args) == 1:
        return r"\ln\left(" + format_latex(value.args[0], settings) + r"\right)"
    if len(value.args) == 2:
        argument, base = value.args
        return (
            r"\log_{"
            + format_latex(base, settings)
            + r"}\left("
            + format_latex(argument, settings)
            + r"\right)"
        )
    return trim_numeric_string(latex(value))


def _imageset_to_plain(value: ImageSet, settings: Optional[EngineSettings]) -> str:
    variables = getattr(value.lamda, "variables", ())
    expression = getattr(value.lamda, "expr", value)
    if len(variables) == 1:
        variable_name = plain_text(variables[0], settings)
        if value.base_set == S.Integers:
            return "{" + plain_text(expression, settings) + " | " + variable_name + " in Z}"
    return trim_numeric_string(sstr(value))


def format_latex(value: Any, settings: EngineSettings) -> str:
    if getattr(value, "func", None) == binomial and len(getattr(value, "args", ())) == 2:
        return "\\binom{{{0}}}{{{1}}}".format(
            format_latex(value.args[0], settings),
            format_latex(value.args[1], settings),
        )

    if getattr(value, "func", None) == log:
        return _log_to_latex(value, settings)

    if isinstance(value, Rational):
        return rational_to_latex(value, settings)

    if isinstance(value, Float):
        return _format_float_value(value, settings)

    if isinstance(value, MatrixBase):
        if value.rows == 1 and value.cols == 1:
            return format_latex(value[0, 0], settings)
        return _matrix_to_latex(value, settings)

    if isinstance(value, dict):
        return _mapping_to_latex(value, settings)

    if isinstance(value, FiniteSet):
        return "\\left\\{ " + ",\\ ".join(format_latex(item, settings) for item in value) + " \\right\\}"

    if isinstance(value, Eq):
        return "{0} = {1}".format(format_latex(value.lhs, settings), format_latex(value.rhs, settings))

    if isinstance(value, (list, tuple)):
        return _sequence_to_latex(value, settings)

    try:
        return trim_numeric_string(latex(value))
    except Exception:
        try:
            return trim_numeric_string(latex(simplify(value)))
        except Exception:
            return r"\text{" + plain_text(value, settings).replace("\\", r"\\") + "}"


def plain_text(value: Any, settings: Optional[EngineSettings] = None) -> str:
    if getattr(value, "func", None) == binomial and len(getattr(value, "args", ())) == 2:
        return "C({0}, {1})".format(
            plain_text(value.args[0], settings),
            plain_text(value.args[1], settings),
        )

    if getattr(value, "func", None) == log:
        if len(getattr(value, "args", ())) == 1:
            return "ln({0})".format(plain_text(value.args[0], settings))
        if len(value.args) == 2:
            return "log({0}, {1})".format(
                plain_text(value.args[0], settings),
                plain_text(value.args[1], settings),
            )

    if isinstance(value, MatrixBase):
        if value.rows == 1 and value.cols == 1:
            return plain_text(value[0, 0], settings)
        return str(
            [
                [plain_text(value[row, column], settings) for column in range(value.cols)]
                for row in range(value.rows)
            ]
        )

    if isinstance(value, dict):
        return "{" + ", ".join(
            "{0}: {1}".format(plain_text(key, settings), plain_text(item, settings))
            for key, item in value.items()
        ) + "}"

    if isinstance(value, ImageSet):
        return _imageset_to_plain(value, settings)

    if isinstance(value, Union):
        return " U ".join(plain_text(item, settings) for item in value.args)

    if isinstance(value, (list, tuple, set)):
        return "[" + ", ".join(plain_text(item, settings) for item in value) + "]"

    if isinstance(value, Float):
        return _format_float_value(value, settings)

    return trim_numeric_string(sstr(value))
