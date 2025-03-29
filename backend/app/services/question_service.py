from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.question import Question, QuestionCreate, QuestionUpdate
from ..models.database import Question as QuestionModel
import uuid
from datetime import datetime
from crewai import Agent, Task, Crew
from ..core.config import settings


class QuestionService:
    @staticmethod
    def create_question_generator_agent() -> Agent:
        """创建问题生成Agent"""
        return Agent(
            role='问题生成专家',
            goal='根据文本内容生成高质量的问题',
            backstory="""你是一个专业的问题生成专家，擅长分析文本并生成相关的问题。
            你会根据文本的内容、结构和上下文生成合适的问题，确保问题具有教育意义和启发性。""",
            verbose=True,
            allow_delegation=False
        )

    @staticmethod
    def create_question_task(agent: Agent, text_chunk: str) -> Task:
        """创建问题生成任务"""
        return Task(
            description=f"""请根据以下文本内容生成3-5个高质量的问题：
            
            文本内容：
            {text_chunk}
            
            要求：
            1. 问题应该覆盖文本的主要内容和关键点
            2. 问题应该具有不同的难度级别
            3. 问题应该能够促进深入思考和理解
            4. 问题应该清晰、具体、易于理解
            5. 避免过于简单或过于复杂的问题
            
            请以JSON格式返回问题列表，每个问题包含：
            - content: 问题内容
            - difficulty: 难度级别（easy/medium/hard）
            - type: 问题类型（comprehension/analysis/application）
            """,
            agent=agent
        )

    @staticmethod
    async def create_question(db: Session, question: QuestionCreate) -> Question:
        db_question = QuestionModel(**question.dict())
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return Question.from_orm(db_question)

    @staticmethod
    async def get_question(db: Session, question_id: str) -> Optional[Question]:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            return Question.from_orm(db_question)
        return None

    @staticmethod
    async def list_questions(db: Session, project_id: str) -> List[Question]:
        db_questions = db.query(QuestionModel).filter(QuestionModel.project_id == project_id).all()
        return [Question.from_orm(question) for question in db_questions]

    @staticmethod
    async def delete_question(db: Session, question_id: str) -> bool:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            db.delete(db_question)
            db.commit()
            return True
        return False

    @staticmethod
    async def generate_questions(db: Session, text) -> List[Question]:
        """为文本生成问题"""
        # TODO: 实现问题生成逻辑
        # 这里需要调用 LLM 或其他服务来生成问题
        # 暂时返回空列表
        return []

    @staticmethod
    async def update_question(db: Session, question_id: str, question: QuestionUpdate) -> Optional[Question]:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            for key, value in question.dict(exclude_unset=True).items():
                setattr(db_question, key, value)
            db.commit()
            db.refresh(db_question)
            return Question.from_orm(db_question)
        return None
