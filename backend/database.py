import mysql.connector
from mysql.connector import Error


def get_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Preetha@21",
            database="quiz_generator_agent"
        )

        if connection.is_connected():
            print("Connected to MySQL successfully.")
            return connection

    except Error as e:
        print("Database Connection Error:", e)
        return None