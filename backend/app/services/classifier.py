import re
from pathlib import PurePosixPath

from app.models import EmailCategory, EmailRecord


def _attachment_has_token(path: str, token: str) -> bool:
    stem = PurePosixPath(path).stem
    return bool(re.search(rf"(?:^|[_\-\s]){token}(?:$|[_\-\s])", stem, flags=re.IGNORECASE))


def classify_email(email: EmailRecord) -> EmailCategory:
    has_si = any(_attachment_has_token(path, "SI") for path in email.attachments)
    has_bl = any(_attachment_has_token(path, "BL") for path in email.attachments)
    combined = f"{email.subject}\n{email.body}".casefold()

    comparison_terms = (
        "confirm docs",
        "request bl draft",
        "draft bl",
        "check si and bl",
        "compare si and bl",
    )
    si_subject = email.subject.casefold()
    si_request_terms = (
        "request si",
        "si needed",
        "submit si",
        "cust si",
        "shipping instruction",
    )
    si_operational_pattern = re.search(r"(?:^|re[_:\s-]+)si\s*[-_]", si_subject)

    if (has_si and has_bl) or any(term in si_subject for term in comparison_terms):
        return EmailCategory.BL_COMPARISON
    if any(term in combined for term in si_request_terms) or si_operational_pattern:
        return EmailCategory.SI_REQUEST
    if any(
        term in combined
        for term in (
            "weird trick",
            "lottery",
            "prize winner",
            "free crypto",
            "claim your reward",
            "urgent business proposal",
            "guaranteed investment",
        )
    ):
        return EmailCategory.SPAM
    if any(
        term in combined
        for term in (
            "invoice",
            "billing",
            "payment query",
            "local charges",
            "total freight",
            "d & d charges",
            "missing gr",
        )
    ):
        return EmailCategory.INVOICE_QUERY
    return EmailCategory.GENERAL
