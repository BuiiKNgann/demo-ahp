import mysql.connector
import logging

# Thiết lập logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="12345",
            database="ahp_demo1"
        )
        logger.info("Kết nối cơ sở dữ liệu thành công")
        return conn
    except mysql.connector.Error as e:
        logger.error(f"Lỗi kết nối cơ sở dữ liệu: {str(e)}")
        return None