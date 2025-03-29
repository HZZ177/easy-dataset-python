from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.api import projects, texts, questions, datasets

app = FastAPI(title="Easy Dataset API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(texts.router, prefix="/api/texts", tags=["texts"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])


@app.get("/")
async def root():
    return {"message": "Welcome to Easy Dataset API"}


if __name__ == "__main__":
    uvicorn.run(app="main:app", host="0.0.0.0", port=1897, reload=True)
