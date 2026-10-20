import bcrypt


def get_password_hash(password: str) -> str:
    """
    Hash a plaintext password using bcrypt with a securely generated salt.
    Never stores or logs the plaintext password.
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    # Bcrypt has a 72-byte max length limit for passwords.
    # We enforce a clean check to prevent silent truncation.
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password exceeds maximum bcrypt length of 72 bytes.")

    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify whether a plaintext password matches the stored bcrypt hash.
    Safely handles malformed hashes and timing attack resistance.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False
