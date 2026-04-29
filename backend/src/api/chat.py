from typing import List, Dict
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
import json

from src.api import deps
from src.database.session import SessionLocal
from src.models.models import Message, User, Project

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # project_id -> list of websockets
        self.active_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: UUID):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: UUID):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, message: dict, project_id: UUID):
        if project_id in self.active_connections:
            for connection in self.active_connections[project_id]:
                await connection.send_json(message)

manager = ConnectionManager()

async def get_token_user(
    token: str = Query(...),
    db: Session = Depends(deps.get_db)
) -> User:
    # Re-use the same logic from deps.get_current_user but for query param
    return await deps.get_current_user(db=db, token=token)

@router.websocket("/{project_id}")
async def websocket_chat(
    websocket: WebSocket,
    project_id: UUID,
    token: str = Query(...)
):
    # We can't use Depends easily in websocket handlers for some things 
    # so we'll do manual db and auth
    db = SessionLocal()
    try:
        # Authenticate
        try:
            user = await deps.get_current_user(db=db, token=token)
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Verify project and tenant
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.tenant_id == user.tenant_id
        ).first()
        
        if not project:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, project_id)
        
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                content = message_data.get("content")
                
                if content:
                    # Save to database
                    db_message = Message(
                        sender_id=user.id,
                        project_id=project_id,
                        tenant_id=user.tenant_id,
                        content=content
                    )
                    db.add(db_message)
                    db.commit()
                    db.refresh(db_message)

                    # Broadcast to project members
                    broadcast_data = {
                        "id": str(db_message.id),
                        "content": content,
                        "sender_id": str(user.id),
                        "sender_name": user.full_name,
                        "created_at": db_message.created_at.isoformat()
                    }
                    await manager.broadcast(broadcast_data, project_id)

        except WebSocketDisconnect:
            manager.disconnect(websocket, project_id)
            
    finally:
        db.close()
