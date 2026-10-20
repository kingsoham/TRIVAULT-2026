from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import timedelta

from app.database import get_session
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)
from app.security.passwords import get_password_hash, verify_password
from app.security.tokens import create_access_token
from app.security.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(
    request: UserRegisterRequest,
    session: Session = Depends(get_session)
):
    """
    Registers a new user account with unique username and email.
    Hashes password using bcrypt. Never stores plaintext passwords.
    """
    # Check if username is already taken
    existing_username = session.exec(
        select(User).where(User.username == request.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username already exists."
        )

    # Check if email is already registered
    existing_email = session.exec(
        select(User).where(User.email == request.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    # Hash the password securely
    hashed_pwd = get_password_hash(request.password)

    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=hashed_pwd
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive an expiring JWT access token"
)
def login(
    request: UserLoginRequest,
    session: Session = Depends(get_session)
):
    """
    Validates user credentials and issues an HMAC-SHA256 signed JWT token.
    Uses a generic error message to prevent account enumeration.
    """
    # Support logging in with either username or email
    user = session.exec(
        select(User).where(
            (User.username == request.username) | (User.email == request.username)
        )
    ).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    settings = get_settings()
    expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    access_token = create_access_token(
        subject=user.id,
        additional_claims={"username": user.username},
        expires_delta=timedelta(minutes=expires_minutes)
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_minutes * 60,
        user=UserResponse.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Resolves the authenticated user from the active JWT bearer token.
    """
    return current_user
