from app.models import CaseStatus, EmailCategory, EmailRecord
from app.services.processor import CaseProcessor

from tests.test_extractor import BL_TEXT, SI_TEXT


class FakeInbox:
    def __init__(self) -> None:
        self.email = EmailRecord(
            email_id="email_001",
            **{"from": "shipping@example.com"},
            subject="Please confirm SI and draft BL",
            body="Attached for checking.",
            attachments=["attachments/email_001_SI.txt", "attachments/email_001_BL.txt"],
        )

    async def list_emails(self) -> list[EmailRecord]:
        return [self.email]

    async def get_attachment(self, path: str) -> bytes:
        return SI_TEXT.encode() if "_SI." in path else BL_TEXT.encode()


async def test_processor_builds_a_complete_matching_case() -> None:
    processor = CaseProcessor(FakeInbox())
    cases = await processor.process_all()

    case = cases[0]
    assert case.category is EmailCategory.BL_COMPARISON
    assert case.status is CaseStatus.MATCH
    assert len(case.comparison) == 7

