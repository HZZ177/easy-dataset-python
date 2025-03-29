from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List

from backend.app.models.dataset import DatasetCreate
from backend.app.models.project import Project, ProjectCreate, ProjectUpdate
from backend.app.services.text_service import TextService
from backend.app.services.question_service import QuestionService
from backend.app.services.dataset_service import DatasetService
from backend.app.core.database import db
import uuid
from datetime import datetime
from ..core.database import FileDatabase
from ..models.text import Text, TextCreate
from ..models.question import Question, QuestionCreate

router = APIRouter()
db = FileDatabase()


@router.post("", response_model=Project)
async def create_project(project: ProjectCreate):
    """创建新项目"""
    try:
        return db.create_project(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """获取项目详情"""
    try:
        project = db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """更新项目"""
    try:
        project = db.update_project(project_id, project_update)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """删除项目"""
    try:
        if not db.delete_project(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[Project])
async def list_projects():
    """获取所有项目"""
    try:
        return db.list_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/upload")
async def upload_text(project_id: str, file: UploadFile = File(...)):
    """上传文本文件"""
    try:
        content = await file.read()
        text_content = content.decode("utf-8")

        # 保存文件
        file_path = await TextService.save_uploaded_file(content, file.filename)

        # 创建文本记录
        text_data = TextCreate(
            title=file.filename,
            content=text_content,
            project_id=project_id,
            file_path=file_path
        )

        text = await TextService.create_text(text_data)

        # 生成问题
        questions = await QuestionService.generate_questions(text)

        return {
            "text": text,
            "questions": questions
        }
    except Exception as e:
        print(f"Error uploading text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/datasets")
async def create_dataset(project_id: str, dataset: DatasetCreate):
    """创建数据集"""
    if dataset.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")

    new_dataset = await DatasetService.generate_dataset(dataset)
    return new_dataset


@router.get("/{project_id}/datasets")
async def list_datasets(project_id: str):
    """获取项目的数据集"""
    datasets = await DatasetService.list_datasets(project_id)
    return datasets
