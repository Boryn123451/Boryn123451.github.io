from app.core.calculator import CalculatorEngine
from app.core.formula_identities import known_formula_count
from app.core.settings import EngineSettings
from app.api.schemas import EvaluateRequest, PreviewRequest


def test_exact_trigonometry_returns_symbolic_form():
    engine = CalculatorEngine()
    response = engine.evaluate("sin(pi/3)", EngineSettings(mode="exact"))
    assert "\\frac" in response["resultLatex"] or "\\sqrt{3}" in response["resultLatex"]


def test_formula_library_contains_at_least_two_hundred_entries():
    assert known_formula_count() >= 300


def test_known_identity_is_applied_automatically_in_normal_evaluation():
    engine = CalculatorEngine()
    response = engine.evaluate("sin(x)^2 + cos(x)^2", EngineSettings(mode="exact"))
    assert response["resultPlain"] == "1"


def test_decimal_comma_is_accepted_in_evaluation():
    engine = CalculatorEngine()
    response = engine.evaluate("4/0,75", EngineSettings(mode="approx", precision=8))
    assert response["resultPlain"].startswith("5.3333333")


def test_absolute_value_bar_notation_is_accepted():
    engine = CalculatorEngine()
    response = engine.evaluate("|-5|", EngineSettings(mode="exact"))
    assert response["resultPlain"] == "5"


def test_nth_root_function_is_accepted():
    engine = CalculatorEngine()
    response = engine.evaluate("root(3,27)", EngineSettings(mode="exact"))
    assert response["resultPlain"] == "3"


def test_absolute_value_quotient_formula_is_applied():
    engine = CalculatorEngine()
    response = engine.evaluate("abs(x/y)", EngineSettings(mode="exact"))
    assert response["resultPlain"] in {"Abs(x/y)", "Abs(x)/Abs(y)"}


def test_degree_mode_works_in_approx_mode():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "sin(30)",
        EngineSettings(mode="approx", angle_mode="deg", precision=8),
    )
    assert response["resultPlain"].startswith("0.5")


def test_approx_precision_changes_irrational_result():
    engine = CalculatorEngine()
    low_precision = engine.evaluate("sqrt(2)", EngineSettings(mode="approx", precision=4))
    high_precision = engine.evaluate("sqrt(2)", EngineSettings(mode="approx", precision=16))

    assert low_precision["resultPlain"] == "1.414"
    assert high_precision["resultPlain"].startswith("1.41421356")
    assert low_precision["resultPlain"] != high_precision["resultPlain"]


def test_exact_mode_simplifies_complex_fraction_to_shorter_form():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "(sqrt(23)-43*I)/(sqrt(23)+9*I)",
        EngineSettings(mode="exact"),
    )
    assert response["resultPlain"] == "-7/2 - sqrt(23)*I/2"
    assert response["resultLatex"] == "- \\frac{7}{2} - \\frac{\\sqrt{23} i}{2}"


def test_solver_returns_complex_quartic_roots():
    engine = CalculatorEngine()
    response = engine.solve_equation("x^4 + 1 = 0", "x", EngineSettings(mode="exact"))
    assert "I" in response["resultPlain"] or "\\sqrt{2}" in response["resultLatex"]


def test_mixed_fraction_formatting_is_available():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "5/2",
        EngineSettings(mode="exact", fraction_display="mixed"),
    )
    assert "2\\;" in response["resultLatex"]


def test_degree_mode_warns_when_pi_is_used_inside_trigonometry():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "sin(pi/3)",
        EngineSettings(mode="exact", angle_mode="deg"),
    )
    assert response["warnings"]


def test_preview_keeps_raw_division_structure():
    engine = CalculatorEngine()
    response = engine.preview_input("8/9*sqrt(6)", EngineSettings(mode="exact"))
    assert response["latex"] == "8 / 9 \\cdot \\sqrt{6}"


def test_preview_renders_binomial_symbol():
    engine = CalculatorEngine()
    response = engine.preview_input("binomial(5,2)", EngineSettings(mode="exact"))
    assert response["latex"] == "\\binom{5}{2}"


def test_preview_renders_logarithm_base_as_subscript():
    engine = CalculatorEngine()
    response = engine.preview_input("log(x,10)", EngineSettings(mode="exact"))
    assert response["latex"] == "\\log_{10}\\left(x\\right)"


def test_preview_marks_incomplete_input_without_throwing():
    engine = CalculatorEngine()
    response = engine.preview_input("8/", EngineSettings(mode="exact"))
    assert response["status"] == "incomplete"
    assert "Dopisz" in response["suggestion"]


def test_general_equation_solver_handles_periodic_family():
    engine = CalculatorEngine()
    response = engine.solve_equation("sin(x)=0", "x", EngineSettings(mode="exact"))
    assert "\\pi" in response["resultLatex"]
    assert "\\pi k" in response["resultLatex"] or "k \\pi" in response["resultLatex"]
    assert "\\pi n" not in response["resultLatex"]
    assert "n \\pi" not in response["resultLatex"]


def test_equation_input_renders_logarithm_base_as_subscript():
    engine = CalculatorEngine()
    response = engine.solve_equation("log(x,10)=2", "x", EngineSettings(mode="exact"))
    assert "\\log_{10}\\left(x\\right)" in response["inputLatex"]


def test_system_solver_handles_two_variables():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "x + y = 10\nx - y = 2",
        "x, y",
        EngineSettings(mode="exact"),
    )
    assert "x = 6" in response["resultLatex"]
    assert "y = 4" in response["resultLatex"]


def test_implicit_multiplication_evaluate_returns_visible_result():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "5sqrt(9)",
        EngineSettings(mode="approx", precision=10),
    )
    assert response["resultLatex"] == "15"
    assert response["resultPlain"] == "15"


def test_evaluate_builds_real_arithmetic_result():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "3sqrt(3)-5*8-5sqrt(7)",
        EngineSettings(mode="exact"),
    )
    assert response["resultLatex"]
    assert "-40" in response["resultLatex"]


def test_evaluate_converts_angles_in_exact_mode():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "sin(80)",
        EngineSettings(mode="exact", angle_mode="deg"),
    )
    assert "\\frac{4 \\pi}{9}" in response["resultLatex"]


def test_evaluate_expands_radical_to_final_exact_result():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "9/2sqrt(8)",
        EngineSettings(mode="exact"),
    )
    assert response["resultLatex"] == "9 \\sqrt{2}"


def test_evaluate_shows_binomial_symbol_in_input_and_result():
    engine = CalculatorEngine()
    response = engine.evaluate(
        "binomial(5,2)",
        EngineSettings(mode="exact"),
    )
    assert response["inputLatex"] == "\\binom{5}{2}"
    assert response["resultPlain"] == "10"


def test_equation_solver_auto_detects_variable():
    engine = CalculatorEngine()
    response = engine.solve_equation(
        "2t^2 + 4 = 0",
        "",
        EngineSettings(mode="approx", precision=8),
    )
    assert "1.414" in response["resultPlain"]


def test_equation_solver_falls_back_when_stale_variable_does_not_exist():
    engine = CalculatorEngine()
    response = engine.solve_equation(
        "3y^2 + 8 = 3",
        "x",
        EngineSettings(mode="exact"),
    )
    assert response["warnings"]


def test_equation_solver_returns_complex_solutions_when_complex_domain_is_enabled():
    engine = CalculatorEngine()
    response = engine.solve_equation(
        "x^2 + 1 = 0",
        "x",
        EngineSettings(mode="exact", solution_domain="complex"),
    )
    assert "i" in response["resultPlain"].lower()


def test_approx_equation_solver_returns_numeric_form():
    engine = CalculatorEngine()
    response = engine.solve_equation(
        "x^2 - 2 = 0",
        "x",
        EngineSettings(mode="approx", precision=8),
    )
    assert "1.414" in response["resultPlain"]


def test_system_solver_handles_approx_mode():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "x + y = 7\nx - y = 1",
        "x, y",
        EngineSettings(mode="approx", precision=8),
    )
    assert "4.0" in response["resultPlain"] or "4" in response["resultPlain"]
    assert "3.0" in response["resultPlain"] or "3" in response["resultPlain"]


def test_system_solver_auto_detects_variables():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "a + b = 7\na - b = 1",
        "",
        EngineSettings(mode="exact"),
    )
    assert "a = 4" in response["resultLatex"]
    assert "b = 3" in response["resultLatex"]


def test_system_solver_falls_back_when_stale_variable_list_does_not_match():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "a + b = 7\na - b = 1",
        "x, y",
        EngineSettings(mode="exact"),
    )
    assert "a = 4" in response["resultLatex"]
    assert response["warnings"]


def test_system_solver_handles_adjacent_variable_products_without_internal_error():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36",
        "",
        EngineSettings(mode="exact"),
    )
    assert "x = 1" in response["resultLatex"] or "x = 2" in response["resultLatex"] or "x = 3" in response["resultLatex"]
    assert response["resultPlain"]


def test_system_solver_hides_complex_solutions_in_real_mode():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36",
        "",
        EngineSettings(mode="exact"),
    )
    assert "-7/2 - sqrt(23)*I/2" not in response["resultPlain"]
    assert "-7/2 + sqrt(23)*I/2" not in response["resultPlain"]
    assert "{x: 1, y: 2, z: 3}" in response["resultPlain"]


def test_system_solver_returns_complex_solutions_in_simpler_exact_form():
    engine = CalculatorEngine()
    response = engine.solve_system(
        "x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36",
        "",
        EngineSettings(mode="exact", solution_domain="complex"),
    )
    assert "-7/2 - sqrt(23)*I/2" in response["resultPlain"]
    assert "-7/2 + sqrt(23)*I/2" in response["resultPlain"]
    assert "(sqrt(23) - 43*I)/(sqrt(23) + 9*I)" not in response["resultPlain"]


def test_differentiate_returns_non_empty_result():
    engine = CalculatorEngine()
    response = engine.differentiate(
        "sin(x)^2",
        "x",
        EngineSettings(mode="exact"),
    )
    assert response["resultLatex"]


def test_higher_order_derivative_is_supported():
    engine = CalculatorEngine()
    response = engine.differentiate(
        "sin(x)^2",
        "",
        EngineSettings(mode="exact"),
        order=3,
    )
    assert "\\sin" in response["resultLatex"]

def test_integral_result_covers_arcsin_pattern():
    engine = CalculatorEngine()
    response = engine.integrate_expression(
        "1/sqrt(1-x^2)",
        "x",
        EngineSettings(mode="exact"),
    )
    assert "asin" in response["resultLatex"].lower() or "arcsin" in response["resultLatex"].lower()


def test_api_schema_normalizes_invalid_options_without_422_style_validation_errors():
    evaluate = EvaluateRequest.model_validate(
        {
            "expression": "sin(80)",
            "mode": "wrong",
            "angle_mode": None,
            "fraction_display": "",
            "precision": "",
        }
    )
    preview = PreviewRequest.model_validate(
        {
            "expression": "sin(80)",
            "mode": None,
            "angle_mode": "deg",
            "fraction_display": None,
            "precision": "999",
        }
    )

    assert evaluate.mode == "exact"
    assert evaluate.angle_mode == "rad"
    assert evaluate.fraction_display == "improper"
    assert evaluate.precision == 12
    assert preview.precision == 20
