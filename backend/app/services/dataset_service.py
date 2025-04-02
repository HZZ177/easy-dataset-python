from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models.dataset import Dataset, DatasetCreate, ChunkDatasetResponse
from ..models.database import Dataset as DatasetModel, DatasetItem as DatasetItemModel, Text as TextModel, Chunk as ChunkModel
from ..services.question_service import QuestionService
import uuid
from datetime import datetime
from crewai import Agent, Task, Crew
from ..core.config import settings
from ..services.text_service import TextService


class DatasetService:
    @staticmethod
    def create_answer_generator_agent() -> Agent:
        """创建答案生成Agent"""
        return Agent(
            role='答案生成专家',
            goal='根据问题生成准确、详细的答案',
            backstory="""你是一个专业的答案生成专家，擅长根据问题生成准确、详细的答案。
            你会确保答案准确、完整，并且易于理解。""",
            verbose=True,
            allow_delegation=False
        )

    @staticmethod
    def create_answer_task(agent: Agent, question: str) -> Task:
        """创建答案生成任务"""
        return Task(
            description=f"""请根据以下问题生成详细、准确的答案：
            
            问题：
            {question}
            
            要求：
            1. 答案应该准确、完整
            2. 答案应该结构清晰、易于理解
            3. 答案应该包含必要的解释和说明
            4. 答案应该使用恰当的语言和表达方式
            5. 答案应该避免过于简单或过于复杂
            
            请以JSON格式返回答案，包含：
            - answer: 答案内容
            - explanation: 解释说明
            - references: 参考来源（如果有）
            """,
            agent=agent
        )

    @staticmethod
    async def create_dataset(db: Session, dataset_data: DatasetCreate) -> Dataset:
        """创建新的数据集"""
        db_dataset = DatasetModel(
            id=str(uuid.uuid4()),
            name=dataset_data.name,
            description=dataset_data.description,
            project_id=dataset_data.project_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)

        return Dataset(
            id=db_dataset.id,
            name=db_dataset.name,
            description=db_dataset.description,
            project_id=db_dataset.project_id,
            created_at=db_dataset.created_at.isoformat(),
            updated_at=db_dataset.updated_at.isoformat(),
            items=[]
        )

    @staticmethod
    async def get_dataset(db: Session, dataset_id: str) -> Optional[Dataset]:
        """获取数据集详情"""
        db_dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not db_dataset:
            return None

        # 获取数据集项
        db_items = db.query(DatasetItemModel).filter(DatasetItemModel.dataset_id == dataset_id).all()
        items = [
            {
                "question": item.question,
                "answer": item.answer,
                "metadata": item.item_metadata
            }
            for item in db_items
        ]

        return Dataset(
            id=db_dataset.id,
            name=db_dataset.name,
            description=db_dataset.description,
            project_id=db_dataset.project_id,
            created_at=db_dataset.created_at.isoformat(),
            updated_at=db_dataset.updated_at.isoformat(),
            items=items
        )

    @staticmethod
    async def list_datasets(db: Session, project_id: str) -> List[Dataset]:
        """获取项目下的所有数据集"""
        db_datasets = db.query(DatasetModel).filter(DatasetModel.project_id == project_id).all()
        datasets = []

        for db_dataset in db_datasets:
            # 获取数据集项
            db_items = db.query(DatasetItemModel).filter(DatasetItemModel.dataset_id == db_dataset.id).all()
            items = [
                {
                    "question": item.question,
                    "answer": item.answer,
                    "metadata": item.item_metadata
                }
                for item in db_items
            ]

            datasets.append(Dataset(
                id=db_dataset.id,
                name=db_dataset.name,
                description=db_dataset.description,
                project_id=db_dataset.project_id,
                created_at=db_dataset.created_at.isoformat(),
                updated_at=db_dataset.updated_at.isoformat(),
                items=items
            ))

        return datasets

    @staticmethod
    async def delete_dataset(db: Session, dataset_id: str) -> bool:
        """删除数据集"""
        db_dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not db_dataset:
            return False

        # 删除数据集项
        db.query(DatasetItemModel).filter(DatasetItemModel.dataset_id == dataset_id).delete()

        # 删除数据集
        db.delete(db_dataset)
        db.commit()
        return True

    @staticmethod
    async def generate_dataset(db: Session, dataset_data: DatasetCreate) -> Dataset:
        """生成数据集"""
        # 创建数据集
        dataset = await DatasetService.create_dataset(db, dataset_data)

        # 获取所有问题
        questions = await QuestionService.list_questions(db, dataset_data.project_id)

        # 创建数据集项
        for question in questions:
            db_item = DatasetItemModel(
                id=str(uuid.uuid4()),
                dataset_id=dataset.id,
                question=question.content,
                answer=question.answer,
                item_metadata=question.metadata,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(db_item)

        db.commit()

        # 返回完整的数据集
        return await DatasetService.get_dataset(db, dataset.id)

    @staticmethod
    async def export_dataset(db: Session, dataset_id: str) -> dict:
        """导出数据集"""
        dataset = await DatasetService.get_dataset(db, dataset_id)
        if not dataset:
            return None

        return {
            "name": dataset.name,
            "description": dataset.description,
            "items": dataset.items
        }

    @staticmethod
    async def generate_dataset_from_text(db: Session, text_id: str, project_id: str) -> Dataset:
        """从文本生成数据集"""
        # 获取文本内容
        text = await TextService.get_text(db, text_id)
        if not text:
            raise ValueError("文本不存在")

        # 创建数据集
        dataset_data = DatasetCreate(
            name=f"从文本生成的数据集 - {text.title}",
            description=f"基于文本 '{text.title}' 自动生成的数据集",
            project_id=project_id,
            question_ids=[]  # 暂时为空，后续会添加问题ID
        )
        dataset = await DatasetService.create_dataset(db, dataset_data)

        # 生成问题
        questions = await QuestionService.generate_questions(db, text)
        
        # 创建数据集项
        for question in questions:
            db_item = DatasetItemModel(
                id=str(uuid.uuid4()),
                dataset_id=dataset.id,
                question=question.content,
                answer=question.answer,
                item_metadata=question.metadata,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(db_item)

        db.commit()

        # 返回完整的数据集
        return await DatasetService.get_dataset(db, dataset.id)

    @staticmethod
    async def list_chunk_datasets(db: Session, project_id: str, chunk_index: int) -> ChunkDatasetResponse:
        """获取特定分块的数据集列表"""
        # 获取项目下的所有文本
        texts = db.query(TextModel).filter(TextModel.project_id == project_id).all()
        if not texts:
            return ChunkDatasetResponse(
                chunk_content="",
                datasets=[]
            )

        # 获取第一个文本的指定分块内容
        text = texts[0]
        chunks = db.query(ChunkModel).filter(ChunkModel.text_id == text.id).all()
        if not chunks or chunk_index >= len(chunks):
            return ChunkDatasetResponse(
                chunk_content="",
                datasets=[]
            )

        chunk = chunks[chunk_index]
        chunk_content = chunk.content

        # 获取该分块的所有数据集
        datasets = db.query(DatasetModel).filter(
            DatasetModel.project_id == project_id,
            DatasetModel.chunk_index == chunk_index
        ).all()

        return ChunkDatasetResponse(
            chunk_content=chunk_content,
            datasets=[Dataset.from_orm(dataset) for dataset in datasets]
        )

    @staticmethod
    async def generate_dataset_from_chunk(db: Session, text_id: str, chunk_index: int, project_id: str) -> Dataset:
        """从特定分块生成数据集"""
        # 获取文本内容
        text = await TextService.get_text(db, text_id)
        if not text:
            raise ValueError("文本不存在")
        
        if not text.chunks or chunk_index >= len(text.chunks):
            raise ValueError("分块不存在")

        # 获取指定分块
        chunk = text.chunks[chunk_index]

        # 创建数据集
        dataset_data = DatasetCreate(
            name=f"从文本生成的数据集 - {text.title} (分块 {chunk_index + 1})",
            description=f"基于文本 '{text.title}' 的第 {chunk_index + 1} 个分块自动生成的数据集",
            project_id=project_id,
            chunk_index=chunk_index,
            question_ids=[]  # 暂时为空，后续会添加问题ID
        )
        dataset = await DatasetService.create_dataset(db, dataset_data)

        # 生成问题
        questions = await QuestionService.generate_questions(db, text, chunk_index)
        
        # 创建数据集项
        for question in questions:
            db_item = DatasetItemModel(
                id=str(uuid.uuid4()),
                dataset_id=dataset.id,
                question=question.content,
                answer=question.answer,
                item_metadata=question.metadata,
                chunk_index=chunk_index,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(db_item)

        db.commit()

        # 返回完整的数据集
        return await DatasetService.get_dataset(db, dataset.id)
