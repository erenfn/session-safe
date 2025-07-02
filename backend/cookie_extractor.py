import os
import time
import sqlite3
import base64
import json
import requests
import argparse
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Updated path for Google Chrome
CHROME_COOKIE_DB = os.path.expanduser('~/.config/google-chrome/Default/Cookies')
ENCRYPTION_KEY = os.environ.get('COOKIE_ENCRYPTION_KEY', 'this_is_a_32byte_key_12345678901')

def parse_arguments():
    parser = argparse.ArgumentParser(description='Extract cookies from Chrome for a specific domain')
    parser.add_argument('--target-domain', required=True, help='Target domain to extract cookies for')
    parser.add_argument('--session-id', required=True, help='Session ID for posting cookies')
    parser.add_argument('--backend-url', default='http://host.docker.internal:3000', 
                       help='Backend URL for posting cookies (default: http://host.docker.internal:3000)')
    parser.add_argument('--script-secret', default=None, help='Secret for authenticating with backend (overrides env var)')
    return parser.parse_args()

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


def extract_cookies(target_domain):
    if not os.path.exists(CHROME_COOKIE_DB):
        return None
    try:
        conn = sqlite3.connect(CHROME_COOKIE_DB)
        cursor = conn.cursor()
        cursor.execute("SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly FROM cookies WHERE host_key LIKE ?", (f"%{target_domain}",))
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


def post_cookies(encrypted_cookies, backend_url, session_id, script_secret=None):
    url = f"{backend_url}/api/session/{session_id}/cookies"
    if script_secret is None:
        script_secret = os.environ.get('PYTHON_SCRIPT_SECRET', 'python-script-secret-key-2024')
    headers = {
        "x-python-script-auth": script_secret
    }
    try:
        resp = requests.post(url, json={'encryptedCookies': encrypted_cookies}, headers=headers)
        print(f"POST {url} status: {resp.status_code}")
        return resp.status_code == 200
    except Exception as e:
        print(f"Error posting cookies: {e}")
        return False


def main(target_domain, backend_url, session_id, script_secret=None):
    """
    Main function to extract cookies and post them to the backend.
    Polls for cookies for up to 5 minutes.
    """
    timeout_seconds = 300  # 5 minutes
    check_interval_seconds = 10
    start_time = time.time()

    while time.time() - start_time < timeout_seconds:
        cookies = extract_cookies(target_domain)
        if cookies:
            print(f"Found cookies: {cookies}")
            data = json.dumps(cookies).encode('utf-8')
            encrypted = encrypt_data(data)
            if post_cookies(encrypted, backend_url, session_id, script_secret):
                print("Cookies sent successfully. Exiting.")
                return
        time.sleep(check_interval_seconds)
    
    print("Timeout: No cookies found after 10 minutes.")

if __name__ == '__main__':
    args = parse_arguments()
    main(args.target_domain, args.backend_url, args.session_id, args.script_secret) 