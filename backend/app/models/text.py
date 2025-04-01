from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class TextChunk(BaseModel):
    content: str
    start_index: int
    end_index: int
    metadata: Optional[Dict] = None


class TextBase(BaseModel):
    title: str
    project_id: str
    content: Optional[str] = None
    file_path: str
    file_size: Optional[int] = None
    total_chunks: Optional[int] = None
    chunks: Optional[List[TextChunk]] = None


class TextCreate(TextBase):
    pass


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class Text(TextBase):
    id: str
    created_at: datetime
    updated_at: datetime
    status: str = "active"

    class Config:
        from_attributes = True
