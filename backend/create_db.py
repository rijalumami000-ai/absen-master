import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import sys
from dotenv import load_dotenv

# Load database config from .env
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

def create_database():
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "Rijalumami1002")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "absensi_sholat")
    
    print(f"Menghubungkan ke default database 'postgres' di {host}:{port}...")
    try:
        # Connect to default database 'postgres' to run administrative commands
        con = psycopg2.connect(dbname='postgres', user=user, host=host, password=password, port=port)
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = con.cursor()
        
        # Check if the target database already exists
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Membuat database '{dbname}'...")
            cursor.execute(f"CREATE DATABASE {dbname}")
            print(f"Database '{dbname}' berhasil dibuat!")
        else:
            print(f"Database '{dbname}' sudah ada.")
            
        cursor.close()
        con.close()
        sys.exit(0)
    except Exception as e:
        print(f"Gagal membuat database: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    create_database()
