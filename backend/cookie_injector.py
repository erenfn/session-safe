#!/usr/bin/env python3
"""
Cookie injector for Firefox - injects cookies into Firefox's cookie database
before Firefox starts.
"""

import os
import json
import sqlite3
import argparse
import glob
import shutil
from pathlib import Path

# Firefox profile path for browser user
FIREFOX_PROFILE_PATH = '/home/browser/.mozilla/firefox/'
FIXED_PROFILE_PATH = '/home/browser/.mozilla/firefox/session.default'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def get_firefox_cookie_db(profile_arg: str | None = None):
    """Return cookies.sqlite path determined in priority order.

    1. If ``profile_arg`` is provided, use it directly.
    2. Else try the fixed profile path (session.default).
    """

    if profile_arg:
        explicit_db = os.path.join(profile_arg, 'cookies.sqlite')
        print(f"DEBUG: Using explicit profile cookie database: {explicit_db}")
        return explicit_db

    # Fixed profile path created by firefox-command.sh
    fixed_cookie_db = os.path.join(FIXED_PROFILE_PATH, 'cookies.sqlite')
    if os.path.exists(fixed_cookie_db):
        print(f"DEBUG: Using fixed profile cookie database: {fixed_cookie_db}")
        return fixed_cookie_db
    
    print(f"DEBUG: No cookie database found at {fixed_cookie_db}")
    return None

def inject_cookies(cookies_data, profile_arg: str | None = None):
    """Inject cookies into Firefox's cookie database."""
    print(f"DEBUG: Injecting {len(cookies_data)} cookies")
    
    cookie_db = get_firefox_cookie_db(profile_arg)
    if not cookie_db:
        print("DEBUG: No cookie database found")
        return False
    
    # Ensure the profile directory exists
    profile_dir = os.path.dirname(cookie_db)
    os.makedirs(profile_dir, exist_ok=True)
    
    # Copy the database to a temp location to avoid 'database is locked' error
    temp_db = '/tmp/cookies_inject.sqlite'
    try:
        shutil.copy2(cookie_db, temp_db)
        print(f"DEBUG: Copied cookie database to {temp_db}")
    except Exception as e:
        print(f"DEBUG: Failed to copy cookie database: {e}")
        return False

    try:
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # Check if moz_cookies table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='moz_cookies'")
        if not cursor.fetchone():
            print("DEBUG: moz_cookies table does not exist")
            conn.close()
            return False
        
        # Get current timestamp for lastAccessed and creationTime
        import time
        current_time = int(time.time() * 1000000)  # Firefox uses microseconds
        
        # Determine if baseDomain exists in schema
        cursor.execute("PRAGMA table_info(moz_cookies)")
        columns = [row[1] for row in cursor.fetchall()]
        has_base_domain = 'baseDomain' in columns
        has_same_site = 'sameSite' in columns
        has_raw_same_site = 'rawSameSite' in columns
        has_scheme_map = 'schemeMap' in columns

        # Insert cookies
        for cookie in cookies_data:
            try:
                # Build dynamic column list and parameters based on schema
                insert_cols = ['originAttributes', 'name', 'value', 'host', 'path', 'expiry',
                              'lastAccessed', 'creationTime', 'isSecure', 'isHttpOnly', 'inBrowserElement']
                
                params = ['',  # originAttributes
                          cookie.get('name', ''),
                          cookie.get('value', ''),
                          cookie.get('domain', ''),
                          cookie.get('path', '/'),
                          cookie.get('expires_utc', 0),
                          current_time,  # lastAccessed
                          current_time,  # creationTime
                          1 if cookie.get('secure', False) else 0,  # isSecure
                          1 if cookie.get('httponly', False) else 0,  # isHttpOnly
                          0]  # inBrowserElement

                # Add optional columns if they exist in the schema
                if has_base_domain:
                    insert_cols.insert(0, 'baseDomain')
                    params.insert(0, cookie.get('domain', '').lstrip('.'))

                if has_same_site:
                    insert_cols.append('sameSite')
                    params.append(0)

                if has_raw_same_site:
                    insert_cols.append('rawSameSite')
                    params.append(0)

                if has_scheme_map:
                    insert_cols.append('schemeMap')
                    params.append(0)

                # Build the SQL query dynamically
                placeholders = ', '.join(['?'] * len(insert_cols))
                insert_sql = f'''INSERT OR REPLACE INTO moz_cookies 
                    ({', '.join(insert_cols)})
                    VALUES ({placeholders})'''

                cursor.execute(insert_sql, params)
                print(f"DEBUG: Injected cookie: {cookie.get('name', '')} for {cookie.get('domain', '')}")
            except Exception as e:
                print(f"DEBUG: Error injecting cookie {cookie.get('name', '')}: {e}")
        
        conn.commit()
        conn.close()
        
        # Copy back to original location
        shutil.copy2(temp_db, cookie_db)
        print(f"DEBUG: Successfully injected {len(cookies_data)} cookies")
        return True
        
    except Exception as e:
        print(f"DEBUG: Error injecting cookies: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='Inject cookies into Firefox')
    parser.add_argument('--cookies-file', help='Path to cookies JSON file')
    parser.add_argument('--cookies-json', help='Base64 encoded cookies JSON')
    parser.add_argument('--profile-path', help='Absolute Firefox profile directory (optional)')
    args = parser.parse_args()
    
    if args.cookies_file:
        # Read from file
        with open(args.cookies_file, 'r') as f:
            cookies_data = json.load(f)
    elif args.cookies_json:
        # Decode from base64
        import base64
        cookies_json = base64.b64decode(args.cookies_json).decode('utf-8')
        cookies_data = json.loads(cookies_json)
    else:
        print("ERROR: Must provide either --cookies-file or --cookies-json")
        return 1
    
    print(f"DEBUG: Loaded {len(cookies_data)} cookies")
    
    if inject_cookies(cookies_data, args.profile_path):
        print("DEBUG: Cookie injection completed successfully")
        return 0
    else:
        print("DEBUG: Cookie injection failed")
        return 1

if __name__ == '__main__':
    exit(main()) 