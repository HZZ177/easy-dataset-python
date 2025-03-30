from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DatasetItemBase(BaseModel):
    question: str
    answer: str
    metadata: Optional[dict] = None


class DatasetItemCreate(DatasetItemBase):
    pass


class DatasetItem(DatasetItemBase):
    id: str
    dataset_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Dataset(DatasetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    items: List[DatasetItem] = []

    class Config:
        from_attributes = True
