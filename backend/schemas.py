from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class ProfileSetupRequest(BaseModel):
    display_name: str
    about: Optional[str] = "Hey there! I am using Signal."
    avatar_url: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    id: int
    phone: str
    display_name: Optional[str] = None
    about: Optional[str] = None
    avatar_url: Optional[str] = None
    last_seen: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserProfile(UserBase):
    pass

class ContactResponse(BaseModel):
    id: int
    user_id: int
    contact_user_id: int
    nickname: Optional[str] = None
    contact_user: UserBase
    
    model_config = ConfigDict(from_attributes=True)

# --- Message Schemas ---
class MessageCreate(BaseModel):
    content: str
    msg_type: str = "text"

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    msg_type: str
    status: str
    created_at: datetime
    edited_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Conversation / Group Schemas ---
class ParticipantResponse(BaseModel):
    user_id: int
    is_admin: bool
    user: UserBase
    
    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: int
    is_group: bool
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
    participants: List[ParticipantResponse]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class CreateGroupRequest(BaseModel):
    group_name: str
    participant_ids: List[int]
    group_avatar: Optional[str] = None

class CreateDMRequest(BaseModel):
    contact_id: int
