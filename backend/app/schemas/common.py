from pydantic import BaseModel


class BulkIdsRequest(BaseModel):
    ids: list[int]
    force: bool = False


class BulkStatusRequest(BaseModel):
    ids: list[int]
    is_active: bool


class BulkActionSkipped(BaseModel):
    id: int
    reason: str


class BulkActionResult(BaseModel):
    deleted: list[int]
    skipped: list[BulkActionSkipped]


class BulkStatusResult(BaseModel):
    updated: int
