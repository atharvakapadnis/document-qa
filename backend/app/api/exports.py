# New file: backend/app/api/exports.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime
from fastapi.responses import StreamingResponse

from app.models.user import User
from app.api.auth import get_current_user
from app.db.database import db

router = APIRouter()

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
        
        # Filter and format messages for Excel
        qa_pairs = []
        user_message = None
        
        for msg in chat["messages"]:
            if msg["sender"] == "user":
                user_message = msg
            elif msg["sender"] == "system" and user_message is not None:
                # Create a Q&A pair
                pair = {
                    "Question": user_message["text"],
                    "Answer": msg["text"],
                    "Timestamp": datetime.fromisoformat(msg["timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Include confidence if requested
                if include_confidence and "confidence" in msg:
                    pair["Confidence"] = f"{msg['confidence'] * 100:.1f}%"
                
                # Include sources if requested
                if include_sources and "sources" in msg and msg["sources"]:
                    sources = []
                    for i, src in enumerate(msg["sources"]):
                        source_text = f"{src.get('filename', 'Unknown')}"
                        if "page" in src and src["page"]:
                            source_text += f" (Page {src['page']})"
                        sources.append(source_text)
                    pair["Sources"] = "; ".join(sources[:3])  # Limit to top 3 sources
                
                qa_pairs.append(pair)
                user_message = None  # Reset for next pair
        
        # Create DataFrame
        df = pd.DataFrame(qa_pairs)
        
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
            
            # Write the column headers with the defined format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
            # Set column widths
            worksheet.set_column('A:A', 40)  # Question
            worksheet.set_column('B:B', 60)  # Answer
            worksheet.set_column('C:C', 20)  # Timestamp
            if include_confidence:
                worksheet.set_column('D:D', 12)  # Confidence
            if include_sources:
                worksheet.set_column('E:E', 40)  # Sources
        
        # Prepare response
        output.seek(0)
        
        # Generate filename based on chat title
        safe_title = ''.join(c if c.isalnum() else '_' for c in chat["title"])
        filename = f"{safe_title}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting chat: {str(e)}")