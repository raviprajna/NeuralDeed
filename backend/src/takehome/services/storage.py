"""Object storage service for Railway deployment.

Railway doesn't persist local file storage between deployments.
We use Cloudflare R2 (S3-compatible) for production document storage.
"""
from __future__ import annotations

import io
import os
from typing import BinaryIO

import structlog

logger = structlog.get_logger()

# Check if we're in production (Railway) or local development
# For now, always use local storage (uploads folder) even in production
USE_R2 = os.environ.get("USE_R2") == "true"  # Only use R2 if explicitly enabled

if USE_R2:
    import boto3
    from botocore.config import Config

    # Cloudflare R2 configuration
    R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
    R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
    R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
    R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "neuraldeed-documents")

    # S3-compatible client for R2
    s3_client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )

    logger.info("Initialized R2 storage", bucket=R2_BUCKET_NAME)


async def save_file(file_content: bytes, file_key: str) -> str:
    """Save file to storage (R2 in production, local in development).

    Args:
        file_content: Binary file content
        file_key: Unique file identifier (e.g., "documents/abc123_file.pdf")

    Returns:
        str: Storage path/key that can be used to retrieve the file
    """
    if USE_R2:
        # Upload to R2
        try:
            s3_client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=file_key,
                Body=file_content,
                ContentType="application/pdf",
            )
            logger.info("Uploaded to R2", key=file_key, size=len(file_content))
            return f"r2://{R2_BUCKET_NAME}/{file_key}"
        except Exception as e:
            logger.error("R2 upload failed", error=str(e))
            raise ValueError(f"Failed to upload to R2: {str(e)}")
    else:
        # Local development: save to disk
        from takehome.config import settings

        file_path = os.path.join(settings.upload_dir, file_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(file_content)

        logger.info("Saved to local disk", path=file_path, size=len(file_content))
        return file_path


async def read_file(storage_path: str) -> bytes:
    """Read file from storage.

    Args:
        storage_path: Path returned from save_file()

    Returns:
        bytes: File content
    """
    if storage_path.startswith("r2://"):
        # Parse R2 path: r2://bucket/key
        parts = storage_path.replace("r2://", "").split("/", 1)
        bucket = parts[0]
        key = parts[1]

        try:
            response = s3_client.get_object(Bucket=bucket, Key=key)
            content = response["Body"].read()
            logger.info("Downloaded from R2", key=key, size=len(content))
            return content
        except Exception as e:
            logger.error("R2 download failed", error=str(e))
            raise ValueError(f"Failed to download from R2: {str(e)}")
    else:
        # Local file path
        if not os.path.exists(storage_path):
            raise FileNotFoundError(f"File not found: {storage_path}")

        with open(storage_path, "rb") as f:
            content = f.read()

        logger.info("Read from local disk", path=storage_path, size=len(content))
        return content


async def delete_file(storage_path: str) -> bool:
    """Delete file from storage.

    Args:
        storage_path: Path returned from save_file()

    Returns:
        bool: True if deleted, False if not found
    """
    if storage_path.startswith("r2://"):
        # Parse R2 path
        parts = storage_path.replace("r2://", "").split("/", 1)
        bucket = parts[0]
        key = parts[1]

        try:
            s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info("Deleted from R2", key=key)
            return True
        except Exception as e:
            logger.error("R2 delete failed", error=str(e))
            return False
    else:
        # Local file
        if os.path.exists(storage_path):
            os.remove(storage_path)
            logger.info("Deleted from local disk", path=storage_path)
            return True
        return False


def get_public_url(storage_path: str) -> str:
    """Get public URL for file (if applicable).

    For R2, this would be the public R2 URL.
    For local, this returns the API endpoint.
    """
    if storage_path.startswith("r2://"):
        parts = storage_path.replace("r2://", "").split("/", 1)
        bucket = parts[0]
        key = parts[1]
        # R2 public URL format (if bucket has public access)
        return f"https://pub-{R2_ACCOUNT_ID}.r2.dev/{key}"
    else:
        # Local files served via API
        return storage_path
