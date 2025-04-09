import os
import uuid
import shutil
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks, Query, status
from pydantic import BaseModel
from langchain_ollama.llms import OllamaLLM

from app.models.user import User
from app.api.auth import get_current_user
from app.db.database import db
from app.rag_engine.document_processor import DocumentProcessor
from app.rag_engine.embedding_manager import EmbeddingManager
from app.rag_engine.document_store import DocumentStore
from app.core.config import settings

router = APIRouter()

# Initialize components
document_processor = DocumentProcessor()
embedding_manager = EmbeddingManager(
    model_name=settings.EMBEDDING_MODEL,
    base_url=settings.OLLAMA_BASE_URL
)
document_store = DocumentStore(db_path=settings.VECTOR_DB_PATH)


class DocumentMetadata(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    upload_date: str
    size_bytes: int
    num_pages: Optional[int] = None
    tags: List[str] = []
    status: str = "processing"
    error: Optional[str] = None


class DocumentUpdate(BaseModel):
    tags: Optional[List[str]] = None


async def process_document(file_path: str, doc_id: str, file_type: str, username: str, original_filename: str):
    """Background task for document processing"""
    try:
        # Get document metadata
        doc_metadata = db.get_document(username, doc_id)
        if not doc_metadata:
            return
        
        # Update status to processing
        db.update_document(username, doc_id, {"status": "processing"})
        
        # Extract text and chunk the document
        document_chunks = document_processor.process_file(file_path, file_type)
        
        # Count pages (if available)
        num_pages = None
        if file_type == 'pdf':
            import fitz
            try:
                pdf = fitz.open(file_path)
                num_pages = len(pdf)
                pdf.close()
            except:
                pass
        
        # Update document with page count
        if num_pages:
            db.update_document(username, doc_id, {"num_pages": num_pages})
        
        # Get embeddings for each chunk
        for i, chunk in enumerate(document_chunks):
            embedding = embedding_manager.get_embedding(chunk.text)
            
            # Store in vector database
            document_store.add_chunk(
                username=username,
                doc_id=doc_id,
                chunk_id=f"{doc_id}_chunk_{i}",
                text=chunk.text,
                embedding=embedding,
                metadata={
                    "page": chunk.metadata.get("page"),
                    "chunk_index": i,
                    "source": original_filename
                }
            )
        
        # Update document status
        db.update_document(username, doc_id, {"status": "processed"})
    
    except Exception as e:
        # Update document status to error
        db.update_document(username, doc_id, {"status": "error", "error": str(e)})
        print(f"Error processing document {doc_id}: {str(e)}")


@router.post("/upload", response_model=DocumentMetadata)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tags: List[str] = Query(default=[]),
    current_user: User = Depends(get_current_user)
):
    """Upload a document for processing"""
    # Create document directories if they don't exist
    storage_path = f"{settings.DOCUMENT_STORAGE_PATH}/{current_user.username}"
    os.makedirs(storage_path, exist_ok=True)
    
    # Generate unique document ID
    doc_id = str(uuid.uuid4())
    
    # Check file size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / (1024 * 1024)}MB"
        )
    
    # Get file extension
    file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ""
    
    # Check if file type is supported
    supported_types = ['pdf', 'docx', 'doc', 'txt', 'csv']
    if file_extension not in supported_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Supported types: {', '.join(supported_types)}"
        )
    
    # Save file to disk
    file_path = f"{storage_path}/{doc_id}.{file_extension}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create document metadata
    doc_metadata = {
        "doc_id": doc_id,
        "filename": file.filename,
        "file_type": file_extension,
        "upload_date": datetime.utcnow().isoformat(),
        "size_bytes": file_size,
        "tags": tags,
        "status": "processing"
    }
    
    # Save document metadata
    db.save_document(current_user.username, doc_metadata)
    
    # Process document in background
    background_tasks.add_task(
        process_document,
        file_path=file_path,
        doc_id=doc_id,
        file_type=file_extension,
        username=current_user.username,
        original_filename=file.filename
    )
    
    return DocumentMetadata(**doc_metadata)


@router.get("", response_model=List[DocumentMetadata])
async def list_documents(
    tag: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List all documents for the current user"""
    documents = db.get_documents_for_user(current_user.username)
    
    # Filter by tag if specified
    if tag:
        documents = [doc for doc in documents if tag in doc.get("tags", [])]
    
    return [DocumentMetadata(**doc) for doc in documents]


@router.get("/{doc_id}", response_model=DocumentMetadata)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get document metadata"""
    doc = db.get_document(current_user.username, doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentMetadata(**doc)


@router.put("/{doc_id}", response_model=DocumentMetadata)
async def update_document(
    doc_id: str,
    updates: DocumentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update document metadata"""
    doc = db.get_document(current_user.username, doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update document
    update_data = updates.dict(exclude_unset=True)
    updated_doc = db.update_document(current_user.username, doc_id, update_data)
    
    return DocumentMetadata(**updated_doc)


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    doc = db.get_document(current_user.username, doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete document metadata
    db.delete_document(current_user.username, doc_id)
    
    # Delete document chunks from vector store
    document_store.delete_document_chunks(current_user.username, doc_id)
    
    # Delete document file
    storage_path = f"{settings.DOCUMENT_STORAGE_PATH}/{current_user.username}"
    file_type = doc.get("file_type", "")
    file_path = f"{storage_path}/{doc_id}.{file_type}"
    
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return {"message": "Document deleted successfully"}

class ComparisonRequest(BaseModel):
    document_ids: List[str]
    comparison_type: str = "similarity"  # similarity, difference, or overlap


class ComparisonResult(BaseModel):
    similarity_score: float
    common_topics: List[str]
    unique_topics: Dict[str, List[str]]
    summary: str


@router.post("/compare", response_model=ComparisonResult)
async def compare_documents(
    comparison_request: ComparisonRequest,
    current_user: User = Depends(get_current_user)
):
    """Compare two or more documents"""
    try:
        document_ids = comparison_request.document_ids
        comparison_type = comparison_request.comparison_type
        
        # Ensure we have at least 2 documents
        if len(document_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least two documents are required for comparison"
            )
        
        # Get documents
        documents = []
        for doc_id in document_ids:
            doc = db.get_document(current_user.username, doc_id)
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {doc_id} not found"
                )
            documents.append(doc)
        
        # Get document contents
        document_texts = []
        for doc in documents:
            file_path = f"{settings.DOCUMENT_STORAGE_PATH}/{current_user.username}/{doc['doc_id']}.{doc['file_type']}"
            
            if not os.path.exists(file_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document file not found: {doc['filename']}"
                )
            
            # Extract text using document processor
            chunks = document_processor.process_file(file_path, doc['file_type'])
            doc_text = "\n".join([chunk.text for chunk in chunks])
            document_texts.append(doc_text)

        # Get document embeddings
        document_embeddings = [
            embedding_manager.get_embedding("\n".join(doc_text.split("\n")[:50])) 
            for doc_text in document_texts
        ]
        
        # Calculate similarity between documents
        from scipy.spatial.distance import cosine
        
        similarity_scores = []
        for i in range(len(document_embeddings)):
            for j in range(i + 1, len(document_embeddings)):
                similarity = 1 - cosine(document_embeddings[i], document_embeddings[j])
                similarity_scores.append(similarity)
        
        # Calculate average similarity
        avg_similarity = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0
        
        # Extract key topics using LLM
        topic_extraction_prompt = f"""
        Extract 5-7 key topics from each of these documents. Return topics in this format:
        
        Document 1 topics:
        - Topic 1
        - Topic 2
        ...
        
        Document 2 topics:
        - Topic 1
        - Topic 2
        ...
        
        Document 1 content:
        {document_texts[0][:2000]}
        
        Document 2 content:
        {document_texts[1][:2000]}
        """
        
        topic_result = OllamaLLM(model=settings.LLM_MODEL, base_url=settings.OLLAMA_BASE_URL).invoke(topic_extraction_prompt)
        
        # Extract common and unique topics using LLM
        topic_analysis_prompt = f"""
        Analyze the topics from these documents and identify:
        1. Common topics shared between documents
        2. Unique topics for each document
        
        Topics from analysis:
        {topic_result}
        
        Format the response as a JSON with these keys:
        - common_topics: array of strings
        - unique_topics: object with document IDs as keys and arrays of strings as values
        
        For example:
        {{
            "common_topics": ["Water management", "Environmental impact"],
            "unique_topics": {{
                "doc1": ["Filtration methods", "Chemical analysis"],
                "doc2": ["Regulatory compliance", "Cost efficiency"]
            }}
        }}
        """
        
        analysis_result = OllamaLLM(model=settings.LLM_MODEL, base_url=settings.OLLAMA_BASE_URL).invoke(topic_analysis_prompt)
        
        # Parse analysis result
        import re
        import json
        
        # Extract JSON from the result
        json_match = re.search(r'```json\n(.*?)\n```', analysis_result, re.DOTALL)
        if json_match:
            analysis_json = json_match.group(1)
        else:
            json_match = re.search(r'({.*})', analysis_result, re.DOTALL)
            if json_match:
                analysis_json = json_match.group(1)
            else:
                analysis_json = analysis_result
        
        try:
            analysis_data = json.loads(analysis_json)
        except:
            # Fallback if JSON parsing fails
            analysis_data = {
                "common_topics": [],
                "unique_topics": {f"doc{i+1}": [] for i in range(len(documents))}
            }
        
        # Generate summary comparison
        summary_prompt = f"""
        Compare and contrast the following documents based on their content. 
        Provide a brief summary of the main similarities and differences.
        
        Document 1: {documents[0]['filename']}
        Content: {document_texts[0][:1500]}
        
        Document 2: {documents[1]['filename']}
        Content: {document_texts[1][:1500]}
        
        Topics analysis:
        Common topics: {', '.join(analysis_data.get('common_topics', []))}
        Unique topics for Document 1: {', '.join(analysis_data.get('unique_topics', {}).get('doc1', []))}
        Unique topics for Document 2: {', '.join(analysis_data.get('unique_topics', {}).get('doc2', []))}
        
        Overall similarity score: {avg_similarity:.2f} (on a scale of 0 to 1)
        """
        
        summary = OllamaLLM(model=settings.LLM_MODEL, base_url=settings.OLLAMA_BASE_URL).invoke(summary_prompt)
        
        # Process unique topics for response
        unique_topics = {}
        for i, doc_id in enumerate(document_ids):
            doc_key = f"doc{i+1}"
            if doc_key in analysis_data.get('unique_topics', {}):
                unique_topics[doc_id] = analysis_data['unique_topics'][doc_key]
            else:
                unique_topics[doc_id] = []
        
        return ComparisonResult(
            similarity_score=avg_similarity,
            common_topics=analysis_data.get('common_topics', []),
            unique_topics=unique_topics,
            summary=summary
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing documents: {str(e)}"
        )