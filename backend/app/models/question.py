from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class QuestionBase(BaseModel):
    content: str
    project_id: str
    text_id: str
    chunk_index: int
    metadata: Optional[dict] = None


class QuestionCreate(QuestionBase):
    pass


class Question(QuestionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    answer: Optional[str] = None
    status: str = "active"
    tags: List[str] = []

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }


class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    answer: Optional[str] = None
    metadata: Optional[dict] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
