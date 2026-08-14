from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio
import models
from database import engine
from routers import auth, users, conversations, groups, upload
from socketio_server import sio
import uvicorn
import os

# Create DB tables
models.Base.metadata.create_all(bind=engine)

# Run migrations for columns added after initial deploy (safe to re-run)
from sqlalchemy import text, inspect as sa_inspect
with engine.connect() as _conn:
    existing_cols = [c["name"] for c in sa_inspect(engine).get_columns("users")]
    if "note_to_self_conv_id" not in existing_cols:
        _conn.execute(text("ALTER TABLE users ADD COLUMN note_to_self_conv_id INTEGER REFERENCES conversations(id)"))
        _conn.commit()


from config import get_allowed_origins

fastapi_app = FastAPI(title="Signal Clone API")

# Configure CORS dynamically based on FRONTEND_URL env var
allowed_origins = get_allowed_origins()
if isinstance(allowed_origins, str):
    allowed_origins = [allowed_origins]

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for local uploaded images
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static_uploads")
os.makedirs(STATIC_DIR, exist_ok=True)
fastapi_app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include REST routers
fastapi_app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
fastapi_app.include_router(users.router, prefix="/api/users", tags=["users"])
fastapi_app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
fastapi_app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
fastapi_app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

@fastapi_app.get("/")
def read_root():
    return {"message": "Welcome to Signal Clone API"}

# Wrap FastAPI with Socket.io ASGI middleware.
# Socket.io intercepts /socket.io/* requests; everything else falls through to FastAPI.
# This is exported as `app` so Render's `uvicorn main:app` serves both REST + WebSocket.
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

