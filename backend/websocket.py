from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
from sqlalchemy.orm import Session
from database import get_db
import models
from jose import JWTError, jwt
from auth_utils import SECRET_KEY, ALGORITHM

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # user_id -> List of active WebSocket connections (support multiple devices)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        # Broadcast user online status
        await self.broadcast_user_status(user_id, True)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
                # In a real app, you'd trigger a broadcast_user_status(user_id, False) asynchronously
                # But we'll leave it simplified here since disconnect is sync.

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

    async def broadcast_user_status(self, user_id: int, is_online: bool):
        # In a complete app, you'd find all contacts of user_id and notify them
        # For simplicity, we skip full broadcast here and rely on clients fetching status
        pass

manager = ConnectionManager()

def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            return None
        user = db.query(models.User).filter(models.User.phone == phone).first()
        return user
    except JWTError:
        return None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=1008)
        return
        
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            event_type = message_data.get("type")
            payload = message_data.get("payload", {})
            
            if event_type == "message.send":
                conversation_id = payload.get("conversation_id")
                content = payload.get("content")
                msg_type = payload.get("msg_type", "text")
                
                # Check if participant
                is_participant = db.query(models.Participant).filter(
                    models.Participant.conversation_id == conversation_id,
                    models.Participant.user_id == user.id
                ).first()
                
                if is_participant:
                    # Save to DB
                    new_message = models.Message(
                        conversation_id=conversation_id,
                        sender_id=user.id,
                        content=content,
                        msg_type=msg_type,
                        status="sent"
                    )
                    db.add(new_message)
                    db.commit()
                    db.refresh(new_message)
                    
                    # Notify all participants
                    participants = db.query(models.Participant).filter(
                        models.Participant.conversation_id == conversation_id
                    ).all()
                    
                    message_response = {
                        "type": "message.new",
                        "payload": {
                            "id": new_message.id,
                            "conversation_id": new_message.conversation_id,
                            "sender_id": new_message.sender_id,
                            "content": new_message.content,
                            "msg_type": new_message.msg_type,
                            "status": new_message.status,
                            "created_at": new_message.created_at.isoformat(),
                        }
                    }
                    
                    for p in participants:
                        await manager.send_personal_message(message_response, p.user_id)
                        
            elif event_type == "message.read":
                # Mark as read and notify sender
                message_id = payload.get("message_id")
                msg = db.query(models.Message).filter(models.Message.id == message_id).first()
                if msg:
                    # check if we already read it
                    read_record = db.query(models.MessageRead).filter(
                        models.MessageRead.message_id == msg.id,
                        models.MessageRead.user_id == user.id
                    ).first()
                    
                    if not read_record:
                        new_read = models.MessageRead(message_id=msg.id, user_id=user.id)
                        db.add(new_read)
                        msg.status = "read"
                        db.commit()
                        
                        read_response = {
                            "type": "message.status_update",
                            "payload": {
                                "message_id": msg.id,
                                "conversation_id": msg.conversation_id,
                                "status": "read"
                            }
                        }
                        await manager.send_personal_message(read_response, msg.sender_id)
                        
            elif event_type == "typing.start" or event_type == "typing.stop":
                conversation_id = payload.get("conversation_id")
                participants = db.query(models.Participant).filter(
                    models.Participant.conversation_id == conversation_id
                ).all()
                
                typing_response = {
                    "type": event_type,
                    "payload": {
                        "conversation_id": conversation_id,
                        "user_id": user.id
                    }
                }
                for p in participants:
                    if p.user_id != user.id:
                        await manager.send_personal_message(typing_response, p.user_id)
                        
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
