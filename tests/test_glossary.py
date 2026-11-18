"""The pinned terms registry stays valid and the popover copy stays short."""

from __future__ import annotations

import pytest

from britain_exchange.glossary import TERMS_PATH, load_terms_yaml


def test_terms_yaml_loads_and_is_unique() -> None:
    terms = load_terms_yaml(TERMS_PATH)
    assert len(terms) >= 70
    slugs = [t.slug for t in terms]
    assert len(slugs) == len(set(slugs))
    for t in terms:
        assert t.definition.endswith("."), t.slug
        assert t.sector in {"shared", "housing-land", "energy-industry", "economy-public-finance"}, t.slug


def test_bad_slug_is_rejected(tmp_path) -> None:
    path = tmp_path / "terms.yaml"
    path.write_text('terms:\n  - slug: "Bad Slug"\n    short: x\n    full_name: x\n    definition: x.\n    sector: shared\n')
    with pytest.raises(ValueError, match="bad slug"):
        load_terms_yaml(path)


def test_economy_figure_terms_resolve() -> None:
    """Every economy Notes panel points to an available shared registry term."""
    import json
    import re

    from britain_exchange.db import REPO_ROOT

    terms = {t.slug: t for t in load_terms_yaml()}
    canvases = REPO_ROOT / "web/src/brand/economy"
    for name in (
        "Inflation", "Wages", "Employment", "Household", "Growth",
        "Tax", "Spending", "Debt", "Investment", "Policy",
    ):
        text = (canvases / f"{name}Canvas.tsx").read_text()
        # Named term lists (`const RATE_TERMS = [...INFLATION_TERMS] as const;`) resolve within the file.
        consts = dict(re.findall(r"const (\w+_TERMS)\s*=\s*(\[[^\]\n]*\])", text))

        def slugs_of(expr: str, seen: tuple[str, ...] = ()) -> list[str]:
            out: list[str] = []
            for item in (part.strip() for part in expr.strip()[1:-1].split(",")):
                if not item:
                    continue
                if item.startswith("..."):
                    ref = item[3:]
                    assert ref in consts and ref not in seen, (name, ref)
                    out += slugs_of(consts[ref], (*seen, ref))
                else:
                    out.append(json.loads(item))
            return out

        records = text.split("<FigureRecord")[1:]
        assert records, name
        for record in records:
            match = re.match(r"\s+terms=\{(\[[^\n]+?\])\}", record)
            assert match, name
            for slug in slugs_of(match[1]):
                assert slug in terms, (name, slug)
                assert terms[slug].sector in {"shared", "economy-public-finance"}
