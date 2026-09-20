import hashlib
import json
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel

from app.models import (
    CaseRecord,
    CaseStatus,
    FieldComparison,
    FieldStatus,
    UploadComparisonResponse,
)
from app.reviews.models import (
    CreateHumanReviewRequest,
    EffectiveFieldValue,
    EffectiveSideValue,
    FieldReviewSummary,
    HumanReviewHistory,
    HumanReviewRecord,
    HumanReviewStatus,
    HumanReviewSummary,
    NewHumanReviewRecord,
    ReviewAction,
    ReviewScope,
    ReviewSide,
    ReviewTargetType,
    ShippingFieldName,
)
from app.reviews.store import HumanReviewStore


class HumanReviewError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class HumanReviewService:
    def __init__(
        self,
        store: HumanReviewStore,
        case_lookup: Callable[[str], CaseRecord | None],
        upload_lookup: Callable[[str], UploadComparisonResponse | None],
    ) -> None:
        self.store = store
        self.case_lookup = case_lookup
        self.upload_lookup = upload_lookup

    def create(
        self,
        target_type: ReviewTargetType,
        target_id: str,
        request: CreateHumanReviewRequest,
    ) -> HumanReviewRecord:
        target = self._resolve(target_type, target_id)
        self._validate_request(target, request)
        comparison = self._field_comparison(target, request.field)
        previous = self._latest_for_key(
            self.store.list(target_type, target_id),
            request.scope,
            request.field,
            request.side,
        )
        review_status = self._review_status(request.action, previous)

        now = datetime.now(UTC)
        si_value = self._raw_value(comparison, ReviewSide.SI)
        bl_value = self._raw_value(comparison, ReviewSide.BL)
        original_value = (
            self._raw_value(comparison, request.side)
            if request.side in {ReviewSide.SI, ReviewSide.BL}
            else None
        )
        carries_escalation = (
            request.action is ReviewAction.ADD_NOTE
            and previous is not None
            and previous.review_status is HumanReviewStatus.ESCALATED
        )
        is_escalated = (
            request.action is ReviewAction.ESCALATE or carries_escalation
        )
        record = NewHumanReviewRecord(
            review_id=uuid4(),
            target_type=target_type,
            target_id=target_id,
            scope=request.scope,
            field=request.field,
            side=request.side,
            action=request.action,
            automated_status=target.status,
            automated_field_status=(comparison.status if comparison else None),
            original_value=original_value,
            original_si_value=si_value,
            original_bl_value=bl_value,
            corrected_value=self._clean(request.corrected_value),
            review_status=review_status,
            note=self._clean(request.note),
            is_escalated=is_escalated,
            escalation_reason=(
                self._clean(request.escalation_reason)
                if request.action is ReviewAction.ESCALATE
                else previous.escalation_reason
                if carries_escalation
                else None
            ),
            escalated_at=(
                now
                if request.action is ReviewAction.ESCALATE
                else previous.escalated_at
                if carries_escalation
                else None
            ),
            automated_result_hash=self._result_hash(target),
            created_at=now,
        )
        return self.store.append(record)

    def history(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> HumanReviewHistory:
        self._resolve(target_type, target_id)
        return HumanReviewHistory(
            target_type=target_type,
            target_id=target_id,
            reviews=self.store.list(target_type, target_id),
        )

    def summary(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> HumanReviewSummary:
        target = self._resolve(target_type, target_id)
        records = self.store.list(target_type, target_id)
        latest = records[-1] if records else None
        active = self._latest_records_by_key(records)
        active_records = sorted(active.values(), key=lambda record: record.sequence)
        active_escalations = [
            record
            for record in active_records
            if record.review_status is HumanReviewStatus.ESCALATED
        ]
        latest_escalation = active_escalations[-1] if active_escalations else None
        case_records = [
            record for record in records if record.scope is ReviewScope.CASE
        ]
        field_reviews = [
            FieldReviewSummary(
                field=record.field,
                side=record.side,
                review_status=record.review_status,
                latest_review=record,
            )
            for record in active_records
            if record.scope is ReviewScope.FIELD
            and record.field is not None
            and record.side is not None
        ]
        return HumanReviewSummary(
            target_type=target_type,
            target_id=target_id,
            automated_status=target.status,
            review_status=self._aggregate_status(active_records),
            is_escalated=latest_escalation is not None,
            escalation_reason=(
                latest_escalation.escalation_reason if latest_escalation else None
            ),
            escalated_at=(
                latest_escalation.escalated_at if latest_escalation else None
            ),
            latest_review=latest,
            case_review=case_records[-1] if case_records else None,
            field_reviews=field_reviews,
            effective_values=self._effective_values(target, records, active),
            review_count=len(records),
        )

    def _validate_request(
        self,
        target: CaseRecord | UploadComparisonResponse,
        request: CreateHumanReviewRequest,
    ) -> None:
        if request.scope is ReviewScope.CASE:
            if request.field is not None:
                raise HumanReviewError(422, "Case-level review cannot specify a field.")
            if request.side is not None and request.action is not ReviewAction.UNREADABLE:
                raise HumanReviewError(
                    422,
                    "Case-level review cannot specify a side for this action.",
                )
        else:
            if request.field is None or request.side is None:
                raise HumanReviewError(
                    422,
                    "Field-level review requires a field and side.",
                )

        if request.action is ReviewAction.CORRECT:
            if request.scope is not ReviewScope.FIELD:
                raise HumanReviewError(422, "CORRECT requires field scope.")
            if request.side not in {ReviewSide.SI, ReviewSide.BL}:
                raise HumanReviewError(422, "CORRECT requires side SI or BL.")
            if not self._clean(request.corrected_value):
                raise HumanReviewError(422, "CORRECT requires corrected_value.")
        elif request.corrected_value is not None:
            raise HumanReviewError(422, "corrected_value is only valid for CORRECT.")

        if request.action is ReviewAction.ADD_NOTE and not self._clean(request.note):
            raise HumanReviewError(422, "ADD_NOTE requires a note.")

        if request.action is ReviewAction.RETRY:
            if target.status not in {CaseStatus.MISMATCH, CaseStatus.NEEDS_REVIEW}:
                raise HumanReviewError(
                    409,
                    "RETRY is only valid for MISMATCH or NEEDS_REVIEW.",
                )

        if request.action is ReviewAction.ESCALATE:
            if target.status not in {CaseStatus.MISMATCH, CaseStatus.NEEDS_REVIEW}:
                raise HumanReviewError(
                    409,
                    "ESCALATE is only valid for MISMATCH or NEEDS_REVIEW.",
                )
            if not self._clean(request.escalation_reason):
                raise HumanReviewError(422, "ESCALATE requires escalation_reason.")
        elif request.escalation_reason is not None:
            raise HumanReviewError(
                422,
                "escalation_reason is only valid for ESCALATE.",
            )

        if request.action is ReviewAction.EQUIVALENT:
            if request.scope is not ReviewScope.FIELD or request.side is not ReviewSide.BOTH:
                raise HumanReviewError(
                    422,
                    "EQUIVALENT requires field scope and side BOTH.",
                )
            comparison = self._field_comparison(target, request.field)
            if comparison is None or comparison.status is not FieldStatus.MISMATCH:
                raise HumanReviewError(
                    409,
                    "EQUIVALENT requires an existing field-level mismatch.",
                )

        if request.action is ReviewAction.UNREADABLE:
            if request.side not in {ReviewSide.SI, ReviewSide.BL}:
                raise HumanReviewError(422, "UNREADABLE requires side SI or BL.")
            if isinstance(target, CaseRecord):
                attachment = (
                    target.si_attachment
                    if request.side is ReviewSide.SI
                    else target.bl_attachment
                )
                if attachment is None:
                    raise HumanReviewError(
                        409,
                        "UNREADABLE requires an existing attachment for the selected side.",
                    )
            if request.scope is ReviewScope.CASE and not self._clean(request.note):
                raise HumanReviewError(
                    422,
                    "Case-level UNREADABLE requires a note.",
                )

    @staticmethod
    def _review_status(
        action: ReviewAction,
        previous: HumanReviewRecord | None,
    ) -> HumanReviewStatus:
        if action is ReviewAction.ADD_NOTE:
            return (
                previous.review_status
                if previous is not None
                else HumanReviewStatus.IN_REVIEW
            )
        return {
            ReviewAction.CONFIRM: HumanReviewStatus.CONFIRMED,
            ReviewAction.CORRECT: HumanReviewStatus.CORRECTED,
            ReviewAction.EQUIVALENT: HumanReviewStatus.ACCEPTED_EQUIVALENT,
            ReviewAction.UNREADABLE: HumanReviewStatus.UNREADABLE,
            ReviewAction.RETRY: HumanReviewStatus.RETRY_REQUESTED,
            ReviewAction.ESCALATE: HumanReviewStatus.ESCALATED,
        }[action]

    @staticmethod
    def _clean(value: str | None) -> str | None:
        cleaned = value.strip() if value is not None else None
        return cleaned or None

    @staticmethod
    def _field_comparison(
        target: CaseRecord | UploadComparisonResponse,
        field: ShippingFieldName | None,
    ) -> FieldComparison | None:
        if field is None:
            return None
        return next(
            (item for item in target.comparison if item.field == field.value),
            None,
        )

    @staticmethod
    def _raw_value(
        comparison: FieldComparison | None,
        side: ReviewSide | None,
    ) -> str | None:
        if comparison is None:
            return None
        extracted = comparison.si if side is ReviewSide.SI else comparison.bl
        return extracted.raw_value if extracted is not None else None

    @staticmethod
    def _record_key(
        record: HumanReviewRecord,
    ) -> tuple[ReviewScope, ShippingFieldName | None, ReviewSide | None]:
        return record.scope, record.field, record.side

    @classmethod
    def _latest_for_key(
        cls,
        records: list[HumanReviewRecord],
        scope: ReviewScope,
        field: ShippingFieldName | None,
        side: ReviewSide | None,
    ) -> HumanReviewRecord | None:
        key = (scope, field, side)
        return next(
            (record for record in reversed(records) if cls._record_key(record) == key),
            None,
        )

    @classmethod
    def _latest_records_by_key(
        cls,
        records: list[HumanReviewRecord],
    ) -> dict[
        tuple[ReviewScope, ShippingFieldName | None, ReviewSide | None],
        HumanReviewRecord,
    ]:
        latest = {}
        for record in records:
            latest[cls._record_key(record)] = record
        return latest

    @staticmethod
    def _aggregate_status(
        active_records: list[HumanReviewRecord],
    ) -> HumanReviewStatus:
        if not active_records:
            return HumanReviewStatus.PENDING
        statuses = {record.review_status for record in active_records}
        if HumanReviewStatus.ESCALATED in statuses:
            return HumanReviewStatus.ESCALATED
        if HumanReviewStatus.RETRY_REQUESTED in statuses:
            return HumanReviewStatus.RETRY_REQUESTED
        if len(statuses) == 1:
            return next(iter(statuses))
        return HumanReviewStatus.IN_REVIEW

    def _resolve(
        self,
        target_type: ReviewTargetType,
        target_id: str,
    ) -> CaseRecord | UploadComparisonResponse:
        target = (
            self.case_lookup(target_id)
            if target_type is ReviewTargetType.COMPETITION_CASE
            else self.upload_lookup(target_id)
        )
        if target is None:
            raise HumanReviewError(404, "Review target not found.")
        if target.status is CaseStatus.FAILED:
            raise HumanReviewError(409, "FAILED targets are not reviewable.")
        return target

    @staticmethod
    def _result_hash(target: BaseModel) -> str:
        encoded = json.dumps(
            target.model_dump(mode="json"),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
        return hashlib.sha256(encoded).hexdigest()

    @staticmethod
    def _effective_values(
        target: CaseRecord | UploadComparisonResponse,
        records: list[HumanReviewRecord],
        active: dict[
            tuple[ReviewScope, ShippingFieldName | None, ReviewSide | None],
            HumanReviewRecord,
        ],
    ) -> dict[ShippingFieldName, EffectiveFieldValue]:
        corrections: dict[tuple[ShippingFieldName, ReviewSide], str] = {}
        for record in records:
            if (
                record.action is ReviewAction.CORRECT
                and record.field is not None
                and record.side in {ReviewSide.SI, ReviewSide.BL}
                and record.corrected_value is not None
            ):
                corrections[(record.field, record.side)] = record.corrected_value

        values: dict[ShippingFieldName, EffectiveFieldValue] = {}
        for field in ShippingFieldName:
            si_field = getattr(target.si_fields, field.value) if target.si_fields else None
            bl_field = getattr(target.bl_fields, field.value) if target.bl_fields else None
            si_value = si_field.raw_value if si_field else None
            bl_value = bl_field.raw_value if bl_field else None
            reviewed_si = corrections.get((field, ReviewSide.SI))
            reviewed_bl = corrections.get((field, ReviewSide.BL))
            equivalent_record = active.get(
                (ReviewScope.FIELD, field, ReviewSide.BOTH)
            )
            values[field] = EffectiveFieldValue(
                si=EffectiveSideValue(
                    automated_value=si_value,
                    reviewed_value=reviewed_si,
                    effective_value=reviewed_si if reviewed_si is not None else si_value,
                ),
                bl=EffectiveSideValue(
                    automated_value=bl_value,
                    reviewed_value=reviewed_bl,
                    effective_value=reviewed_bl if reviewed_bl is not None else bl_value,
                ),
                accepted_equivalent=(
                    equivalent_record is not None
                    and equivalent_record.review_status
                    is HumanReviewStatus.ACCEPTED_EQUIVALENT
                ),
            )
        return values
