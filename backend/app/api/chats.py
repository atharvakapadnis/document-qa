from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.database import db
from app.models.user import User
from app.models.chat import Chat, ChatCreate, ChatUpdate, Message
from app.api.auth import get_current_user
from app.core.config import settings
import uuid
from datetime import datetime

router = APIRouter()


@router.get("", response_model=List[Chat])
async def list_chats(current_user: User = Depends(get_current_user)):
    """List all chats for the current user"""
    chats = db.get_chats_for_user(current_user.username)
    return chats


@router.get("/count", response_model=Dict[str, int])
async def get_chat_count(current_user: User = Depends(get_current_user)):
    """Get the number of chats for the current user"""
    count = db.get_chat_count(current_user.username)
    remaining = max(0, 5 - count)  # Assuming 5 is the max chats allowed
    return {
        "total": count,
        "remaining": remaining,
        "max_allowed": 5  # This should ideally be a configurable setting
    }


@router.get("/{chat_id}", response_model=Chat)
async def get_chat(chat_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific chat by ID"""
    chat = db.get_chat(current_user.username, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    return chat


@router.post("", response_model=Chat)
async def create_chat(chat: ChatCreate, current_user: User = Depends(get_current_user)):
    """Create a new chat"""
    # Check if the user already has the maximum number of chats
    count = db.get_chat_count(current_user.username)
    if count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have reached the maximum limit of 5 chats. Please delete a chat before creating a new one."
        )
    
    # Prepare chat data
    chat_data = chat.dict()
    chat_data["chat_id"] = str(uuid.uuid4())
    chat_data["user_id"] = current_user.id
    chat_data["created_at"] = datetime.utcnow().isoformat()
    chat_data["updated_at"] = datetime.utcnow().isoformat()
    chat_data["messages"] = []
    
    # Create the chat
    created_chat = db.create_chat(current_user.username, chat_data)
    return created_chat


@router.put("/{chat_id}", response_model=Chat)
async def update_chat(chat_id: str, chat_update: ChatUpdate, current_user: User = Depends(get_current_user)):
    """Update a chat"""
    existing_chat = db.get_chat(current_user.username, chat_id)
    if not existing_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    updates = chat_update.dict(exclude_unset=True)
    updated_chat = db.update_chat(current_user.username, chat_id, updates)
    return updated_chat


@router.post("/{chat_id}/messages", response_model=Chat)
async def add_message(chat_id: str, message: Message, current_user: User = Depends(get_current_user)):
    """Add a message to a chat"""
    existing_chat = db.get_chat(current_user.username, chat_id)
    if not existing_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Add message to the chat
    if "messages" not in existing_chat:
        existing_chat["messages"] = []
    
    existing_chat["messages"].append(message.dict())
    
    # Update the chat
    updated_chat = db.update_chat(current_user.username, chat_id, existing_chat)
    return updated_chat


@router.delete("/{chat_id}", response_model=Dict[str, str])
async def delete_chat(chat_id: str, current_user: User = Depends(get_current_user)):
    """Delete a chat"""
    success = db.delete_chat(current_user.username, chat_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return {"message": "Chat deleted successfully"}


@router.delete("/{chat_id}/messages/{message_id}", response_model=Chat)
async def delete_message(chat_id: str, message_id: str, current_user: User = Depends(get_current_user)):
    """Delete a message from a chat"""
    existing_chat = db.get_chat(current_user.username, chat_id)
    if not existing_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Remove the message with the given ID
    if "messages" in existing_chat:
        existing_chat["messages"] = [
            msg for msg in existing_chat["messages"] 
            if msg.get("id") != message_id
        ]
    
    # Update the chat
    updated_chat = db.update_chat(current_user.username, chat_id, existing_chat)
    return updated_chat