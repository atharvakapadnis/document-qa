import os
import json
from typing import List, Dict, Any, Optional, Set
import chromadb
from chromadb.config import Settings
from app.core.config import settings


class DocumentStore:
    """Store and retrieve document chunks and metadata"""
    
    def __init__(self, db_path: str = settings.VECTOR_DB_PATH):
        self.db_path = db_path
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(anonymized_telemetry=False)
        )
    
    def _get_user_collection(self, username: str):
        """Get or create a ChromaDB collection for a user"""
        try:
            return self.chroma_client.get_or_create_collection(name=f"user_{username}")
        except Exception as e:
            raise Exception(f"Error accessing vector database: {str(e)}")
    
    def add_chunk(self, username: str, doc_id: str, chunk_id: str, text: str, 
                 embedding: List[float], metadata: Dict[str, Any]):
        """Add a document chunk to the vector store"""
        try:
            # Add document identifier to metadata
            chunk_metadata = {**metadata, "doc_id": doc_id}
            
            # Add to ChromaDB
            collection = self._get_user_collection(username)
            collection.add(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[chunk_metadata]
            )
            
            return True
        except Exception as e:
            raise Exception(f"Error adding chunk to vector store: {str(e)}")
    
    def search_chunks(self, username: str, query_embedding: List[float], 
                     filter_doc_ids: Optional[List[str]] = None, 
                     max_results: int = 5) -> Dict[str, Any]:
        """Search for similar chunks using vector similarity"""
        try:
            collection = self._get_user_collection(username)
            
            # Apply document filter if specified
            where_filter = None
            if filter_doc_ids:
                where_filter = {"doc_id": {"$in": filter_doc_ids}}
            
            # Perform the search
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=max_results,
                where=where_filter
            )
            
            return results
        except Exception as e:
            raise Exception(f"Error searching vector store: {str(e)}")
    
    def delete_document_chunks(self, username: str, doc_id: str):
        """Delete all chunks for a document"""
        try:
            collection = self._get_user_collection(username)
            collection.delete(where={"doc_id": doc_id})
            return True
        except Exception as e:
            raise Exception(f"Error deleting document chunks: {str(e)}")
