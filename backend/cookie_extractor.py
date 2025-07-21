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
import glob
import shutil
import socket
from urllib.parse import urlparse, urlunparse

# Updated path for Google Chrome
CHROME_COOKIE_DB = os.path.expanduser('~/.config/google-chrome/Default/Cookies')

# Updated path for Mozilla Firefox (browser user)
FIREFOX_PROFILE_PATH = '/home/browser/.mozilla/firefox/'
FIXED_PROFILE_PATH = '/home/browser/.mozilla/firefox/session.default'

def parse_arguments():
    parser = argparse.ArgumentParser(description='Extract cookies from Firefox for a specific domain')
    parser.add_argument('--target-domain', required=True, help='Target domain to extract cookies for')
    parser.add_argument('--session-id', required=True, help='Session ID for posting cookies')
    parser.add_argument('--api-url', required=True, help='Backend API URL for posting cookies')
    parser.add_argument('--secret', required=True, help='Secret for authenticating with backend')
    parser.add_argument('--encryption-key', required=True, help='Encryption key for encrypting cookies')
    return parser.parse_args()

def get_key_from_args(args):
    return args.encryption_key.encode('utf-8')[:32].ljust(32, b'0')

def encrypt_data(data: bytes, key: bytes) -> str:
    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded = padder.update(data) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(iv + ct).decode('utf-8')

def get_firefox_cookie_db():
    # First check the fixed profile path used by our containers
    fixed_cookie_db = os.path.join(FIXED_PROFILE_PATH, 'cookies.sqlite')
    if os.path.exists(fixed_cookie_db):
        print(f"DEBUG: Using fixed profile cookie database: {fixed_cookie_db}")
        return fixed_cookie_db

    print(f"DEBUG: Looking for Firefox profiles in: {FIREFOX_PROFILE_PATH}")
    if not os.path.exists(FIREFOX_PROFILE_PATH):
        print(f"DEBUG: Firefox profile path does not exist: {FIREFOX_PROFILE_PATH}")
        return None
    
    # Prefer *.default-release profile
    default_release_profiles = glob.glob(os.path.join(FIREFOX_PROFILE_PATH, '*.default-release'))
    if default_release_profiles:
        print(f"DEBUG: Found default-release profile(s): {default_release_profiles}")
        cookie_db = os.path.join(default_release_profiles[0], 'cookies.sqlite')
        print(f"DEBUG: Using cookie database: {cookie_db}")
        return cookie_db
    
    # Fallback to any *.default* profile
    profiles = glob.glob(os.path.join(FIREFOX_PROFILE_PATH, '*.default*'))
    print(f"DEBUG: Found {len(profiles)} Firefox profiles: {profiles}")
    if not profiles:
        print("DEBUG: No Firefox profiles found")
        return None
    cookie_db = os.path.join(profiles[0], 'cookies.sqlite')
    print(f"DEBUG: Using cookie database: {cookie_db}")
    return cookie_db

def extract_cookies(target_domain):
    print(f"DEBUG: Extracting cookies for domain: {target_domain}")
    cookie_db = get_firefox_cookie_db()
    
    if not cookie_db:
        print("DEBUG: No cookie database found")
        return None
    
    if not os.path.exists(cookie_db):
        print(f"DEBUG: Cookie database file does not exist: {cookie_db}")
        return None
    
    print(f"DEBUG: Cookie database exists, size: {os.path.getsize(cookie_db)} bytes")
    
    # Copy the database to a temp location to avoid 'database is locked' error
    temp_db = '/tmp/cookies.sqlite'
    try:
        shutil.copy2(cookie_db, temp_db)
        print(f"DEBUG: Copied cookie database to {temp_db}")
    except Exception as e:
        print(f"DEBUG: Failed to copy cookie database: {e}")
        return None

    try:
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        # Check if moz_cookies table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='moz_cookies'")
        if not cursor.fetchone():
            print("DEBUG: moz_cookies table does not exist")
            # List all tables for debugging
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"DEBUG: Available tables: {[table[0] for table in tables]}")
            conn.close()
            return None
        
        query = "SELECT name, value, host, path, expiry, isSecure, isHttpOnly FROM moz_cookies WHERE host = ? OR host LIKE ?"
        print(f"DEBUG: Executing query: {query} with parameters: {target_domain}, %.{target_domain}")
        
        cursor.execute(query, (target_domain, f"%.{target_domain}"))
        rows = cursor.fetchall()
        print(f"DEBUG: Found {len(rows)} cookie rows")
        
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
            for row in rows
        ]
        
        print(f"DEBUG: Processed {len(cookies)} cookies")
        if cookies:
            print(f"DEBUG: Cookie names: {[cookie['name'] for cookie in cookies]}")
        
        conn.close()
        return cookies if cookies else None
    except Exception as e:
        print(f"DEBUG: Error extracting cookies: {e}")
        import traceback
        traceback.print_exc()
        return None

def post_cookies(encrypted_cookies, api_url, session_id, secret):
    api_url = resolve_host_in_url(api_url)
    url = f"{api_url}/api/session/{session_id}/cookies"
    headers = {
        "x-python-script-auth": secret
    }
    print(f"DEBUG: Posting cookies to: {url}")
    print(f"DEBUG: Headers: {headers}")
    try:
        resp = requests.post(url, json={'encryptedCookies': encrypted_cookies}, headers=headers)
        print(f"DEBUG: POST {url} status: {resp.status_code}")
        print(f"DEBUG: Response content: {resp.text[:200]}...")  # First 200 chars
        return resp.status_code == 200
    except Exception as e:
        print(f"DEBUG: Error posting cookies: {e}")
        import traceback
        traceback.print_exc()
        return False

def main(target_domain, api_url, session_id, secret):
    """
    Main function to extract cookies and post them to the backend.
    Polls for cookies for up to 3 minutes.
    """
    print(f"DEBUG: Starting cookie extraction for domain: {target_domain}")
    print(f"DEBUG: API URL: {api_url}")
    print(f"DEBUG: Session ID: {session_id}")
    
    timeout_seconds = 180  # 3 minutes
    check_interval_seconds = 10
    start_time = time.time()

    while time.time() - start_time < timeout_seconds:
        print(f"DEBUG: Attempt {int((time.time() - start_time) / check_interval_seconds) + 1}")
        cookies = extract_cookies(target_domain)
        if cookies:
            print(f"DEBUG: Found cookies: {cookies}")
            data = json.dumps(cookies).encode('utf-8')
            key = get_key_from_args(args)
            encrypted = encrypt_data(data, key)
            print(f"DEBUG: Encrypted data length: {len(encrypted)}")
            if post_cookies(encrypted, api_url, session_id, secret):
                print("DEBUG: Cookies sent successfully. Exiting.")
                return
        else:
            print("DEBUG: No cookies found in this attempt")
        time.sleep(check_interval_seconds)

    print("DEBUG: Timeout: No cookies found after 3 minutes.")

# ---------------------------------------------------------------------------
# Network helpers
# ---------------------------------------------------------------------------

def resolve_host_in_url(api_url: str) -> str:
    """
    Ensure that the hostname embedded in ``api_url`` is resolvable from inside
    the current runtime (e.g. inside a Docker container).  If the hostname
    cannot be resolved – a common situation for ``host.docker.internal`` on
    Linux unless an explicit host-gateway mapping is supplied – we fall back to
    using the Docker host gateway IP.  The gateway IP can be overridden via the
    ``DOCKER_HOST_GATEWAY`` environment variable; otherwise we default to the
    conventional ``172.17.0.1`` address.
    """
    try:
        parsed = urlparse(api_url)
        # If hostname resolves successfully, we keep the original URL.
        socket.gethostbyname(parsed.hostname)
        return api_url
    except Exception:
        gateway_ip = os.environ.get('DOCKER_HOST_GATEWAY', '172.17.0.1')
        port = f":{parsed.port}" if parsed.port else ''
        new_netloc = f"{gateway_ip}{port}"
        resolved_url = urlunparse(parsed._replace(netloc=new_netloc))
        return resolved_url

if __name__ == '__main__':
    args = parse_arguments()
    main(args.target_domain, args.api_url, args.session_id, args.secret) 