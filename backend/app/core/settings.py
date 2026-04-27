from dataclasses import dataclass


@dataclass
class EngineSettings:
    mode: str = "exact"
    angle_mode: str = "rad"
    fraction_display: str = "improper"
    solution_domain: str = "real"
    precision: int = 12

    @property
    def exact(self) -> bool:
        return self.mode == "exact"

    @property
    def complex_solutions(self) -> bool:
        return self.solution_domain == "complex"
