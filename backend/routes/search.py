from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import os

from database import get_db
from models import DoubtHistory, QuizAttempt

router = APIRouter()

UPLOAD_DIR = "uploads"

@router.get("/search")
async def search_content(q: str, db: Session = Depends(get_db)) -> Dict:
    """
    Unified search endpoint that searches across:
    - Recent doubt history questions/subjects
    - Completed quiz titles
    - Uploaded PDF study materials on disk
    """
    query = q.strip().lower()
    if not query:
        return {
            "success": True,
            "results": {
                "doubts": [],
                "quizzes": [],
                "documents": []
            }
        }
        
    try:
        # 1. Search in Doubt History
        doubts = (
            db.query(DoubtHistory)
            .filter(
                (DoubtHistory.question.ilike(f"%{query}%")) |
                (DoubtHistory.subject.ilike(f"%{query}%"))
            )
            .limit(10)
            .all()
        )
        
        # 2. Search in Quiz Attempts
        quizzes = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_title.ilike(f"%{query}%"))
            .group_by(QuizAttempt.quiz_title)  # Return unique quiz titles
            .limit(10)
            .all()
        )
        
        # 3. Search in Uploaded Files on disk
        documents = []
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                if filename.lower().endswith(".pdf") and query in filename.lower():
                    documents.append({
                        "filename": filename,
                        "title": filename.replace(".pdf", "")
                    })
        
        return {
            "success": True,
            "results": {
                "doubts": [
                    {
                        "id": d.id,
                        "question": d.question,
                        "subject": d.subject,
                        "created_at": d.created_at.isoformat()
                    }
                    for d in doubts
                ],
                "quizzes": [
                    {
                        "id": qz.id,
                        "title": qz.quiz_title,
                        "completed_at": qz.completed_at.isoformat()
                    }
                    for qz in quizzes
                ],
                "documents": documents[:10]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during search query execution: {str(e)}"
        )
