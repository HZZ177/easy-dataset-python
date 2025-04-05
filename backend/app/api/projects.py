from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import quote
from backend.app.models.project import Project, ProjectCreate
from backend.app.models.text import TextCreate, Text, TextChunk
from backend.app.models.question import Question
from backend.app.models.dataset import Dataset, DatasetCreate, ChunkDatasetResponse
from backend.app.services.project_service import ProjectService
from backend.app.services.text_service import TextService
from backend.app.services.question_service import QuestionService
from backend.app.services.dataset_service import DatasetService
from backend.app.core.database import get_db
from backend.app.models.database import Text as TextModel
from backend.app.schemas.question import Question, QuestionCreate, QuestionUpdate, QuestionGenerationResponse
import os

router = APIRouter()


@router.post("/", response_model=Project)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """创建新项目"""
    return await ProjectService.create_project(db, project)


@router.get("/detail", response_model=Project)
async def get_project(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """获取项目详情"""
    project = await ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.get("/", response_model=List[Project])
async def list_projects(db: Session = Depends(get_db)):
    """获取所有项目"""
    projects = await ProjectService.list_projects(db)
    result = []
    for project in projects:
        # 转换为字典
        project_dict = project.model_dump()
        # 获取文本数量
        text_count = await TextService.get_text_count(db, project.id)
        # 添加文本数量
        project_dict["text_count"] = text_count
        # 创建新的 Project 对象
        result.append(Project(**project_dict))
    return result


@router.post("/update", response_model=Project)
async def update_project(
    project_id: str = Query(..., description="项目ID"),
    project: ProjectCreate = None,
    db: Session = Depends(get_db)
):
    """更新项目信息"""
    updated_project = await ProjectService.update_project(db, project_id, project)
    if not updated_project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return updated_project


@router.post("/delete")
async def delete_project(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """删除项目"""
    success = await ProjectService.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {"message": "项目已删除"}


@router.post("/upload", response_model=Text)
async def upload_text(
    project_id: str = Query(..., description="项目ID"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传文本文件"""
    content = await file.read()
    content_str = content.decode("utf-8")

    # 保存文件
    file_path = await TextService.save_uploaded_file(content, file.filename)

    # 分块处理文本
    chunks = TextService.split_text(content_str)

    # 创建文本记录
    text_data = TextCreate(
        title=file.filename,
        project_id=project_id,
        content=content_str,
        file_path=file_path,
        file_size=len(content),
        total_chunks=len(chunks),
        chunks=[TextChunk(**chunk) for chunk in chunks]
    )

    db_text = await TextService.create_text(db, text_data)
    
    # 获取分块数据
    chunks_data = await TextService.get_text_chunks(db, db_text.id)
    
    # 创建返回的文本对象
    return Text(
        id=db_text.id,
        title=db_text.title,
        project_id=db_text.project_id,
        content=db_text.content,
        file_path=db_text.file_path,
        file_size=db_text.file_size,
        total_chunks=db_text.total_chunks,
        chunks=[TextChunk(**chunk) for chunk in chunks_data],
        created_at=db_text.created_at,
        updated_at=db_text.updated_at,
        status=db_text.status
    )


@router.post("/generate-questions", response_model=List[Question])
async def generate_questions(
    project_id: str = Query(..., description="项目ID"),
    text_id: str = Query(..., description="文本ID"),
    db: Session = Depends(get_db)
):
    """为文本生成问题"""
    questions = await QuestionService.generate_questions(db, text_id)
    return questions


@router.post("/datasets", response_model=Dataset)
async def create_dataset(
    project_id: str = Query(..., description="项目ID"),
    dataset: DatasetCreate = None,
    db: Session = Depends(get_db)
):
    """创建数据集"""
    dataset.project_id = project_id
    return await DatasetService.create_dataset(db, dataset)


@router.get("/datasets", response_model=List[Dataset])
async def list_datasets(project_id: str = Query(..., description="项目ID"), db: Session = Depends(get_db)):
    """获取项目下的所有数据集"""
    return await DatasetService.list_datasets(db, project_id)


@router.get("/datasets/export")
async def export_dataset(
    project_id: str = Query(..., description="项目ID"),
    dataset_id: str = Query(..., description="数据集ID"),
    db: Session = Depends(get_db)
):
    """导出数据集"""
    dataset = await DatasetService.export_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return dataset


@router.post("/datasets/delete")
async def delete_dataset(
    project_id: str = Query(..., description="项目ID"),
    dataset_id: str = Query(..., description="数据集ID"),
    db: Session = Depends(get_db)
):
    """删除数据集"""
    success = await DatasetService.delete_dataset(db, dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return {"message": "数据集已删除"}


@router.get("/texts/download")
async def download_text(text_id: str = Query(..., description="文本ID"), db: Session = Depends(get_db)):
    """下载文本文件"""
    text = await TextService.get_text(db, text_id)
    if not text:
        raise HTTPException(status_code=404, detail="文件不存在")

    try:
        # 读取文件内容
        with open(text.file_path, 'rb') as f:
            content = f.read()

        # 根据文件扩展名设置正确的 MIME 类型
        file_extension = os.path.splitext(text.title)[1].lower()
        mime_types = {
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.csv': 'text/csv',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.xml': 'application/xml',
            '.yaml': 'text/yaml',
            '.yml': 'text/yaml',
        }
        content_type = mime_types.get(file_extension, 'text/plain')

        # 返回文件内容
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{quote(text.title)}"; filename*=UTF-8\'\'{quote(text.title)}',
                "X-Content-Type-Options": "nosniff",  # 防止浏览器对文件类型进行嗅探修改
                "Content-Type": f"{content_type}; charset=utf-8",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文件失败: {str(e)}")


@router.post("/generate-dataset", response_model=Dataset)
async def generate_dataset(
    project_id: str = Query(..., description="项目ID"),
    text_id: str = Query(..., description="文本ID"),
    db: Session = Depends(get_db)
):
    """从文本生成数据集"""
    try:
        dataset = await DatasetService.generate_dataset_from_text(db, text_id, project_id)
        return dataset
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成数据集失败: {str(e)}")


@router.get("/datasets/chunk", response_model=ChunkDatasetResponse)
async def list_chunk_datasets(
    project_id: str = Query(..., description="项目ID"),
    chunk_index: int = Query(..., description="分块索引"),
    db: Session = Depends(get_db)
):
    """获取特定分块的数据集列表"""
    return await DatasetService.list_chunk_datasets(db, project_id, chunk_index)


@router.post("/{project_id}/texts/{text_id}/chunk/{chunk_index}/generate-dataset")
async def generate_dataset_from_chunk(
    project_id: str,
    text_id: str,
    chunk_index: int,
    db: Session = Depends(get_db)
):
    """从特定分块生成数据集"""
    dataset = await DatasetService.generate_dataset_from_chunk(db, text_id, chunk_index, project_id)
    return dataset


@router.post("/{project_id}/texts/{text_id}/chunk/{chunk_index}/generate-questions", response_model=QuestionGenerationResponse)
async def generate_questions_for_chunk(
    project_id: str,
    text_id: str,
    chunk_index: int,
    db: Session = Depends(get_db)
):
    """为特定文本分块生成问题"""
    # 获取文本对象
    text = db.query(TextModel).filter(TextModel.id == text_id, TextModel.project_id == project_id).first()
    if not text:
        raise HTTPException(status_code=404, detail="文本不存在")
    
    # 检查分块索引是否有效
    if not text.chunks or chunk_index >= len(text.chunks):
        raise HTTPException(status_code=400, detail=f"分块索引 {chunk_index} 超出范围")
    
    # 创建 QuestionService 实例
    question_service = QuestionService()
    
    # 生成问题
    result = await question_service.generate_questions(db, text, chunk_index)
    
    # 如果返回的是列表，说明成功
    if isinstance(result, list):
        return {
            "success": True,
            "questions": result,
            "error": None
        }
    
    # 否则返回错误信息
    return result


@router.get("/{project_id}/texts/{text_id}/chunk/{chunk_index}/questions/count")
async def get_chunk_question_count(
    project_id: str,
    text_id: str,
    chunk_index: int,
    db: Session = Depends(get_db)
):
    """获取特定分块的问题数量"""
    count = await QuestionService.get_chunk_question_count(db, project_id, text_id, chunk_index)
    return {"count": count}


@router.get("/{project_id}/question-count")
async def get_project_question_count(
    project_id: str,
    db: Session = Depends(get_db)
):
    """获取项目的问题总数"""
    count = await QuestionService.get_project_question_count(db, project_id)
    return {"count": count}
