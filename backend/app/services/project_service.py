from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.project import Project, ProjectCreate, ProjectUpdate
from ..models.database import Project as ProjectModel
import uuid
from datetime import datetime


class ProjectService:
    @staticmethod
    async def create_project(db: Session, project_data: ProjectCreate) -> Project:
        """创建新项目"""
        db_project = ProjectModel(
            id=str(uuid.uuid4()),
            name=project_data.name,
            description=project_data.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        return Project(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            created_at=db_project.created_at.isoformat(),
            updated_at=db_project.updated_at.isoformat()
        )

    @staticmethod
    async def get_project(db: Session, project_id: str) -> Optional[Project]:
        """获取项目详情"""
        db_project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not db_project:
            return None

        return Project(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            created_at=db_project.created_at.isoformat(),
            updated_at=db_project.updated_at.isoformat()
        )

    @staticmethod
    async def update_project(
            db: Session,
            project_id: str,
            project_update: ProjectUpdate
    ) -> Optional[Project]:
        """更新项目信息"""
        db_project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not db_project:
            return None

        update_data = project_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_project, key, value)

        db_project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_project)

        return Project(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            created_at=db_project.created_at.isoformat(),
            updated_at=db_project.updated_at.isoformat()
        )

    @staticmethod
    async def delete_project(db: Session, project_id: str) -> bool:
        """删除项目"""
        db_project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not db_project:
            return False

        db.delete(db_project)
        db.commit()
        return True

    @staticmethod
    async def list_projects(db: Session) -> List[Project]:
        """获取所有项目列表"""
        db_projects = db.query(ProjectModel).all()
        return [
            Project(
                id=project.id,
                name=project.name,
                description=project.description,
                created_at=project.created_at.isoformat(),
                updated_at=project.updated_at.isoformat()
            )
            for project in db_projects
        ]
