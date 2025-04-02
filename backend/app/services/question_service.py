from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.question import Question, QuestionCreate, QuestionUpdate
from ..models.database import Question as QuestionModel, Chunk as ChunkModel
from crewai import Agent, Task, Crew, LLM
from ..core.config import settings
from backend.core.logger import logger
import uuid


class QuestionService:

    def __init__(self):
        self.question_llm = LLM(
            # openrouter
            model="openrouter/google/gemini-2.0-flash-001",
            base_url="https://openrouter.ai/api/v1",
            api_key="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"
        )

    def create_question_generator_agent(self) -> Agent:
        """创建问题生成Agent"""
        return Agent(
            role='问题生成专家',
            goal='根据文本内容生成高质量的问题',
            backstory="""你是一个专业的问题生成专家，擅长分析文本并生成相关的问题。
            你会根据文本的内容、结构和上下文生成合适的问题，确保问题具有教育意义和启发性。""",
            verbose=True,
            allow_delegation=False,
            llm=self.question_llm
        )

    @staticmethod
    def create_question_task(agent: Agent, text_chunk: str) -> Task:
        """创建问题生成任务"""
        return Task(
            description=f"""请根据以下文本内容生成5个高质量的问题：
            
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
            agent=agent,
            expected_output="""[
                {
                    "content": "问题内容",
                    "difficulty": "easy/medium/hard",
                    "type": "comprehension/analysis/application"
                }
            ]"""
        )

    @staticmethod
    async def create_question(db: Session, question: QuestionCreate) -> Question:
        # 将 Pydantic 模型转换为字典
        question_dict = question.dict()
        # 将 metadata 中的 chunk_index 移动到顶层
        if "metadata" in question_dict and "chunk_index" in question_dict["metadata"]:
            question_dict["chunk_index"] = question_dict["metadata"].pop("chunk_index")
        
        # 生成新的 UUID 作为 id
        question_dict["id"] = str(uuid.uuid4())
        
        # 确保 answer 字段不为 None
        if question_dict.get("answer") is None:
            question_dict["answer"] = "暂无答案"
        
        # 创建数据库模型实例
        db_question = QuestionModel(**question_dict)
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        return Question.model_validate(db_question)

    @staticmethod
    async def get_question(db: Session, question_id: str) -> Optional[Question]:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            return Question.model_validate(db_question)
        return None

    @staticmethod
    async def list_questions(db: Session, project_id: str) -> List[Question]:
        db_questions = db.query(QuestionModel).filter(QuestionModel.project_id == project_id).all()
        questions = []
        for question in db_questions:
            # 将 SQLAlchemy 模型转换为字典
            question_dict = {
                "id": str(question.id),
                "content": str(question.content),
                "answer": str(question.answer),
                "project_id": str(question.project_id),
                "text_id": str(question.text_id),
                "chunk_index": int(question.chunk_index),
                "metadata": question.metadata if isinstance(question.metadata, dict) else {},
                "created_at": question.created_at.isoformat() if question.created_at else None,
                "updated_at": question.updated_at.isoformat() if question.updated_at else None
            }
            questions.append(Question.model_validate(question_dict))
        return questions

    @staticmethod
    async def delete_question(db: Session, question_id: str) -> bool:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            db.delete(db_question)
            db.commit()
            return True
        return False

    async def generate_questions(self, db: Session, text, chunk_index: Optional[int] = None) -> List[Question]:
        """为文本生成问题
        
        Args:
            db: 数据库会话
            text: 文本对象
            chunk_index: 可选的分块索引，如果指定则只处理该分块
            
        Returns:
            List[Question]: 生成的问题列表
        """
        # 获取分块
        chunks = db.query(ChunkModel).filter(ChunkModel.text_id == text.id).all()
        if not chunks:
            raise ValueError("文本没有分块数据")

        # 确定要处理的分块
        chunks_to_process = []
        if chunk_index is not None:
            if chunk_index >= len(chunks):
                raise ValueError(f"分块索引 {chunk_index} 超出范围")
            chunks_to_process = [chunks[chunk_index]]
        else:
            chunks_to_process = chunks

        # 创建问题生成 Agent
        agent = self.create_question_generator_agent()
        questions = []
        total_chunks = len(chunks_to_process)
        processed_chunks = 0

        # 处理每个分块
        for chunk in chunks_to_process:
            try:
                # 创建任务
                task = self.create_question_task(agent, chunk.content)

                # 创建 Crew 并执行任务
                crew = Crew(
                    agents=[agent],
                    tasks=[task],
                    verbose=True
                )

                # 执行任务获取结果
                result = crew.kickoff()
                # 将 CrewOutput 转换为字符串
                result_str = str(result)

                try:
                    # 提取 JSON 部分
                    import re
                    json_match = re.search(r'```json\s*(\[.*?\])\s*```', result_str, re.DOTALL)
                    if not json_match:
                        logger.info("未找到有效的 JSON 数据")
                        continue
                    
                    json_str = json_match.group(1)
                    # 解析返回的 JSON 结果
                    import json
                    questions_data = json.loads(json_str)

                    # 为每个生成的问题创建数据库记录
                    for q_data in questions_data:
                        question = QuestionCreate(
                            content=q_data["content"],
                            answer="暂无答案",  # 设置默认答案
                            project_id=text.project_id,
                            text_id=text.id,
                            chunk_index=chunk_index if chunk_index is not None else chunks_to_process.index(chunk),
                            metadata={
                                "difficulty": q_data["difficulty"],
                                "type": q_data["type"],
                                "chunk_index": chunk_index if chunk_index is not None else chunks_to_process.index(chunk),
                                "chunk_metadata": chunk.chunk_metadata
                            }
                        )

                        # 保存到数据库
                        db_question = await self.create_question(db, question)
                        questions.append(db_question)

                except json.JSONDecodeError as e:
                    logger.info(f"解析问题生成结果失败: {e}")
                    continue

                # 更新进度
                processed_chunks += 1
                logger.info(f"进度: {processed_chunks}/{total_chunks} 分块处理完成")

            except Exception as e:
                logger.info(f"处理分块时发生错误: {e}")
                continue

        logger.info(f"问题生成完成，共生成 {len(questions)} 个问题")
        return questions

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
