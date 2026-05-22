import os
import uuid
import fitz  # PyMuPDF
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import Dict

router = APIRouter()

# Define the folder where PDFs will be saved
UPLOAD_DIR = "uploads"
# Ensure the directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum file size (e.g., 25MB to match frontend)
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB in bytes

def background_index_pdf(unique_filename: str, file_path: str):
    """
    Background worker task to load cached sidecar text and index chunks inside the vector store.
    """
    try:
        txt_path = f"{file_path}.txt"
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8") as f:
                text_content = f.read()
        else:
            # Fallback to extraction if text file doesn't exist
            text_content = ""
            with fitz.open(file_path) as doc:
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text_content += page_text + "\n"
                        
        if text_content.strip():
            from utils.text_splitter import split_text
            from services import ai_service, vector_service
            chunks = split_text(text_content)
            embeddings = ai_service.get_embeddings_model()
            vector_service.index_document(
                pdf_id=unique_filename,
                chunks=chunks,
                embeddings_model=embeddings
            )
            print(f"Background vector indexing completed for: {unique_filename}")
    except Exception as e:
        print(f"Error indexing document {unique_filename} in background: {e}")

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()) -> Dict:
    """
    Endpoint to upload a PDF file.
    - Validates file type (must be PDF)
    - Validates file size (max 25MB)
    - Generates a unique filename to avoid overwrites
    - Saves the file to the uploads folder
    - Extracts text, caches it in a sidecar .txt file, and triggers background vector indexing
    """
    
    # 1. Validate file type by extension or content type
    filename = file.filename or "unknown.pdf"
    if not filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Only PDF files are allowed."
        )

    # 2. Validate file size
    # We read the content to check size, then seek back to start for saving
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size allowed is {MAX_FILE_SIZE // (1024*1024)}MB."
        )
    
    # 3. Generate a unique filename using UUID
    file_extension = os.path.splitext(filename)[1] or ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 4. Save the file
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 5. Extract text from the PDF and write to sidecar txt file
        text_content = ""
        page_count = 0
        try:
            with fitz.open(file_path) as doc:
                page_count = len(doc)
                for page in doc:
                    page_text = page.get_text()
                    if page_text:
                        text_content += page_text + "\n"
            
            # Save to a sidecar .txt file for future quick retrieval without re-rendering PDF
            txt_path = f"{file_path}.txt"
            with open(txt_path, "w", encoding="utf-8") as f_txt:
                f_txt.write(text_content)
            
            # Queue vector embedding creation in the background
            background_tasks.add_task(background_index_pdf, unique_filename, file_path)
            
            snippet = text_content[:200].replace("\n", " ") + "..."
        except Exception as pdf_err:
            print(f"PDF extraction error: {pdf_err}")
            snippet = "Could not extract text from this PDF."

    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Could not save file: {str(e)}"
        )

    # 6. Return success response with the extracted snippet
    return {
        "success": True,
        "filename": unique_filename,
        "message": "PDF uploaded successfully. Text cached and background indexing started.",
        "analysis": {
            "snippet": snippet,
            "char_count": len(text_content),
            "page_count": page_count
        }
    }

