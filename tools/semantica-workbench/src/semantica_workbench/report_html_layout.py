from __future__ import annotations

import html
from typing import Any


def hero(title: str, subtitle: str, facts: list[tuple[str, str]]) -> str:
    fact_html = "".join(
        f'<div class="fact"><span>{escape(label)}</span><strong>{escape(value)}</strong></div>'
        for label, value in facts
    )
    return f"""
<header class="hero">
  <div>
    <p class="eyebrow">RAWR document intelligence</p>
    <h1>{escape(title)}</h1>
    <p class="lede">{escape(subtitle)}</p>
  </div>
  <div class="facts">{fact_html}</div>
</header>
"""


def metric_grid(metrics: list[tuple[str, Any, str]]) -> str:
    cards = "".join(
        f"""
<article class="metric">
  <span>{escape(label)}</span>
  <strong>{escape(str(value))}</strong>
  <small>{escape(help_text)}</small>
</article>
"""
        for label, value, help_text in metrics
    )
    return f'<section class="metric-grid">{cards}</section>'


def escape(value: Any) -> str:
    return html.escape(str(value), quote=True)
