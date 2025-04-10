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
             max_results: int = 10) -> Dict[str, Any]:  # Increased max_results to 10
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
            
            # Calculate confidence based on relevance scores - IMPROVED CALCULATION
            confidence = 0.5  # Default confidence level
            if "distances" in search_results and search_results["distances"] and len(search_results["distances"][0]) > 0:
                distances = search_results["distances"][0]
                
                # Convert distances to similarities (where 0 distance = 1.0 similarity)
                # Handle both cosine similarity (where smaller is better) and
                # other metrics (where larger might be better)
                if min(distances) >= 0 and max(distances) <= 1:
                    # Likely cosine similarity, where smaller is better
                    similarities = [1 - d for d in distances]
                else:
                    # For other distance metrics, normalize to 0-1 range
                    max_dist = max(distances)
                    min_dist = min(distances)
                    range_dist = max_dist - min_dist if max_dist > min_dist else 1
                    similarities = [1 - ((d - min_dist) / range_dist) for d in distances]
                
                # Calculate weighted average of top 3 similarities
                top_similarities = sorted(similarities, reverse=True)[:3]
                if top_similarities:
                    # Weight the most relevant chunks higher
                    weights = [0.6, 0.3, 0.1][:len(top_similarities)]
                    # Normalize weights if needed
                    weight_sum = sum(weights)
                    weights = [w/weight_sum for w in weights]
                    
                    # Calculate weighted confidence
                    confidence = sum(s * w for s, w in zip(top_similarities, weights))
                    
                    # Apply scaling to make confidence more meaningful
                    # This makes mid-range similarities produce moderate confidence scores
                    if confidence < 0.2:
                        confidence = confidence * 0.5  # Very low remains very low
                    elif confidence < 0.5:
                        confidence = 0.2 + (confidence - 0.2) * 0.7  # Scale up low-mid range
                    else:
                        confidence = 0.41 + (confidence - 0.5) * 1.18  # Scale up mid-high range
                
                # Ensure confidence is between 0.01 and 1.0 (never exactly 0)
                confidence = max(0.01, min(1.0, confidence))
            
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