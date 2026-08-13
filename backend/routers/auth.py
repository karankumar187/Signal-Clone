from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth_utils import create_access_token, get_current_user
from datetime import timedelta

router = APIRouter()

MOCK_OTP = "123456"

@router.post("/send-otp")
def send_otp(request: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    # In a real app, integrate with Twilio/SNS to send SMS here
    return {"message": "OTP sent successfully (use 123456 to verify)", "phone": request.phone}

@router.post("/verify-otp", response_model=schemas.TokenResponse)
def verify_otp(request: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    if request.otp != MOCK_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user = db.query(models.User).filter(models.User.phone == request.phone).first()
    if not user:
        # Register new user implicitly
        user = models.User(phone=request.phone)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access_token = create_access_token(data={"sub": user.phone})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/setup-profile", response_model=schemas.UserProfile)
def setup_profile(
    request: schemas.ProfileSetupRequest, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.display_name = request.display_name
    current_user.about = request.about
    if request.avatar_url:
        current_user.avatar_url = request.avatar_url
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=schemas.UserProfile)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
