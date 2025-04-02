import os
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.schemas.text import Text, TextCreate, TextUpdate
from backend.app.models.database import Text as TextModel, Chunk as ChunkModel
from backend.app.core.config import settings
from backend.core.logger import logger


class TextService:
    @staticmethod
    async def save_uploaded_file(content: bytes, filename: str) -> str:
        """保存上传的文件"""
        file_id = str(uuid.uuid4())
        file_path = f"uploads/{file_id}.txt"
        full_path = os.path.join(settings.BASE_DIR, file_path)
        
        # 确保目录存在
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # 保存文件
        with open(full_path, "wb") as f:
            f.write(content)
            
        return file_path

    @staticmethod
    def split_text(text: str) -> List[dict]:
        """将文本分割成小块"""
        # 检查文本大小
        if len(text) > 10 * 1024 * 1024:  # 10MB
            raise ValueError("文本大小不能超过10MB")

        chunks = []
        start = 0
        max_iterations = 1000  # 防止无限循环
        iteration_count = 0

        while start < len(text):
            if iteration_count >= max_iterations:
                raise ValueError("文本分割次数过多，可能存在异常")

            # 计算当前块的结束位置
            end = min(start + settings.MAX_CHUNK_SIZE, len(text))
            
            # 创建当前块
            chunk = {
                "content": text[start:end],
                "start_index": start,
                "end_index": end,
                "metadata": {"length": end - start}
            }
            chunks.append(chunk)

            # 如果已经到达文本末尾，退出循环
            if end >= len(text):
                break

            # 更新起始位置，考虑重叠
            start = max(end - settings.CHUNK_OVERLAP, start + 1)
            iteration_count += 1

        return chunks

    @staticmethod
    async def create_text(db: Session, text_data: TextCreate) -> TextModel:
        """创建新的文本记录"""
        # 如果没有提供file_path，生成一个
        if not text_data.file_path:
            file_id = str(uuid.uuid4())
            text_data.file_path = f"uploads/{file_id}.txt"

        # 创建新的文本记录
        db_text = TextModel(
            id=str(uuid.uuid4()),
            title=text_data.title,
            project_id=text_data.project_id,
            content=text_data.content or "",  # 确保content字段不为None
            file_path=text_data.file_path,
            file_size=text_data.file_size or 0,
            total_chunks=text_data.total_chunks or 0,
            status="active",  # 添加状态字段
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(db_text)
        db.commit()
        db.refresh(db_text)

        # 创建分块记录
        if text_data.chunks:
            for chunk in text_data.chunks:
                db_chunk = ChunkModel(
                    id=str(uuid.uuid4()),
                    content=chunk.content,
                    start_index=chunk.start_index,
                    end_index=chunk.end_index,
                    chunk_metadata=chunk.metadata,
                    text_id=db_text.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(db_chunk)

            db.commit()

        return db_text

    @staticmethod
    async def get_text(db: Session, text_id: str) -> Optional[TextModel]:
        """获取文本记录"""
        return db.query(TextModel).filter(TextModel.id == text_id).first()

    @staticmethod
    async def get_text_chunks(db: Session, text_id: str) -> List[dict]:
        """获取文本的分块数据"""
        text = await TextService.get_text(db, text_id)
        if not text:
            raise ValueError("文本不存在")
        
        # 从数据库获取分块
        chunks = db.query(ChunkModel).filter(ChunkModel.text_id == text_id).all()
        return [
            {
                "content": chunk.content,
                "start_index": chunk.start_index,
                "end_index": chunk.end_index,
                "metadata": chunk.chunk_metadata
            }
            for chunk in chunks
        ]

    @staticmethod
    async def list_texts(db: Session, project_id: str) -> List[Text]:
        """获取项目下的所有文本"""
        db_texts = db.query(TextModel).filter(TextModel.project_id == project_id).all()
        return [Text.from_orm(text) for text in db_texts]

    @staticmethod
    async def get_text_count(db: Session, project_id: str) -> int:
        """获取项目下的文本数量"""
        return db.query(TextModel).filter(TextModel.project_id == project_id).count()

    @staticmethod
    async def delete_text(db: Session, text_id: str) -> bool:
        """删除文本记录"""
        db_text = db.query(TextModel).filter(TextModel.id == text_id).first()
        if not db_text:
            return False

        # 删除文件系统中的文件
        if os.path.exists(db_text.file_path):
            os.remove(db_text.file_path)

        # 删除关联的分块（通过级联删除自动处理）
        db.delete(db_text)
        db.commit()
        return True

    @staticmethod
    async def update_text(db: Session, text_id: str, text: TextUpdate) -> Optional[Text]:
        """更新文本记录"""
        db_text = db.query(TextModel).filter(TextModel.id == text_id).first()
        if not db_text:
            return None

        update_data = text.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_text, key, value)

        db_text.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_text)
        return Text.from_orm(db_text)
