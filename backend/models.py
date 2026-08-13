from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    display_name = Column(String, nullable=True)
    about = Column(String, nullable=True, default="Hey there! I am using Signal.")
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    participants = relationship("Participant", back_populates="user")
    messages = relationship("Message", back_populates="sender")
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")


class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contact_user_id = Column(Integer, ForeignKey("users.id"))
    nickname = Column(String, nullable=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id])
    
    __table_args__ = (UniqueConstraint('user_id', 'contact_user_id', name='_user_contact_uc'),)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    is_group = Column(Boolean, default=False)
    group_name = Column(String, nullable=True)
    group_avatar = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    participants = relationship("Participant", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_admin = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="participants")
    
    __table_args__ = (UniqueConstraint('conversation_id', 'user_id', name='_conversation_user_uc'),)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    msg_type = Column(String, default="text") # text, image
    status = Column(String, default="sent") # sent, delivered, read (for DMs)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    edited_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="messages")
    reads = relationship("MessageRead", back_populates="message")


class MessageRead(Base):
    __tablename__ = "message_reads"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    read_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    message = relationship("Message", back_populates="reads")
    user = relationship("User")
    
    __table_args__ = (UniqueConstraint('message_id', 'user_id', name='_message_user_read_uc'),)
