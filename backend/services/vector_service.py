import os
import json
import re
import math
from collections import Counter
from typing import List, Dict, Any, Optional

# Attempt to import LangChain Chroma vector store, failing gracefully if compilation constraints occur
try:
    from langchain_community.vectorstores import Chroma
    HAS_CHROMA = True
except Exception as e:
    print(f"ChromaDB import bypassed: {e}. Defaulting to resilient offline matching engine.")
    HAS_CHROMA = False


class VectorService:
    """
    Manages indexing and similarity search for PDF study materials.
    Uses ChromaDB when online and active, and falls back to a pure-Python
    mathematical Cosine Similarity matching engine when offline.
    """
    def __init__(self):
        # Configure persist directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.backend_dir = os.path.dirname(current_dir)
        self.persist_dir = os.path.join(self.backend_dir, "chroma_db")
        os.makedirs(self.persist_dir, exist_ok=True)
        
        # Configure path for offline backup store
        self.offline_store_path = os.path.join(self.persist_dir, "offline_store.json")
        self.use_chroma = HAS_CHROMA

    def _load_offline_chunks(self) -> Dict[str, List[str]]:
        """Loads raw text chunks from the offline JSON store."""
        if os.path.exists(self.offline_store_path):
            try:
                with open(self.offline_store_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading offline store: {e}")
        return {}

    def _save_offline_chunks(self, pdf_id: str, chunks: List[str]):
        """Saves raw text chunks to the offline JSON store to ensure persistence."""
        store = self._load_offline_chunks()
        store[pdf_id] = chunks
        try:
            with open(self.offline_store_path, "w", encoding="utf-8") as f:
                json.dump(store, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to offline store: {e}")

    def index_document(self, pdf_id: str, chunks: List[str], embeddings_model: Optional[Any] = None) -> Dict:
        """
        Splits and indexes PDF text chunks into the vector store.
        Always registers chunks in the offline backup JSON directory.
        """
        if not chunks:
            return {"success": False, "message": "No chunks provided to index."}
            
        # 1. Always register in the offline persistent store first for safety
        self._save_offline_chunks(pdf_id, chunks)
        
        # 2. Index in ChromaDB if enabled and embedding model is active
        indexed_in_chroma = False
        if self.use_chroma and embeddings_model:
            try:
                # Store text chunks with Gemini Embeddings in our persistent Chroma collection
                Chroma.from_texts(
                    texts=chunks,
                    embedding=embeddings_model,
                    persist_directory=self.persist_dir,
                    collection_name=pdf_id
                )
                indexed_in_chroma = True
                print(f"Successfully indexed document '{pdf_id}' into ChromaDB!")
            except Exception as e:
                print(f"ChromaDB indexing error: {e}. Fallback registered.")
                indexed_in_chroma = False
                
        return {
            "success": True,
            "pdf_id": pdf_id,
            "chunk_count": len(chunks),
            "indexed_in_chroma": indexed_in_chroma,
            "fallback_registered": True
        }

    def _compute_cosine_similarity(self, text1: str, text2: str) -> float:
        """
        Pure-Python Cosine Similarity calculation based on term-frequency vectors.
        Excludes small common filler words for better semantic keyword matching.
        """
        word_pattern = re.compile(r"\w+")
        
        # Convert text to frequency Counters
        words1 = word_pattern.findall(text1.lower())
        words2 = word_pattern.findall(text2.lower())
        
        # Filter basic stop words to isolate main conceptual nouns/verbs
        stopwords = {"is", "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "of", "by", "that", "this"}
        filtered1 = [w for w in words1 if w not in stopwords]
        filtered2 = [w for w in words2 if w not in stopwords]
        
        if not filtered1 or not filtered2:
            return 0.0
            
        vec1 = Counter(filtered1)
        vec2 = Counter(filtered2)
        
        # Compute cosine math
        intersection = set(vec1.keys()) & set(vec2.keys())
        numerator = sum([vec1[x] * vec2[x] for x in intersection])
        
        sum1 = sum([val ** 2 for val in vec1.values()])
        sum2 = sum([val ** 2 for val in vec2.values()])
        denominator = math.sqrt(sum1) * math.sqrt(sum2)
        
        if not denominator:
            return 0.0
            
        return float(numerator) / denominator

    def retrieve_relevant_chunks(self, pdf_id: str, query: str, embeddings_model: Optional[Any] = None, k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves the top K most relevant text chunks matching a student query.
        Falls back to our pure-Python cosine-similarity database index in offline mode.
        """
        # Check if the query is a request for a broad document summary/outline
        query_words = set(re.compile(r"\w+").findall(query.lower()))
        summary_terms = {"summary", "summarize", "outline", "overview", "topics", "contents", "chapters"}
        is_summary_request = bool(query_words & summary_terms)

        # 1. Attempt to query ChromaDB if online and enabled and not a broad summary request
        if self.use_chroma and embeddings_model and not is_summary_request:
            try:
                db = Chroma(
                    persist_directory=self.persist_dir,
                    embedding_function=embeddings_model,
                    collection_name=pdf_id
                )
                
                # Perform similarity search with distance scores
                docs_and_scores = db.similarity_search_with_score(query, k=k)
                
                results = []
                for doc, score in docs_and_scores:
                    results.append({
                        "content": doc.page_content,
                        "score": float(score),
                        "source": "ChromaDB Similarity Match"
                    })
                
                if results:
                    return results
            except Exception as e:
                print(f"ChromaDB retrieval failed: {e}. Falling back to Python matching.")

        # 2. Offline / Resilient Fallback: Pure-Python Cosine Similarity Search
        print(f"Executing Python cosine-similarity fallback search for document '{pdf_id}'...")
        store = self._load_offline_chunks()
        chunks = store.get(pdf_id, [])
        
        if not chunks:
            print(f"Warning: No indexed text passages found for document '{pdf_id}'.")
            return []
            
        # If it's a broad summary/overview request, pull a representational sample of chunks spread across the document
        if is_summary_request:
            print("Detected broad document summary request! Selecting representative index samples.")
            sampled_chunks = []
            chunk_count = len(chunks)
            if chunk_count <= k:
                # Return all chunks if document is small
                for index, chunk_text in enumerate(chunks):
                    sampled_chunks.append({
                        "content": chunk_text,
                        "score": 1.0 - (index * 0.05),  # mock score hierarchy
                        "chunk_index": index,
                        "source": "Document Outline Indexer"
                    })
            else:
                # Select evenly spaced indices (e.g. first, middle, last) to capture entire document scope
                step = chunk_count / k
                for i in range(k):
                    index = min(int(i * step), chunk_count - 1)
                    sampled_chunks.append({
                        "content": chunks[index],
                        "score": 1.0 - (i * 0.05),
                        "chunk_index": index,
                        "source": "Document Outline Indexer"
                    })
            return sampled_chunks

        # Score each chunk against the query using cosine term frequency
        scored_chunks = []
        for index, chunk_text in enumerate(chunks):
            similarity = self._compute_cosine_similarity(query, chunk_text)
            scored_chunks.append({
                "content": chunk_text,
                "score": similarity,
                "chunk_index": index,
                "source": "Local Cosine Similarity Engine"
            })
            
        # Sort in descending order of similarity score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        
        # Return top K ranked chunks
        return scored_chunks[:k]

