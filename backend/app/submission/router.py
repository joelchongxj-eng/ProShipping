from uuid import UUID

from fastapi import APIRouter, HTTPException, Response

from app.submission.models import (
    SubmissionChannel,
    SubmissionDispatch,
    SubmissionWorkflowResponse,
)
from app.submission.service import SubmissionWorkflowError, SubmissionWorkflowService


def create_submission_workflow_router(
    service: SubmissionWorkflowService,
) -> APIRouter:
    router = APIRouter()

    def guarded(call):
        try:
            return call()
        except SubmissionWorkflowError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    async def guarded_async(call):
        try:
            return await call()
        except SubmissionWorkflowError as exc:
            raise HTTPException(exc.status_code, exc.detail) from exc

    @router.get("/api/submission-workflow", response_model=SubmissionWorkflowResponse)
    def get_submission_workflow() -> SubmissionWorkflowResponse:
        return service.aggregate()

    @router.delete(
        "/api/submission-workflow/supervisor/{target_id}",
        status_code=204,
    )
    def remove_supervisor_item(target_id: str) -> Response:
        guarded(lambda: service.remove(SubmissionChannel.SUPERVISOR, target_id))
        return Response(status_code=204)

    @router.delete(
        "/api/submission-workflow/sender/{target_id}",
        status_code=204,
    )
    def remove_sender_item(target_id: str) -> Response:
        guarded(lambda: service.remove(SubmissionChannel.SENDER, target_id))
        return Response(status_code=204)

    @router.post(
        "/api/submission/supervisor/submit",
        response_model=SubmissionDispatch,
    )
    async def submit_supervisor() -> SubmissionDispatch:
        return await guarded_async(service.supervisor_submit)

    @router.post(
        "/api/submission/supervisor/update",
        response_model=SubmissionDispatch,
    )
    async def update_supervisor() -> SubmissionDispatch:
        return await guarded_async(service.supervisor_update)

    @router.post(
        "/api/submission/sender/send",
        response_model=SubmissionDispatch,
    )
    async def send_sender_follow_up() -> SubmissionDispatch:
        return await guarded_async(service.sender_send)

    @router.post(
        "/api/submission/sender/update",
        response_model=SubmissionDispatch,
    )
    async def update_sender_follow_up() -> SubmissionDispatch:
        return await guarded_async(service.sender_update)

    @router.post(
        "/api/submission/dispatches/{dispatch_id}/resend",
        response_model=SubmissionDispatch,
    )
    async def resend_dispatch(dispatch_id: UUID) -> SubmissionDispatch:
        return await guarded_async(lambda: service.resend(dispatch_id))

    return router
