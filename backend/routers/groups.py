from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth_utils import get_current_user

router = APIRouter()

@router.post("", response_model=schemas.ConversationResponse)
@router.post("/", response_model=schemas.ConversationResponse)
def create_group(
    request: schemas.CreateGroupRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(request.participant_ids) == 0:
        raise HTTPException(status_code=400, detail="Group must have at least one other participant")
        
    new_group = models.Conversation(
        is_group=True,
        group_name=request.group_name,
        group_avatar=request.group_avatar,
        created_by=current_user.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add creator as admin
    p_creator = models.Participant(conversation_id=new_group.id, user_id=current_user.id, is_admin=True)
    db.add(p_creator)
    
    # Add other participants
    for pid in request.participant_ids:
        # Check if user exists
        user = db.query(models.User).filter(models.User.id == pid).first()
        if user:
            p = models.Participant(conversation_id=new_group.id, user_id=pid, is_admin=False)
            db.add(p)
            
    db.commit()
    
    # Reload the entire conversation to ensure relationships (participants, user) are fully loaded for Pydantic
    reloaded_group = db.query(models.Conversation).filter(models.Conversation.id == new_group.id).first()
    
    return {
        "id": reloaded_group.id,
        "is_group": reloaded_group.is_group,
        "group_name": reloaded_group.group_name,
        "group_avatar": reloaded_group.group_avatar,
        "created_at": reloaded_group.created_at,
        "created_by": reloaded_group.created_by,
        "participants": reloaded_group.participants,
        "last_message": None,
        "unread_count": 0
    }
