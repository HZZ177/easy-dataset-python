from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class DatasetItem(BaseModel):
    question: str
    answer: str
    metadata: Dict[str, Any]
    chunk_index: Optional[int] = None


class DatasetBase(BaseModel):
    name: str
    project_id: str
    description: Optional[str] = None
    metadata: Optional[Dict] = None
    chunk_index: Optional[int] = None


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


class ChunkDatasetResponse(BaseModel):
    chunk_content: str
    datasets: List[Dataset]

    class Config:
        from_attributes = True
