from __future__ import annotations

import re
import unicodedata

_TRANSLATION = str.maketrans(
    {
        "\u00a0": " ",
        "\u1680": " ",
        "\u2000": " ",
        "\u2001": " ",
        "\u2002": " ",
        "\u2003": " ",
        "\u2004": " ",
        "\u2005": " ",
        "\u2006": " ",
        "\u2007": " ",
        "\u2008": " ",
        "\u2009": " ",
        "\u200a": " ",
        "\u202f": " ",
        "\u205f": " ",
        "\u3000": " ",
        "\u200b": "",
        "\u200c": "",
        "\u200d": "",
        "\ufeff": "",
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201b": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u201f": '"',
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2015": "-",
        "\u2212": "-",
        "\u2026": "...",
    }
)


def normalize_unicode(value: str) -> str:
    return unicodedata.normalize("NFKC", value).translate(_TRANSLATION)


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_text(value: str) -> str:
    text = normalize_unicode(str(value or "")).replace("`", "").lower()
    return collapse_whitespace(text)


def normalize_match_text(value: str) -> str:
    text = normalize_text(value)
    return re.sub(r"[^a-z0-9/_.()#+:@'-]+", " ", text).strip()


def normalize_section_text(value: str) -> str:
    text = normalize_text(value)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def term_in_normalized_text(term: str, normalized_text: str) -> bool:
    if not term or len(term) < 4:
        return False
    normalized_term = normalize_match_text(term)
    if len(normalized_term) < 4:
        return False
    return re.search(rf"(?<![a-z0-9]){re.escape(normalized_term)}(?![a-z0-9])", normalized_text) is not None
