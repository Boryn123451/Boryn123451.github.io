from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_preview_accepts_legacy_invalid_settings_payload():
    response = client.post(
        "/api/preview",
        json={
            "expression": "sin(80)",
            "kind": "expression",
            "mode": "wrong",
            "angle_mode": None,
            "fraction_display": "",
            "precision": "",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "incomplete", "error"}
    assert "latex" in payload


def test_evaluate_accepts_legacy_invalid_settings_payload():
    response = client.post(
        "/api/evaluate",
        json={
            "expression": "5sqrt(9)",
            "mode": None,
            "angle_mode": "deg",
            "fraction_display": None,
            "precision": "999",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["resultPlain"] == "15"
    assert payload["resultLatex"] == "15"


def test_differentiate_endpoint_supports_higher_orders():
    response = client.post(
        "/api/differentiate",
        json={
            "expression": "sin(x)^2",
            "variable": "",
            "order": 3,
            "mode": "exact",
            "angle_mode": "rad",
            "fraction_display": "improper",
            "precision": 12,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["resultLatex"]


def test_symbolic_family_response_is_readable_in_plain_text():
    response = client.post(
        "/api/solve",
        json={
            "equation": "sin(x)=0",
            "variable": "",
            "mode": "exact",
            "angle_mode": "rad",
            "fraction_display": "improper",
            "precision": 12,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["resultLatex"]
    assert "Union(" not in payload["resultPlain"]
    assert "in Z" in payload["resultPlain"]


def test_api_responses_have_expected_fields_across_modules():
    cases = [
        (
            "/api/evaluate",
            {
                "expression": "sqrt(2)",
                "mode": "approx",
                "angle_mode": "rad",
                "fraction_display": "improper",
                "precision": 6,
            },
        ),
        (
            "/api/solve-system",
            {
                "equations": "x+y=10\nx-y=2",
                "variables": "x,y",
                "mode": "exact",
                "angle_mode": "rad",
                "fraction_display": "improper",
                "precision": 12,
            },
        ),
        (
            "/api/integrate",
            {
                "expression": "x*cos(x)",
                "variable": "",
                "mode": "exact",
                "angle_mode": "rad",
                "fraction_display": "improper",
                "precision": 12,
            },
        ),
    ]

    for path, body in cases:
        response = client.post(path, json=body)
        assert response.status_code == 200
        payload = response.json()
        assert payload["operation"]
        assert "inputLatex" in payload
        assert payload["resultLatex"]
        assert payload["resultPlain"] is not None
        assert isinstance(payload.get("warnings", []), list)


def test_solve_system_endpoint_handles_adjacent_variable_products_without_500():
    response = client.post(
        "/api/solve-system",
        json={
            "equations": "x^2 + y^2 + z^2 = 14\nxy + yz + zx = 11\nx^3 + y^3 + z^3 = 36",
            "variables": "",
            "mode": "exact",
            "angle_mode": "rad",
            "fraction_display": "improper",
            "solution_domain": "complex",
            "precision": 12,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["resultLatex"]
    assert payload["resultPlain"]
    assert "-7/2 - sqrt(23)*I/2" in payload["resultPlain"]
