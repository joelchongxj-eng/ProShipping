"""Run AI extraction and comparison for one local SI/BL pair."""

import argparse
import asyncio
from pathlib import Path

from app.services.ai_models import DocumentType
from app.services.ai_service import AIService
from app.services.comparison import compare_documents
from app.services.document_text import attachment_text


async def evaluate_pair(si_path: Path, bl_path: Path, service: AIService) -> str:
    si_text = attachment_text(si_path.read_bytes(), si_path.name)
    bl_text = attachment_text(bl_path.read_bytes(), bl_path.name)
    si = await service.extract_text(si_text, si_path.name)
    bl = await service.extract_text(bl_text, bl_path.name)
    if si.document_type is not DocumentType.SI or bl.document_type is not DocumentType.BL:
        return f"SI: {si.document_type}; BL: {bl.document_type}\nOverall: NEEDS_REVIEW (wrong document type)"
    result = compare_documents(si.fields, bl.fields)
    lines = [f"SI: {si.document_type}; BL: {bl.document_type}", f"Overall: {result.status}"]
    for item in result.fields:
        values = ""
        if item.si is not None and item.bl is not None:
            values = f" (SI={item.si.normalized_value}, BL={item.bl.normalized_value})"
        lines.append(f"{item.field}: {item.status}{values}")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare one local SI/BL TXT or PDF pair with Groq")
    parser.add_argument("si", type=Path, help="Path to the SI file")
    parser.add_argument("bl", type=Path, help="Path to the draft BL file")
    args = parser.parse_args()
    print(asyncio.run(evaluate_pair(args.si, args.bl, AIService())))


if __name__ == "__main__":
    main()
