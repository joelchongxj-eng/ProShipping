from decimal import Decimal

from app.services.normalization import normalize_container_count, normalize_text, weight_to_kg


def test_normalize_text_ignores_case_punctuation_and_whitespace() -> None:
    assert normalize_text("  Port-Klang, MALAYSIA ") == "port klang malaysia"


def test_weight_mt_is_converted_to_kg() -> None:
    assert weight_to_kg("22 MT") == Decimal("22000")
    assert weight_to_kg("22,000 KG") == Decimal("22000")


def test_container_count_extracts_leading_count() -> None:
    assert normalize_container_count("1 x 40'HC") == 1

