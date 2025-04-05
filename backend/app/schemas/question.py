from pydantic import BaseModel
from typing import List, Optional, Union
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

    class Config:
        from_attributes = True


class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    answer: Optional[str] = None
    metadata: Optional[dict] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class QuestionGenerationResponse(BaseModel):
    success: bool
    questions: List[Question] | None = None
    error: str | None = None


class AnswerGenerationResponse(BaseModel):
    success: bool
    question: Question | None = None
    error: str | None = None


class BatchDeleteRequest(BaseModel):
    question_ids: List[str]
