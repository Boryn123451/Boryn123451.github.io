from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    DifferentiateRequest,
    EvaluateRequest,
    IntegrateRequest,
    PreviewRequest,
    SolveRequest,
    SolveSystemRequest,
)
from app.core.calculator import CalculatorEngine
from app.core.error_reporting import build_error_detail
from app.core.exceptions import CalculatorError


router = APIRouter(prefix="/api")


def _engine() -> CalculatorEngine:
    return CalculatorEngine()


def _map_error(operation: str, exc: CalculatorError, payload) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail=build_error_detail(
            operation,
            exc,
            status_code=400,
            payload=payload.model_dump() if hasattr(payload, "model_dump") else None,
            unexpected=False,
        ),
    )


def _map_unexpected_error(operation: str, exc: Exception, payload) -> HTTPException:
    return HTTPException(
        status_code=500,
        detail=build_error_detail(
            operation,
            exc,
            status_code=500,
            payload=payload.model_dump() if hasattr(payload, "model_dump") else None,
            unexpected=True,
        ),
    )


@router.get("/health")
def healthcheck():
    return {"status": "ok"}


@router.post("/evaluate")
def evaluate(payload: EvaluateRequest):
    try:
        return _engine().evaluate(payload.expression, payload.to_settings())
    except CalculatorError as exc:
        raise _map_error("evaluate", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("evaluate", exc, payload)


@router.post("/preview")
def preview(payload: PreviewRequest):
    try:
        return _engine().preview_input(payload.expression, payload.to_settings(), kind=payload.kind)
    except CalculatorError as exc:
        raise _map_error("preview", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("preview", exc, payload)


@router.post("/solve")
def solve(payload: SolveRequest):
    try:
        return _engine().solve_equation(payload.equation, payload.variable, payload.to_settings())
    except CalculatorError as exc:
        raise _map_error("solve", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("solve", exc, payload)


@router.post("/solve-system")
def solve_system(payload: SolveSystemRequest):
    try:
        return _engine().solve_system(payload.equations, payload.variables, payload.to_settings())
    except CalculatorError as exc:
        raise _map_error("solve-system", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("solve-system", exc, payload)


@router.post("/differentiate")
def differentiate(payload: DifferentiateRequest):
    try:
        return _engine().differentiate(
            payload.expression,
            payload.variable,
            payload.to_settings(),
            order=payload.order,
        )
    except CalculatorError as exc:
        raise _map_error("differentiate", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("differentiate", exc, payload)


@router.post("/integrate")
def integrate_expression(payload: IntegrateRequest):
    try:
        return _engine().integrate_expression(
            payload.expression,
            payload.variable,
            payload.to_settings(),
            lower_bound=payload.lower_bound,
            upper_bound=payload.upper_bound,
        )
    except CalculatorError as exc:
        raise _map_error("integrate", exc, payload)
    except Exception as exc:
        raise _map_unexpected_error("integrate", exc, payload)
