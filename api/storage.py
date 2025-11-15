"""
Storage service for VaultScribe
Supports AWS S3, Azure Blob Storage, and local file storage
"""

import os
from datetime import datetime, timedelta
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from pathlib import Path

# Optional Azure imports
try:
    from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    BlobServiceClient = None
    generate_blob_sas = None
    BlobSasPermissions = None


class StorageService:
    """Unified storage interface for S3, Azure, and local storage"""

    def __init__(self):
        self.backend = os.getenv("STORAGE_BACKEND", "local").lower()
        self.expiration = int(os.getenv("UPLOAD_URL_EXPIRATION", "3600"))

        if self.backend == "s3":
            self._init_s3()
        elif self.backend == "azure":
            self._init_azure()
        elif self.backend == "local":
            self._init_local()
        else:
            raise ValueError(f"Unsupported storage backend: {self.backend}")

    def _init_s3(self):
        """Initialize AWS S3 client"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )
        self.bucket_name = os.getenv("S3_BUCKET_NAME")
        if not self.bucket_name:
            raise ValueError("S3_BUCKET_NAME must be set when using S3 backend")

    def _init_azure(self):
        """Initialize Azure Blob Storage client"""
        if not AZURE_AVAILABLE:
            raise ValueError("Azure Storage SDK not installed. Run: pip install azure-storage-blob")

        account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
        account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
        self.container_name = os.getenv("AZURE_CONTAINER_NAME", "vaultscribe-recordings")

        if not account_name or not account_key:
            raise ValueError("AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY must be set")

        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={account_key};EndpointSuffix=core.windows.net"
        self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        self.account_name = account_name
        self.account_key = account_key

    def _init_local(self):
        """Initialize local file storage"""
        base_dir = Path(__file__).resolve().parent.parent
        self.uploads_dir = base_dir / "uploads"
        self.uploads_dir.mkdir(exist_ok=True)

    def generate_upload_url(self, session_id: str, filename: str = "recording.webm") -> str:
        """
        Generate a presigned URL for uploading a file

        Args:
            session_id: Unique session identifier
            filename: Name of the file to upload

        Returns:
            Presigned URL for uploading the file
        """
        if self.backend == "s3":
            return self._generate_s3_upload_url(session_id, filename)
        elif self.backend == "azure":
            return self._generate_azure_upload_url(session_id, filename)
        elif self.backend == "local":
            return self._generate_local_upload_url(session_id)
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")

    def _generate_s3_upload_url(self, session_id: str, filename: str) -> str:
        """Generate S3 presigned URL for upload"""
        object_key = f"{session_id}/{filename}"

        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key,
                    'ContentType': 'audio/webm'
                },
                ExpiresIn=self.expiration
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate S3 presigned URL: {str(e)}")

    def _generate_azure_upload_url(self, session_id: str, filename: str) -> str:
        """Generate Azure Blob Storage presigned URL for upload"""
        blob_name = f"{session_id}/{filename}"

        try:
            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=self.container_name,
                blob_name=blob_name,
                account_key=self.account_key,
                permission=BlobSasPermissions(write=True, create=True),
                expiry=datetime.utcnow() + timedelta(seconds=self.expiration)
            )

            # Construct the full URL
            url = f"https://{self.account_name}.blob.core.windows.net/{self.container_name}/{blob_name}?{sas_token}"
            return url
        except Exception as e:
            raise Exception(f"Failed to generate Azure presigned URL: {str(e)}")

    def _generate_local_upload_url(self, session_id: str) -> str:
        """Generate local upload URL (API endpoint)"""
        # For local storage, return the API endpoint for uploading
        return f"/api/session/{session_id}/upload"

    def get_storage_info(self) -> dict:
        """Get information about the configured storage backend"""
        info = {
            "backend": self.backend,
            "url_expiration_seconds": self.expiration
        }

        if self.backend == "s3":
            info["bucket"] = self.bucket_name
            info["region"] = os.getenv("AWS_REGION", "us-east-1")
        elif self.backend == "azure":
            info["account"] = self.account_name
            info["container"] = self.container_name
        elif self.backend == "local":
            info["upload_directory"] = str(self.uploads_dir)

        return info


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Get or create the storage service singleton"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
