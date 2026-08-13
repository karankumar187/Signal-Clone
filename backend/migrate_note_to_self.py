"""
One-time migration: adds note_to_self_conv_id column to the users table.
Run once: python migrate_note_to_self.py
"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN note_to_self_conv_id INTEGER REFERENCES conversations(id)"
        ))
        conn.commit()
        print("Migration successful: note_to_self_conv_id column added.")
    except Exception as e:
        print(f"Migration skipped (column may already exist): {e}")
