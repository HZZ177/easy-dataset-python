import os
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.schemas.text import Text, TextCreate, TextUpdate
from backend.app.models.database import Text as TextModel
from backend.app.core.config import settings


class TextService:
    @staticmethod
    async def save_uploaded_file(content: bytes, original_filename: str) -> str:
        """保存上传的文件"""
        # 确保上传目录存在
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # 生成唯一的文件名，保留原始扩展名
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(original_filename)[1]  # 获取原始文件的扩展名
        if not file_extension:  # 如果没有扩展名，默认使用.txt
            file_extension = ".txt"
        file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{file_extension}")

        # 保存文件
        with open(file_path, 'wb') as f:
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

            end = min(start + settings.MAX_CHUNK_SIZE, len(text))

            # 如果已经到达文本末尾
            if end == len(text):
                chunk = {
                    "content": text[start:end],
                    "start_index": start,
                    "end_index": end,
                    "metadata": {"length": end - start}
                }
                chunks.append(chunk)
                break

            # 尝试在句子边界分割
            sentence_endings = '.。!！?？\n'
            found_boundary = False

            # 向前查找最近的句子结束符
            for i in range(end, start, -1):
                if text[i - 1] in sentence_endings:
                    end = i
                    found_boundary = True
                    break

            # 如果没找到合适的边界，就在最大长度处分割
            if not found_boundary:
                end = min(start + settings.MAX_CHUNK_SIZE, len(text))

            chunk = {
                "content": text[start:end],
                "start_index": start,
                "end_index": end,
                "metadata": {"length": end - start}
            }
            chunks.append(chunk)

            # 更新起始位置，考虑重叠
            start = max(end - settings.CHUNK_OVERLAP, start + 1)
            iteration_count += 1

        return chunks

    @staticmethod
    async def create_text(db: Session, text_data: TextCreate) -> Text:
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
            chunks=text_data.chunks or [],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(db_text)
        db.commit()
        db.refresh(db_text)
        return db_text

    @staticmethod
    async def get_text(db: Session, text_id: str) -> Optional[TextModel]:
        """获取文本记录"""
        return db.query(TextModel).filter(TextModel.id == text_id).first()

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
