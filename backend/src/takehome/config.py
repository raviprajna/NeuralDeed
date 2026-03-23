from __future__ import annotations

import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database URL - REQUIRED, no default (must be set in environment)
    database_url: str
    anthropic_api_key: str = ""
    upload_dir: str = "uploads"  # Will be made absolute below
    max_upload_size: int = 25 * 1024 * 1024  # 25MB

    model_config = {"env_file": ".env"}


settings = Settings()

# Make upload_dir absolute if it's relative
# Check for Railway volume at /uploads first, then fall back to /app/uploads
if not os.path.isabs(settings.upload_dir):
    # Check if /uploads exists (Railway volume)
    railway_upload_path = "/uploads"
    if os.path.exists(railway_upload_path) and os.path.isdir(railway_upload_path):
        settings.upload_dir = railway_upload_path
    else:
        # Use /app/uploads for standard deployment
        settings.upload_dir = os.path.join(os.getcwd(), settings.upload_dir)

# Ensure the Anthropic API key is available as an environment variable
# so that pydantic-ai's Anthropic integration can pick it up.
if settings.anthropic_api_key:
    os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)
