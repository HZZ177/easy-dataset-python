from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Text as SQLAlchemyText, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid
from sqlalchemy.sql import func

Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    texts = relationship("Text", back_populates="project", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="project", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    content = Column(Text, nullable=False)
    start_index = Column(Integer, nullable=False)
    end_index = Column(Integer, nullable=False)
    chunk_metadata = Column(JSON, nullable=True)
    text_id = Column(String, ForeignKey("texts.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    text = relationship("Text", back_populates="chunks")


class Text(Base):
    __tablename__ = "texts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    total_chunks = Column(Integer, nullable=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    project = relationship("Project", back_populates="texts")
    questions = relationship("Question", back_populates="text", cascade="all, delete-orphan")
    chunks = relationship("Chunk", back_populates="text", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True)
    content = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    text_id = Column(String, ForeignKey("texts.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    question_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    project = relationship("Project", back_populates="questions")
    text = relationship("Text", back_populates="questions")
    dataset_items = relationship("DatasetItem", back_populates="question_ref", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    text_id = Column(String, ForeignKey("texts.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    project = relationship("Project", back_populates="datasets")
    items = relationship("DatasetItem", back_populates="dataset", cascade="all, delete-orphan")


class DatasetItem(Base):
    __tablename__ = "dataset_items"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"))
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"))
    question = Column(SQLAlchemyText, nullable=False)
    answer = Column(SQLAlchemyText, nullable=False)
    item_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联关系
    dataset = relationship("Dataset", back_populates="items")
    question_ref = relationship("Question", back_populates="dataset_items")
