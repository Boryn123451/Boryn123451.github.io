from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.settings import EngineSettings


class EngineOptions(BaseModel):
    mode: Literal["exact", "approx"] = "exact"
    angle_mode: Literal["rad", "deg", "grad"] = "rad"
    fraction_display: Literal["improper", "mixed"] = "improper"
    solution_domain: Literal["real", "complex"] = "real"
    precision: int = Field(default=12, ge=4, le=20)

    @field_validator("mode", mode="before")
    @classmethod
    def normalize_mode(cls, value):
        return value if value in {"exact", "approx"} else "exact"

    @field_validator("angle_mode", mode="before")
    @classmethod
    def normalize_angle_mode(cls, value):
        return value if value in {"rad", "deg", "grad"} else "rad"

    @field_validator("fraction_display", mode="before")
    @classmethod
    def normalize_fraction_display(cls, value):
        return value if value in {"improper", "mixed"} else "improper"

    @field_validator("solution_domain", mode="before")
    @classmethod
    def normalize_solution_domain(cls, value):
        return value if value in {"real", "complex"} else "real"

    @field_validator("precision", mode="before")
    @classmethod
    def normalize_precision(cls, value):
        if value in {None, ""}:
            return 12
        try:
            numeric_value = int(float(value))
        except (TypeError, ValueError):
            return 12
        return max(4, min(20, numeric_value))

    def to_settings(self) -> EngineSettings:
        return EngineSettings(
            mode=self.mode,
            angle_mode=self.angle_mode,
            fraction_display=self.fraction_display,
            solution_domain=self.solution_domain,
            precision=self.precision,
        )


class EvaluateRequest(EngineOptions):
    expression: str


class PreviewRequest(EngineOptions):
    expression: str
    kind: Literal["expression", "equation", "system", "variable_list"] = "expression"


class SolveRequest(EngineOptions):
    equation: str
    variable: str = ""


class SolveSystemRequest(EngineOptions):
    equations: str
    variables: str = ""


class DifferentiateRequest(EngineOptions):
    expression: str
    variable: str = ""
    order: int = Field(default=1, ge=1, le=6)


class IntegrateRequest(EngineOptions):
    expression: str
    variable: str = ""
    lower_bound: Optional[str] = None
    upper_bound: Optional[str] = None
