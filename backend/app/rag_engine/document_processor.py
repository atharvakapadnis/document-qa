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
        """Process CSV files into text chunks with improved handling"""
        chunks = []
        try:
            # First, analyze the CSV file to understand its structure
            with open(file_path, 'r', encoding='utf-8') as f:
                # Try to detect delimiter
                sample = f.read(10000)  # Read a larger sample to better detect patterns
                f.seek(0)
                
                try:
                    sniffer = csv.Sniffer()
                    dialect = sniffer.sniff(sample)
                    has_header = sniffer.has_header(sample)
                except:
                    # Default to comma if detection fails
                    dialect = csv.excel
                    has_header = True
                
                # Read the CSV with the detected dialect
                csv_reader = csv.reader(f, dialect)
                rows = list(csv_reader)  # Convert to list to get row count
                
                # Extract headers
                if has_header and len(rows) > 0:
                    headers = rows[0]
                    data_rows = rows[1:]
                else:
                    # Generate column names if no header
                    if len(rows) > 0:
                        headers = [f"Column{i+1}" for i in range(len(rows[0]))]
                        data_rows = rows
                    else:
                        headers = []
                        data_rows = []
                
                # Create a CSV summary
                total_rows = len(data_rows)
                total_cols = len(headers)
                
                summary = f"CSV File: {os.path.basename(file_path)}\n"
                summary += f"Total rows: {total_rows}, Total columns: {total_cols}\n\n"
                summary += "Column Headers:\n"
                for i, header in enumerate(headers):
                    summary += f"- {header}\n"
                
                # Add sample data if available
                if data_rows:
                    summary += "\nSample Data (first 5 rows):\n"
                    for i, row in enumerate(data_rows[:5]):
                        summary += f"Row {i+1}: "
                        row_items = []
                        for j, cell in enumerate(row):
                            if j < len(headers):
                                row_items.append(f"{headers[j]}: {cell}")
                            else:
                                row_items.append(f"Column{j+1}: {cell}")
                        summary += ", ".join(row_items) + "\n"
                
                # Add this summary as a chunk
                chunks.append(DocumentChunk(
                    text=summary,
                    metadata={
                        "source": os.path.basename(file_path),
                        "content_type": "csv_summary",
                        "row_count": total_rows,
                        "column_count": total_cols
                    }
                ))
                
                # Process chunks of rows (process the whole dataset in reasonable chunks)
                chunk_size = 50  # Process 50 rows per chunk
                for chunk_start in range(0, len(data_rows), chunk_size):
                    chunk_end = min(chunk_start + chunk_size, len(data_rows))
                    rows_subset = data_rows[chunk_start:chunk_end]
                    
                    # Process this chunk of rows
                    chunk_text = f"CSV Data (Rows {chunk_start+1} to {chunk_end}):\n\n"
                    
                    for row_idx, row in enumerate(rows_subset):
                        actual_row_num = chunk_start + row_idx + 1
                        row_text = f"Row {actual_row_num}: "
                        row_items = []
                        for col_idx, cell in enumerate(row):
                            if col_idx < len(headers):
                                header = headers[col_idx]
                                row_items.append(f"{header}: {cell}")
                        row_text += ", ".join(row_items)
                        chunk_text += row_text + "\n"
                    
                    # Add this chunk
                    chunks.append(DocumentChunk(
                        text=chunk_text,
                        metadata={
                            "source": os.path.basename(file_path),
                            "content_type": "csv_data",
                            "row_range": f"{chunk_start+1}-{chunk_end}",
                            "total_rows": total_rows
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