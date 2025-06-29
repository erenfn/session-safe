import os
import time
import sqlite3
import base64
import json
import requests
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Updated path for Google Chrome
CHROME_COOKIE_DB = os.path.expanduser('~/.config/google-chrome/Default/Cookies')
TARGET_DOMAIN = os.environ.get('TARGET_DOMAIN')
SESSION_ID = os.environ.get('SESSION_ID')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://host.docker.internal:3000')
ENCRYPTION_KEY = os.environ.get('COOKIE_ENCRYPTION_KEY', 'this_is_a_32byte_key_123456789012')

assert TARGET_DOMAIN and SESSION_ID, 'TARGET_DOMAIN and SESSION_ID env vars required'

# Pad key to 32 bytes
key = ENCRYPTION_KEY.encode('utf-8')[:32].ljust(32, b'0')


def encrypt_data(data: bytes) -> str:
    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded = padder.update(data) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(iv + ct).decode('utf-8')


def extract_cookies():
    if not os.path.exists(CHROME_COOKIE_DB):
        return None
    try:
        conn = sqlite3.connect(CHROME_COOKIE_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly FROM cookies WHERE host_key LIKE ?", (f"%{TARGET_DOMAIN}",))
        cookies = [
            {
                'name': row[0],
                'value': row[1],
                'domain': row[2],
                'path': row[3],
                'expires_utc': row[4],
                'secure': bool(row[5]),
                'httponly': bool(row[6]),
            }
            for row in cursor.fetchall()
        ]
        conn.close()
        return cookies if cookies else None
    except Exception as e:
        print(f"Error extracting cookies: {e}")
        return None


def post_cookies(encrypted_cookies):
    url = f"{BACKEND_URL}/api/session/{SESSION_ID}/cookies"
    try:
        resp = requests.post(url, json={'encryptedCookies': encrypted_cookies})
        print(f"POST {url} status: {resp.status_code}")
        return resp.status_code == 200
    except Exception as e:
        print(f"Error posting cookies: {e}")
        return False


def main():
    print(f"Waiting for cookies for domain: {TARGET_DOMAIN}")
    for _ in range(60 * 10):  # Wait up to 10 minutes
        cookies = extract_cookies()
        if cookies:
            print(f"Found cookies: {cookies}")
            data = json.dumps(cookies).encode('utf-8')
            encrypted = encrypt_data(data)
            if post_cookies(encrypted):
                print("Cookies sent successfully. Exiting.")
                return
        time.sleep(10)
    print("Timeout: No cookies found.")

if __name__ == '__main__':
    main() 