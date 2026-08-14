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

app = FastAPI(title="Signal Clone API")

# Configure CORS dynamically based on FRONTEND_URL env var
allowed_origins = get_allowed_origins()
if isinstance(allowed_origins, str):
    allowed_origins = [allowed_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for local uploaded images
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static_uploads")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include REST routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Signal Clone API"}

# Mount Socket.io directly on FastAPI app so it works regardless of whether
# Render/production runs `uvicorn main:app` or `uvicorn main:socket_app`
sio_app = socketio.ASGIApp(sio, socketio_path="")
app.mount("/socket.io", sio_app)

# Wrap FastAPI with Socket.io ASGI middleware as top-level application wrapper
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:socket_app", host="0.0.0.0", port=port, reload=True)
