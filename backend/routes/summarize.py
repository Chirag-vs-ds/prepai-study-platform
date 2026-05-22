import os
import fitz  # PyMuPDF
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from services import ai_service

router = APIRouter()

# Folder where uploaded PDFs are stored
UPLOAD_DIR = "uploads"


class SummarizeRequest(BaseModel):
    """
    Pydantic schema to validate that incoming requests contain 
    the extracted text content or a PDF filename.
    """
    text: Optional[str] = Field(default="", description="Extracted study guide text to summarize.")
    filename: Optional[str] = Field(default=None, description="Unique saved filename of the PDF to parse.")


@router.post("/summarize")
async def summarize_pdf(request: SummarizeRequest) -> Dict:
    """
    Accepts extracted PDF text content or a PDF filename, and returns an AI-generated structured summary
    consisting of a short summary, detailed summary, and exam key points.
    
    Request Body:
        {
            "text": "Extracted text content from study guide...",
            "filename": "some-uuid.pdf"
        }
    """
    filename = request.filename.strip() if request.filename else None
    text_content = request.text.strip() if request.text else ""

    # If filename is provided, extract text on the fly
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

    # Clean and validate input
    if not text_content:
        raise HTTPException(
            status_code=400,
            detail="PDF text content is empty. Cannot generate a summary."
        )
        
    try:
        # Pass the extracted text content to the reusable AI Service
        result = ai_service.summarize_pdf_text(text_content)
        return result
    except Exception as e:
        # Standard server-side error catcher
        raise HTTPException(
            status_code=500,
            detail=f"An unhandled error occurred during AI summarization: {str(e)}"
        )

