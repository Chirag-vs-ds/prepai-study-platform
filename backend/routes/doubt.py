from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from sqlalchemy.orm import Session
from database import get_db
from models import DoubtHistory
from services import ai_service

router = APIRouter()

class DoubtRequest(BaseModel):
    question: str
    subject: Optional[str] = None
    context: Optional[str] = None
    image_data: Optional[str] = None
    image_mime: Optional[str] = None

@router.post("/solve-doubt")
async def solve_doubt(request: DoubtRequest, db: Session = Depends(get_db)) -> Dict:
    """
    Solves student doubts using Gemini 2.5 Flash API (via shared AI service)
    or local academic fallbacks, and saves the history.
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    # Solve general doubt using shared AI service
    result = ai_service.solve_general_doubt(
        question=question,
        subject=request.subject,
        image_data=request.image_data,
        image_mime=request.image_mime,
        context=request.context
    )
    
    # Save the doubt to history in database
    try:
        new_history = DoubtHistory(
            user_id="default_student",
            question=question,
            subject=result.get("subject", "General Science"),
            answer_source=result.get("source", "Gemini 2.5 Flash")
        )
        db.add(new_history)
        db.commit()
    except Exception as e:
        print(f"Error saving doubt to history: {e}")
        
    return result

@router.get("/doubt-history")
async def get_doubt_history(user_id: str = "default_student", db: Session = Depends(get_db)) -> Dict:
    """
    Retrieves the recent doubts solved by the student from the database.
    """
    try:
        history = (
            db.query(DoubtHistory)
            .filter(DoubtHistory.user_id == user_id)
            .order_by(DoubtHistory.created_at.desc())
            .limit(10)
            .all()
        )
        return {
            "success": True,
            "history": [
                {
                    "id": item.id,
                    "user_id": item.user_id,
                    "question": item.question,
                    "subject": item.subject,
                    "answer_source": item.answer_source,
                    "created_at": item.created_at.isoformat()
                }
                for item in history
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while fetching doubt history: {str(e)}"
        )
