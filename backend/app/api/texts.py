from fastapi import APIRouter, HTTPException
from typing import List
from backend.app.models.text import Text, TextCreate, TextUpdate
from backend.app.services.text_service import TextService

router = APIRouter()


@router.post("/", response_model=Text)
async def create_text(text: TextCreate):
    """创建新文本"""
    return await TextService.create_text(text)


@router.get("/{text_id}", response_model=Text)
async def get_text(text_id: str):
    """获取文本详情"""
    text = await TextService.get_text(text_id)
    if not text:
        raise HTTPException(status_code=404, detail="Text not found")
    return text


@router.put("/{text_id}", response_model=Text)
async def update_text(text_id: str, text: TextUpdate):
    """更新文本"""
    updated_text = await TextService.update_text(text_id, text.dict(exclude_unset=True))
    if not updated_text:
        raise HTTPException(status_code=404, detail="Text not found")
    return updated_text


@router.delete("/{text_id}")
async def delete_text(text_id: str):
    """删除文本"""
    if not await TextService.delete_text(text_id):
        raise HTTPException(status_code=404, detail="Text not found")
    return {"message": "Text deleted successfully"}


@router.get("/project/{project_id}", response_model=List[Text])
async def list_project_texts(project_id: str):
    """获取项目下的所有文本"""
    return await TextService.list_texts(project_id)
