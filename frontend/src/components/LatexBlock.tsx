import katex from "katex";

interface LatexBlockProps {
  latex: string;
  inline?: boolean;
  className?: string;
}

function renderLatex(latex: string, inline: boolean) {
  return katex.renderToString(latex, {
    displayMode: !inline,
    throwOnError: false,
    output: "html",
    strict: "ignore",
    trust: false,
  });
}

export function LatexBlock({ latex, inline = false, className = "" }: LatexBlockProps) {
  if (!latex) {
    return <span className="muted">Brak danych</span>;
  }

  try {
    const html = renderLatex(latex, inline);
    const classes = ["latex-block", inline ? "latex-block--inline" : "", className]
      .filter(Boolean)
      .join(" ");

    if (inline) {
      return (
        <span className={classes} data-latex-source={latex}>
          <span className="latex-block__content" dangerouslySetInnerHTML={{ __html: html }} />
        </span>
      );
    }

    return (
      <div className={classes} data-latex-source={latex}>
        <div className="latex-block__content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  } catch {
    return <pre className="plain-output">{latex}</pre>;
  }
}
