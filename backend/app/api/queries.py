from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
        # Get answer using the RAG query engine
        result = query_engine.query(
            query=query_request.query,
            username=current_user.username,
            document_ids=query_request.document_ids,
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