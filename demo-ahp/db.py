import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host='localhost',
        user='root',  # Sửa thành thông tin đăng nhập của bạn
        password='12345',
        database='ahp_demo'
    )
    return connection
