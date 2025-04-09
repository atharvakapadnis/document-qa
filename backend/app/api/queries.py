from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.database import db
from app.models.user import User
from app.api.auth import get_current_user
from app.rag_engine.embedding_manager import EmbeddingManager
from app.rag_engine.document_store import DocumentStore
from app.rag_engine.query_engine import QueryEngine
from app.core.config import settings

router = APIRouter()

# Initialize components
embedding_manager = EmbeddingManager(
    model_name=settings.EMBEDDING_MODEL,
    base_url=settings.OLLAMA_BASE_URL
)
document_store = DocumentStore(db_path=settings.VECTOR_DB_PATH)
query_engine = QueryEngine(
    document_store=document_store,
    embedding_manager=embedding_manager,
    llm_model=settings.LLM_MODEL,
    base_url=settings.OLLAMA_BASE_URL
)


class QueryRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    max_results: Optional[int] = 5
    filter_criteria: Optional[Dict[str, Any]] = None
    include_all_results: Optional[bool] = False


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    query_time_seconds: float


@router.post("", response_model=QueryResponse)
async def process_query(
    query_request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Process a query against the user's documents"""
    try:
        # Get filter criteria
        filter_criteria = query_request.filter_criteria or {}
        
        # If document IDs are provided, use them directly
        document_ids = query_request.document_ids
        
        # If no document IDs but filter criteria is provided, fetch matching documents
        if not document_ids and filter_criteria:
            # Get all user documents
            all_docs = db.get_documents_for_user(current_user.username)
            
            # Apply filters
            filtered_docs = all_docs
            
            # Filter by tags if specified
            if "tags" in filter_criteria:
                required_tags = filter_criteria["tags"]
                filtered_docs = [
                    doc for doc in filtered_docs 
                    if all(tag in doc.get("tags", []) for tag in required_tags)
                ]
            
            # Filter by file type if specified
            if "file_type" in filter_criteria:
                file_types = filter_criteria["file_type"]
                if not isinstance(file_types, list):
                    file_types = [file_types]
                filtered_docs = [
                    doc for doc in filtered_docs 
                    if doc.get("file_type") in file_types
                ]
            
            # Filter by date range if specified
            if "date_range" in filter_criteria:
                date_range = filter_criteria["date_range"]
                from datetime import datetime
                
                start_date = None
                end_date = None
                
                if "start" in date_range:
                    start_date = datetime.fromisoformat(date_range["start"])
                if "end" in date_range:
                    end_date = datetime.fromisoformat(date_range["end"])
                
                filtered_docs = [
                    doc for doc in filtered_docs 
                    if (not start_date or datetime.fromisoformat(doc.get("upload_date", "2000-01-01")) >= start_date) and
                       (not end_date or datetime.fromisoformat(doc.get("upload_date", "3000-01-01")) <= end_date)
                ]
            
            # Get document IDs from filtered documents
            document_ids = [doc["doc_id"] for doc in filtered_docs]
        
        # Get answer using the RAG query engine
        result = query_engine.query(
            query=query_request.query,
            username=current_user.username,
            document_ids=document_ids,
            max_results=query_request.max_results or 5
        )
        
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            confidence=result["confidence"],
            query_time_seconds=result["query_time_seconds"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")