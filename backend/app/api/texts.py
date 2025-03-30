from fastapi import APIRouter, Depends, HTTPException
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


@router.get("/{text_id}", response_model=Text)
async def get_text(text_id: str, db: Session = Depends(get_db)):
    """获取文本详情"""
    text = await TextService.get_text(db, text_id)
    if not text:
        raise HTTPException(status_code=404, detail="文本不存在")
    return text


@router.put("/{text_id}", response_model=Text)
async def update_text(text_id: str, text: TextUpdate, db: Session = Depends(get_db)):
    """更新文本"""
    updated_text = await TextService.update_text(db, text_id, text)
    if not updated_text:
        raise HTTPException(status_code=404, detail="文本不存在")
    return updated_text


@router.delete("/{text_id}")
async def delete_text(text_id: str, db: Session = Depends(get_db)):
    """删除文本"""
    success = await TextService.delete_text(db, text_id)
    if not success:
        raise HTTPException(status_code=404, detail="文本不存在")
    return {"message": "删除成功"}


@router.get("/project/{project_id}", response_model=List[Text])
async def list_project_texts(project_id: str, db: Session = Depends(get_db)):
    """获取项目下的所有文本"""
    return await TextService.list_texts(db, project_id)


@router.get("/project/{project_id}/count")
async def get_project_text_count(project_id: str, db: Session = Depends(get_db)):
    """获取项目下的文本数量"""
    count = await TextService.get_text_count(db, project_id)
    return {"count": count}
