from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class DatasetItem(BaseModel):
    question: str
    answer: str
    metadata: Optional[Dict] = None


class DatasetBase(BaseModel):
    name: str
    project_id: str
    description: Optional[str] = None
    metadata: Optional[Dict] = None


class DatasetCreate(DatasetBase):
    question_ids: List[str]


class Dataset(DatasetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    items: List[DatasetItem] = []
    status: str = "active"
    format: str = "json"

    class Config:
        from_attributes = True


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict] = None
    status: Optional[str] = None
    format: Optional[str] = None
