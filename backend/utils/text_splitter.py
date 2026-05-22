from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List

def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Splits long PDF text content into overlapping chunks using LangChain's
    RecursiveCharacterTextSplitter to ensure conceptual context and equations 
    are preserved rather than awkwardly severed in half.
    
    Args:
        text (str): Raw extracted PDF text content.
        chunk_size (int): Character size of each chunk.
        chunk_overlap (int): Overlap size between adjacent chunks.
        
    Returns:
        List[str]: A list of text passages.
    """
    if not text or not text.strip():
        return []
        
    # Standard splitter configured with high-leverage separators
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    return splitter.split_text(text)
