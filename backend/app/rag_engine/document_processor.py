import os
import tempfile
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import fitz  # PyMuPDF
import docx
import csv
from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass
class DocumentChunk:
    text: str
    metadata: Dict[str, Any]


class DocumentProcessor:
    """Process uploaded documents into chunks for embedding"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def process_file(self, file_path: str, file_type: str) -> List[DocumentChunk]:
        """Process a file and return text chunks with metadata"""
        if file_type in ['pdf']:
            return self._process_pdf(file_path)
        elif file_type in ['docx', 'doc']:
            return self._process_docx(file_path)
        elif file_type in ['txt']:
            return self._process_text(file_path)
        elif file_type in ['csv']:
            return self._process_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def _process_pdf(self, file_path: str) -> List[DocumentChunk]:
        """Extract text from PDF files"""
        chunks = []
        try:
            doc = fitz.open(file_path)
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if text.strip():
                    # Create chunks from the page text
                    page_chunks = self.text_splitter.create_documents(
                        texts=[text],
                        metadatas=[{"page": page_num + 1, "source": file_path}]
                    )
                    
                    # Convert to our DocumentChunk format
                    for chunk in page_chunks:
                        chunks.append(DocumentChunk(
                            text=chunk.page_content,
                            metadata=chunk.metadata
                        ))
            
            return chunks
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
    
    def _process_docx(self, file_path: str) -> List[DocumentChunk]:
        """Extract text from DOCX files"""
        chunks = []
        try:
            doc = docx.Document(file_path)
            full_text = []
            
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text)
            
            text = "\n".join(full_text)
            
            # Create chunks from the document text
            doc_chunks = self.text_splitter.create_documents(
                texts=[text],
                metadatas=[{"source": file_path}]
            )
            
            # Convert to our DocumentChunk format
            for chunk in doc_chunks:
                chunks.append(DocumentChunk(
                    text=chunk.page_content,
                    metadata=chunk.metadata
                ))
            
            return chunks
        except Exception as e:
            raise Exception(f"Error processing DOCX: {str(e)}")
    
    def _process_text(self, file_path: str) -> List[DocumentChunk]:
        """Extract text from plain text files"""
        chunks = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            # Create chunks from the text
            text_chunks = self.text_splitter.create_documents(
                texts=[text],
                metadatas=[{"source": file_path}]
            )
            
            # Convert to our DocumentChunk format
            for chunk in text_chunks:
                chunks.append(DocumentChunk(
                    text=chunk.page_content,
                    metadata=chunk.metadata
                ))
            
            return chunks
        except Exception as e:
            raise Exception(f"Error processing text file: {str(e)}")
    
    def _process_csv(self, file_path: str) -> List[DocumentChunk]:
        """Process CSV files into text chunks"""
        chunks = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Try to detect delimiter
                sample = f.read(4096)
                f.seek(0)
                
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample)
                has_header = sniffer.has_header(sample)
                
                csv_reader = csv.reader(f, dialect)
                
                # Extract headers or generate column numbers
                if has_header:
                    headers = next(csv_reader)
                else:
                    # First row might be data, rewind
                    f.seek(0)
                    csv_reader = csv.reader(f, dialect)
                    # Generate column names as Col1, Col2, etc.
                    first_row = next(csv_reader)
                    headers = [f"Column{i+1}" for i in range(len(first_row))]
                    # Reset to start to process all rows as data
                    f.seek(0)
                    csv_reader = csv.reader(f, dialect)
                
                # Process each row into a text representation
                rows = []
                for i, row in enumerate(csv_reader):
                    # Skip header row if it exists
                    if i == 0 and has_header:
                        continue
                        
                    if any(cell.strip() for cell in row):  # Skip empty rows
                        # Create a text representation of the row with header labels
                        row_parts = []
                        for j, cell in enumerate(row):
                            if j < len(headers):
                                header = headers[j] if headers[j] else f"Column{j+1}"
                                row_parts.append(f"{header}: {cell}")
                        
                        row_text = f"Row {i}: " + ", ".join(row_parts)
                        rows.append(row_text)
                
                # Combine rows into chunks
                for i in range(0, len(rows), 10):  # Group by 10 rows per chunk
                    chunk_text = "\n".join(rows[i:i+10])
                    # Use string values for metadata to avoid None issues
                    row_range = f"{i+1}-{min(i+10, len(rows))}"
                    chunks.append(DocumentChunk(
                        text=chunk_text,
                        metadata={
                            "source": os.path.basename(file_path), 
                            "rows": row_range,
                            "file_type": "csv"
                        }
                    ))
            
            return chunks
        except Exception as e:
            raise Exception(f"Error processing CSV: {str(e)}")
    
    def update_chunking_parameters(self, chunk_size: int, chunk_overlap: int):
        """Update the chunking parameters"""
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )