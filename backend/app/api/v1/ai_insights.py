"""Phase 6.2: source-grounded conversational intent resolution (Admin only)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.rbac import require_admin_permission
from app.services.ai_query_v62 import answer_question

router = APIRouter(prefix='/ai-insights', tags=['AI Insights'])


class QueryBody(BaseModel):
    question: str = Field(min_length=5, max_length=500)
    # Bounded conversational context; no roles, tokens, arbitrary agent tools.
    history: list[str] = Field(default_factory=list, max_length=3)


@router.post('/query')
def query_insights(body: QueryBody,
                   admin: dict = Depends(require_admin_permission('admin:ai_insights:read')),
                   db: Session = Depends(get_db)):
    question = body.question.strip()
    if len(question) < 5 or any(len(item) > 500 for item in body.history):
        raise HTTPException(status_code=422, detail='Câu hỏi hoặc lịch sử không hợp lệ.')
    result = answer_question(db, question, body.history)
    return {'status': 'success', 'data': result}
