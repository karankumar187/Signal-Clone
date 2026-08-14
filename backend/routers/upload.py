from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
import cloudinary
import cloudinary.uploader
import os
import uuid
import shutil
from auth_utils import get_current_user
import models

router = APIRouter()

# Configure Cloudinary if env variables exist
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")

if CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
elif CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )

# Static directory for local fallback uploads
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static_uploads")
os.makedirs(STATIC_DIR, exist_ok=True)

@router.post("/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # If Cloudinary credentials are set, upload directly to Cloudinary
    is_cloudinary_configured = bool(CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET))
    if is_cloudinary_configured:
        try:
            result = cloudinary.uploader.upload(file.file, folder="signal_clone")
            return {"url": result.get("secure_url")}
        except Exception as e:
            print("Cloudinary upload failed, falling back to local storage:", e)

    # Local storage fallback (construct URL using actual request base URL)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(STATIC_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/static/{filename}"
    return {"url": url}
