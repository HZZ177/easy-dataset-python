from fastapi import APIRouter, HTTPException
from typing import List
from backend.app.models.question import Question, QuestionCreate, QuestionUpdate
from backend.app.services.question_service import QuestionService

router = APIRouter()


@router.post("/", response_model=Question)
async def create_question(question: QuestionCreate):
    """创建新问题"""
    return await QuestionService.create_question(question)


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str):
    """获取问题详情"""
    question = await QuestionService.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/{question_id}", response_model=Question)
async def update_question(question_id: str, question: QuestionUpdate):
    """更新问题"""
    updated_question = await QuestionService.update_question(question_id, question.dict(exclude_unset=True))
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question


@router.delete("/{question_id}")
async def delete_question(question_id: str):
    """删除问题"""
    if not await QuestionService.delete_question(question_id):
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}


@router.get("/project/{project_id}", response_model=List[Question])
async def list_project_questions(project_id: str):
    """获取项目下的所有问题"""
    return await QuestionService.list_questions(project_id)
