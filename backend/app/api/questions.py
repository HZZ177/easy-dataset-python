from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.question import Question, QuestionCreate, QuestionUpdate, AnswerGenerationResponse, BatchDeleteRequest
from backend.app.services.question_service import QuestionService

router = APIRouter()


@router.post("/", response_model=Question)
async def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    """创建新问题"""
    return await QuestionService.create_question(db, question)


@router.get("/", response_model=Question)
async def get_question(question_id: str = Query(..., description="问题ID"), db: Session = Depends(get_db)):
    """获取问题详情"""
    question = await QuestionService.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="问题不存在")
    return question


@router.put("/update", response_model=Question)
async def update_question(
    question_id: str = Query(..., description="问题ID"),
    question: QuestionUpdate = None,
    db: Session = Depends(get_db)
):
    """更新问题"""
    updated_question = await QuestionService.update_question(db, question_id, question)
    if not updated_question:
        raise HTTPException(status_code=404, detail="问题不存在")
    return updated_question


@router.delete("/delete")
async def delete_question(question_id: str = Query(..., description="问题ID"), db: Session = Depends(get_db)):
    """删除问题"""
    success = await QuestionService.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="问题不存在")
    return {"message": "删除成功"}


@router.get("/list")
async def list_questions(
    project_id: str = Query(..., description="项目ID"),
    text_id: str | None = Query(None, description="文件ID"),
    chunk_index: int | None = Query(None, description="分块索引"),
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    db: Session = Depends(get_db)
):
    """获取问题列表"""
    questions, total = await QuestionService.list_questions(
        db, 
        project_id=project_id,
        text_id=text_id,
        chunk_index=chunk_index,
        page=page,
        page_size=page_size
    )
    return {
        "items": questions,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/count")
async def get_chunk_question_count(
    project_id: str = Query(..., description="项目ID"),
    text_id: str = Query(..., description="文本ID"),
    chunk_index: int = Query(..., description="分块索引"),
    db: Session = Depends(get_db)
):
    """获取特定分块的问题数量"""
    count = await QuestionService.get_chunk_question_count(db, project_id, text_id, chunk_index)
    return {"count": count}


@router.post("/{question_id}/generate-answer", response_model=AnswerGenerationResponse)
async def generate_answer(
    question_id: str,
    db: Session = Depends(get_db)
):
    """为问题生成答案"""
    question_service = QuestionService()  # 创建 QuestionService 实例
    try:
        question = await question_service.generate_answer(db, question_id)
        if not question:
            return {
                "success": False,
                "question": None,
                "error": "问题不存在"
            }
        return {
            "success": True,
            "question": question,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "question": None,
            "error": str(e)
        }


@router.post("/batch-delete")
async def batch_delete_questions(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db)
):
    """批量删除问题"""
    success = await QuestionService.batch_delete_questions(db, request.question_ids)
    if not success:
        raise HTTPException(status_code=400, detail="批量删除失败")
    return {"message": "批量删除成功"}
