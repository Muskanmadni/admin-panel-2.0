import boto3
import uuid
from typing import Optional
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session
from fastapi import UploadFile

from src.config.settings import settings
from src.models.models import File, User

class FileService:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )

    def generate_presigned_url(self, file_name: str, file_type: str, tenant_id: uuid.UUID):
        object_name = f"{tenant_id}/{uuid.uuid4()}-{file_name}"
        try:
            response = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": object_name,
                    "ContentType": file_type
                },
                ExpiresIn=3600
            )
            return response, object_name
        except ClientError as e:
            return None, None

    def upload_file(self, db: Session, file: UploadFile, current_user: User) -> File:
        file_id = uuid.uuid4()
        object_name = f"{current_user.tenant_id}/{file_id}-{file.filename}"
        
        try:
            self.s3_client.upload_fileobj(
                file.file,
                settings.S3_BUCKET_NAME,
                object_name,
                ExtraArgs={"ContentType": file.content_type}
            )
        except ClientError as e:
            raise Exception(f"Failed to upload to S3: {e}")

        file_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{object_name}"
        
        db_obj = File(
            id=file_id,
            name=file.filename,
            file_type=file.content_type,
            size=file.size,
            url=file_url,
            tenant_id=current_user.tenant_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

file_service = FileService()
