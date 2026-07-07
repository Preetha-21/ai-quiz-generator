import os
import mysql.connector
from mysql.connector import Error


def get_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", "4000")),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            ssl_verify_identity=False,
            ssl_verify_cert=False
        )

        if connection.is_connected():
            print("Connected to TiDB successfully.")
            return connection

    except Error as e:
        print("Database Connection Error:", e)
        return None