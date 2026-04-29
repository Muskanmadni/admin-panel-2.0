import uuid
from passlib.context import CryptContext
from src.database.session import SessionLocal, engine
from src.models.models import Base, Tenant, User

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

try:
    existing_tenant = db.query(Tenant).first()
    if existing_tenant:
        print(f"Tenant already exists: {existing_tenant.name}")
        tenant = existing_tenant
    else:
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Default Organization",
            slug="default-org",
            is_active=True
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        print(f"Created tenant: {tenant.name} (id: {tenant.id})")

    existing_user = db.query(User).filter(User.email == "admin@example.com").first()
    if existing_user:
        print(f"User already exists: {existing_user.email}")
    else:
        hashed_password = pwd_context.hash("admin123")
        user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            hashed_password=hashed_password,
            full_name="Admin User",
            role="admin",
            tenant_id=tenant.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"Created user: {user.email} (id: {user.id})")
        print(f"Password: admin123")
finally:
    db.close()
