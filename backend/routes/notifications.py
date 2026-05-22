from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, List, Optional
from database import get_db
from models import Notification

router = APIRouter()

class ReadAllRequest(BaseModel):
    user_id: str = "default_student"

@router.get("/notifications")
async def get_notifications(user_id: str = "default_student", db: Session = Depends(get_db)) -> Dict:
    """
    Retrieves all notifications for a student, along with the total unread count.
    """
    try:
        notifications = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(30)
            .all()
        )
        
        unread_count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .filter(Notification.is_read == False)
            .count()
        )
        
        return {
            "success": True,
            "notifications": [
                {
                    "id": item.id,
                    "user_id": item.user_id,
                    "title": item.title,
                    "message": item.message,
                    "type": item.type,
                    "is_read": item.is_read,
                    "created_at": item.created_at.isoformat()
                }
                for item in notifications
            ],
            "unread_count": unread_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while fetching notifications: {str(e)}"
        )

@router.patch("/notifications/{id}/read")
async def mark_notification_read(id: int, db: Session = Depends(get_db)) -> Dict:
    """
    Marks a single notification as read.
    """
    try:
        notif = db.query(Notification).filter(Notification.id == id).first()
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found.")
        
        notif.is_read = True
        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while marking notification as read: {str(e)}"
        )

@router.post("/notifications/read-all")
async def mark_all_notifications_read(request: ReadAllRequest, db: Session = Depends(get_db)) -> Dict:
    """
    Marks all notifications as read for a given user.
    """
    try:
        db.query(Notification).filter(
            Notification.user_id == request.user_id,
            Notification.is_read == False
        ).update({Notification.is_read: True}, synchronize_session=False)
        db.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while marking all notifications as read: {str(e)}"
        )
