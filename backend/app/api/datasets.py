from fastapi import APIRouter, HTTPException
from typing import List
from backend.app.models.dataset import Dataset, DatasetCreate, DatasetUpdate
from backend.app.services.dataset_service import DatasetService

router = APIRouter()


@router.post("/", response_model=Dataset)
async def create_dataset(dataset: DatasetCreate):
    """创建新数据集"""
    return await DatasetService.generate_dataset(dataset)


@router.get("/{dataset_id}", response_model=Dataset)
async def get_dataset(dataset_id: str):
    """获取数据集详情"""
    dataset = await DatasetService.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.put("/{dataset_id}", response_model=Dataset)
async def update_dataset(dataset_id: str, dataset: DatasetUpdate):
    """更新数据集"""
    updated_dataset = await DatasetService.update_dataset(dataset_id, dataset.dict(exclude_unset=True))
    if not updated_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return updated_dataset


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """删除数据集"""
    if not await DatasetService.delete_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"message": "Dataset deleted successfully"}


@router.get("/project/{project_id}", response_model=List[Dataset])
async def list_project_datasets(project_id: str):
    """获取项目下的所有数据集"""
    return await DatasetService.list_datasets(project_id)


@router.get("/{dataset_id}/export")
async def export_dataset(dataset_id: str, format: str = "json"):
    """导出数据集"""
    try:
        content = await DatasetService.export_dataset(dataset_id, format)
        if not content:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return content
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
