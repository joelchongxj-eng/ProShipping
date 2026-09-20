import hashlib
import json

from pydantic import BaseModel


def automated_result_hash(result: BaseModel) -> str:
    encoded = json.dumps(
        result.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode()
    return hashlib.sha256(encoded).hexdigest()
