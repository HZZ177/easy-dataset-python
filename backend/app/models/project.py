from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ProjectBase(BaseModel):
    name: str
    description: str = ""
    model_config: Optional[dict] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    description: Optional[str] = None


class Project(ProjectBase):
    id: str
    created_at: str
    updated_at: str
    status: str = "active"
    texts: List[str] = []
    questions: List[str] = []
    datasets: List[str] = []
    text_count: Optional[int] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model_config: Optional[dict] = None
    status: Optional[str] = None
