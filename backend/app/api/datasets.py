from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from ..models.dataset import Dataset, DatasetCreate, DatasetUpdate
from ..services.dataset_service import DatasetService
from ..core.database import get_db

router = APIRouter()


@router.post("/", response_model=Dataset)
async def create_dataset(dataset: DatasetCreate, db: Session = Depends(get_db)):
    """创建新数据集"""
    return await DatasetService.create_dataset(db, dataset)


@router.get("/", response_model=Dataset)
async def get_dataset(dataset_id: str = Query(..., description="数据集ID"), db: Session = Depends(get_db)):
    """获取数据集详情"""
    dataset = await DatasetService.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return dataset


@router.post("/update", response_model=Dataset)
async def update_dataset(dataset_id: str = Query(..., description="数据集ID"), dataset: DatasetUpdate = None, db: Session = Depends(get_db)):
    """更新数据集"""
    updated_dataset = await DatasetService.update_dataset(db, dataset_id, dataset.dict(exclude_unset=True))
    if not updated_dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return updated_dataset


@router.post("/delete")
async def delete_dataset(dataset_id: str = Query(..., description="数据集ID"), db: Session = Depends(get_db)):
    """删除数据集"""
    if not await DatasetService.delete_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"message": "Dataset deleted successfully"}


@router.get("/list", response_model=List[Dataset])
async def list_project_datasets(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """获取项目下的所有数据集"""
    return await DatasetService.list_datasets(db, project_id)


@router.get("/export")
async def export_dataset(dataset_id: str = Query(..., description="数据集ID"), format: str = Query("json", description="导出格式")):
    """导出数据集"""
    try:
        content = await DatasetService.export_dataset(dataset_id, format)
        if not content:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return content
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
