import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64


# !!! IMPORTANT SECURITY NOTE !!!
# CHANGE THIS SALT to a unique, secure random byte string and keep it secret and consistent.
# Example generation: import os; os.urandom(16)
SALT = b'\x1f\x8b\xcd\x01\xef\x9a\x23\x45\x67\x89\xab\xcd\xef\x00\x12\x34' # Secure 16-byte random salt # <<< --- CHANGE THIS VALUE!

def _derive_key(password: str, salt: bytes) -> bytes:
    """Derives a 32-byte key for Fernet using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000, # NIST recommendation for PBKDF2
    )
    key = kdf.derive(password.encode())
    return base64.urlsafe_b64encode(key)

ENCRYPTION_KEY_STR = os.getenv('FLASK_SECRET_ENCRYPTION_KEY')
if not ENCRYPTION_KEY_STR:
    raise ValueError("FLASK_SECRET_ENCRYPTION_KEY environment variable not set. Cannot proceed with encryption.")

# Derive the Fernet key
FERNET_KEY = _derive_key(ENCRYPTION_KEY_STR, SALT)

fernet = Fernet(FERNET_KEY)

def encrypt_data(data: str) -> str:
    """Encrypts a string and returns it as a string."""
    if not data:
        return ""
    try:
        encrypted_bytes = fernet.encrypt(data.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"Error encrypting data: {e}") # Consider proper logging
        raise

def decrypt_data(encrypted_data: str) -> str:
    """Decrypts a string and returns it."""
    if not encrypted_data:
        return ""
    try:
        decrypted_bytes = fernet.decrypt(encrypted_data.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"Error decrypting data: {e}") # Consider proper logging
        raise