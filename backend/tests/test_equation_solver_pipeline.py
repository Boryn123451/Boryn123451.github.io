import pytest
from sympy import simplify, sstr

from app.core.calculator import CalculatorEngine
from app.core.parsing import parse_expression
from app.core.settings import EngineSettings


SETTINGS = EngineSettings(mode="exact", angle_mode="rad")
ENGINE = CalculatorEngine()


def parse_expected(expression: str):
    return parse_expression(expression, SETTINGS)


def normalize_solutions(values):
    return tuple(sorted(sstr(simplify(value), order="lex") for value in values))


def assert_solution_set(analysis, expected_expressions):
    expected = normalize_solutions(parse_expected(item) for item in expected_expressions)
    actual = normalize_solutions(analysis.valid_solutions)
    assert actual == expected


@pytest.mark.parametrize(
    ("case_id", "equation", "variable", "expected"),
    [
        ("R001", "x+2=5", "x", ["3"]),
        ("R002", "x-7=0", "x", ["7"]),
        ("R003", "2x=10", "x", ["5"]),
        ("R004", "-3x=9", "x", ["-3"]),
        ("R005", "5x+1=16", "x", ["3"]),
        ("R006", "4x-8=0", "x", ["2"]),
        ("R007", "10x+5=2x+21", "x", ["2"]),
        ("R008", "7x-3=4x+12", "x", ["5"]),
        ("R011", "2(x+3)=10", "x", ["2"]),
        ("R012", "3(x-1)=12", "x", ["5"]),
        ("R013", "2(x+1)=x+7", "x", ["5"]),
        ("R014", "5(x-2)=3(x+4)", "x", ["11"]),
        ("R015", "2(3x-1)=4x+6", "x", ["4"]),
        ("R016", "4(x+2)-3(x-1)=10", "x", ["-1"]),
        ("R019", "x/2=3", "x", ["6"]),
        ("R020", "x/3+2=5", "x", ["9"]),
        ("R021", "x/2+x/3=5", "x", ["6"]),
        ("R022", "(x-1)/4=2", "x", ["9"]),
        ("R023", "(2x+3)/5=1", "x", ["1"]),
        ("R024", "(x+1)/2=(x-3)/4", "x", ["-5"]),
        ("R025", "1/x=2", "x", ["1/2"]),
        ("R026", "1/(x-1)=1", "x", ["2"]),
        ("R035", "x^2-2x+1=0", "x", ["1"]),
        ("R036", "x^2=0", "x", ["0"]),
        ("R038", "(x+1)^2=0", "x", ["-1"]),
        ("R043", "x^3=8", "x", ["2"]),
        ("R044", "x^3-1=0", "x", ["1"]),
        ("R051", "sqrt(x)=3", "x", ["9"]),
        ("R052", "sqrt(x+1)=4", "x", ["15"]),
        ("R053", "sqrt(x)=x-2", "x", ["4"]),
        ("R054", "sqrt(x+5)=x", "x", ["(1+sqrt(21))/2"]),
        ("R055", "sqrt(x-1)=sqrt(3)", "x", ["4"]),
        ("R056", "sqrt(x+2)=x+2", "x", ["-2", "-1"]),
        ("R058", "sqrt(x-4)=x-4", "x", ["4", "5"]),
        ("R063", "abs(x-1)=0", "x", ["1"]),
        ("R065", "abs(x+2)=abs(x-2)", "x", ["0"]),
        ("R066", "abs(x-3)=x+1", "x", ["1"]),
        ("R067", "2^x=8", "x", ["3"]),
        ("R068", "3^x=1", "x", ["0"]),
        ("R069", "4^x=2", "x", ["1/2"]),
        ("R070", "2^(x+1)=16", "x", ["3"]),
        ("R071", "5^(2x)=25", "x", ["1"]),
        ("R072", "9^x=27", "x", ["3/2"]),
        ("R075", "log(x,10)=2", "x", ["100"]),
        ("R076", "ln(x)=0", "x", ["1"]),
        ("R077", "ln(x)=1", "x", ["e"]),
        ("R078", "log(x)=0", "x", ["1"]),
        ("R079", "log(x-1,10)=1", "x", ["11"]),
        ("R080", "ln(x+2)=ln(5)", "x", ["3"]),
        ("R081", "ln(x)=-1", "x", ["exp(-1)"]),
        ("R091", "ax=b", "x", ["b/a"]),
        ("R092", "ax+a=0", "x", ["-1"]),
        ("R093", "x+a=0", "x", ["-a"]),
        ("R094", "x^2-a=0", "x", ["-sqrt(a)", "sqrt(a)"]),
        ("R097", "x+0.5=1", "x", ["0.5"]),
        ("R098", "x+1e-3=0", "x", ["-0.001"]),
        ("R099", "1e6*x=1", "x", ["1e-6"]),
        ("R100", "x+pi=0", "x", ["-pi"]),
        ("R101", "x+sqrt(2)=0", "x", ["-sqrt(2)"]),
        ("R102", "x-1/3=2/3", "x", ["1"]),
        ("R103", "0.1x=0.02", "x", ["0.2"]),
        ("R104", "x+(-3)=0", "x", ["3"]),
    ],
)
def test_equation_solver_returns_expected_single_or_symbolic_solution(case_id, equation, variable, expected):
    analysis = ENGINE.solve_equation_detailed(equation, variable, SETTINGS)
    assert analysis.classification in {"one_solution", "many_solutions"}
    assert_solution_set(analysis, expected)


@pytest.mark.parametrize(
    ("case_id", "equation", "expected"),
    [
        ("R029", "x^2=9", ["-3", "3"]),
        ("R030", "x^2-4=0", ["-2", "2"]),
        ("R031", "x^2-5x+6=0", ["2", "3"]),
        ("R032", "x^2+5x+6=0", ["-3", "-2"]),
        ("R033", "2x^2-8=0", ["-2", "2"]),
        ("R037", "(x-2)(x-3)=0", ["2", "3"]),
        ("R039", "(x-1)(x+1)=5", ["-sqrt(6)", "sqrt(6)"]),
        ("R040", "(2x-1)^2=9", ["-1", "2"]),
        ("R041", "x(x-4)=0", ["0", "4"]),
        ("R042", "x(x+2)=3x", ["0", "1"]),
        ("R045", "x^3-6x^2+11x-6=0", ["1", "2", "3"]),
        ("R046", "x^4-16=0", ["-2", "2"]),
        ("R047", "x^4-5x^2+4=0", ["-2", "-1", "1", "2"]),
        ("R048", "x^6=1", ["-1", "1"]),
        ("R049", "x^5-x=0", ["-1", "0", "1"]),
        ("R050", "x^3+x^2-x-1=0", ["-1", "1"]),
        ("R057", "sqrt(x)= -3", []),
        ("R059", "abs(x)=3", ["-3", "3"]),
        ("R060", "abs(x-2)=5", ["-3", "7"]),
        ("R061", "abs(2x)=8", ["-4", "4"]),
        ("R062", "abs(x)+1=4", ["-3", "3"]),
        ("R105", "(x-1)^3=0", ["1"]),
        ("R106", "(x-2)^2(x+1)=0", ["-1", "2"]),
        ("R107", "x^2(x-3)=0", ["0", "3"]),
        ("R108", "(x^2-1)(x^2-4)=0", ["-2", "-1", "1", "2"]),
        ("R114", "(x^2-1)/(x-1)=0", ["-1"]),
        ("R116", "sqrt(x-3)=x-5", ["7"]),
        ("R117", "x/(x-1)=x", ["0", "2"]),
    ],
)
def test_equation_solver_returns_expected_finite_solution_sets(case_id, equation, expected):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    if expected:
        assert analysis.classification in {"one_solution", "many_solutions"}
        assert_solution_set(analysis, expected)
    else:
        assert analysis.classification == "no_solutions"


@pytest.mark.parametrize(
    ("case_id", "equation"),
    [
        ("R009", "0x+5=5"),
        ("R017", "2(x+3)=2x+6"),
        ("R095", "mx+2=mx+2"),
        ("R109", "x=x"),
        ("R110", "x+1=x+1"),
        ("R112", "2(x+1)=2x+2"),
        ("R115", "1/(x-2)=1/(x-2)"),
        ("R118", "(x-1)/(x-1)=1"),
    ],
)
def test_equation_solver_classifies_infinite_solution_cases(case_id, equation):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    assert analysis.classification == "infinite_solutions"


@pytest.mark.parametrize(
    ("case_id", "equation"),
    [
        ("R010", "0x+5=7"),
        ("R018", "2(x+3)=2x+7"),
        ("R027", "1/x=0"),
        ("R028", "x/(x-2)=1"),
        ("R064", "abs(x)= -1"),
        ("R073", "2^x=0"),
        ("R111", "x+1=x+2"),
        ("R113", "2(x+1)=2x+3"),
        ("R133", "1/(x-2)=0"),
        ("R138", "x+1=x+2"),
    ],
)
def test_equation_solver_classifies_no_solution_cases(case_id, equation):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    assert analysis.classification == "no_solutions"


@pytest.mark.parametrize(
    ("case_id", "equation"),
    [
        ("R034", "x^2+1=0"),
        ("R074", "10^x=-1"),
        ("R082", "ln(x)=ln(-1)"),
        ("R090", "sin(x)=2"),
        ("R130", "sqrt(x)=sqrt(-1)"),
        ("R139", "x^2+1=0"),
    ],
)
def test_equation_solver_classifies_no_real_solution_cases(case_id, equation):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    assert analysis.classification == "no_real_solutions"


@pytest.mark.parametrize(
    ("case_id", "equation", "domain_fragment"),
    [
        ("R131", "log(-x)=1", "x < 0"),
        ("R132", "ln(x-2)=0", "x > 2"),
        ("B001", "1/(x-2)=1/(x-2)", "x != 2"),
        ("B002", "(x-1)/(x-1)=1", "x != 1"),
    ],
)
def test_equation_solver_tracks_real_domain(case_id, equation, domain_fragment):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    assert domain_fragment in analysis.domain_plain


@pytest.mark.parametrize(
    ("case_id", "equation", "expected_fragment"),
    [
        ("R083", "sin(x)=0", "pi*n"),
        ("R084", "cos(x)=1", "2*pi*n"),
        ("R085", "sin(x)=1", "pi/2"),
        ("R086", "tan(x)=0", "pi*n"),
        ("R087", "cos(x)=0", "pi/2"),
        ("R088", "sin(x)=1/2", "pi/6"),
        ("R089", "tan(x)=1", "pi/4"),
    ],
)
def test_equation_solver_returns_general_trigonometric_families(case_id, equation, expected_fragment):
    response = ENGINE.solve_equation(equation, "x", SETTINGS)
    assert expected_fragment in response["resultPlain"]


@pytest.mark.parametrize(
    ("case_id", "equation", "expected_classification"),
    [
        ("R119", "x+2", "syntax_error"),
        ("R120", "=x+2", "syntax_error"),
        ("R121", "x+2=", "syntax_error"),
        ("R122", "x++2=5", "syntax_error"),
        ("R124", "sqrt(x=3", "syntax_error"),
        ("R125", "(x+1))=2", "syntax_error"),
        ("R126", "", "syntax_error"),
        ("R128", "sin(=1", "syntax_error"),
        ("R129", "1/(x-1)=1/0", "math_error"),
        ("R134", "tan(x)=undefined", "syntax_error"),
    ],
)
def test_equation_solver_reports_bad_inputs_and_math_errors(case_id, equation, expected_classification):
    analysis = ENGINE.solve_equation_detailed(equation, "x", SETTINGS)
    assert analysis.classification == expected_classification


def test_equation_solver_allows_python_power_syntax_when_supported():
    analysis = ENGINE.solve_equation_detailed("2**x=8", "x", SETTINGS)
    assert analysis.classification == "one_solution"
    assert_solution_set(analysis, ["3"])


def test_equation_solver_can_treat_unknown_identifier_as_symbol_when_requested():
    analysis = ENGINE.solve_equation_detailed("abc=5", "abc", SETTINGS)
    assert analysis.classification == "one_solution"
    assert_solution_set(analysis, ["5"])


def test_equation_solver_does_not_duplicate_roots():
    analysis = ENGINE.solve_equation_detailed("(x-1)^2=0", "x", SETTINGS)
    assert analysis.classification == "one_solution"
    assert_solution_set(analysis, ["1"])


def test_equation_solver_returns_clear_messages_for_identity_and_contradiction():
    identity = ENGINE.solve_equation("x=x", "x", SETTINGS)
    contradiction = ENGINE.solve_equation("x+1=x+2", "x", SETTINGS)

    assert "Niesko" in identity["resultPlain"]
    assert "Brak rozwiązań" in contradiction["resultPlain"]
