from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class QuestionBase(BaseModel):
    content: str
    answer: str
    project_id: str = Field(..., description="项目ID")
    text_id: str = Field(..., description="文本ID")
    chunk_index: int
    metadata: Dict[str, Any] = Field(default_factory=dict)


class QuestionCreate(QuestionBase):
    pass


class Question(QuestionBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    status: str = "active"
    tags: List[str] = []

    class Config:
        from_attributes = True


class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    answer: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
