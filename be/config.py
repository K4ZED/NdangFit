import os
from dotenv import load_dotenv

# Load environment variables dari file .env
load_dotenv()

SERVER_NAME = os.getenv("SERVER_NAME", r"localhost\SQLEXPRESS")
DATABASE_NAME = os.getenv("DATABASE_NAME", "NdangFitDB")
DRIVER = os.getenv("DRIVER", "{ODBC Driver 17 for SQL Server}")

DATABASE_CONNECTION_STRING = (
    f"DRIVER={DRIVER};SERVER={SERVER_NAME};DATABASE={DATABASE_NAME};Trusted_Connection=yes;"
)
