import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

# Database connection parameters
DB_HOST = "localhost"
DB_USER = "postgres"
DB_PASS = "282681"
DB_NAME = "insureTM_db"

def reset_database():
    try:
        # Connect to 'postgres' database to drop/create the target database
        print("Connecting to 'postgres' database...")
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            dbname="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Drop database if exists
        print(f"Dropping database '{DB_NAME}' if it exists...")
        cursor.execute(f"DROP DATABASE IF EXISTS \"{DB_NAME}\";")
        
        # Create database
        print(f"Creating database '{DB_NAME}' with owner '{DB_USER}'...")
        cursor.execute(f"CREATE DATABASE \"{DB_NAME}\" WITH OWNER \"{DB_USER}\";")
        
        cursor.close()
        conn.close()
        print("Database reset successfully.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_database()
