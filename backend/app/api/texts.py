from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.schemas.text import Text, TextCreate, TextUpdate
from backend.app.services.text_service import TextService

router = APIRouter()


@router.post("/", response_model=Text)
async def create_text(text: TextCreate, db: Session = Depends(get_db)):
    """创建新文本"""
    return await TextService.create_text(db, text)


@router.get("/", response_model=Text)
async def get_text(text_id: str = Query(..., description="文本ID"), db: Session = Depends(get_db)):
    """获取文本详情"""
    text = await TextService.get_text(db, text_id)
    if not text:
        raise HTTPException(status_code=404, detail="文本不存在")
    return text


@router.post("/update", response_model=Text)
async def update_text(
    text_id: str = Query(..., description="文本ID"),
    text: TextUpdate = None,
    db: Session = Depends(get_db)
):
    """更新文本"""
    updated_text = await TextService.update_text(db, text_id, text)
    if not updated_text:
        raise HTTPException(status_code=404, detail="文本不存在")
    return updated_text


@router.post("/delete")
async def delete_text(text_id: str = Query(..., description="文本ID"), db: Session = Depends(get_db)):
    """删除文本"""
    success = await TextService.delete_text(db, text_id)
    if not success:
        raise HTTPException(status_code=404, detail="文本不存在")
    return {"message": "删除成功"}


@router.get("/list", response_model=List[Text])
async def list_project_texts(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """获取项目下的所有文本"""
    return await TextService.list_texts(db, project_id)


@router.get("/count")
async def get_project_text_count(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """获取项目下的文本数量"""
    count = await TextService.get_text_count(db, project_id)
    return {"count": count}


@router.get("/chunks")
async def get_text_chunks(
    text_id: str = Query(..., description="文本ID"),
    db: Session = Depends(get_db)
):
    """获取文本的分块数据"""
    try:
        chunks = await TextService.get_text_chunks(db, text_id)
        return chunks
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分块数据失败: {str(e)}")
