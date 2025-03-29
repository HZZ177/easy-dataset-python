from typing import List, Optional
import uuid
from datetime import datetime
from crewai import Agent, Task, Crew
from backend.app.core.config import settings
from backend.app.core.database import db
from backend.app.models.question import Question, QuestionCreate
from backend.app.models.text import Text


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
    async def generate_questions(text: Text) -> List[Question]:
        """为文本生成问题"""
        questions = []
        agent = QuestionService.create_question_generator_agent()

        for chunk in text.chunks:
            task = QuestionService.create_question_task(agent, chunk.content)
            crew = Crew(
                agents=[agent],
                tasks=[task],
                verbose=True
            )

            result = crew.kickoff()
            # 解析结果并创建问题
            # 这里需要根据实际的返回格式进行调整
            for q_data in result:
                question = Question(
                    id=str(uuid.uuid4()),
                    content=q_data["content"],
                    project_id=text.project_id,
                    text_id=text.id,
                    chunk_index=chunk.start_index,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    metadata={
                        "difficulty": q_data["difficulty"],
                        "type": q_data["type"]
                    }
                )
                questions.append(question)
                # 保存到数据库
                db.write_json(f"questions/{question.id}.json", question.dict())

        return questions

    @staticmethod
    async def get_question(question_id: str) -> Optional[Question]:
        """获取问题记录"""
        data = db.read_json(f"questions/{question_id}.json")
        if not data:
            return None
        return Question(**data)

    @staticmethod
    async def update_question(question_id: str, question_data: dict) -> Optional[Question]:
        """更新问题记录"""
        question = await QuestionService.get_question(question_id)
        if not question:
            return None

        for key, value in question_data.items():
            if hasattr(question, key):
                setattr(question, key, value)

        question.updated_at = datetime.utcnow()
        db.write_json(f"questions/{question_id}.json", question.dict())
        return question

    @staticmethod
    async def delete_question(question_id: str) -> bool:
        """删除问题记录"""
        return db.delete_file(f"questions/{question_id}.json")

    @staticmethod
    async def list_questions(project_id: str) -> List[Question]:
        """获取项目下的所有问题"""
        questions = []
        for filename in db.list_files("questions/*.json"):
            data = db.read_json(filename)
            if data.get("project_id") == project_id:
                questions.append(Question(**data))
        return questions
