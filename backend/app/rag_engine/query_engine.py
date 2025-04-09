from typing import List, Dict, Any, Optional
import time
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings


class QueryEngine:
    """Process queries against the document store"""
    
    def __init__(self, document_store, embedding_manager, 
                llm_model: str = "llama3.2",
                base_url: str = settings.OLLAMA_BASE_URL):
        self.document_store = document_store
        self.embedding_manager = embedding_manager
        self.llm_model = llm_model
        self.base_url = base_url
        self._initialize_llm()
        self._setup_prompt_template()
    
    def _initialize_llm(self):
        """Initialize the LLM"""
        self.llm = OllamaLLM(
            model=self.llm_model,
            base_url=self.base_url
        )
    
    def _setup_prompt_template(self):
        """Set up the prompt template for the LLM"""
        self.prompt_template = ChatPromptTemplate.from_template("""
        You are an expert assistant specialized in analyzing documents and answering questions based on the provided content.

        ### Instructions for Answering:
        - Base your answer ONLY on the information provided in the context below.
        - If the context doesn't contain enough information to answer the question fully, clearly state what's missing.
        - Be concise but thorough in your explanation.
        - If appropriate, include specific quotes or references from the source documents.
        - Format your answer for readability using markdown when helpful.
        - Do not include any personal opinions or information not found in the context.

        ### Context (retrieved document sections):
        {context}

        ### User Question:
        {question}

        ### Answer:
        """)
        
        self.chain = self.prompt_template | self.llm
    
    def _format_context(self, results):
        """Format the search results into a context string for the LLM"""
        formatted_context = ""
        
        if "documents" in results and results["documents"]:
            for i, (doc, metadata) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
                source_info = ""
                
                if "doc_id" in metadata:
                    doc_id = metadata["doc_id"]
                    source_info += f"Document ID: {doc_id}"
                
                if "source" in metadata:
                    source = metadata["source"].split('/')[-1]  # Get just the filename
                    source_info += f", Source: {source}"
                
                if "page" in metadata:
                    source_info += f", Page: {metadata['page']}"
                
                formatted_context += f"\n--- SECTION {i+1} ---\n"
                formatted_context += f"{source_info}\n\n"
                formatted_context += f"{doc}\n"
        
        return formatted_context
    
    def query(self, query: str, username: str, document_ids: Optional[List[str]] = None, 
             max_results: int = 5) -> Dict[str, Any]:
        """Process a query and return the answer with sources"""
        try:
            # Start timing
            start_time = time.time()
            
            # Get query embedding
            query_embedding = self.embedding_manager.get_embedding(query)
            
            # Search for relevant chunks
            search_results = self.document_store.search_chunks(
                username=username,
                query_embedding=query_embedding,
                filter_doc_ids=document_ids,
                max_results=max_results
            )
            
            # Format context for the LLM
            context = self._format_context(search_results)
            
            # Get answer from LLM
            answer = self.chain.invoke({
                "context": context,
                "question": query
            })
            
            # Format sources for citation
            sources = []
            if "metadatas" in search_results and search_results["metadatas"]:
                for i, metadata in enumerate(search_results["metadatas"][0]):
                    doc_id = metadata.get("doc_id", "unknown")
                    
                    source_info = {
                        "document_id": doc_id,
                        "filename": metadata.get("source", "").split('/')[-1],
                        "page": metadata.get("page", None),
                        "section": i+1,
                        "relevance_score": search_results["distances"][0][i] if "distances" in search_results else None
                    }
                    sources.append(source_info)
            
            # Calculate confidence based on relevance scores
            confidence = 0.0
            if "distances" in search_results and search_results["distances"]:
                # Lower distance means higher confidence
                avg_distance = sum(search_results["distances"][0]) / len(search_results["distances"][0])
                # Convert distance to confidence score (0-1)
                confidence = max(0, min(1, 1 - avg_distance))
            
            # End timing
            query_time = time.time() - start_time
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "query_time_seconds": query_time
            }
        
        except Exception as e:
            raise Exception(f"Error processing query: {str(e)}")
    
    def change_llm(self, model: str):
        """Change the LLM model"""
        self.llm_model = model
        self._initialize_llm()