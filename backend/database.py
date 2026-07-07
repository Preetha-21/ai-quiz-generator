import mysql.connector
from mysql.connector import Error


def get_connection():
    try:
        connection = mysql.connector.connect(
            host="gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com",
            port=4000,
            user="2MXSmWTbKcPNxc3.root",
            password="CyFF4IAY371cPYTL",
            database="quiz_generator_agent",
            ssl_ca="C:/Users/preet/Downloads/isrgrootx1.pem"
        )

        if connection.is_connected():
            print("Connected to TiDB successfully.")
            return connection

    except Error as e:
        print("Database Connection Error:", e)
        return None