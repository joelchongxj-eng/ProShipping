from app.models import EmailCategory, EmailRecord
from app.services.classifier import classify_email


def make_email(subject: str, body: str = "", attachments: list[str] | None = None) -> EmailRecord:
    return EmailRecord(
        email_id="email_test",
        **{"from": "sender@example.com"},
        subject=subject,
        body=body,
        attachments=attachments or [],
    )


def test_si_and_bl_attachments_are_a_comparison() -> None:
    email = make_email(
        "Please confirm documents",
        attachments=["attachments/case_SI.txt", "attachments/case_BL.txt"],
    )
    assert classify_email(email) is EmailCategory.BL_COMPARISON


def test_invoice_subject_is_an_invoice_query() -> None:
    assert classify_email(make_email("Invoice payment question")) is EmailCategory.INVOICE_QUERY


def test_comparison_subject_is_detected_even_when_attachment_is_missing() -> None:
    assert classify_email(make_email("RE: TO CONFIRM DOCS _ 5AAT-03056")) is EmailCategory.BL_COMPARISON
    assert classify_email(make_email("REQUEST BL DRAFT _ PO 26067")) is EmailCategory.BL_COMPARISON


def test_operational_si_subject_is_an_si_request() -> None:
    assert classify_email(make_email("RE: SI NEEDED_ 5APH-26773")) is EmailCategory.SI_REQUEST
    assert classify_email(make_email("SI - OOLU5310033092 - DIRECT(OOCL)")) is EmailCategory.SI_REQUEST


def test_obvious_marketing_message_is_spam() -> None:
    assert classify_email(make_email("Increase your shipping revenue with this ONE weird trick")) is EmailCategory.SPAM
