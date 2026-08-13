import datetime
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

def seed_data():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(models.User).first():
        print("Database already seeded.")
        return
        
    print("Seeding database...")
    
    # 1. Create Users
    users_data = [
        {"phone": "+1234567890", "display_name": "Alice Smith", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"},
        {"phone": "+1987654321", "display_name": "Bob Jones", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"},
        {"phone": "+1122334455", "display_name": "Charlie Brown", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie"},
        {"phone": "+1555666777", "display_name": "Diana Prince", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana"},
        {"phone": "+1444555666", "display_name": "Eve Adams", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve"},
    ]
    
    users = []
    for ud in users_data:
        u = models.User(phone=ud["phone"], display_name=ud["display_name"], avatar_url=ud["avatar_url"])
        db.add(u)
        users.append(u)
    db.commit()
    for u in users:
        db.refresh(u)
        
    # 2. Create Contacts
    # Alice adds Bob and Charlie
    c1 = models.Contact(user_id=users[0].id, contact_user_id=users[1].id)
    c2 = models.Contact(user_id=users[0].id, contact_user_id=users[2].id)
    # Bob adds Alice
    c3 = models.Contact(user_id=users[1].id, contact_user_id=users[0].id)
    db.add_all([c1, c2, c3])
    db.commit()

    # 3. Create DM Conversation (Alice & Bob)
    dm = models.Conversation(is_group=False)
    db.add(dm)
    db.commit()
    db.refresh(dm)
    
    p1 = models.Participant(conversation_id=dm.id, user_id=users[0].id, is_admin=True)
    p2 = models.Participant(conversation_id=dm.id, user_id=users[1].id, is_admin=True)
    db.add_all([p1, p2])
    db.commit()
    
    # Add messages
    m1 = models.Message(conversation_id=dm.id, sender_id=users[0].id, content="Hey Bob!", status="read")
    m2 = models.Message(conversation_id=dm.id, sender_id=users[1].id, content="Hi Alice, how are you?", status="read")
    db.add_all([m1, m2])
    db.commit()
    
    # 4. Create Group Conversation (Alice, Bob, Charlie)
    group = models.Conversation(is_group=True, group_name="Weekend Plans", created_by=users[0].id)
    db.add(group)
    db.commit()
    db.refresh(group)
    
    pg1 = models.Participant(conversation_id=group.id, user_id=users[0].id, is_admin=True)
    pg2 = models.Participant(conversation_id=group.id, user_id=users[1].id, is_admin=False)
    pg3 = models.Participant(conversation_id=group.id, user_id=users[2].id, is_admin=False)
    db.add_all([pg1, pg2, pg3])
    db.commit()
    
    gm1 = models.Message(conversation_id=group.id, sender_id=users[0].id, content="Where are we going this weekend?", status="sent")
    db.add(gm1)
    db.commit()
    
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed_data()
