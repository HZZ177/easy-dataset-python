from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TextBase(BaseModel):
    title: str
    content: str
    project_id: str


class TextCreate(TextBase):
    pass


class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class Text(TextBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 