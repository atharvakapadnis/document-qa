from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime
from fastapi.responses import StreamingResponse
import logging
import traceback

from app.models.user import User
from app.api.auth import get_current_user
from app.db.database import db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/chat/{chat_id}/excel")
async def export_chat_to_excel(
    chat_id: str,
    include_confidence: bool = True,
    include_sources: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Export chat Q&A pairs to Excel"""
    try:
        # Get chat data
        chat = db.get_chat(current_user.username, chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Log chat info for debugging
        logger.info(f"Exporting chat: {chat_id}, messages: {len(chat.get('messages', []))}")
        
        # Filter and format messages for Excel
        qa_pairs = []
        
        # Check if messages exist in chat data
        if "messages" not in chat or not chat["messages"]:
            logger.warning(f"No messages found in chat {chat_id}")
            # Create empty dataframe to avoid errors
            df = pd.DataFrame(columns=["Question", "Answer", "Timestamp"])
        else:
            # Process messages and create Q&A pairs
            user_message = None
            
            for msg in chat["messages"]:
                # Extract sender with fallback to empty string if not present
                sender = msg.get("sender", "")
                
                if sender == "user":
                    user_message = msg
                elif sender == "system" and user_message is not None:
                    # Create a Q&A pair
                    try:
                        # Ensure all fields exist with fallbacks
                        user_text = user_message.get("text", "")
                        system_text = msg.get("text", "")
                        timestamp = msg.get("timestamp", datetime.now().isoformat())
                        
                        # Try to parse the timestamp
                        try:
                            if isinstance(timestamp, str):
                                formatted_time = datetime.fromisoformat(timestamp).strftime("%Y-%m-%d %H:%M:%S")
                            else:
                                formatted_time = timestamp.strftime("%Y-%m-%d %H:%M:%S")
                        except Exception as e:
                            logger.warning(f"Error formatting timestamp: {str(e)}")
                            formatted_time = str(timestamp)
                        
                        pair = {
                            "Question": user_text,
                            "Answer": system_text,
                            "Timestamp": formatted_time
                        }
                        
                        # Include confidence if requested
                        if include_confidence and "confidence" in msg:
                            confidence_value = msg.get("confidence", 0)
                            # Ensure confidence is a number
                            if isinstance(confidence_value, (int, float)):
                                pair["Confidence"] = f"{confidence_value * 100:.1f}%"
                            else:
                                pair["Confidence"] = "N/A"
                        
                        # Include sources if requested
                        if include_sources and "sources" in msg and msg["sources"]:
                            sources = []
                            for src in msg["sources"]:
                                source_text = f"{src.get('filename', 'Unknown')}"
                                if "page" in src and src["page"]:
                                    source_text += f" (Page {src['page']})"
                                sources.append(source_text)
                            pair["Sources"] = "; ".join(sources[:3])  # Limit to top 3 sources
                        
                        qa_pairs.append(pair)
                    except Exception as e:
                        logger.error(f"Error processing message: {str(e)}")
                        # Continue with next message pair
                    
                    user_message = None  # Reset for next pair
            
            # Check if we found any Q&A pairs
            if not qa_pairs:
                logger.warning("No Q&A pairs found in messages")
                # Try alternative approach - just list all messages
                for msg in chat["messages"]:
                    sender = msg.get("sender", "unknown")
                    text = msg.get("text", "")
                    timestamp = msg.get("timestamp", datetime.now().isoformat())
                    
                    # Format timestamp
                    try:
                        if isinstance(timestamp, str):
                            formatted_time = datetime.fromisoformat(timestamp).strftime("%Y-%m-%d %H:%M:%S")
                        else:
                            formatted_time = timestamp.strftime("%Y-%m-%d %H:%M:%S")
                    except:
                        formatted_time = str(timestamp)
                    
                    # Create a row for each message
                    pair = {
                        "Type": sender.capitalize(),
                        "Message": text,
                        "Timestamp": formatted_time
                    }
                    
                    # Include confidence if requested and available
                    if include_confidence and "confidence" in msg:
                        confidence_value = msg.get("confidence", 0)
                        if isinstance(confidence_value, (int, float)):
                            pair["Confidence"] = f"{confidence_value * 100:.1f}%"
                        else:
                            pair["Confidence"] = "N/A"
                    
                    # Include sources if requested and available
                    if include_sources and "sources" in msg and msg["sources"]:
                        sources = []
                        for src in msg["sources"]:
                            source_text = f"{src.get('filename', 'Unknown')}"
                            if "page" in src:
                                source_text += f" (Page {src['page']})"
                            sources.append(source_text)
                        pair["Sources"] = "; ".join(sources[:3])
                    
                    qa_pairs.append(pair)
            
            # Create DataFrame
            df = pd.DataFrame(qa_pairs)
        
        # Log dataframe info
        logger.info(f"Created dataframe with {len(df)} rows and columns: {list(df.columns)}")
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Q&A Export', index=False)
            
            # Format the sheet
            workbook = writer.book
            worksheet = writer.sheets['Q&A Export']
            
            # Add some formatting
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'bg_color': '#D9E1F2',
                'border': 1
            })
            
            # Create cell format for wrapping text
            wrap_format = workbook.add_format({
                'text_wrap': True,
                'valign': 'top',
                'align': 'left'
            })
            
            # Write the column headers with the defined format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # Write the data with formatting
            for row_num, row in enumerate(df.values):
                for col_num, value in enumerate(row):
                    # Apply the wrap format to all cells
                    worksheet.write(row_num + 1, col_num, value, wrap_format)
            
            # Set column widths based on content
            worksheet.set_column('A:A', 40)  # Question or Type
            worksheet.set_column('B:B', 60)  # Answer or Message
            worksheet.set_column('C:C', 20)  # Timestamp
            
            # Set additional columns if they exist
            if include_confidence:
                worksheet.set_column('D:D', 15)  # Confidence
            if include_sources:
                col_idx = 'D' if not include_confidence else 'E'
                worksheet.set_column(f'{col_idx}:{col_idx}', 40)  # Sources
            
            # Set row height to be dynamic based on content
            for row_num in range(1, len(df) + 1):
                max_height = 0
                for col_num, col in enumerate(df.columns):
                    if col in ["Question", "Answer", "Message"]:
                        # Get the text in this cell
                        text = str(df.iloc[row_num-1, col_num])
                        # Calculate the number of lines (roughly)
                        num_lines = text.count('\n') + 1
                        # Add extra lines for text that will wrap
                        estimated_chars_per_line = 50 if col == "Question" else 80
                        if len(text) > estimated_chars_per_line:
                            num_lines += len(text) // estimated_chars_per_line
                        
                        # Calculate height (15 points per line is a common approach)
                        height = num_lines * 15
                        max_height = max(max_height, height)
                
                # Set the row height (minimum 20, maximum 409 - Excel's limit)
                worksheet.set_row(row_num, min(max(max_height, 20), 409))
            
            # Enable autofilter for easy sorting
            worksheet.autofilter(0, 0, len(df), len(df.columns) - 1)
            
            # Freeze the header row
            worksheet.freeze_panes(1, 0)
            
            # Add basic formatting for the sheet
            worksheet.set_zoom(100)
            
        # Prepare response
        output.seek(0)
        
        # Generate filename based on chat title
        safe_title = ''.join(c if c.isalnum() else '_' for c in chat.get("title", "chat"))
        filename = f"{safe_title}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        logger.error(f"Error exporting chat: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error exporting chat: {str(e)}")