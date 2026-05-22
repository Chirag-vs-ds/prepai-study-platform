import os
import fitz  # PyMuPDF
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from services import ai_service

# Initialize APIRouter
router = APIRouter()

# Folder where uploaded PDFs are stored
UPLOAD_DIR = "uploads"


class QuizRequest(BaseModel):
    """
    Pydantic schema to validate that incoming requests contain 
    all parameters required for custom MCQ generation.
    """
    text: Optional[str] = Field(default="", description="Extracted study guide text from which to generate questions.")
    filename: Optional[str] = Field(default=None, description="Unique saved filename of the PDF to parse.")
    difficulty: Optional[str] = Field(
        default="medium", 
        description="Difficulty level of the generated MCQs. Must be 'easy', 'medium', or 'hard'."
    )
    num_questions: Optional[int] = Field(
        default=5, 
        description="Number of MCQs to generate. Must be between 1 and 10."
    )


@router.post("/generate-quiz")
async def generate_quiz(request: QuizRequest) -> Dict:
    """
    Accepts extracted study material text or a filename, difficulty, and question count, 
    and returns an AI-generated multiple-choice quiz.
    
    Request Body:
        {
            "text": "Extracted text content...",
            "filename": "some-uuid.pdf",
            "difficulty": "medium",
            "num_questions": 5
        }
    """
    # 1. Check if filename is provided and extract text if so
    filename = request.filename.strip() if request.filename else None
    text_content = request.text.strip() if request.text else ""

    if filename:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"Study material PDF '{filename}' was not found. Please upload it first."
            )
        try:
            extracted_text = ""
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        extracted_text += page_text + "\n"
            text_content = extracted_text.strip()
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred while extracting text from PDF: {str(e)}"
            )

    # 2. Clean and validate study text
    if not text_content:
        raise HTTPException(
            status_code=400,
            detail="PDF text content is empty. Cannot generate a quiz."
        )

    # 3. Validate difficulty selection
    difficulty_level = request.difficulty.lower().strip()
    if difficulty_level not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty: '{request.difficulty}'. Must be one of: 'easy', 'medium', or 'hard'."
        )

    # 4. Validate number of questions (range-constrained between 1 and 10 for performance and token safety)
    q_count = request.num_questions
    if q_count < 1 or q_count > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid question count: {q_count}. Must be between 1 and 10."
        )
        
    try:
        # Pass the parameters to the modular AI Service
        result = ai_service.generate_quiz(
            text=text_content, 
            difficulty=difficulty_level, 
            num_questions=q_count
        )
        return result
    except Exception as e:
        # standard server-side error catcher
        raise HTTPException(
            status_code=500,
            detail=f"An unhandled error occurred during AI quiz generation: {str(e)}"
        )

