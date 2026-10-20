from cryptography.fernet import Fernet, InvalidToken
from app.config import get_settings


class EncryptionError(Exception):
    """Base exception for cryptographic operations."""
    pass


class DecryptionError(EncryptionError):
    """Raised when decryption fails due to corruption, tampering, or invalid key."""
    pass


def get_encryption_key() -> bytes:
    """
    Retrieve the configured Fernet encryption key from application settings.
    Never generates ephemeral keys at runtime to guarantee data persistence.
    """
    settings = get_settings()
    key_str = settings.FERNET_ENCRYPTION_KEY
    if not key_str:
        raise EncryptionError("FERNET_ENCRYPTION_KEY is not configured.")
    return key_str.strip().encode("utf-8")


def get_fernet_cipher() -> Fernet:
    """Initialize a Fernet cipher instance using the validated static key."""
    key = get_encryption_key()
    try:
        return Fernet(key)
    except Exception as exc:
        raise EncryptionError("Invalid Fernet encryption key format.") from exc


def encrypt_data(data: bytes) -> bytes:
    """
    Encrypt plaintext bytes using authenticated 128-bit AES in CBC mode with PKCS7
    padding and HMAC-SHA256 authentication (Fernet specification).
    
    Accepts empty bytes (b"") and produces an authenticated ciphertext.
    """
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("Data to encrypt must be bytes or bytearray.")
    cipher = get_fernet_cipher()
    try:
        return cipher.encrypt(bytes(data))
    except Exception as exc:
        raise EncryptionError("Failed to encrypt data.") from exc


def decrypt_data(encrypted_data: bytes) -> bytes:
    """
    Decrypt and verify authentication tag of Fernet ciphertext.
    
    Raises DecryptionError if the ciphertext was modified, tampered with,
    or encrypted with a different key.
    """
    if not isinstance(encrypted_data, (bytes, bytearray)):
        raise TypeError("Encrypted data must be bytes or bytearray.")
    cipher = get_fernet_cipher()
    try:
        return cipher.decrypt(bytes(encrypted_data))
    except InvalidToken as exc:
        raise DecryptionError(
            "Decryption failed: corrupted data, authentication failure, or invalid key."
        ) from exc
    except Exception as exc:
        raise DecryptionError("Decryption operation encountered an unexpected error.") from exc
