from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.init_db import init_db
from .api import projects, texts, questions, datasets

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(texts.router, prefix="/api/texts", tags=["texts"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])

@app.on_event("startup")
async def startup_event():
    init_db()
