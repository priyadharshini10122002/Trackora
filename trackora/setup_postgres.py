#!/usr/bin/env python
"""
PostgreSQL Setup Script for Trackora
This script helps set up the PostgreSQL database for Trackora development.
"""
import psycopg2
import sys

# PostgreSQL connection details
PG_USER = "postgres"  # Superuser
PG_PASSWORD = "taskiy034"  # Postgres superuser password
PG_HOST = "localhost"
PG_PORT = 5432

# Trackora user details
TRACKORA_USER = "priyadharshiniramachandran034"
TRACKORA_PASSWORD = "taskiy034"
TRACKORA_DB = "trackora"

def setup_postgres():
    """Set up PostgreSQL database and user for Trackora"""
    
    print("=" * 60)
    print("PostgreSQL Setup for Trackora")
    print("=" * 60)
    
    try:
        # Try connecting as postgres superuser
        print("\n1. Connecting to PostgreSQL as superuser...")
        try:
            conn = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                user=PG_USER,
                password=PG_PASSWORD,
                database="postgres"
            )
            conn.autocommit = True  # Required for CREATE DATABASE
            print("   ✓ Connected as postgres superuser")
        except psycopg2.OperationalError as e:
            if "password authentication failed" in str(e):
                print("   ✗ PostgreSQL superuser password required")
                pg_password = input("   Enter postgres password (or press Enter for empty): ").strip()
                conn = psycopg2.connect(
                    host=PG_HOST,
                    port=PG_PORT,
                    user=PG_USER,
                    password=pg_password,
                    database="postgres"
                )
                print("   ✓ Connected successfully")
            else:
                raise
        
        cursor = conn.cursor()
        
        # Create database
        print(f"\n2. Creating database '{TRACKORA_DB}'...")
        try:
            cursor.execute(f"CREATE DATABASE {TRACKORA_DB};")
            print(f"   ✓ Database '{TRACKORA_DB}' created")
        except psycopg2.Error as e:
            if "already exists" in str(e):
                print(f"   ⓘ Database '{TRACKORA_DB}' already exists")
            else:
                raise
        
        # Create user
        print(f"\n3. Creating user '{TRACKORA_USER}'...")
        try:
            cursor.execute(f"""
                CREATE USER {TRACKORA_USER} WITH PASSWORD '{TRACKORA_PASSWORD}';
            """)
            print(f"   ✓ User '{TRACKORA_USER}' created")
        except psycopg2.Error as e:
            if "already exists" in str(e):
                print(f"   ⓘ User '{TRACKORA_USER}' already exists")
                # Update password
                print(f"   Updating password...")
                cursor.execute(f"""
                    ALTER USER {TRACKORA_USER} WITH PASSWORD '{TRACKORA_PASSWORD}';
                """)
                print(f"   ✓ Password updated")
            else:
                raise
        
        # Grant privileges
        print(f"\n4. Granting privileges...")
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {TRACKORA_DB} TO {TRACKORA_USER};")
        print(f"   ✓ Granted privileges on database")
        
        # Configure user
        print(f"\n5. Configuring user settings...")
        cursor.execute(f"""
            ALTER ROLE {TRACKORA_USER} SET client_encoding TO 'utf8';
            ALTER ROLE {TRACKORA_USER} SET default_transaction_isolation TO 'read committed';
        """)
        print(f"   ✓ User configured")
        
        # Connect to the trackora database
        print(f"\n6. Granting schema privileges...")
        trackora_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            database=TRACKORA_DB
        )
        trackora_conn.autocommit = True
        trackora_cursor = trackora_conn.cursor()
        
        # Grant schema privileges
        trackora_cursor.execute(f"GRANT ALL ON SCHEMA public TO {TRACKORA_USER};")
        trackora_cursor.execute(f"""
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {TRACKORA_USER};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {TRACKORA_USER};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO {TRACKORA_USER};
        """)
        print(f"   ✓ Schema privileges granted")
        trackora_cursor.close()
        trackora_conn.close()
        
        conn.commit()
        print("\n" + "=" * 60)
        print("✓ PostgreSQL Setup Complete!")
        print("=" * 60)
        
        # Test connection
        print(f"\n7. Testing connection as '{TRACKORA_USER}'...")
        test_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=TRACKORA_USER,
            password=TRACKORA_PASSWORD,
            database=TRACKORA_DB
        )
        print(f"   ✓ Connection successful!")
        test_conn.close()
        
        print("\n✓ All setup complete! You can now run:")
        print("   python manage.py migrate")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    success = setup_postgres()
    sys.exit(0 if success else 1)
