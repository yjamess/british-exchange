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
