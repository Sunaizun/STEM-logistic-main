from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, or_
from sqlalchemy.orm import Session


from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import TokenOut, UserOut
from app.security import create_access_token, verify_password, hash_password
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["auth"])


def normalize_phone(raw: str) -> str:
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits.startswith("8") and len(digits) == 11:
        digits = "7" + digits[1:]
    return digits


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form.username.strip()

    if "@" in identifier:
        user = db.execute(select(User).where(User.email == identifier)).scalar_one_or_none()
    else:
        phone = normalize_phone(identifier)
        user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


@router.post("/change-password")
def change_password(payload: PasswordChangeIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}