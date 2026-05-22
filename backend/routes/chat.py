import os
import fitz  # PyMuPDF
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from utils.text_splitter import split_text
from services import ai_service, vector_service
from database import get_db
from models import DoubtHistory

# Initialize APIRouter
router = APIRouter()

# Folder where uploaded PDFs are stored
UPLOAD_DIR = "uploads"


class IndexRequest(BaseModel):
    """Schema to validate PDF indexing requests."""
    filename: str = Field(description="Unique saved filename of the uploaded PDF (e.g., UUID-based name).")


class ChatRequest(BaseModel):
    """Schema to validate context-grounded RAG questions."""
    filename: str = Field(description="Unique saved filename of the PDF to query.")
    question: str = Field(description="Student's study query or doubt regarding the material.")
    k: Optional[int] = Field(default=3, description="Number of source passages to retrieve.")


@router.post("/index-pdf")
async def index_pdf(request: IndexRequest) -> Dict:
    """
    Reads an uploaded PDF, extracts text, splits it into recursive overlapping
    chunks, and indexes it into the Vector database.
    """
    filename = request.filename.strip()
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # 1. Verify file exists on disk
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"Uploaded PDF file '{filename}' was not found. Please upload it first."
        )
        
    try:
        # 2. Extract full text from PDF using fitz
        text_content = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                page_text = page.get_text()
                if page_text:
                    text_content += page_text + "\n"
                    
        if not text_content.strip():
            raise HTTPException(
                status_code=400,
                detail="The PDF contains no extractable text content. Scan/OCR may be required."
            )
            
        # 3. Chunk the text using recursive splitting
        chunks = split_text(text_content)
        
        # 4. Fetch the active LangChain embeddings model (Gemini-based)
        embeddings = ai_service.get_embeddings_model()
        
        # 5. Index chunks inside the vector store
        index_result = vector_service.index_document(
            pdf_id=filename,
            chunks=chunks,
            embeddings_model=embeddings
        )
        
        return index_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while indexing PDF: {str(e)}"
        )


@router.post("/chat-pdf")
async def chat_pdf(request: ChatRequest, db: Session = Depends(get_db)) -> Dict:
    """
    Performs context-grounded doubt solving over the indexed PDF text.
    Automatically indexes the PDF first if it has not been indexed yet!
    """
    filename = request.filename.strip()
    question = request.question.strip()
    k_count = request.k
    
    if not question:
        raise HTTPException(
            status_code=400,
            detail="Student question is empty. Please enter a valid inquiry."
        )
        
    # Check if the PDF exists on disk
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"Study material PDF '{filename}' was not found. Please upload it first."
        )
        
    # 1. Auto-Indexing Safety Net: 
    # If the document has not been cached in our offline store, index it now!
    store = vector_service._load_offline_chunks()
    if filename not in store:
        print(f"Document '{filename}' not indexed yet. Auto-indexing on-the-fly...")
        try:
            text_content = ""
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text_content += page_text + "\n"
            chunks = split_text(text_content)
            embeddings = ai_service.get_embeddings_model()
            vector_service.index_document(pdf_id=filename, chunks=chunks, embeddings_model=embeddings)
        except Exception as idx_err:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to auto-index study material PDF: {str(idx_err)}"
            )

    try:
        # 2. Retrieve relevant chunks from the similarity store
        embeddings = ai_service.get_embeddings_model()
        retrieved_chunks = vector_service.retrieve_relevant_chunks(
            pdf_id=filename,
            query=question,
            embeddings_model=embeddings,
            k=k_count
        )
        
        # 3. Generate context-grounded AI RAG explanation
        rag_response = ai_service.generate_rag_answer(
            question=question,
            retrieved_chunks=retrieved_chunks
        )
        
        # Identify subject from query keywords
        query_lower = question.lower()
        subject = "General Science"
        if "induction" in query_lower or "magnetic" in query_lower or "faraday" in query_lower or "flux" in query_lower:
            subject = "Physics"
        elif "integration" in query_lower or "parts" in query_lower or "calculus" in query_lower:
            subject = "Mathematics"
        elif "sn1" in query_lower or "carbocation" in query_lower or "organic" in query_lower or "reaction" in query_lower:
            subject = "Chemistry"
        elif "circulation" in query_lower or "heart" in query_lower or "blood" in query_lower:
            subject = "Biology"
            
        # Save solved doubt to history database
        try:
            new_history = DoubtHistory(
                user_id="default_student",
                question=question,
                subject=subject,
                answer_source=rag_response.get("source", "Gemini 2.5 Flash (RAG)")
            )
            db.add(new_history)
            db.commit()
        except Exception as e:
            print(f"Error saving PDF doubt to history database: {e}")
        
        # 4. Formulate final response
        return {
            "success": True,
            "filename": filename,
            "question": question,
            "answer": rag_response["answer"],
            "source": rag_response["source"],
            "references": [
                {
                    "content": chunk["content"],
                    "match_score": round(chunk["score"], 4),
                    "search_source": chunk["source"]
                }
                for chunk in retrieved_chunks
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating RAG answer: {str(e)}"
        )
