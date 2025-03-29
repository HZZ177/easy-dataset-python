from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.models.project import Project, ProjectCreate
from app.models.text import Text, TextCreate
from app.models.question import Question
from app.models.dataset import Dataset, DatasetCreate
from app.services.project_service import ProjectService
from app.services.text_service import TextService
from app.services.question_service import QuestionService
from app.services.dataset_service import DatasetService
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Project)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """创建新项目"""
    return await ProjectService.create_project(db, project)

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str, db: Session = Depends(get_db)):
    """获取项目详情"""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project

@router.get("/", response_model=List[Project])
async def list_projects(db: Session = Depends(get_db)):
    """获取所有项目"""
    return await ProjectService.list_projects(db)

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project: ProjectCreate, db: Session = Depends(get_db)):
    """更新项目信息"""
    updated_project = await ProjectService.update_project(db, project_id, project)
    if not updated_project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return updated_project

@router.delete("/{project_id}")
async def delete_project(project_id: str, db: Session = Depends(get_db)):
    """删除项目"""
    success = await ProjectService.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"message": "项目已删除"}

@router.post("/{project_id}/upload", response_model=Text)
async def upload_text(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传文本文件"""
    content = await file.read()
    text_data = TextCreate(
        title=file.filename,
        content=content.decode(),
        project_id=project_id
    )
    text = await TextService.create_text(db, text_data)
    return text

@router.post("/{project_id}/texts/{text_id}/generate-questions", response_model=List[Question])
async def generate_questions(
    project_id: str,
    text_id: str,
    db: Session = Depends(get_db)
):
    """为文本生成问题"""
    questions = await QuestionService.generate_questions(db, text_id)
    return questions

@router.post("/{project_id}/datasets", response_model=Dataset)
async def create_dataset(
    project_id: str,
    dataset: DatasetCreate,
    db: Session = Depends(get_db)
):
    """创建数据集"""
    dataset.project_id = project_id
    return await DatasetService.create_dataset(db, dataset)

@router.get("/{project_id}/datasets", response_model=List[Dataset])
async def list_datasets(project_id: str, db: Session = Depends(get_db)):
    """获取项目下的所有数据集"""
    return await DatasetService.list_datasets(db, project_id)

@router.get("/{project_id}/datasets/{dataset_id}/export")
async def export_dataset(
    project_id: str,
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """导出数据集"""
    dataset = await DatasetService.export_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return dataset

@router.delete("/{project_id}/datasets/{dataset_id}")
async def delete_dataset(
    project_id: str,
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """删除数据集"""
    success = await DatasetService.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return {"message": "数据集已删除"}
