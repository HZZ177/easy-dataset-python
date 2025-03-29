from typing import List, Optional
import uuid
from datetime import datetime
from pathlib import Path
import aiofiles
from backend.app.core.config import settings
from backend.app.core.database import db
from backend.app.models.text import Text, TextCreate, TextChunk


class TextService:
    @staticmethod
    async def save_uploaded_file(file_content: bytes, filename: str) -> str:
        """保存上传的文件"""
        file_path = settings.UPLOAD_DIR / filename
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        return str(file_path)

    @staticmethod
    def split_text(text: str) -> List[TextChunk]:
        """将文本分割成小块"""
        chunks = []
        start = 0
        while start < len(text):
            end = start + settings.MAX_CHUNK_SIZE
            if end > len(text):
                end = len(text)

            # 尝试在句子边界分割
            if end < len(text):
                while end > start and text[end] not in '.。!！?？\n':
                    end -= 1
                if end == start:
                    end = start + settings.MAX_CHUNK_SIZE

            chunk = TextChunk(
                content=text[start:end],
                start_index=start,
                end_index=end,
                metadata={"length": end - start}
            )
            chunks.append(chunk)
            start = end - settings.CHUNK_OVERLAP

        return chunks

    @staticmethod
    async def create_text(text_data: TextCreate) -> Text:
        """创建新的文本记录"""
        text_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # 分割文本
        chunks = TextService.split_text(text_data.content)

        text = Text(
            id=text_id,
            **text_data.dict(),
            created_at=now,
            updated_at=now,
            chunks=chunks
        )

        # 保存到数据库
        db.write_json(f"texts/{text_id}.json", text.dict())
        return text

    @staticmethod
    async def get_text(text_id: str) -> Optional[Text]:
        """获取文本记录"""
        data = db.read_json(f"texts/{text_id}.json")
        if not data:
            return None
        return Text(**data)

    @staticmethod
    async def update_text(text_id: str, text_data: dict) -> Optional[Text]:
        """更新文本记录"""
        text = await TextService.get_text(text_id)
        if not text:
            return None

        for key, value in text_data.items():
            if hasattr(text, key):
                setattr(text, key, value)

        text.updated_at = datetime.utcnow()
        db.write_json(f"texts/{text_id}.json", text.dict())
        return text

    @staticmethod
    async def delete_text(text_id: str) -> bool:
        """删除文本记录"""
        return db.delete_file(f"texts/{text_id}.json")

    @staticmethod
    async def list_texts(project_id: str) -> List[Text]:
        """获取项目下的所有文本"""
        texts = []
        for filename in db.list_files("texts/*.json"):
            data = db.read_json(filename)
            if data.get("project_id") == project_id:
                texts.append(Text(**data))
        return texts
