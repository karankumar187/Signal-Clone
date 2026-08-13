import socketio
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from jose import JWTError, jwt
from auth_utils import SECRET_KEY, ALGORITHM

# Create async Socket.io server (ASGI compatible)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# Map sid (socket session id) -> user_id
sid_to_user: dict[str, int] = {}
# Map user_id -> set of sids (multiple tabs/devices)
user_to_sids: dict[int, set] = {}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            return None
        return db.query(models.User).filter(models.User.phone == phone).first()
    except JWTError:
        return None


async def emit_to_user(user_id: int, event: str, data: dict):
    """Emit an event to all sockets belonging to a user."""
    sids = user_to_sids.get(user_id, set())
    for sid in sids:
        await sio.emit(event, data, to=sid)


# ──────────────────────────────────────────────
# Connection / Disconnection
# ──────────────────────────────────────────────

@sio.event
async def connect(sid, environ, auth):
    token = None

    # 1) auth dict from socket.io-client { auth: { token } }
    if isinstance(auth, dict):
        token = auth.get("token") or auth.get("Authorization") or auth.get("authorization")

    # 2) Fallback: query string ?token=...
    if not token:
        query = environ.get("QUERY_STRING", "")
        for part in query.split("&"):
            if part.startswith("token="):
                token = part[6:]
                break

    # 3) Fallback: HTTP Authorization header
    if not token:
        auth_header = environ.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    # Strip "Bearer " prefix if present (in case client sends full header value)
    if token and token.startswith("Bearer "):
        token = token[7:]

    if not token:
        # Raise ConnectionRefusedError — the correct way to reject in python-socketio
        # (avoids the 403 retry loop that `return False` causes)
        raise ConnectionRefusedError("authentication required")

    db = SessionLocal()
    try:
        user = get_user_from_token(token, db)
        if not user:
            raise ConnectionRefusedError("invalid token")

        sid_to_user[sid] = user.id
        if user.id not in user_to_sids:
            user_to_sids[user.id] = set()
        user_to_sids[user.id].add(sid)

        # Join per-user room so we can easily target this user
        await sio.enter_room(sid, f"user_{user.id}")
        print(f"[Socket.io] User {user.id} connected (sid={sid})")

        # Mark incoming sent messages as delivered
        user_convs = db.query(models.Participant.conversation_id).filter(
            models.Participant.user_id == user.id
        ).all()
        conv_ids = [c[0] for c in user_convs]
        if conv_ids:
            sent_messages = db.query(models.Message).filter(
                models.Message.conversation_id.in_(conv_ids),
                models.Message.sender_id != user.id,
                models.Message.status == "sent",
            ).all()
            for msg in sent_messages:
                msg.status = "delivered"
                db.add(msg)
            if sent_messages:
                db.commit()
                # Notify the senders
                for msg in sent_messages:
                    await emit_to_user(msg.sender_id, "message_status_update", {
                        "message_id": msg.id,
                        "conversation_id": msg.conversation_id,
                        "status": "delivered",
                    })
    finally:
        db.close()


@sio.event
async def disconnect(sid):
    user_id = sid_to_user.pop(sid, None)
    if user_id and user_id in user_to_sids:
        user_to_sids[user_id].discard(sid)
        if not user_to_sids[user_id]:
            del user_to_sids[user_id]
    print(f"[Socket.io] sid={sid} disconnected")


# ──────────────────────────────────────────────
# Events
# ──────────────────────────────────────────────

@sio.event
async def message_send(sid, data):
    """
    Client emits: message_send({ conversation_id, content, msg_type })
    """
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    db = SessionLocal()
    try:
        conversation_id = data.get("conversation_id")
        content = data.get("content", "")
        msg_type = data.get("msg_type", "text")

        is_participant = db.query(models.Participant).filter(
            models.Participant.conversation_id == conversation_id,
            models.Participant.user_id == user_id,
        ).first()

        if not is_participant:
            return

        participants = db.query(models.Participant).filter(
            models.Participant.conversation_id == conversation_id
        ).all()

        is_delivered = False
        for p in participants:
            if p.user_id != user_id and p.user_id in user_to_sids:
                is_delivered = True
                break

        new_message = models.Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            msg_type=msg_type,
            status="delivered" if is_delivered else "sent",
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        # Fetch sender info
        sender = db.query(models.User).filter(models.User.id == user_id).first()

        payload = {
            "id": new_message.id,
            "conversation_id": new_message.conversation_id,
            "sender_id": new_message.sender_id,
            "sender_name": sender.display_name if sender else "",
            "sender_avatar": sender.avatar_url if sender else None,
            "content": new_message.content,
            "msg_type": new_message.msg_type,
            "status": new_message.status,
            "created_at": new_message.created_at.isoformat(),
        }

        # Notify all participants

        for p in participants:
            await emit_to_user(p.user_id, "message_new", payload)

    finally:
        db.close()


@sio.event
async def typing_start(sid, data):
    """
    Client emits: typing_start({ conversation_id })
    Server forwards to other participants.
    """
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    db = SessionLocal()
    try:
        conversation_id = data.get("conversation_id")
        sender = db.query(models.User).filter(models.User.id == user_id).first()
        participants = db.query(models.Participant).filter(
            models.Participant.conversation_id == conversation_id
        ).all()

        for p in participants:
            if p.user_id != user_id:
                await emit_to_user(p.user_id, "typing_start", {
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "user_name": sender.display_name if sender else "",
                })
    finally:
        db.close()


@sio.event
async def typing_stop(sid, data):
    """
    Client emits: typing_stop({ conversation_id })
    """
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    db = SessionLocal()
    try:
        conversation_id = data.get("conversation_id")
        participants = db.query(models.Participant).filter(
            models.Participant.conversation_id == conversation_id
        ).all()

        for p in participants:
            if p.user_id != user_id:
                await emit_to_user(p.user_id, "typing_stop", {
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                })
    finally:
        db.close()


@sio.event
async def message_read(sid, data):
    """
    Client emits: message_read({ message_id })
    """
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    db = SessionLocal()
    try:
        message_id = data.get("message_id")
        msg = db.query(models.Message).filter(models.Message.id == message_id).first()
        if not msg:
            return

        read_record = db.query(models.MessageRead).filter(
            models.MessageRead.message_id == msg.id,
            models.MessageRead.user_id == user_id,
        ).first()

        if not read_record:
            db.add(models.MessageRead(message_id=msg.id, user_id=user_id))
            if user_id != msg.sender_id:
                msg.status = "read"
            db.commit()

            if user_id != msg.sender_id:
                await emit_to_user(msg.sender_id, "message_status_update", {
                    "message_id": msg.id,
                    "conversation_id": msg.conversation_id,
                    "status": "read",
                })
    finally:
        db.close()
