from typing import List, Dict, Any, Optional, Union
import numpy as np
from langchain_ollama import OllamaEmbeddings


class EmbeddingManager:
    """Manage embeddings for document chunks and queries"""
    
    def __init__(self, model_name: str = "mxbai-embed-large", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self._initialize_embeddings()
    
    def _initialize_embeddings(self):
        """Initialize the embedding model"""
        self.embeddings = OllamaEmbeddings(
            model=self.model_name,
            base_url=self.base_url
        )
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector for a text"""
        try:
            return self.embeddings.embed_query(text)
        except Exception as e:
            raise Exception(f"Error generating embedding: {str(e)}")
    
    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a batch of texts"""
        try:
            return self.embeddings.embed_documents(texts)
        except Exception as e:
            raise Exception(f"Error generating batch embeddings: {str(e)}")
    
    def change_model(self, model_name: str):
        """Change the embedding model"""
        self.model_name = model_name
        self._initialize_embeddings()