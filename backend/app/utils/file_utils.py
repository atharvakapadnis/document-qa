import os
import shutil
from typing import List, Optional
from fastapi import UploadFile


async def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    """Save an uploaded file to the specified destination"""
    try:
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return destination
    finally:
        upload_file.file.close()


def get_file_extension(filename: str) -> str:
    """Get the file extension from a filename"""
    return filename.split('.')[-1].lower() if '.' in filename else ""


def is_supported_filetype(filename: str, supported_types: Optional[List[str]] = None) -> bool:
    """Check if a file has a supported extension"""
    if not supported_types:
        supported_types = ['pdf', 'docx', 'doc', 'txt', 'csv']
    
    ext = get_file_extension(filename)
    return ext in supported_types


def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    return os.path.getsize(file_path)
