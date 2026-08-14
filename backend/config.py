import os

def get_allowed_origins():
    """
    Retrieves allowed origins for CORS and Socket.io from FRONTEND_URL env var.
    Defaults to local dev origins + deployed Vercel domain.
    """
    default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://signal-clone-navy.vercel.app",
    ]
    
    frontend_url = os.getenv("FRONTEND_URL") or os.getenv("ALLOWED_ORIGINS")
    
    if not frontend_url:
        return default_origins
    
    if frontend_url.strip() == "*":
        return "*"
    
    # Split comma-separated origins and strip trailing slashes
    custom_origins = [
        url.strip().rstrip("/") for url in frontend_url.split(",") if url.strip()
    ]
    
    # Combine with default local development origins
    combined = list(set(default_origins + custom_origins))
    return combined
