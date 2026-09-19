import re
from decimal import Decimal, InvalidOperation


def normalize_text(value: str) -> str:
    value = value.casefold().strip()
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


def normalize_party(value: str) -> str:
    return re.sub(r"\bfareast\b", "far east", normalize_text(value))


def weight_to_kg(value: str) -> Decimal | None:
    compact = value.upper().replace(",", "").strip()
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*(MT|TONNES?|TONS?|KG|KGS)?\b", compact)
    if not match:
        return None
    try:
        amount = Decimal(match.group(1))
    except InvalidOperation:
        return None
    unit = match.group(2) or "KG"
    if unit in {"MT", "TON", "TONS", "TONNE", "TONNES"}:
        amount *= 1000
    return amount


def normalize_decimal(value: Decimal) -> str:
    normalized = value.normalize()
    return format(normalized, "f")


def normalize_container_count(value: str) -> int | None:
    match = re.search(r"\d+", value.replace(",", ""))
    return int(match.group()) if match else None

