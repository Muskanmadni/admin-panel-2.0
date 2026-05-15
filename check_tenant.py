import sys
import os
sys.path.insert(0, os.path.dirname(__file__) + '/backend')

from sqlalchemy import text
from backend.src.database.session import engine

with engine.connect() as conn:
    # Show all tenants
    rows = conn.execute(text("SELECT id, name, slug, org_code, is_active FROM tenant")).fetchall()
    print(f"Total tenants: {len(rows)}")
    for r in rows:
        print(f"  id={r.id}  name={r.name}  slug={r.slug}  org_code={r.org_code}  active={r.is_active}")
