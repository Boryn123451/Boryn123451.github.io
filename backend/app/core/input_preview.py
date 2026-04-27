import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence


_FUNCTION_MACROS = {
    "sin": r"\sin",
    "cos": r"\cos",
    "tan": r"\tan",
    "cot": r"\cot",
    "sec": r"\sec",
    "csc": r"\csc",
    "asin": r"\arcsin",
    "acos": r"\arccos",
    "atan": r"\arctan",
    "acot": r"\operatorname{acot}",
    "asec": r"\operatorname{asec}",
    "acsc": r"\operatorname{acsc}",
    "sinh": r"\sinh",
    "cosh": r"\cosh",
    "tanh": r"\tanh",
    "asinh": r"\operatorname{arsinh}",
    "acosh": r"\operatorname{arcosh}",
    "atanh": r"\operatorname{artanh}",
    "exp": r"\exp",
    "log": r"\log",
    "ln": r"\ln",
    "factorial": r"\operatorname{factorial}",
    "gamma": r"\Gamma",
    "floor": r"\lfloor",
    "ceiling": r"\lceil",
    "sign": r"\operatorname{sign}",
    "Min": r"\min",
    "Max": r"\max",
    "conjugate": r"\operatorname{conjugate}",
    "det": r"\det",
    "trace": r"\operatorname{tr}",
    "transpose": r"\operatorname{transpose}",
    "inv": r"\operatorname{inv}",
}

_KNOWN_FUNCTIONS = set(_FUNCTION_MACROS) | {"sqrt", "root", "abs", "Matrix"}
_BINOMIAL_NAMES = {"binomial", "choose", "nCr", "C"}
_GREEK_IDENTIFIERS = {
    "alpha": r"\alpha",
    "beta": r"\beta",
    "gamma": r"\gamma",
    "delta": r"\delta",
    "epsilon": r"\epsilon",
    "theta": r"\theta",
    "lambda": r"\lambda",
    "mu": r"\mu",
    "phi": r"\phi",
    "varphi": r"\varphi",
    "omega": r"\omega",
    "Delta": r"\Delta",
    "Omega": r"\Omega",
}


def _convert_decimal_commas(text: str) -> str:
    paren_depths: List[int] = []
    bracket_depths: List[int] = []
    paren_depth = 0
    bracket_depth = 0
    for character in text:
        paren_depths.append(paren_depth)
        bracket_depths.append(bracket_depth)
        if character == "(":
            paren_depth += 1
        elif character == ")":
            paren_depth = max(0, paren_depth - 1)
        elif character == "[":
            bracket_depth += 1
        elif character == "]":
            bracket_depth = max(0, bracket_depth - 1)

    characters = list(text)
    for index, character in enumerate(characters):
        if character != ",":
            continue
        if index == 0 or index >= len(characters) - 1:
            continue
        if not characters[index - 1].isdigit() or not characters[index + 1].isdigit():
            continue
        if bracket_depths[index] > 0:
            continue

        left_index = index - 1
        while left_index >= 0 and characters[left_index].isdigit():
            left_index -= 1

        right_index = index + 1
        while right_index < len(characters) and characters[right_index].isdigit():
            right_index += 1

        previous_non_digit = characters[left_index] if left_index >= 0 else ""
        next_non_digit = characters[right_index] if right_index < len(characters) else ""

        if previous_non_digit == "," or next_non_digit == ",":
            continue
        if previous_non_digit.isalpha():
            continue

        current_paren_depth = paren_depths[index]
        if current_paren_depth > 0:
            tail = text[right_index:]
            head = text[:left_index + 1]
            same_level_before = any(
                char == "," and paren_depths[pos] == current_paren_depth and bracket_depths[pos] == 0
                for pos, char in enumerate(head)
                if pos >= 0
            )
            same_level_after = any(
                char == "," and paren_depths[right_index + offset] == current_paren_depth and bracket_depths[right_index + offset] == 0
                for offset, char in enumerate(tail)
            )
            if same_level_before or same_level_after:
                continue

        characters[index] = "."

    return "".join(characters)


def _rewrite_matrix_method_calls(text: str) -> str:
    method_patterns = {
        "inv": r"inv(\1)",
        "det": r"det(\1)",
        "trace": r"trace(\1)",
        "transpose": r"transpose(\1)",
    }
    rewritten = text
    for method_name, replacement in method_patterns.items():
        rewritten = re.sub(
            rf"(Matrix\(\s*\[.*\]\s*\))\.{method_name}\(\)",
            replacement,
            rewritten,
        )
    rewritten = re.sub(r"(Matrix\(\s*\[.*\]\s*\))\.T\b", r"transpose(\1)", rewritten)
    return rewritten


def normalize_preview_text(expression: str) -> str:
    normalized = expression.replace("\r\n", "\n").replace("\r", "\n")
    replacements = {
        "×": "*",
        "÷": "/",
        "−": "-",
        "π": "pi",
        "√": "sqrt",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    normalized = _rewrite_matrix_method_calls(normalized)
    normalized = re.sub(
        r"\b(root|binomial|choose|nCr|C|log|log_base)\(\s*([^(),]+)\s*,\s*([^(),]+)\s*\)",
        lambda match: "{0}({1};{2})".format(match.group(1), match.group(2).strip(), match.group(3).strip()),
        normalized,
    )
    normalized = _convert_decimal_commas(normalized)
    normalized = normalized.replace(";", ",")
    if normalized.count("|") % 2 == 0 and "|" in normalized:
        parts: List[str] = []
        absolute_open = False
        for character in normalized:
            if character == "|":
                parts.append(")" if absolute_open else "abs(")
                absolute_open = not absolute_open
            else:
                parts.append(character)
        if not absolute_open:
            normalized = "".join(parts)
    return normalized


def _escape_text(text: str) -> str:
    escaped = (
        text.replace("\\", r"\backslash ")
        .replace("{", r"\{")
        .replace("}", r"\}")
        .replace("_", r"\_")
        .replace("%", r"\%")
        .replace("&", r"\&")
        .replace("#", r"\#")
        .replace("$", r"\$")
    )
    escaped = escaped.replace(" ", r"\ ")
    return escaped


def _wrap_texttt(text: str) -> str:
    return r"\texttt{" + _escape_text(text) + "}"


def _render_identifier(name: str) -> str:
    if name == "pi":
        return r"\pi"
    if name in _GREEK_IDENTIFIERS:
        return _GREEK_IDENTIFIERS[name]
    if len(name) == 1:
        return name
    return r"\mathrm{" + _escape_text(name).replace(r"\ ", " ") + "}"


@dataclass
class Token:
    kind: str
    value: str
    position: int


@dataclass
class NumberNode:
    value: str


@dataclass
class IdentifierNode:
    name: str


@dataclass
class UnaryNode:
    operator: str
    operand: Any


@dataclass
class BinaryNode:
    operator: str
    left: Any
    right: Any
    implicit: bool = False


@dataclass
class PostfixNode:
    operator: str
    operand: Any


@dataclass
class GroupNode:
    delimiter: str
    expression: Any


@dataclass
class ListNode:
    items: List[Any]


@dataclass
class FunctionNode:
    name: str
    arguments: List[Any]


@dataclass
class EquationNode:
    left: Any
    right: Any


@dataclass
class SystemNode:
    equations: List[EquationNode]


class PreviewSyntaxError(Exception):
    def __init__(
        self,
        message: str,
        position: int,
        *,
        incomplete: bool = False,
        suggestion: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.position = position
        self.incomplete = incomplete
        self.suggestion = suggestion


def tokenize_preview(text: str) -> List[Token]:
    tokens: List[Token] = []
    index = 0
    while index < len(text):
        char = text[index]

        if char in " \t":
            index += 1
            continue

        if char == "\n":
            tokens.append(Token("newline", char, index))
            index += 1
            continue

        if char.isdigit() or (char == "." and index + 1 < len(text) and text[index + 1].isdigit()):
            start = index
            has_dot = char == "."
            index += 1
            while index < len(text):
                current = text[index]
                if current.isdigit():
                    index += 1
                    continue
                if current == "." and not has_dot:
                    has_dot = True
                    index += 1
                    continue
                break
            tokens.append(Token("number", text[start:index], start))
            continue

        if char.isalpha() or char == "_":
            start = index
            index += 1
            while index < len(text) and (text[index].isalnum() or text[index] == "_"):
                index += 1
            tokens.append(Token("identifier", text[start:index], start))
            continue

        mapping = {
            "+": "operator",
            "-": "operator",
            "*": "operator",
            "/": "operator",
            "^": "operator",
            "=": "equals",
            ",": "comma",
            "!": "postfix",
            "(": "lparen",
            ")": "rparen",
            "[": "lbracket",
            "]": "rbracket",
            ";": "separator",
        }
        token_kind = mapping.get(char)
        if token_kind:
            tokens.append(Token(token_kind, char, index))
            index += 1
            continue

        raise PreviewSyntaxError(
            "Znak '{0}' nie jest obslugiwany w tym zapisie.".format(char),
            index,
            suggestion="Usuń ten znak albo zastąp go standardowym zapisem matematycznym.",
        )

    return tokens


def render_token_stream(text: str) -> str:
    try:
        tokens = tokenize_preview(normalize_preview_text(text))
    except PreviewSyntaxError:
        return _wrap_texttt(text)

    parts: List[str] = []
    for index, token in enumerate(tokens):
        next_token = tokens[index + 1] if index + 1 < len(tokens) else None
        if token.kind == "number":
            parts.append(token.value)
        elif token.kind == "identifier":
            if next_token and next_token.kind == "lparen" and token.value in _FUNCTION_MACROS:
                parts.append(_FUNCTION_MACROS[token.value])
            elif token.value == "sqrt" and next_token and next_token.kind == "lparen":
                parts.append(r"\sqrt")
            else:
                parts.append(_render_identifier(token.value))
        elif token.kind == "operator":
            parts.append(
                {
                    "*": r"\cdot",
                    "/": "/",
                    "^": "^",
                    "+": "+",
                    "-": "-",
                }[token.value]
            )
        elif token.kind == "equals":
            parts.append("=")
        elif token.kind == "comma":
            parts.append(",")
        elif token.kind == "postfix":
            parts.append("!")
        elif token.kind == "lparen":
            parts.append("(")
        elif token.kind == "rparen":
            parts.append(")")
        elif token.kind == "lbracket":
            parts.append("[")
        elif token.kind == "rbracket":
            parts.append("]")
        elif token.kind in {"newline", "separator"}:
            parts.append(r"\\")

    return " ".join(parts) if parts else ""


class PreviewParser:
    def __init__(self, tokens: Sequence[Token]) -> None:
        self.tokens = list(tokens)
        self.index = 0

    def current(self) -> Optional[Token]:
        if self.index >= len(self.tokens):
            return None
        return self.tokens[self.index]

    def advance(self) -> Optional[Token]:
        token = self.current()
        if token is not None:
            self.index += 1
        return token

    def match(self, *kinds: str) -> Optional[Token]:
        token = self.current()
        if token and token.kind in kinds:
            self.index += 1
            return token
        return None

    def expect(self, kind: str, message: str, suggestion: Optional[str] = None) -> Token:
        token = self.current()
        if token and token.kind == kind:
            self.index += 1
            return token
        position = token.position if token else (self.tokens[-1].position + 1 if self.tokens else 0)
        raise PreviewSyntaxError(
            message,
            position,
            incomplete=token is None,
            suggestion=suggestion,
        )

    def parse_expression_complete(self) -> Any:
        expression = self.parse_sum(stop_tokens={"newline", "separator", "equals"})
        if self.current() is not None:
            token = self.current()
            raise PreviewSyntaxError(
                "W tym miejscu zapis nie jest jeszcze poprawny.",
                token.position,
                suggestion="Sprawdź operatory, przecinki i nawiasy w pobliżu wskazanego miejsca.",
            )
        return expression

    def parse_equation_complete(self) -> EquationNode:
        left = self.parse_sum(stop_tokens={"equals"})
        if self.current() is None or self.current().kind != "equals":
            position = self.tokens[-1].position + 1 if self.tokens else 0
            raise PreviewSyntaxError(
                "Równanie jest niepełne, bo brakuje znaku '=' albo prawej strony.",
                position,
                incomplete=True,
                suggestion="Dopisz '= 0' albo pełną prawą stronę równania.",
            )
        self.advance()
        if self.current() is None:
            position = self.tokens[-1].position + 1 if self.tokens else 0
            raise PreviewSyntaxError(
                "Za znakiem '=' brakuje drugiej strony równania.",
                position,
                incomplete=True,
                suggestion="Dopisz prawą stronę, na przykład '= 0'.",
            )
        right = self.parse_sum(stop_tokens={"newline", "separator"})
        if self.current() is not None:
            token = self.current()
            raise PreviewSyntaxError(
                "Jedno równanie powinno mieć tylko jeden znak '='.",
                token.position,
                suggestion="Jeśli wpisujesz układ, rozdziel równania nową linią albo średnikiem.",
            )
        return EquationNode(left, right)

    def parse_system_complete(self) -> SystemNode:
        equations: List[EquationNode] = []
        while self.current() is not None:
            while self.match("newline", "separator"):
                pass
            if self.current() is None:
                break
            start_index = self.index
            equation = self.parse_equation_line()
            equations.append(equation)
            if start_index == self.index:
                break
            while self.match("newline", "separator"):
                pass

        if not equations:
            raise PreviewSyntaxError(
                "Wpisz przynajmniej jedno równanie.",
                0,
                incomplete=True,
                suggestion="Każde równanie wpisz w osobnym wierszu, na przykład 'x + y = 2'.",
            )
        return SystemNode(equations)

    def parse_equation_line(self) -> EquationNode:
        left = self.parse_sum(stop_tokens={"equals", "newline", "separator"})
        token = self.current()
        if token is None or token.kind in {"newline", "separator"}:
            position = token.position if token else (self.tokens[-1].position + 1 if self.tokens else 0)
            raise PreviewSyntaxError(
                "To równanie jest jeszcze niepełne, bo brakuje znaku '=' albo prawej strony.",
                position,
                incomplete=True,
                suggestion="Dopisz drugą stronę równania, na przykład '= 0'.",
            )
        if token.kind != "equals":
            raise PreviewSyntaxError(
                "Układ równań powinien składać się z pełnych równań z jednym znakiem '='.",
                token.position,
                suggestion="Każdy wiersz wpisz w formie 'lewa strona = prawa strona'.",
            )
        self.advance()
        if self.current() is None or self.current().kind in {"newline", "separator"}:
            position = self.tokens[self.index - 1].position + 1
            raise PreviewSyntaxError(
                "Za znakiem '=' brakuje prawej strony równania.",
                position,
                incomplete=True,
                suggestion="Dopisz prawą stronę równania.",
            )
        right = self.parse_sum(stop_tokens={"newline", "separator"})
        return EquationNode(left, right)

    def parse_sum(self, stop_tokens: Optional[set] = None) -> Any:
        stop_tokens = stop_tokens or set()
        node = self.parse_product(stop_tokens)
        while True:
            token = self.current()
            if token is None or token.kind in stop_tokens:
                return node
            if token.kind == "operator" and token.value in {"+", "-"}:
                self.advance()
                if self.current() is None or self.current().kind in stop_tokens:
                    raise PreviewSyntaxError(
                        "Po operatorze '{0}' brakuje dalszej części wyrażenia.".format(token.value),
                        token.position + 1,
                        incomplete=True,
                        suggestion="Dopisz kolejny składnik albo usuń ostatni operator.",
                    )
                node = BinaryNode(token.value, node, self.parse_product(stop_tokens))
                continue
            return node

    def parse_product(self, stop_tokens: set) -> Any:
        node = self.parse_power(stop_tokens)
        while True:
            token = self.current()
            if token is None or token.kind in stop_tokens:
                return node
            if token.kind == "operator" and token.value in {"*", "/"}:
                self.advance()
                if self.current() is None or self.current().kind in stop_tokens:
                    raise PreviewSyntaxError(
                        "Po operatorze '{0}' brakuje kolejnego fragmentu.".format(token.value),
                        token.position + 1,
                        incomplete=True,
                        suggestion="Dopisz drugą liczbę lub zamknij poprzednie działanie.",
                    )
                node = BinaryNode(token.value, node, self.parse_power(stop_tokens))
                continue
            if self._starts_implicit_factor(token):
                node = BinaryNode("*", node, self.parse_power(stop_tokens), implicit=True)
                continue
            return node

    def parse_power(self, stop_tokens: set) -> Any:
        node = self.parse_unary(stop_tokens)
        token = self.current()
        if token and token.kind == "operator" and token.value == "^":
            self.advance()
            if self.current() is None or self.current().kind in stop_tokens:
                raise PreviewSyntaxError(
                    "Po znaku '^' brakuje wykładnika.",
                    token.position + 1,
                    incomplete=True,
                    suggestion="Dopisz wykładnik, na przykład '^2' albo '^(x+1)'.",
                )
            return BinaryNode("^", node, self.parse_power(stop_tokens))
        return node

    def parse_unary(self, stop_tokens: set) -> Any:
        token = self.current()
        if token and token.kind == "operator" and token.value in {"+", "-"}:
            self.advance()
            operand = self.parse_unary(stop_tokens)
            return UnaryNode(token.value, operand)
        return self.parse_postfix(stop_tokens)

    def parse_postfix(self, stop_tokens: set) -> Any:
        node = self.parse_primary(stop_tokens)
        while True:
            token = self.current()
            if token and token.kind == "postfix":
                self.advance()
                node = PostfixNode(token.value, node)
                continue
            return node

    def parse_primary(self, stop_tokens: set) -> Any:
        token = self.current()
        if token is None or token.kind in stop_tokens:
            position = token.position if token else (self.tokens[-1].position + 1 if self.tokens else 0)
            raise PreviewSyntaxError(
                "Wyrażenie urywa się w miejscu, w którym powinien pojawić się kolejny element.",
                position,
                incomplete=True,
                suggestion="Dopisz liczbę, zmienną, funkcję albo zamknij nawias.",
            )

        if token.kind == "number":
            self.advance()
            return NumberNode(token.value)

        if token.kind == "identifier":
            self.advance()
            if self.match("lparen"):
                arguments = self.parse_arguments(token)
                return FunctionNode(token.value, arguments)
            return IdentifierNode(token.value)

        if token.kind == "lparen":
            self.advance()
            if self.current() and self.current().kind == "rparen":
                raise PreviewSyntaxError(
                    "Puste nawiasy niczego jeszcze nie opisują.",
                    token.position,
                    incomplete=True,
                    suggestion="Wpisz coś pomiędzy nawiasami albo usuń pustą parę nawiasów.",
                )
            expression = self.parse_sum(stop_tokens={"rparen"})
            self.expect(
                "rparen",
                "Brakuje zamykającego nawiasu ')'.",
                suggestion="Domknij otwarty nawias, aby zapis był kompletny.",
            )
            return GroupNode("()", expression)

        if token.kind == "lbracket":
            self.advance()
            items: List[Any] = []
            if self.current() and self.current().kind == "rbracket":
                self.advance()
                return ListNode(items)
            while True:
                items.append(self.parse_sum(stop_tokens={"comma", "rbracket"}))
                if self.match("comma"):
                    if self.current() and self.current().kind == "rbracket":
                        raise PreviewSyntaxError(
                            "Po przecinku brakuje kolejnego elementu listy.",
                            token.position,
                            incomplete=True,
                            suggestion="Dopisz następny element albo usuń końcowy przecinek.",
                        )
                    continue
                self.expect(
                    "rbracket",
                    "Brakuje zamykającego nawiasu ']'.",
                    suggestion="Domknij listę lub macierz nawiasem ']'.",
                )
                break
            return ListNode(items)

        if token.kind == "rparen":
            raise PreviewSyntaxError(
                "Pojawił się dodatkowy zamykający nawias ')'.",
                token.position,
                suggestion="Usuń ten nawias albo dopisz brakujący nawias otwierający.",
            )

        if token.kind == "rbracket":
            raise PreviewSyntaxError(
                "Pojawił się dodatkowy zamykający nawias ']'.",
                token.position,
                suggestion="Usuń ten nawias albo dopisz brakujący nawias '['.",
            )

        if token.kind == "comma":
            raise PreviewSyntaxError(
                "Przecinek pojawił się za wcześnie.",
                token.position,
                suggestion="Przed przecinkiem dopisz argument albo usuń przecinek.",
            )

        if token.kind == "equals":
            raise PreviewSyntaxError(
                "Lewa strona równania jest pusta.",
                token.position,
                incomplete=True,
                suggestion="Dopisz wyrażenie po lewej stronie przed znakiem '='.",
            )

        raise PreviewSyntaxError(
            "Ten fragment zapisu nie jest jeszcze poprawny.",
            token.position,
            suggestion="Sprawdź operatory i nawiasy w tym miejscu.",
        )

    def parse_arguments(self, function_token: Token) -> List[Any]:
        arguments: List[Any] = []
        if self.current() and self.current().kind == "rparen":
            self.advance()
            raise PreviewSyntaxError(
                "Funkcja '{0}' wymaga argumentu.".format(function_token.value),
                function_token.position,
                incomplete=True,
                suggestion="Wpisz argument funkcji pomiędzy nawiasami.",
            )

        while True:
            arguments.append(self.parse_sum(stop_tokens={"comma", "rparen"}))
            if self.match("comma"):
                if self.current() and self.current().kind == "rparen":
                    raise PreviewSyntaxError(
                        "Po przecinku brakuje kolejnego argumentu funkcji.",
                        function_token.position,
                        incomplete=True,
                        suggestion="Dopisz następny argument albo usuń ostatni przecinek.",
                    )
                continue
            self.expect(
                "rparen",
                "Brakuje zamykającego nawiasu ')' w wywołaniu funkcji.",
                suggestion="Domknij nawias funkcji albo dopisz brakujący argument.",
            )
            break
        return arguments

    @staticmethod
    def _starts_implicit_factor(token: Optional[Token]) -> bool:
        if token is None:
            return False
        return token.kind in {"number", "identifier", "lparen", "lbracket"}


def _precedence(node: Any) -> int:
    if isinstance(node, BinaryNode):
        if node.operator in {"+", "-"}:
            return 10
        if node.operator in {"*", "/"}:
            return 20
        if node.operator == "^":
            return 30
    if isinstance(node, UnaryNode):
        return 40
    if isinstance(node, PostfixNode):
        return 50
    return 100


def _wrap_if_needed(rendered: str, node: Any, parent_precedence: int, *, right_associative: bool = False) -> str:
    child_precedence = _precedence(node)
    if child_precedence < parent_precedence or (right_associative and child_precedence == parent_precedence):
        return r"\left(" + rendered + r"\right)"
    return rendered


def _render_matrix_if_possible(arguments: Sequence[Any]) -> Optional[str]:
    if len(arguments) != 1 or not isinstance(arguments[0], ListNode):
        return None

    rows = arguments[0].items
    if not rows or not all(isinstance(row, ListNode) for row in rows):
        return None

    widths = {len(row.items) for row in rows}
    if len(widths) != 1:
        return None

    rendered_rows = []
    for row in rows:
        rendered_rows.append(" & ".join(render_latex(item) for item in row.items))
    return r"\begin{bmatrix}" + r"\\".join(rendered_rows) + r"\end{bmatrix}"


def render_latex(node: Any) -> str:
    if isinstance(node, NumberNode):
        return node.value

    if isinstance(node, IdentifierNode):
        return _render_identifier(node.name)

    if isinstance(node, UnaryNode):
        operand = _wrap_if_needed(render_latex(node.operand), node.operand, _precedence(node))
        return node.operator + operand

    if isinstance(node, PostfixNode):
        operand = _wrap_if_needed(render_latex(node.operand), node.operand, _precedence(node))
        return operand + node.operator

    if isinstance(node, GroupNode):
        return r"\left(" + render_latex(node.expression) + r"\right)"

    if isinstance(node, ListNode):
        rendered_items = ", ".join(render_latex(item) for item in node.items)
        return r"\left[" + rendered_items + r"\right]"

    if isinstance(node, FunctionNode):
        if node.name == "sqrt" and len(node.arguments) == 1:
            return r"\sqrt{" + render_latex(node.arguments[0]) + "}"

        if node.name == "root" and len(node.arguments) == 2:
            return r"\sqrt[" + render_latex(node.arguments[0]) + "]{" + render_latex(node.arguments[1]) + "}"

        if node.name == "abs" and len(node.arguments) == 1:
            return r"\left|" + render_latex(node.arguments[0]) + r"\right|"

        if node.name == "log" and len(node.arguments) == 1:
            return r"\log_{10}\left(" + render_latex(node.arguments[0]) + r"\right)"

        if node.name == "log" and len(node.arguments) == 2:
            return (
                r"\log_{"
                + render_latex(node.arguments[1])
                + r"}\left("
                + render_latex(node.arguments[0])
                + r"\right)"
            )

        if node.name == "log_base" and len(node.arguments) == 2:
            return (
                r"\log_{"
                + render_latex(node.arguments[0])
                + r"}\left("
                + render_latex(node.arguments[1])
                + r"\right)"
            )

        if node.name in _BINOMIAL_NAMES and len(node.arguments) == 2:
            return r"\binom{" + render_latex(node.arguments[0]) + "}{" + render_latex(node.arguments[1]) + "}"

        if node.name == "Matrix":
            matrix_latex = _render_matrix_if_possible(node.arguments)
            if matrix_latex:
                return matrix_latex

        rendered_arguments = ", ".join(render_latex(argument) for argument in node.arguments)
        macro = _FUNCTION_MACROS.get(node.name)
        if macro:
            return macro + r"\left(" + rendered_arguments + r"\right)"
        return r"\operatorname{" + _escape_text(node.name).replace(r"\ ", " ") + r"}\left(" + rendered_arguments + r"\right)"

    if isinstance(node, BinaryNode):
        precedence = _precedence(node)
        left = _wrap_if_needed(render_latex(node.left), node.left, precedence)
        right = _wrap_if_needed(
            render_latex(node.right),
            node.right,
            precedence,
            right_associative=node.operator == "^",
        )

        if node.operator == "^":
            return left + "^{" + right + "}"
        if node.operator == "*":
            joiner = " " if node.implicit else r" \cdot "
            return left + joiner + right
        if node.operator == "/":
            return left + " / " + right
        return left + " " + node.operator + " " + right

    if isinstance(node, EquationNode):
        return render_latex(node.left) + " = " + render_latex(node.right)

    if isinstance(node, SystemNode):
        body = r"\\ ".join(render_latex(equation) for equation in node.equations)
        return r"\begin{aligned}" + body + r"\end{aligned}"

    return _wrap_texttt(str(node))


def analyze_preview_input(expression_text: str, kind: str = "expression") -> Dict[str, Any]:
    normalized = normalize_preview_text(expression_text).strip()
    if not normalized:
        return {
            "status": "empty",
            "latex": "",
            "plain": "",
            "message": None,
            "suggestion": None,
        }

    try:
        if kind == "variable_list":
            parts = [part.strip() for part in normalized.split(",")]
            if any(not part for part in parts):
                raise PreviewSyntaxError(
                    "Lista niewiadomych jest jeszcze niepełna.",
                    len(normalized),
                    incomplete=True,
                    suggestion="Oddzielaj niewiadome przecinkami, na przykład: x, y, z.",
                )

            invalid = next(
                (
                    part
                    for part in parts
                    if not part
                    or not (part[0].isalpha() or part[0] == "_")
                    or not all(char.isalnum() or char == "_" for char in part[1:])
                ),
                None,
            )
            if invalid:
                raise PreviewSyntaxError(
                    "Nazwa niewiadomej '{0}' nie ma poprawnej postaci.".format(invalid),
                    normalized.find(invalid),
                    suggestion="Użyj nazw takich jak x, y, z albo a1.",
                )

            return {
                "status": "ok",
                "latex": ", ".join(_render_identifier(part) for part in parts),
                "plain": normalized,
                "message": None,
                "suggestion": None,
            }

        tokens = tokenize_preview(normalized)
        parser = PreviewParser(tokens)
        if kind == "equation":
            node = parser.parse_equation_complete()
        elif kind == "system":
            node = parser.parse_system_complete()
        else:
            node = parser.parse_expression_complete()

        return {
            "status": "ok",
            "latex": render_latex(node),
            "plain": normalized,
            "message": None,
            "suggestion": None,
        }
    except PreviewSyntaxError as exc:
        return {
            "status": "incomplete" if exc.incomplete else "error",
            "latex": render_token_stream(normalized),
            "plain": normalized,
            "message": exc.message,
            "suggestion": exc.suggestion,
        }
