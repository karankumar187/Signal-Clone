from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from database import get_db
import models, schemas
from auth_utils import get_current_user
from typing import List
from datetime import datetime, timezone

router = APIRouter()

@router.get("/", response_model=List[schemas.ConversationResponse])
def get_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all conversations where current_user is a participant
    participants = db.query(models.Participant).filter(models.Participant.user_id == current_user.id).all()
    conversation_ids = [p.conversation_id for p in participants]
    
    conversations = db.query(models.Conversation).filter(models.Conversation.id.in_(conversation_ids)).all()
    
    result = []
    for conv in conversations:
        # Get last message
        last_message = db.query(models.Message).filter(models.Message.conversation_id == conv.id).order_by(desc(models.Message.created_at)).first()
        
        # Calculate unread count (for DMs, count messages where we are not sender and no read record exists)
        unread_count = 0
        if last_message:
            unread_count = db.query(models.Message).outerjoin(
                models.MessageRead, 
                (models.Message.id == models.MessageRead.message_id) & (models.MessageRead.user_id == current_user.id)
            ).filter(
                models.Message.conversation_id == conv.id,
                models.Message.sender_id != current_user.id,
                models.MessageRead.id == None
            ).count()

        conv_dict = {
            "id": conv.id,
            "is_group": conv.is_group,
            "group_name": conv.group_name,
            "group_avatar": conv.group_avatar,
            "created_at": conv.created_at,
            "created_by": conv.created_by,
            "participants": conv.participants,
            "last_message": last_message,
            "unread_count": unread_count
        }
        result.append(conv_dict)
    
    # Sort by last message created_at descending
    result.sort(key=lambda x: x["last_message"].created_at if x["last_message"] else x["created_at"], reverse=True)
    return result

@router.post("/dm", response_model=schemas.ConversationResponse)
def create_dm(
    request: schemas.CreateDMRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.contact_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create DM with yourself")
    
    contact = db.query(models.User).filter(models.User.id == request.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    # Check if DM already exists
    # Find conversations where both are participants and is_group=False
    my_convs = db.query(models.Participant.conversation_id).filter(models.Participant.user_id == current_user.id).subquery()
    contact_convs = db.query(models.Participant.conversation_id).filter(models.Participant.user_id == request.contact_id).subquery()
    
    existing_dm = db.query(models.Conversation).join(my_convs, models.Conversation.id == my_convs.c.conversation_id)\
        .join(contact_convs, models.Conversation.id == contact_convs.c.conversation_id)\
        .filter(models.Conversation.is_group == False).first()
        
    if existing_dm:
        return {
            "id": existing_dm.id,
            "is_group": existing_dm.is_group,
            "created_at": existing_dm.created_at,
            "participants": existing_dm.participants,
            "last_message": None,
            "unread_count": 0
        }

    # Create new DM
    new_conv = models.Conversation(is_group=False)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    
    # Add participants
    p1 = models.Participant(conversation_id=new_conv.id, user_id=current_user.id, is_admin=True)
    p2 = models.Participant(conversation_id=new_conv.id, user_id=request.contact_id, is_admin=True)
    db.add_all([p1, p2])
    
    # Add to contacts if not exist
    existing_contact = db.query(models.Contact).filter(models.Contact.user_id == current_user.id, models.Contact.contact_user_id == request.contact_id).first()
    if not existing_contact:
        c1 = models.Contact(user_id=current_user.id, contact_user_id=request.contact_id)
        db.add(c1)
        
    db.commit()
    db.refresh(new_conv)
    
    return {
        "id": new_conv.id,
        "is_group": new_conv.is_group,
        "created_at": new_conv.created_at,
        "participants": new_conv.participants,
        "last_message": None,
        "unread_count": 0
    }

@router.get("/{conversation_id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if participant
    is_participant = db.query(models.Participant).filter(
        models.Participant.conversation_id == conversation_id,
        models.Participant.user_id == current_user.id
    ).first()
    
    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(desc(models.Message.created_at)).offset(offset).limit(limit).all()
    
    # Mark messages as read
    unread_messages = [m for m in messages if m.sender_id != current_user.id]
    for msg in unread_messages:
        read_record = db.query(models.MessageRead).filter(
            models.MessageRead.message_id == msg.id,
            models.MessageRead.user_id == current_user.id
        ).first()
        if not read_record:
            new_read = models.MessageRead(message_id=msg.id, user_id=current_user.id)
            db.add(new_read)
            if msg.status != "read":
                msg.status = "read"
    
    db.commit()
    
    return messages[::-1] # Return in chronological order


@router.post("/{conversation_id}/delete")
def delete_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only allow participant to delete
    participant = db.query(models.Participant).filter(
        models.Participant.conversation_id == conversation_id,
        models.Participant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    # Delete all messages
    db.query(models.MessageRead).filter(
        models.MessageRead.message_id.in_(
            db.query(models.Message.id).filter(models.Message.conversation_id == conversation_id)
        )
    ).delete(synchronize_session=False)

    db.query(models.Message).filter(models.Message.conversation_id == conversation_id).delete(synchronize_session=False)

    # Remove all participants
    db.query(models.Participant).filter(models.Participant.conversation_id == conversation_id).delete(synchronize_session=False)

    # Delete conversation
    db.query(models.Conversation).filter(models.Conversation.id == conversation_id).delete(synchronize_session=False)

    db.commit()
    return {"status": "deleted"}


@router.post("/{conversation_id}/block")
def block_conversation(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if participant
    participant = db.query(models.Participant).filter(
        models.Participant.conversation_id == conversation_id,
        models.Participant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")

    # Store blocked status in conversation note (simple approach)
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Remove the current user from the conversation (effectively blocking)
    db.delete(participant)
    db.commit()

    return {"status": "blocked"}
