"""
Seed sample projects into Neon DB.
Run from backend/ directory:
  python seed_projects.py
"""
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from src.database.session import SessionLocal
from src.models.models import Tenant, User
from src.models.workflow import Project

SAMPLE_PROJECTS = [
    {
        "name": "Website Redesign",
        "description": "Redesign the company website with modern UI/UX",
        "status": "active",
        "priority": "high",
        "progress": 65,
        "end_date": "2026-06-30",
    },
    {
        "name": "Mobile App Development",
        "description": "Build iOS and Android app for employees",
        "status": "active",
        "priority": "medium",
        "progress": 30,
        "end_date": "2026-08-15",
    },
    {
        "name": "Database Migration",
        "description": "Migrate legacy database to Neon PostgreSQL",
        "status": "completed",
        "priority": "high",
        "progress": 100,
        "end_date": "2026-04-01",
    },
    {
        "name": "API Integration",
        "description": "Integrate third-party payment and shipping APIs",
        "status": "pending",
        "priority": "low",
        "progress": 0,
        "end_date": "2026-09-01",
    },
]

db = SessionLocal()

try:
    # Find a tenant that has at least one user
    owner = db.query(User).filter(User.tenant_id != None).first()
    if not owner:
        print("No user with a tenant found. Please register an organization user first.")
        sys.exit(1)

    tenant = db.query(Tenant).filter(Tenant.id == owner.tenant_id).first()
    print(f"Using tenant: {tenant.name} (id: {tenant.id})")
    print(f"Using owner:  {owner.email} (id: {owner.id})")

    added = 0
    for data in SAMPLE_PROJECTS:
        exists = db.query(Project).filter(
            Project.name == data["name"],
            Project.tenant_id == tenant.id
        ).first()
        if exists:
            print(f"  skip (exists): {data['name']}")
            continue

        project = Project(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            owner_id=owner.id,
            created_by=owner.id,
            **data,
        )
        db.add(project)
        added += 1
        print(f"  + {data['name']}")

    db.commit()
    print(f"\nDone -- {added} project(s) inserted.")

except Exception as e:
    db.rollback()
    print(f"Error: {e}")
    raise
finally:
    db.close()
