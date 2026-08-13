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

app = FastAPI(title="Signal Clone API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# Wrap FastAPI with Socket.io ASGI middleware
# Socket.io will handle /socket.io/* paths; everything else goes to FastAPI
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:socket_app", host="0.0.0.0", port=port, reload=True)
