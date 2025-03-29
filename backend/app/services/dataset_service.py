from typing import List, Optional
import uuid
from datetime import datetime
from crewai import Agent, Task, Crew
from backend.app.core.config import settings
from backend.app.core.database import db
from backend.app.models.dataset import Dataset, DatasetCreate, DatasetItem
from backend.app.models.question import Question


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
    async def generate_dataset(dataset_data: DatasetCreate) -> Dataset:
        """生成数据集"""
        dataset_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # 获取所有问题
        questions = []
        for question_id in dataset_data.question_ids:
            question_data = db.read_json(f"questions/{question_id}.json")
            if question_data:
                questions.append(Question(**question_data))

        # 生成答案
        agent = DatasetService.create_answer_generator_agent()
        items = []

        for question in questions:
            task = DatasetService.create_answer_task(agent, question.content)
            crew = Crew(
                agents=[agent],
                tasks=[task],
                verbose=True
            )

            result = crew.kickoff()
            # 解析结果并创建数据集项
            # 这里需要根据实际的返回格式进行调整
            item = DatasetItem(
                question=question.content,
                answer=result["answer"],
                metadata={
                    "explanation": result["explanation"],
                    "references": result["references"],
                    "question_id": question.id,
                    "difficulty": question.metadata.get("difficulty"),
                    "type": question.metadata.get("type")
                }
            )
            items.append(item)

        # 创建数据集
        dataset = Dataset(
            id=dataset_id,
            **dataset_data.dict(),
            created_at=now,
            updated_at=now,
            items=items
        )

        # 保存到数据库
        db.write_json(f"datasets/{dataset_id}.json", dataset.dict())
        return dataset

    @staticmethod
    async def get_dataset(dataset_id: str) -> Optional[Dataset]:
        """获取数据集记录"""
        data = db.read_json(f"datasets/{dataset_id}.json")
        if not data:
            return None
        return Dataset(**data)

    @staticmethod
    async def update_dataset(dataset_id: str, dataset_data: dict) -> Optional[Dataset]:
        """更新数据集记录"""
        dataset = await DatasetService.get_dataset(dataset_id)
        if not dataset:
            return None

        for key, value in dataset_data.items():
            if hasattr(dataset, key):
                setattr(dataset, key, value)

        dataset.updated_at = datetime.utcnow()
        db.write_json(f"datasets/{dataset_id}.json", dataset.dict())
        return dataset

    @staticmethod
    async def delete_dataset(dataset_id: str) -> bool:
        """删除数据集记录"""
        return db.delete_file(f"datasets/{dataset_id}.json")

    @staticmethod
    async def list_datasets(project_id: str) -> List[Dataset]:
        """获取项目下的所有数据集"""
        datasets = []
        for filename in db.list_files("datasets/*.json"):
            data = db.read_json(filename)
            if data.get("project_id") == project_id:
                datasets.append(Dataset(**data))
        return datasets

    @staticmethod
    async def export_dataset(dataset_id: str, format: str = "json") -> str:
        """导出数据集"""
        dataset = await DatasetService.get_dataset(dataset_id)
        if not dataset:
            return None

        if format == "json":
            return dataset.json(indent=2)
        elif format == "csv":
            # 实现CSV导出
            import csv
            from io import StringIO

            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(["Question", "Answer"])

            for item in dataset.items:
                writer.writerow([item.question, item.answer])

            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")
