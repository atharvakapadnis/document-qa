from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class Message(BaseModel):
    """A single chat message"""
    id: str
    sender: str  # 'user' or 'system'
    text: str
    timestamp: datetime
    sources: Optional[List[Dict[str, Any]]] = None
    confidence: Optional[float] = None
    query_time_seconds: Optional[float] = None
    error: Optional[bool] = None


class ChatBase(BaseModel):
    """Base chat model"""
    title: str
    document_ids: Optional[List[str]] = None


class ChatCreate(ChatBase):
    """Chat creation model"""
    pass


class Chat(ChatBase):
    """Chat model with all fields"""
    chat_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    messages: List[Message] = []

    class Config:
        orm_mode = True


class ChatUpdate(BaseModel):
    """Chat update model"""
    title: Optional[str] = None
    messages: Optional[List[Message]] = None
    document_ids: Optional[List[str]] = None