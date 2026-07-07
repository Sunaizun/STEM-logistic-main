from sqlalchemy import select

from app.database import SessionLocal
from app.models import User, UserRole
from app.security import hash_password


def main():
    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.email == "admin@stem.kz")).scalar_one_or_none()
        if existing:
            print("Admin already exists: admin@stem.kz")
            return
        user = User(name="Admin", email="admin@stem.kz", password_hash=hash_password("admin12345"), role=UserRole.ADMIN)
        db.add(user)
        db.commit()
        print("Created admin: admin@stem.kz / admin12345")
    finally:
        db.close()


if __name__ == "__main__":
    main()
