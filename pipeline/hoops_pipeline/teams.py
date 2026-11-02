"""Team abbreviations (ESPN -> standard) and conferences."""

from __future__ import annotations

# ESPN uses a few short forms. Everything published uses the standard ones.
ESPN_TO_STANDARD = {
    "GS": "GSW",
    "NY": "NYK",
    "SA": "SAS",
    "NO": "NOP",
    "UTAH": "UTA",
    "WSH": "WAS",
}

CONFERENCE = {
    **{t: "East" for t in (
        "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND",
        "MIA", "MIL", "NYK", "ORL", "PHI", "TOR", "WAS",
    )},
    **{t: "West" for t in (
        "DAL", "DEN", "GSW", "HOU", "LAC", "LAL", "MEM", "MIN",
        "NOP", "OKC", "PHX", "POR", "SAC", "SAS", "UTA",
    )},
}


def standard_abbr(espn_abbr: str | None) -> str:
    if not espn_abbr:
        return ""
    abbr = espn_abbr.upper()
    return ESPN_TO_STANDARD.get(abbr, abbr)
