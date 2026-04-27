import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import type { Settings } from "../types";
import { EvaluatePanel } from "./EvaluatePanel";

vi.mock("../api/client", () => ({
  previewMathInput: vi.fn().mockResolvedValue({
    operation: "preview",
    status: "ok",
    latex: "x",
    plain: "x",
    warnings: [],
  }),
}));

const settings: Settings = {
  mode: "approx",
  angle_mode: "deg",
  fraction_display: "improper",
  solution_domain: "real",
  precision: 12,
};

function EvaluateHarness() {
  const [expression, setExpression] = useState("");

  return (
    <EvaluatePanel
      expression={expression}
      settings={settings}
      busy={false}
      onChange={setExpression}
      onAngleModeChange={() => undefined}
      onSubmit={() => undefined}
    />
  );
}

describe("EvaluatePanel", () => {
  it("starts in manual mode and keeps the action button near the header", () => {
    render(<EvaluateHarness />);

    expect(screen.getByText("Oblicz")).toBeInTheDocument();
    expect(screen.getByText("Oblicz teraz")).toBeInTheDocument();
    expect(screen.queryByLabelText("Klawiatura kalkulatora")).not.toBeInTheDocument();
  });

  it("switches to keyboard mode and inserts tokens without losing the textarea", () => {
    render(<EvaluateHarness />);

    fireEvent.click(screen.getByText("Klawiatura"));
    expect(screen.getByLabelText("Klawiatura kalkulatora")).toBeInTheDocument();

    const textarea = screen.getByRole("textbox");
    fireEvent.click(screen.getByLabelText("5"));
    fireEvent.click(screen.getByLabelText("Pierwiastek"));

    expect(textarea).toHaveValue("5sqrt()");
  });
});
