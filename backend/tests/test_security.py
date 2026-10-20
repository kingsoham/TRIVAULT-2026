import pytest
from datetime import timedelta
import jwt

from app.security.encryption import (
    encrypt_data,
    decrypt_data,
    DecryptionError,
)
from app.security.sharding import (
    split_data,
    combine_shards,
    ShardingError,
)
from app.security.passwords import get_password_hash, verify_password
from app.security.tokens import create_access_token, decode_access_token


class TestEncryption:
    def test_encrypt_decrypt_round_trip(self):
        original = b"TriVault secure file encryption test payload 123456!"
        encrypted = encrypt_data(original)
        assert encrypted != original
        decrypted = decrypt_data(encrypted)
        assert decrypted == original

    def test_encrypt_empty_bytes(self):
        original = b""
        encrypted = encrypt_data(original)
        assert len(encrypted) > 0  # Fernet adds IV, timestamp, HMAC
        decrypted = decrypt_data(encrypted)
        assert decrypted == b""

    def test_encrypt_large_payload(self):
        original = b"A" * (1024 * 512)  # 512 KB
        encrypted = encrypt_data(original)
        decrypted = decrypt_data(encrypted)
        assert decrypted == original

    def test_tampered_ciphertext_fails(self):
        original = b"Confidential data"
        encrypted = bytearray(encrypt_data(original))
        # Tamper with byte in the payload
        encrypted[25] ^= 0xFF
        with pytest.raises(DecryptionError):
            decrypt_data(bytes(encrypted))

    def test_invalid_type_raises_type_error(self):
        with pytest.raises(TypeError):
            encrypt_data("not bytes string")  # type: ignore

        with pytest.raises(TypeError):
            decrypt_data(12345)  # type: ignore


class TestSharding:
    def test_split_returns_exactly_three_shards(self):
        data = b"abcdefghijklmnopqrstuvwxyz"
        shards = split_data(data, number_of_shards=3)
        assert len(shards) == 3
        assert combine_shards(shards) == data

    def test_split_empty_data(self):
        data = b""
        shards = split_data(data, number_of_shards=3)
        assert len(shards) == 3
        assert shards == [b"", b"", b""]
        assert combine_shards(shards) == b""

    def test_split_single_byte(self):
        data = b"X"
        shards = split_data(data, number_of_shards=3)
        assert len(shards) == 3
        assert shards == [b"X", b"", b""]
        assert combine_shards(shards) == b"X"

    def test_split_two_bytes(self):
        data = b"XY"
        shards = split_data(data, number_of_shards=3)
        assert len(shards) == 3
        assert shards == [b"X", b"Y", b""]
        assert combine_shards(shards) == b"XY"

    def test_split_uneven_lengths(self):
        # 10 bytes: 4, 3, 3
        data = b"0123456789"
        shards = split_data(data, number_of_shards=3)
        assert len(shards) == 3
        assert len(shards[0]) == 4
        assert len(shards[1]) == 3
        assert len(shards[2]) == 3
        assert combine_shards(shards) == data

    def test_invalid_shard_count_rejected(self):
        with pytest.raises(ValueError, match="strictly requires 3 shards"):
            split_data(b"data", number_of_shards=4)

        with pytest.raises(ValueError, match="strictly requires 3 shards"):
            split_data(b"data", number_of_shards=2)

    def test_combine_wrong_shard_count_raises(self):
        with pytest.raises(ShardingError):
            combine_shards([b"1", b"2"])

        with pytest.raises(ShardingError):
            combine_shards([b"1", b"2", b"3", b"4"])

    def test_combine_non_bytes_raises_type_error(self):
        with pytest.raises(TypeError):
            combine_shards([b"1", "string", b"3"])  # type: ignore


class TestPasswords:
    def test_hash_and_verify(self):
        plain = "MySecretPassphrase!2026"
        hashed = get_password_hash(plain)
        assert hashed != plain
        assert verify_password(plain, hashed) is True
        assert verify_password("WrongPassword!", hashed) is False

    def test_empty_password_raises(self):
        with pytest.raises(ValueError):
            get_password_hash("")

    def test_exceeding_max_length_raises(self):
        with pytest.raises(ValueError, match="72 bytes"):
            get_password_hash("A" * 73)


class TestTokens:
    def test_create_and_decode_token(self):
        token = create_access_token(subject=42, additional_claims={"role": "user"})
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "user"

    def test_expired_token_raises_error(self):
        # Create token that expired 10 minutes ago
        token = create_access_token(
            subject=42,
            expires_delta=timedelta(minutes=-10)
        )
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_access_token(token)

    def test_tampered_token_signature_fails(self):
        token = create_access_token(subject=42)
        # Flip a character in the signature part
        parts = token.split(".")
        tampered_sig = parts[2][:-1] + ("A" if parts[2][-1] != "A" else "B")
        tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"
        with pytest.raises(jwt.PyJWTError):
            decode_access_token(tampered_token)
