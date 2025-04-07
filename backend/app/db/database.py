import os
import json
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

from app.core.config import settings


class JSONDatabase:
    """Simple JSON-based database for users and metadata"""
    
    def __init__(self, db_path: str = "./db"):
        self.db_path = db_path
        self.users_file = f"{db_path}/users.json"
        self.documents_dir = f"{db_path}/documents"
        
        # Initialize database structure
        os.makedirs(db_path, exist_ok=True)
        os.makedirs(self.documents_dir, exist_ok=True)
        
        # Create users file if it doesn't exist
        if not os.path.exists(self.users_file):
            with open(self.users_file, 'w') as f:
                json.dump([], f)
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        users = self._read_users()
        for user in users:
            if user["username"] == username:
                return user
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        users = self._read_users()
        for user in users:
            if user.get("email") == email:
                return user
        return None
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        users = self._read_users()
        
        # Check if username or email already exists
        for user in users:
            if user["username"] == user_data["username"]:
                raise ValueError("Username already exists")
            if user.get("email") == user_data.get("email"):
                raise ValueError("Email already exists")
        
        # Add user
        user_data["id"] = str(uuid.uuid4())
        user_data["created_at"] = datetime.utcnow().isoformat()
        users.append(user_data)
        
        # Save users
        self._write_users(users)
        
        # Create user document directory
        os.makedirs(f"{self.documents_dir}/{user_data['username']}", exist_ok=True)
        
        return user_data
    
    def get_documents_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get all documents for a user"""
        user_docs_dir = f"{self.documents_dir}/{username}"
        
        if not os.path.exists(user_docs_dir):
            return []
        
        documents = []
        for filename in os.listdir(user_docs_dir):
            if filename.endswith('.json'):
                with open(f"{user_docs_dir}/{filename}", 'r') as f:
                    doc = json.load(f)
                    documents.append(doc)
        
        # Sort by upload date (newest first)
        documents.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
        return documents
    
    def get_document(self, username: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        doc_path = f"{self.documents_dir}/{username}/{doc_id}.json"
        
        if not os.path.exists(doc_path):
            return None
        
        with open(doc_path, 'r') as f:
            return json.load(f)
    
    def save_document(self, username: str, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a document"""
        user_docs_dir = f"{self.documents_dir}/{username}"
        os.makedirs(user_docs_dir, exist_ok=True)
        
        doc_path = f"{user_docs_dir}/{doc_data['doc_id']}.json"
        
        with open(doc_path, 'w') as f:
            json.dump(doc_data, f)
        
        return doc_data
    
    def delete_document(self, username: str, doc_id: str) -> bool:
        """Delete a document"""
        doc_path = f"{self.documents_dir}/{username}/{doc_id}.json"
        
        if not os.path.exists(doc_path):
            return False
        
        os.remove(doc_path)
        return True
    
    def update_document(self, username: str, doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a document"""
        doc = self.get_document(username, doc_id)
        
        if not doc:
            return None
        
        # Update fields
        for key, value in updates.items():
            doc[key] = value
        
        # Save updated document
        self.save_document(username, doc)
        
        return doc
    
    def _read_users(self) -> List[Dict[str, Any]]:
        """Read users from file"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_users(self, users: List[Dict[str, Any]]) -> None:
        """Write users to file"""
        with open(self.users_file, 'w') as f:
            json.dump(users, f, indent=2)


# Initialize database
db = JSONDatabase()