#!/usr/bin/env python
import os
import sys

# Remove invalid DEBUG value that Windows system env variable sets
if os.environ.get('DEBUG') == 'release':
    os.environ.pop('DEBUG')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trackora.settings.development')

import django
print("Setting up Django...")
django.setup()
print("✓ Django setup successful")

from django.db import connection

print("\nTesting database connection...")
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
    print(f"✓ Database connection successful! Result: {result}")
except Exception as e:
    print(f"✗ Database connection failed: {type(e).__name__}: {e}")
    sys.exit(1)

# Try to show existing tables
print("\nFetching database tables...")
try:
    from django.core.management import call_command
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
    print(f"✓ Found {len(tables)} existing tables")
    for table in tables[:10]:
        print(f"  - {table[0]}")
    if len(tables) > 10:
        print(f"  ... and {len(tables)-10} more tables")
except Exception as e:
    print(f"Could not fetch table list: {e}")
