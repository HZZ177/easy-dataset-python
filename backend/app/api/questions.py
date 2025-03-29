from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.question import Question, QuestionCreate, QuestionUpdate
from app.services.question_service import QuestionService

router = APIRouter()


@router.post("/", response_model=Question)
async def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """创建新问题"""
    return await QuestionService.create_question(db, question)


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str, db: Session = Depends(get_db)):
    """获取问题详情"""
    question = await QuestionService.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="问题不存在")
    return question


@router.put("/{question_id}", response_model=Question)
async def update_question(question_id: str, question: QuestionUpdate, db: Session = Depends(get_db)):
    """更新问题"""
    updated_question = await QuestionService.update_question(db, question_id, question)
    if not updated_question:
        raise HTTPException(status_code=404, detail="问题不存在")
    return updated_question


@router.delete("/{question_id}")
async def delete_question(question_id: str, db: Session = Depends(get_db)):
    """删除问题"""
    success = await QuestionService.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="问题不存在")
    return {"message": "删除成功"}


@router.get("/project/{project_id}", response_model=List[Question])
async def list_project_questions(project_id: str, db: Session = Depends(get_db)):
    """获取项目下的所有问题"""
    return await QuestionService.list_questions(db, project_id)
