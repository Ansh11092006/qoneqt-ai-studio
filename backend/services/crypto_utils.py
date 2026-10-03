import os
import base64
import logging
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from backend.config import DATA_DIR

logger = logging.getLogger("crypto_utils")

KEY_FILE = DATA_DIR / ".secret.key"

def _get_or_create_cipher() -> Fernet:
    """Retrieves or creates a secure local Fernet key."""
    env_secret = os.getenv("QONEQT_ENCRYPTION_KEY", "").strip()
    if env_secret:
        # Derive 32-byte urlsafe base64 key from env secret
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"qoneqt_studio_secure_salt_2026",
            iterations=100_000,
        )
        derived = base64.urlsafe_b64encode(kdf.derive(env_secret.encode("utf-8")))
        return Fernet(derived)

    if KEY_FILE.exists():
        try:
            key = KEY_FILE.read_bytes().strip()
            return Fernet(key)
        except Exception as e:
            logger.warning("Failed to read existing secret key, generating new one: %s", e)

    # Generate new Fernet key
    new_key = Fernet.generate_key()
    try:
        KEY_FILE.write_bytes(new_key)
        # Attempt to restrict file permissions on Unix if applicable
        if hasattr(os, "chmod"):
            try:
                os.chmod(KEY_FILE, 0o600)
            except Exception:
                pass
    except Exception as e:
        logger.error("Failed to write secret key file: %s", e)
    return Fernet(new_key)

_CIPHER = None

def get_cipher() -> Fernet:
    global _CIPHER
    if _CIPHER is None:
        _CIPHER = _get_or_create_cipher()
    return _CIPHER

def encrypt_secret(plaintext: str) -> str:
    """Encrypts a plaintext secret into a base64 string."""
    if not plaintext:
        return ""
    cipher = get_cipher()
    encrypted_bytes = cipher.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_secret(ciphertext: str) -> str:
    """Decrypts a base64 ciphertext string back to plaintext."""
    if not ciphertext:
        return ""
    cipher = get_cipher()
    try:
        decrypted_bytes = cipher.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error("Failed to decrypt secret: %s", e)
        return ""

def mask_key(key: str) -> str:
    """Returns a safe masked version of an API key, never exposing the full secret."""
    if not key:
        return ""
    clean = key.strip()
    if len(clean) <= 8:
        return "••••••••"
    prefix = clean[:3] if clean.startswith(("sk-", "AIz", "gsk")) else clean[:2]
    suffix = clean[-4:]
    return f"{prefix}••••••••{suffix}"
