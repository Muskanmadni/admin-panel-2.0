from sqlalchemy import create_engine, text
from src.database.session import engine

def check_data():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM rbacrole"))
        count = result.scalar()
        print(f"Number of roles in rbacrole: {count}")
        
        if count > 0:
            result = conn.execute(text("SELECT role_id, name FROM rbacrole"))
            for row in result:
                print(f"Role: {row.role_id} ({row.name})")
        
        result = conn.execute(text("SELECT COUNT(*) FROM rbactempaccess"))
        count = result.scalar()
        print(f"Number of temp access entries: {count}")

if __name__ == "__main__":
    check_data()
