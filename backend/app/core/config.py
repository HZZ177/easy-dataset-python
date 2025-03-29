from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path


class Settings(BaseModel):
    # 基础配置
    PROJECT_NAME: str = "Easy Dataset"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # 文件存储配置
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    PROJECTS_DIR: Path = BASE_DIR / "projects"

    # AI模型配置
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    # 文本处理配置
    MAX_CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 确保必要的目录存在
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
