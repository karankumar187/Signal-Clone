from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth_utils import get_current_user
from typing import List

router = APIRouter()

@router.get("/search", response_model=List[schemas.UserBase])
def search_users(
    q: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not q or len(q) < 3:
        return []
    
    users = db.query(models.User).filter(
        (models.User.phone.contains(q)) | (models.User.display_name.ilike(f"%{q}%")),
        models.User.id != current_user.id
    ).limit(20).all()
    
    return users

@router.get("/{user_id}", response_model=schemas.UserBase)
def get_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/contacts/", response_model=List[schemas.ContactResponse])
def get_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contacts = db.query(models.Contact).filter(models.Contact.user_id == current_user.id).all()
    return contacts
