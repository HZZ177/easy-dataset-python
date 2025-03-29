import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from ..models.project import Project, ProjectCreate, ProjectUpdate
from ..models.text import Text, TextCreate
from ..models.question import Question, QuestionCreate


class FileDatabase:
    def __init__(self, base_dir: str = "backend/data"):
        self.base_dir = base_dir
        self.projects_dir = os.path.join(base_dir, "projects")
        self.ensure_directories()

    def ensure_directories(self):
        """确保必要的目录存在"""
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.projects_dir, exist_ok=True)

    def get_project_path(self, project_id: str) -> str:
        """获取项目文件路径"""
        return os.path.join(self.projects_dir, f"{project_id}.json")

    def create_project(self, project: ProjectCreate) -> Project:
        """创建新项目"""
        project_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        project_data = {
            "id": project_id,
            "name": project.name,
            "description": project.description,
            "created_at": now,
            "updated_at": now,
        }

        with open(self.get_project_path(project_id), 'w', encoding='utf-8') as f:
            json.dump(project_data, f, ensure_ascii=False, indent=2)

        return Project(**project_data)

    def get_project(self, project_id: str) -> Optional[Project]:
        """获取项目详情"""
        try:
            with open(self.get_project_path(project_id), 'r', encoding='utf-8') as f:
                data = json.load(f)
                return Project(**data)
        except FileNotFoundError:
            return None
        except json.JSONDecodeError:
            return None

    def update_project(self, project_id: str, project_update: ProjectUpdate) -> Optional[Project]:
        """更新项目信息"""
        try:
            project = self.get_project(project_id)
            if not project:
                return None

            update_data = project_update.dict(exclude_unset=True)
            project_data = project.dict()
            project_data.update(update_data)
            project_data["updated_at"] = datetime.utcnow().isoformat()

            with open(self.get_project_path(project_id), 'w', encoding='utf-8') as f:
                json.dump(project_data, f, ensure_ascii=False, indent=2)

            return Project(**project_data)
        except Exception as e:
            print(f"Error updating project: {str(e)}")
            return None

    def delete_project(self, project_id: str) -> bool:
        """删除项目"""
        try:
            project_path = self.get_project_path(project_id)
            if os.path.exists(project_path):
                os.remove(project_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting project: {str(e)}")
            return False

    def list_projects(self) -> List[Project]:
        """获取所有项目列表"""
        projects = []
        try:
            for filename in os.listdir(self.projects_dir):
                if filename.endswith('.json'):
                    try:
                        with open(os.path.join(self.projects_dir, filename), 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            projects.append(Project(**data))
                    except Exception as e:
                        print(f"Error reading project file {filename}: {str(e)}")
                        continue
        except Exception as e:
            print(f"Error listing projects: {str(e)}")
        return projects

    def _get_file_path(self, filename: str) -> Path:
        # 确保文件路径在基础目录下
        file_path = (self.base_dir / filename).resolve()
        if not str(file_path).startswith(str(self.base_dir.resolve())):
            raise ValueError("Invalid file path")
        return file_path

    def read_json(self, filename: str) -> Dict[str, Any]:
        try:
            file_path = self._get_file_path(filename)
            if not file_path.exists():
                return {}
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if not content.strip():
                    return {}
                return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from {filename}: {str(e)}")
            return {}
        except Exception as e:
            print(f"Error reading file {filename}: {str(e)}")
            return {}

    def write_json(self, filename: str, data: Dict[str, Any]) -> None:
        try:
            file_path = self._get_file_path(filename)
            # 确保目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # 先将数据转换为 JSON 字符串，验证格式是否正确
            json_str = json.dumps(data, ensure_ascii=False, indent=2)

            # 验证生成的 JSON 是否可以被正确解析
            json.loads(json_str)

            # 如果验证通过，写入文件
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(json_str)
                f.flush()  # 确保数据被写入磁盘
                os.fsync(f.fileno())  # 强制同步到磁盘
        except Exception as e:
            print(f"Error writing to file {filename}: {str(e)}")
            # 如果写入失败，尝试删除可能已经创建的不完整文件
            try:
                if file_path.exists():
                    file_path.unlink()
            except:
                pass
            raise

    def list_files(self, pattern: str = "*") -> List[str]:
        try:
            return [f.name for f in self.base_dir.glob(pattern) if f.is_file()]
        except Exception as e:
            print(f"Error listing files with pattern {pattern}: {str(e)}")
            return []

    def delete_file(self, filename: str) -> bool:
        try:
            file_path = self._get_file_path(filename)
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting file {filename}: {str(e)}")
            return False


# 创建数据库实例
db = FileDatabase(settings.PROJECTS_DIR)
