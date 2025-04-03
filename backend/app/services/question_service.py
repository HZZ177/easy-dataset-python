from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from ..models.question import Question, QuestionCreate, QuestionUpdate
from ..models.database import Question as QuestionModel, Chunk as ChunkModel
from crewai import Agent, Task, Crew, LLM
from ..core.config import settings
from backend.core.logger import logger
import uuid
from uuid import UUID


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
            role='文本分析专家',
            goal='从复杂文本中提取关键信息并生成可用于模型微调的结构化数据（仅生成问题）',
            backstory="""你是一位专业的文本分析专家
            擅长从复杂文本中提取关键信息并生成可用于模型微调的结构化数据（仅生成问题）。""",
            verbose=True,
            allow_delegation=False,
            llm=self.question_llm
        )

    @staticmethod
    def create_question_task(agent: Agent, text_chunk: str) -> Task:
        """创建问题生成任务"""
        return Task(
            description=f"""
    # 角色使命
    你是一位专业的文本分析专家，擅长从复杂文本中提取关键信息并生成可用于模型微调的结构化数据（仅生成问题）。

    ## 核心任务
    根据用户提供的文本，生成不少于 5 个高质量问题。

    ## 约束条件（重要！）
    - 必须基于文本内容直接生成
    - 问题应具有明确答案指向性
    - 需覆盖文本的不同方面
    - 禁止生成假设性、重复或相似问题

    ## 处理流程
    1. 【文本解析】分段处理内容，识别关键实体和核心概念
    2. 【问题生成】基于信息密度选择最佳提问点
    3. 【质量检查】确保：
       - 问题答案可在原文中找到依据
       - 标签与问题内容强相关
       - 无格式错误
    
    ## 输出格式
     - JSON 数组格式必须正确
    - 字段名使用英文双引号
    - 输出的 JSON 数组必须严格符合以下结构：
    ```json
    ["问题1", "问题2", "..."]
    ```

    ## 输出示例
    ```json
    [ "人工智能伦理框架应包含哪些核心要素？","民法典对个人数据保护有哪些新规定？"]
     ```

    ## 待处理文本
    ${text_chunk}

    ## 限制
    - 必须按照规定的 JSON 格式输出，不要输出任何其他不相关内容
    - 生成不少于5个高质量问题
    - 问题不要和材料本身相关，例如禁止出现作者、章节、目录等相关问题
    - 问题不得包含【报告、文章、文献、表格】中提到的这种话术，必须是一个自然的问题
            """,
            agent=agent,
            expected_output="""
            ```json
            ["问题1", "问题2", "..."]
            ```
            """
        )

    @staticmethod
    async def create_question(db: Session, question: QuestionCreate) -> Question:
        """创建问题"""
        # 将 Pydantic 模型转换为字典
        question_dict = question.dict()
        
        # 将 metadata 重命名为 question_metadata
        if "metadata" in question_dict:
            question_dict["question_metadata"] = question_dict.pop("metadata")
        
        # 生成新的 UUID 作为 id
        question_dict["id"] = str(uuid.uuid4())
        
        # 创建数据库模型实例
        db_question = QuestionModel(**question_dict)
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        
        # 转换为 Pydantic 模型
        return Question.model_validate({
            "id": db_question.id,
            "content": db_question.content,
            "answer": db_question.answer,
            "project_id": db_question.project_id,
            "text_id": db_question.text_id,
            "chunk_index": db_question.chunk_index,
            "metadata": db_question.question_metadata if db_question.question_metadata else {},
            "created_at": db_question.created_at.isoformat() if db_question.created_at else None,
            "updated_at": db_question.updated_at.isoformat() if db_question.updated_at else None,
            "status": "active",
            "tags": []
        })

    @staticmethod
    async def get_question(db: Session, question_id: str) -> Optional[Question]:
        db_question = db.query(QuestionModel).filter(QuestionModel.id == question_id).first()
        if db_question:
            return Question.model_validate(db_question)
        return None

    @classmethod
    async def list_questions(
        cls,
        db: Session,
        project_id: str,
        text_id: str | None = None,
        chunk_index: int | None = None,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[Question], int]:
        """获取问题列表"""
        query = db.query(QuestionModel).filter(QuestionModel.project_id == project_id)
        
        # 添加文件和分块的筛选条件
        if text_id:
            query = query.filter(QuestionModel.text_id == text_id)
        if chunk_index is not None:
            query = query.filter(QuestionModel.chunk_index == chunk_index)
        
        # 计算总数
        total = query.count()
        
        # 分页
        questions = query.offset((page - 1) * page_size).limit(page_size).all()
        
        # 转换为 Pydantic 模型
        result = []
        for question in questions:
            question_dict = {
                "id": question.id,
                "content": question.content,
                "answer": question.answer,
                "project_id": question.project_id,
                "text_id": question.text_id,
                "chunk_index": question.chunk_index,
                "metadata": question.question_metadata if question.question_metadata else {},
                "created_at": question.created_at.isoformat() if question.created_at else None,
                "updated_at": question.updated_at.isoformat() if question.updated_at else None,
                "status": "active",
                "tags": []
            }
            result.append(Question.model_validate(question_dict))
        
        return result, total

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
                    for question_content in questions_data:
                        if not isinstance(question_content, str):
                            logger.info(f"跳过无效的问题数据: {question_content}")
                            continue
                            
                        question = QuestionCreate(
                            content=question_content,
                            answer="暂无答案",  # 设置默认答案
                            project_id=str(text.project_id),  # 确保是字符串
                            text_id=str(text.id),  # 确保是字符串
                            chunk_index=chunk_index if chunk_index is not None else chunks_to_process.index(chunk),
                            metadata={
                                "type": "general",
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
                logger.info(f"处理分块时发生错误: {str(e)}")
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

    @staticmethod
    async def get_chunk_question_count(db: Session, project_id: str, text_id: str, chunk_index: int) -> int:
        """获取特定分块的问题数量"""
        return db.query(QuestionModel).filter(
            QuestionModel.project_id == project_id,
            QuestionModel.text_id == text_id,
            QuestionModel.chunk_index == chunk_index
        ).count()
