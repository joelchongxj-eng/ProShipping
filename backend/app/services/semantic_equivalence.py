import re
from dataclasses import dataclass

from app.services.normalization import normalize_text


SEMANTIC_TEXT_FIELDS = frozenset(
    {
        "shipper",
        "consignee",
        "notify_party",
        "port_of_loading",
        "port_of_discharge",
    }
)
PORT_FIELDS = frozenset({"port_of_loading", "port_of_discharge"})

# Qualifiers are deliberately explicit.  This is not a general substring or
# fuzzy-location matcher: an unknown suffix leaves the comparison unresolved.
_COUNTRY_QUALIFIERS = frozenset(
    {
        "korea",
        "south korea",
        "republic of korea",
        "kr",
        "kor",
        "malaysia",
        "my",
        "mys",
    }
)
_PORT_WRAPPER = re.compile(r"^\s*port\s*\(([^()]*)\)\s*$", re.IGNORECASE)
_LEADING_PORT = re.compile(r"^\s*port\b\s*", re.IGNORECASE)


@dataclass(frozen=True)
class DeterministicEquivalence:
    equivalent: bool
    canonical_value: str | None = None
    reason: str | None = None


def _canonical_port(value: str) -> str | None:
    wrapper = _PORT_WRAPPER.fullmatch(value)
    candidate = wrapper.group(1) if wrapper else value
    candidate = _LEADING_PORT.sub("", candidate, count=1).strip()
    parts = [part.strip() for part in candidate.split(",")]
    if len(parts) > 2:
        return None
    if len(parts) == 2:
        qualifier = normalize_text(parts[1])
        if qualifier not in _COUNTRY_QUALIFIERS:
            return None
        candidate = parts[0]
    canonical = normalize_text(candidate)
    return canonical or None


def deterministic_equivalence(field: str, left: str, right: str) -> DeterministicEquivalence:
    if field not in PORT_FIELDS:
        return DeterministicEquivalence(equivalent=False)
    left_port = _canonical_port(left)
    right_port = _canonical_port(right)
    if left_port is None or right_port is None or left_port != right_port:
        return DeterministicEquivalence(equivalent=False)
    return DeterministicEquivalence(
        equivalent=True,
        canonical_value=left_port,
        reason="Port values share the same principal location after removing a safe wrapper or country qualifier.",
    )
