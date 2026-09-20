import pytest

from app.models import CaseStatus, ExtractedField, FieldStatus
from app.services.ai_models import SemanticDecision, SemanticEquivalenceResult
from app.services.ai_service import AIResponseError, GroqRequestError
from app.services.comparison import compare_field
from app.services.document_pair import compare_document_pair_with_ai_fallback
from app.services.normalization import normalize_text


def text_field(name: str, value: str) -> ExtractedField:
    return ExtractedField(
        field=name,
        raw_value=value,
        normalized_value=normalize_text(value),
        confidence=1.0,
        evidence=f"{name}: {value}",
    )


def numeric_field(name: str, value: str) -> ExtractedField:
    return ExtractedField(
        field=name,
        raw_value=value,
        normalized_value=value,
        confidence=1.0,
        evidence=f"{name}: {value}",
    )


@pytest.mark.parametrize(
    ("si_value", "bl_value"),
    (
        ("PORT (BUSSAN,KOREA)", "PORT (BUSSAN)"),
        ("PORT KLANG", "PORT KLANG, MALAYSIA"),
    ),
)
def test_conservative_port_qualifiers_are_semantically_equivalent(
    si_value: str,
    bl_value: str,
) -> None:
    result = compare_field(
        "port_of_loading",
        text_field("port_of_loading", si_value),
        text_field("port_of_loading", bl_value),
    )

    assert result.status is FieldStatus.MATCH
    assert result.comparison_method == "SEMANTIC_RULE"
    assert result.equivalence_reason


@pytest.mark.parametrize(
    ("si_value", "bl_value"),
    (
        ("PORT KLANG", "PORT PENANG"),
        ("BUSAN", "INCHEON"),
        ("SINGAPORE", "PORT KLANG"),
    ),
)
def test_different_ports_remain_different(si_value: str, bl_value: str) -> None:
    result = compare_field(
        "port_of_discharge",
        text_field("port_of_discharge", si_value),
        text_field("port_of_discharge", bl_value),
    )

    assert result.status is FieldStatus.MISMATCH


def test_existing_company_punctuation_normalization_remains_match() -> None:
    result = compare_field(
        "shipper",
        text_field("shipper", "ACME SDN. BHD."),
        text_field("shipper", "acme sdn bhd"),
    )

    assert result.status is FieldStatus.MATCH
    assert result.comparison_method in {"EXACT", "NORMALIZED"}


def test_identical_values_keep_existing_match_path() -> None:
    result = compare_field(
        "consignee",
        text_field("consignee", "ACME IMPORT LTD"),
        text_field("consignee", "ACME IMPORT LTD"),
    )

    assert result.status is FieldStatus.MATCH


@pytest.mark.parametrize(
    ("field", "si_value", "bl_value"),
    (
        ("container_count", "2", "3"),
        ("gross_weight_kg", "25000", "25001"),
    ),
)
def test_numeric_differences_remain_deterministic_mismatches(
    field: str,
    si_value: str,
    bl_value: str,
) -> None:
    result = compare_field(
        field,
        numeric_field(field, si_value),
        numeric_field(field, bl_value),
    )

    assert result.status is FieldStatus.MISMATCH


def shipping_text(*, shipper: str = "ACME EXPORT LTD", containers: str = "2") -> bytes:
    return f"""Shipper: {shipper}
Consignee: ACME IMPORT LTD
Notify Party: ACME NOTIFY LTD
Port of Loading: PORT KLANG
Port of Discharge: CALLAO
Container Count: {containers}
Gross Weight (KG): 25000 KG
""".encode()


class FakeSemanticService:
    def __init__(self, decision: SemanticDecision | Exception) -> None:
        self.decision = decision
        self.calls: list[tuple[str, str, str]] = []

    async def compare_semantic(
        self,
        field: str,
        si_value: str,
        bl_value: str,
    ) -> SemanticEquivalenceResult:
        self.calls.append((field, si_value, bl_value))
        if isinstance(self.decision, Exception):
            raise self.decision
        return SemanticEquivalenceResult(
            decision=self.decision,
            canonical_value="acme export" if self.decision is SemanticDecision.EQUIVALENT else None,
            reason="Controlled semantic decision.",
        )


@pytest.mark.asyncio
async def test_semantic_ai_disabled_preserves_unresolved_text_mismatch() -> None:
    result = await compare_document_pair_with_ai_fallback(
        "si.txt",
        shipping_text(shipper="ACME EXPORTS SDN BHD"),
        "bl.txt",
        shipping_text(shipper="ACME EXPORT SDN BHD"),
    )

    assert result.status is CaseStatus.MISMATCH
    assert result.comparison[0].status is FieldStatus.MISMATCH


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("decision", "expected_status"),
    (
        (SemanticDecision.EQUIVALENT, FieldStatus.MATCH),
        (SemanticDecision.DIFFERENT, FieldStatus.MISMATCH),
        (SemanticDecision.UNCERTAIN, FieldStatus.MISMATCH),
    ),
)
async def test_semantic_ai_decisions_are_applied_safely(
    decision: SemanticDecision,
    expected_status: FieldStatus,
) -> None:
    service = FakeSemanticService(decision)
    result = await compare_document_pair_with_ai_fallback(
        "si.txt",
        shipping_text(shipper="ACME EXPORTS SDN BHD"),
        "bl.txt",
        shipping_text(shipper="ACME EXPORT SDN BHD"),
        semantic_ai_service=service,
    )

    assert result.comparison[0].status is expected_status
    if decision is SemanticDecision.EQUIVALENT:
        assert result.status is CaseStatus.MATCH
        assert result.comparison[0].comparison_method == "SEMANTIC_AI"
        assert result.comparison[0].equivalence_reason == "Controlled semantic decision."
        assert result.comparison[0].si.raw_value == "ACME EXPORTS SDN BHD"
        assert result.comparison[0].bl.raw_value == "ACME EXPORT SDN BHD"
    else:
        assert result.status is CaseStatus.MISMATCH


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "error",
    (
        GroqRequestError("rate limited or invalid key"),
        AIResponseError("malformed response"),
        TimeoutError("timed out"),
    ),
)
async def test_semantic_ai_error_preserves_mismatch_without_raising(error: Exception) -> None:
    service = FakeSemanticService(error)
    result = await compare_document_pair_with_ai_fallback(
        "si.txt",
        shipping_text(shipper="ACME EXPORTS SDN BHD"),
        "bl.txt",
        shipping_text(shipper="ACME EXPORT SDN BHD"),
        semantic_ai_service=service,
    )

    assert result.status is CaseStatus.MISMATCH
    assert result.comparison[0].status is FieldStatus.MISMATCH


@pytest.mark.asyncio
async def test_numeric_mismatches_are_never_sent_to_semantic_ai() -> None:
    service = FakeSemanticService(SemanticDecision.EQUIVALENT)
    result = await compare_document_pair_with_ai_fallback(
        "si.txt",
        shipping_text(containers="2"),
        "bl.txt",
        shipping_text(containers="3"),
        semantic_ai_service=service,
    )

    assert result.status is CaseStatus.MISMATCH
    assert result.comparison[5].status is FieldStatus.MISMATCH
    assert service.calls == []
