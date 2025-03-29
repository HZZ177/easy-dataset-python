from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TextChunk(BaseModel):
    content: str
    start_index: int
    end_index: int
    metadata: Optional[dict] = None


class TextBase(BaseModel):
    title: str
    content: str
    project_id: str
    file_path: Optional[str] = None
    metadata: Optional[dict] = None


class TextCreate(TextBase):
    pass


class Text(TextBase):
    id: str
    created_at: datetime
    updated_at: datetime
    chunks: List[TextChunk] = []
    status: str = "active"

    class Config:
        from_attributes = True


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[dict] = None
    status: Optional[str] = None
