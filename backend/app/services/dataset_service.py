from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.dataset import Dataset, DatasetCreate
from ..models.database import Dataset as DatasetModel, DatasetItem as DatasetItemModel
from ..services.question_service import QuestionService
import uuid
from datetime import datetime
from crewai import Agent, Task, Crew
from ..core.config import settings


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
