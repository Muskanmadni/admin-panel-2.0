import json
from sqlalchemy import create_engine, inspect
from src.database.session import engine
from src.models.models import Base

def check_db():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables in database: {tables}")
    
    expected_tables = ["rbacrole", "rbactempaccess"]
    for table in expected_tables:
        if table in tables:
            print(f"Table '{table}' exists.")
        else:
            print(f"Table '{table}' DOES NOT exist.")

if __name__ == "__main__":
    check_db()
