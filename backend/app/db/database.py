import os
import json
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime
import logging

from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class JSONDatabase:
    """Simple JSON-based database for users and metadata"""
    
    def __init__(self, db_path: str = "./db"):
        self.db_path = db_path
        self.users_file = f"{db_path}/users.json"
        self.documents_dir = f"{db_path}/documents"
        self.chats_dir = f"{db_path}/chats"
        
        # Initialize database structure
        os.makedirs(db_path, exist_ok=True)
        os.makedirs(self.documents_dir, exist_ok=True)
        os.makedirs(self.chats_dir, exist_ok=True)
        
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
        
        # Create user chat directory
        os.makedirs(f"{self.chats_dir}/{user_data['username']}", exist_ok=True)
        
        return user_data
    
    def get_documents_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get all documents for a user"""
        user_docs_dir = f"{self.documents_dir}/{username}"
        
        if not os.path.exists(user_docs_dir):
            return []
        
        documents = []
        for filename in os.listdir(user_docs_dir):
            if filename.endswith('.json'):
                try:
                    with open(f"{user_docs_dir}/{filename}", 'r') as f:
                        doc = json.load(f)
                        documents.append(doc)
                except json.JSONDecodeError as e:
                    logger.error(f"Error reading document file {filename}: {str(e)}")
                    # Skip corrupted files
                    continue
        
        # Sort by upload date (newest first)
        documents.sort(key=lambda x: x.get("upload_date", ""), reverse=True)
        return documents
    
    def get_document(self, username: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        doc_path = f"{self.documents_dir}/{username}/{doc_id}.json"
        
        if not os.path.exists(doc_path):
            return None
        
        try:
            with open(doc_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error reading document {doc_id}: {str(e)}")
            return None
    
    def save_document(self, username: str, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a document"""
        user_docs_dir = f"{self.documents_dir}/{username}"
        os.makedirs(user_docs_dir, exist_ok=True)
        
        doc_path = f"{user_docs_dir}/{doc_data['doc_id']}.json"
        
        try:
            with open(doc_path, 'w') as f:
                json.dump(doc_data, f, cls=DateTimeEncoder)
            
            return doc_data
        except Exception as e:
            logger.error(f"Error saving document {doc_data.get('doc_id')}: {str(e)}")
            raise
    
    def delete_document(self, username: str, doc_id: str) -> bool:
        """Delete a document"""
        doc_path = f"{self.documents_dir}/{username}/{doc_id}.json"
        
        if not os.path.exists(doc_path):
            return False
        
        try:
            os.remove(doc_path)
            return True
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {str(e)}")
            return False
    
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
    
    # Chat-related methods
    def get_chats_for_user(self, username: str) -> List[Dict[str, Any]]:
        """Get all chats for a user"""
        user_chats_dir = f"{self.chats_dir}/{username}"
        
        if not os.path.exists(user_chats_dir):
            return []
        
        chats = []
        for filename in os.listdir(user_chats_dir):
            if filename.endswith('.json'):
                chat_path = f"{user_chats_dir}/{filename}"
                try:
                    with open(chat_path, 'r') as f:
                        chat = json.load(f)
                        chats.append(chat)
                except json.JSONDecodeError as e:
                    logger.error(f"Error reading chat file {filename}: {str(e)}")
                    # Handle corrupted chat file
                    try:
                        # Attempt to repair the file by replacing it with a minimal valid structure
                        chat_id = filename.replace('.json', '')
                        self._repair_chat_file(username, chat_id)
                        
                        # Try to read the repaired file
                        with open(chat_path, 'r') as f:
                            chat = json.load(f)
                            chats.append(chat)
                    except Exception as repair_error:
                        logger.error(f"Could not repair chat file {filename}: {str(repair_error)}")
                        # Skip this file if repair fails
                        continue
        
        # Sort by created_at date (newest first)
        chats.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return chats
    
    def _repair_chat_file(self, username: str, chat_id: str):
        """Repair a corrupted chat file with minimal valid data"""
        chat_path = f"{self.chats_dir}/{username}/{chat_id}.json"
        
        # Create minimal valid chat data
        minimal_chat = {
            "chat_id": chat_id,
            "title": "Recovered Chat",
            "user_id": "unknown",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "messages": []
        }
        
        # Write the repaired file
        with open(chat_path, 'w') as f:
            json.dump(minimal_chat, f, cls=DateTimeEncoder)
        
        logger.info(f"Repaired corrupted chat file: {chat_path}")
    
    def get_chat(self, username: str, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get a chat by ID"""
        chat_path = f"{self.chats_dir}/{username}/{chat_id}.json"
        
        if not os.path.exists(chat_path):
            return None
        
        try:
            with open(chat_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error reading chat {chat_id}: {str(e)}")
            
            # Try to repair the file
            try:
                self._repair_chat_file(username, chat_id)
                
                # Try to read the repaired file
                with open(chat_path, 'r') as f:
                    return json.load(f)
            except Exception:
                return None
    
    def create_chat(self, username: str, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new chat"""
        user_chats_dir = f"{self.chats_dir}/{username}"
        os.makedirs(user_chats_dir, exist_ok=True)
        
        # Check if user already has max number of chats (5)
        existing_chats = self.get_chats_for_user(username)
        if len(existing_chats) >= 5:
            # Delete the oldest chat
            oldest_chat = min(existing_chats, key=lambda x: x.get("created_at", ""))
            self.delete_chat(username, oldest_chat["chat_id"])
        
        # Generate chat ID if not provided
        if "chat_id" not in chat_data:
            chat_data["chat_id"] = str(uuid.uuid4())
        
        # Set creation and update timestamps
        current_time = datetime.utcnow().isoformat()
        chat_data["created_at"] = current_time
        chat_data["updated_at"] = current_time
        
        # Initialize empty messages array if not provided
        if "messages" not in chat_data:
            chat_data["messages"] = []
        
        # Save chat
        chat_path = f"{user_chats_dir}/{chat_data['chat_id']}.json"
        try:
            with open(chat_path, 'w') as f:
                json.dump(chat_data, f, cls=DateTimeEncoder)
            
            return chat_data
        except Exception as e:
            logger.error(f"Error creating chat: {str(e)}")
            raise
    
    def update_chat(self, username: str, chat_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a chat"""
        chat = self.get_chat(username, chat_id)
        
        if not chat:
            return None
        
        # Update fields
        for key, value in updates.items():
            chat[key] = value
        
        # Update timestamp
        chat["updated_at"] = datetime.utcnow().isoformat()
        
        # Save updated chat
        user_chats_dir = f"{self.chats_dir}/{username}"
        chat_path = f"{user_chats_dir}/{chat_id}.json"
        try:
            with open(chat_path, 'w') as f:
                json.dump(chat, f, cls=DateTimeEncoder)
            
            return chat
        except Exception as e:
            logger.error(f"Error updating chat {chat_id}: {str(e)}")
            raise
    
    def delete_chat(self, username: str, chat_id: str) -> bool:
        """Delete a chat"""
        chat_path = f"{self.chats_dir}/{username}/{chat_id}.json"
        
        if not os.path.exists(chat_path):
            return False
        
        try:
            os.remove(chat_path)
            return True
        except Exception as e:
            logger.error(f"Error deleting chat {chat_id}: {str(e)}")
            return False
    
    def get_chat_count(self, username: str) -> int:
        """Get the number of chats for a user"""
        try:
            return len(self.get_chats_for_user(username))
        except Exception as e:
            logger.error(f"Error getting chat count for {username}: {str(e)}")
            return 0
    
    def _read_users(self) -> List[Dict[str, Any]]:
        """Read users from file"""
        try:
            with open(self.users_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_users(self, users: List[Dict[str, Any]]) -> None:
        """Write users to file"""
        try:
            with open(self.users_file, 'w') as f:
                json.dump(users, f, indent=2, cls=DateTimeEncoder)
        except Exception as e:
            logger.error(f"Error writing users file: {str(e)}")
            raise


# Initialize database
db = JSONDatabase()