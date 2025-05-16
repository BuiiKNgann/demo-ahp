

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import numpy as np
from scipy.stats import gmean
import uuid
import logging

app = Flask(__name__)
CORS(app)

# Thiết lập logging để ghi lại các lỗi và thông tin debug
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# ---------------- Kết nối DB ----------------
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

# ---------------- API: GET ----------------
#Lấy danh sách các chuyên gia 
@app.route('/get-experts', methods=['GET'])
def get_experts():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM experts")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"experts": [{"id": row[0], "name": row[1]} for row in rows]})

#Lấy danh sách khách hàng, hỗ trợ lọc
@app.route('/get-customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    query = "SELECT id, name, loan_amount, loan_purpose, financial_description, is_selected_for_ahp FROM customers"
    params = []

    conditions = []
    conditions.append("is_selected_for_ahp = 0")
    if request.args.get('min_loan'):
        conditions.append("loan_amount >= %s")
        params.append(float(request.args.get('min_loan')))
    if request.args.get('max_loan'):
        conditions.append("loan_amount <= %s")
        params.append(float(request.args.get('max_loan')))
    if request.args.get('purpose'):
        conditions.append("loan_purpose = %s")
        params.append(request.args.get('purpose'))
    if request.args.get('is_selected'):
        conditions.append("is_selected_for_ahp = %s")
        params.append(int(request.args.get('is_selected')))

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({
        "customers": [{
            "id": row[0],
            "name": row[1],
            "loan_amount": float(row[2]),
            "loan_purpose": row[3],
            "financial_description": row[4],
            "is_selected_for_ahp": bool(row[5])
        } for row in rows]
    })

@app.route('/get-criteria', methods=['GET'])
def get_criteria():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM criteria")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"criteria": [{"id": row[0], "name": row[1]} for row in rows]})

@app.route('/get-alternatives', methods=['GET'])
def get_alternatives():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM alternatives")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"alternatives": [{"id": row[0], "name": row[1]} for row in rows]})
@app.route('/get-criteria-matrix', methods=['GET'])
def get_criteria_matrix():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    query = """
        SELECT criterion1_id, criterion2_id, value
        FROM criteria_matrix
        WHERE customer_id = %s AND expert_id = %s
    """
    params = [request.args.get('customer_id'), request.args.get('expert_id')]
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({
        "matrix": [{"criterion1_id": row[0], "criterion2_id": row[1], "value": float(row[2])} for row in rows]
    })

@app.route('/get-alternative-comparisons', methods=['GET'])
def get_alternative_comparisons():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    query = """
        SELECT alternative1_id, alternative2_id, value
        FROM alternative_comparisons
        WHERE customer_id = %s AND expert_id = %s AND criterion_id = %s
    """
    params = [
        request.args.get('customer_id'),
        request.args.get('expert_id'),
        request.args.get('criterion_id')
    ]
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({
        "comparisons": [{"alternative1_id": row[0], "alternative2_id": row[1], "value": float(row[2])} for row in rows]
    })
# ---------------- API: POST ----------------
@app.route('/add-expert', methods=['POST'])
def add_expert():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute("INSERT INTO experts (name) VALUES (%s)", (name,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Expert added successfully"}), 201

@app.route('/add-customer', methods=['POST'])
def add_customer():
    data = request.get_json()
    name = data.get('name')
    loan_amount = data.get('loan_amount')
    loan_purpose = data.get('loan_purpose')
    financial_description = data.get('financial_description')
    is_selected_for_ahp = data.get('is_selected_for_ahp', 0)

    if not name or not loan_amount or not loan_purpose:
        return jsonify({"error": "Name, loan_amount, and loan_purpose are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO customers (name, loan_amount, loan_purpose, financial_description, is_selected_for_ahp) VALUES (%s, %s, %s, %s, %s)",
        (name, loan_amount, loan_purpose, financial_description, is_selected_for_ahp)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Customer added successfully"}), 201

@app.route('/add-criterion', methods=['POST'])
def add_criterion():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    cursor.execute("INSERT INTO criteria (name) VALUES (%s)", (name,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Criterion added successfully"}), 201

@app.route('/add-alternative', methods=['POST'])
def add_alternative():
    data = request.get_json()
    name = data.get('name')
    customer_id = data.get('customer_id')
    if not name or not customer_id:
        return jsonify({"error": "Name and customer_id are required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()

    # Kiểm tra xem customer_id đã được chọn chưa
    cursor.execute("SELECT is_selected_for_ahp FROM customers WHERE id = %s", (customer_id,))
    result = cursor.fetchone()
    if not result:
        cursor.close()
        conn.close()
        return jsonify({"error": f"Customer with ID {customer_id} does not exist"}), 400
    if result[0] == 1:
        cursor.close()
        conn.close()
        return jsonify({"error": f"Customer with ID {customer_id} is already selected for AHP"}), 400

    # Kiểm tra xem customer_id đã tồn tại trong alternatives chưa
    cursor.execute("SELECT id FROM alternatives WHERE id = %s", (customer_id,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"error": f"Customer with ID {customer_id} already exists in alternatives"}), 400

    # Thêm vào alternatives và cập nhật is_selected_for_ahp
    cursor.execute("INSERT INTO alternatives (id, name) VALUES (%s, %s)", (customer_id, name))
    # cursor.execute("UPDATE customers SET is_selected_for_ahp = 1 WHERE id = %s", (customer_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Alternative added successfully"}), 201

# ---------------- API: Cập nhật các phương án từ khách hàngg ----------------
@app.route('/update-alternatives-from-customers', methods=['POST'])
def update_alternatives_from_customers():
    try:
        data = request.get_json()
        customer_ids = data.get('customer_ids')  # Danh sách ID khách hàng được lọc
        if not customer_ids or not isinstance(customer_ids, list):
            return jsonify({"error": "customer_ids must be a non-empty list"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        #  Xóa các bảng liên quan trước để tránh vi phạm ràng buộc khóa ngoại
        logger.info("Bắt đầu xóa dữ liệu từ các bảng liên quan")
        cursor.execute("DELETE FROM alternative_comparisons")
        cursor.execute("DELETE FROM criteria_weights")
        cursor.execute("DELETE FROM ahp_final_scores")
        cursor.execute("DELETE FROM alternatives")
        cursor.execute("DELETE FROM criteria_matrix")  # Thêm xóa criteria_matrix
        logger.info("Đã xóa dữ liệu từ các bảng liên quan")

        #  Đặt lại is_selected_for_ahp về 0 chỉ cho các khách hàng không có trong customer_ids
        logger.info("Đặt lại is_selected_for_ahp cho các khách hàng không được chọn")
        placeholders = ','.join(['%s'] * len(customer_ids))
        query = f"UPDATE customers SET is_selected_for_ahp = 0 WHERE id NOT IN ({placeholders})"
        cursor.execute(query, tuple(customer_ids))
        logger.info(f"Số bản ghi được cập nhật trong customers (is_selected_for_ahp): {cursor.rowcount}")

        #  Kiểm tra và thêm các khách hàng được chọn vào alternatives
        logger.info(f"Kiểm tra customer_ids: {customer_ids}")
        query = f"SELECT id, name FROM customers WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(customer_ids))
        customers = cursor.fetchall()

        if not customers:
            cursor.close()
            conn.close()
            logger.error("Không tìm thấy khách hàng hợp lệ cho các ID cung cấp")
            return jsonify({"error": "No valid customers found for the provided IDs"}), 400

        # Thêm vào alternatives và cập nhật is_selected_for_ahp
        logger.info("Thêm khách hàng vào alternatives")
        for customer_id, name in customers:
            cursor.execute(
                "INSERT INTO alternatives (id, name) VALUES (%s, %s)",
                (customer_id, name)
            )
            # cursor.execute(
            #     "UPDATE customers SET is_selected_for_ahp = 1 WHERE id = %s",
            #     (customer_id,)
            # )

        conn.commit()
        logger.info("Commit giao dịch thành công")
        cursor.close()
        conn.close()

        return jsonify({"message": "Alternatives updated successfully"})

    except mysql.connector.Error as db_error:
        logger.error(f"Lỗi cơ sở dữ liệu: {str(db_error)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": f"Lỗi cơ sở dữ liệu: {str(db_error)}"}), 500
    except Exception as e:
        logger.error(f"Lỗi không xác định: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500

# ---------------- AHP: Lưu ma trận tiêu chí ----------------
@app.route('/save-criteria-matrix', methods=['POST'])
def save_criteria_matrix():
    try:
        data = request.get_json()
        if 'matrix' not in data or 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số matrix, customer_id hoặc expert_id"}), 400

        matrix = data['matrix']
        customer_id = data['customer_id']
        expert_id = data['expert_id']

        if not isinstance(matrix, list) or not all(isinstance(row, list) for row in matrix):
            return jsonify({"error": "Matrix phải là một danh sách các danh sách"}), 400

        n = len(matrix)
        if n == 0 or any(len(row) != n for row in matrix):
            return jsonify({"error": "Matrix phải là ma trận vuông không rỗng"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Xóa các bản ghi cũ trong criteria_matrix cho customer_id và expert_id
        cursor.execute(
            "DELETE FROM criteria_matrix WHERE customer_id = %s AND expert_id = %s",
            (customer_id, expert_id)
        )
        logger.info(f"Xóa {cursor.rowcount} bản ghi cũ trong criteria_matrix")

        # Lưu ma trận vào cơ sở dữ liệu
        for i in range(n):
            for j in range(n):
                cursor.execute(
                    "INSERT INTO criteria_matrix (customer_id, expert_id, criterion1_id, criterion2_id, value) VALUES (%s, %s, %s, %s, %s)",
                    (customer_id, expert_id, i + 1, j + 1, float(matrix[i][j]))
                )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Criteria matrix saved successfully"})

    except Exception as e:
        logger.error(f"Lỗi trong save_criteria_matrix: {str(e)}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500

# ---------------- AHP: Tính trọng số tiêu chí ----------------
 
@app.route('/calculate-criteria-weights', methods=['POST'])
def calculate_criteria_weights():
    # Nhận và kiểm tra dữ liệu đầu vào
    try:
        data = request.get_json()
        if 'comparison_matrix' not in data or 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số comparison_matrix, customer_id hoặc expert_id"}), 400
    # Chuyển đổi ma trận
        matrix = np.array(data['comparison_matrix'], dtype=float)
        customer_id = data['customer_id']
        expert_id = data['expert_id']
    # Kiểm tra ma trận
        if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1]:
            return jsonify({"error": "Comparison matrix phải là ma trận vuông"}), 400

        if not np.all(matrix > 0):
            return jsonify({"error": "Tất cả giá trị trong ma trận phải là số dương"}), 400

        col_sum = matrix.sum(axis=0)
        if np.any(col_sum == 0):
            return jsonify({"error": "Ma trận chứa cột có tổng bằng 0, không thể chuẩn hóa"}), 400
    # Chuẩn hóa ma trận và tính trọng số
 
        normalized_matrix = matrix / col_sum
        weights = normalized_matrix.mean(axis=1)
    # Kiểm tra độ nhất quán
        if np.any(weights == 0):
            return jsonify({"error": "Trọng số chứa giá trị 0, không thể tính Consistency Ratio"}), 400

        n = matrix.shape[0]
        weighted_sum = matrix.dot(weights)
        lambda_max = np.sum(weighted_sum / weights) / n
        CI = (lambda_max - n) / (n - 1)
# giá trị Random Index (RI
        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        CR = CI / RI if RI != 0 else 0

        if CR > 0.1:
            return jsonify({
                "message": "Consistency Ratio (CR) exceeds 10%. Data not saved.",
                "weights": {f"C{i+1}": float(w) for i, w in enumerate(weights)},  # Không làm tròn
                "CR": float(CR)  # Không làm tròn
            }), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Xóa các bản ghi cũ trong criteria_weights cho customer_id và expert_id
        cursor.execute(
            "DELETE FROM criteria_weights WHERE customer_id = %s AND expert_id = %s",
            (customer_id, expert_id)
        )
        logger.info(f"Xóa {cursor.rowcount} bản ghi cũ trong criteria_weights")

        # Lưu dữ liệu mới (không làm tròn)
        for i, weight in enumerate(weights):
            criterion_id = i + 1
            cursor.execute(
                "INSERT INTO criteria_weights (customer_id, expert_id, criterion_id, weight) VALUES (%s, %s, %s, %s)",
                (customer_id, expert_id, criterion_id, float(weight))  # Không làm tròn
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Weights calculated and stored successfully.",
            "weights": {f"C{i+1}": float(w) for i, w in enumerate(weights)},  # Không làm tròn
            "CR": float(CR)  # Không làm tròn
        })

    except Exception as e:
        logger.error(f"Lỗi trong calculate_criteria_weights: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ---------------- AHP: Tính điểm phương án ----------------
 
@app.route('/calculate-alternative-scores', methods=['POST'])
def calculate_alternative_scores():
    try:
        data = request.get_json()
        expert_id = data['expert_id']
        criterion_id = data['criteria_id']
        comparisons = data['comparisons']
        customer_id = data.get('customer_id')
        if not customer_id:
            return jsonify({"error": "customer_id is required"}), 400

        # Lấy danh sách alt_ids từ comparisons
        alt_ids_set = set()
        for comp in comparisons:
            alt_ids_set.add(comp['alt1_id'])
            alt_ids_set.add(comp['alt2_id'])
        alt_ids = list(alt_ids_set)
        n = len(alt_ids)

        if n < 2:
            return jsonify({"error": "Cần ít nhất 2 phương án để so sánh"}), 400

        # Kết nối cơ sở dữ liệu
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Kiểm tra xem tất cả alt_ids có tồn tại trong alternatives không
        placeholders = ','.join(['%s'] * len(alt_ids))
        query = f"SELECT id FROM alternatives WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(alt_ids))
        existing_alt_ids = {row[0] for row in cursor.fetchall()}

        if len(existing_alt_ids) != len(alt_ids):
            missing_ids = set(alt_ids) - existing_alt_ids
            cursor.close()
            conn.close()
            return jsonify({
                "error": f"Các phương án với ID {missing_ids} không tồn tại trong bảng alternatives"
            }), 400

        # Khởi tạo ma trận so sánh đôi
        # Khởi tạo ma trận vuông n x n với tất cả phần tử là 1
        matrix = np.ones((n, n))
        for comp in comparisons:
            alt1_id = comp['alt1_id']
            alt2_id = comp['alt2_id']
            value = comp['value']
            if value < 1/9 or value > 9:
                cursor.close()
                conn.close()
                return jsonify({"error": "Giá trị so sánh phải nằm trong khoảng từ 1/9 đến 9"}), 400
            i = alt_ids.index(alt1_id)
            j = alt_ids.index(alt2_id)
            matrix[i][j] = value
            matrix[j][i] = 1 / value

        # Tính trọng số
        col_sum = matrix.sum(axis=0)
        norm_matrix = matrix / col_sum
        weights = norm_matrix.mean(axis=1)

        # Tính CR
        weighted_sum = np.dot(matrix, weights)
        lambda_max = (weighted_sum / weights).mean()
        CI = (lambda_max - n) / (n - 1)
        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        CR = CI / RI if RI != 0 else 0

        # Xóa các bản ghi cũ trong alternative_comparisons cho customer_id, expert_id, và criterion_id
        cursor.execute(
            "DELETE FROM alternative_comparisons WHERE customer_id = %s AND expert_id = %s AND criterion_id = %s",
            (customer_id, expert_id, criterion_id)
        )
        logger.info(f"Xóa {cursor.rowcount} bản ghi cũ trong alternative_comparisons")

        # Lưu dữ liệu mới nếu CR < 0.1
        if CR < 0.1:
            for comp in comparisons:
                cursor.execute(
                    "INSERT INTO alternative_comparisons (customer_id, expert_id, criterion_id, alternative1_id, alternative2_id, value) VALUES (%s, %s, %s, %s, %s, %s)",
                    (customer_id, expert_id, criterion_id, comp['alt1_id'], comp['alt2_id'], comp['value'])
                )
            conn.commit()

        cursor.close()
        conn.close()

        # Trả về scores với key là alt_id (customer.id) (không làm tròn)
        scores = {str(alt_id): float(weight) for alt_id, weight in zip(alt_ids, weights)}

        return jsonify({
            "message": "Alternative scores calculated successfully." if CR < 0.1 else "Consistency Ratio (CR) exceeds 10%. Data not saved.",
            "scores": scores,
            "CR": float(CR)  # Không làm tròn
        })

    except KeyError as e:
        logger.error(f"Thiếu trường bắt buộc trong payload: {str(e)}")
        return jsonify({"error": f"Thiếu trường bắt buộc trong payload: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Lỗi trong calculate_alternative_scores: {str(e)}")
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500
# ---------------- API: GET trọng số và điểm ----------------
@app.route('/get-criteria-weights', methods=['GET'])
def get_criteria_weights():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
    cursor = conn.cursor()
    query = """
        SELECT criteria.name, criteria_weights.weight, customers.name AS customer_name, experts.name AS expert_name
        FROM criteria_weights
        JOIN criteria ON criteria_weights.criterion_id = criteria.id
        JOIN customers ON criteria_weights.customer_id = customers.id
        JOIN experts ON criteria_weights.expert_id = experts.id
    """
    params = []
    conditions = []

    if request.args.get('customer_id'):
        conditions.append("criteria_weights.customer_id = %s")
        params.append(int(request.args.get('customer_id')))
    if request.args.get('expert_id'):
        conditions.append("criteria_weights.expert_id = %s")
        params.append(int(request.args.get('expert_id')))

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({
        "criteria_weights": [{
            "criteria_name": row[0],
            "weight": float(row[1]),
            "customer_name": row[2],
            "expert_name": row[3]
        } for row in rows]
    })

 
@app.route('/get-final-alternative-scores', methods=['GET'])
def get_final_alternative_scores():
    try:
        customer_id = request.args.get('customer_id')
        if not customer_id:
            return jsonify({"error": "customer_id is required"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Lấy danh sách tất cả các phương án (khách hàng)
        cursor.execute("SELECT id, name FROM alternatives")
        alternatives = cursor.fetchall()
        if not alternatives:
            return jsonify({"error": "Không tìm thấy phương án nào trong bảng alternatives"}), 400
        alt_ids = [alt_id for alt_id, _ in alternatives]
        alt_names = {alt_id: name for alt_id, name in alternatives}

        # Lấy danh sách tiêu chí
        cursor.execute("SELECT id FROM criteria")
        criteria = cursor.fetchall()
        criterion_ids = [c_id for c_id, in criteria]
        if not criterion_ids:
            return jsonify({"error": "Không tìm thấy tiêu chí nào"}), 400

        # Khởi tạo điểm cuối cùng cho tất cả khách hàng
        final_scores = {alt_id: 0.0 for alt_id in alt_ids}

        # Lấy trọng số tiêu chí
        cursor.execute(
            "SELECT criterion_id, weight FROM criteria_weights WHERE customer_id = %s",
            (customer_id,)
        )
        criteria_weights = {row[0]: float(row[1]) for row in cursor.fetchall()}
        if not criteria_weights:
            return jsonify({"error": "Không có trọng số tiêu chí cho customer_id này"}), 400

        # Tính điểm cho từng tiêu chí
        for criterion_id in criterion_ids:
            cursor.execute("""
                SELECT alternative1_id, alternative2_id, value, expert_id
                FROM alternative_comparisons
                WHERE customer_id = %s AND criterion_id = %s
            """, (customer_id, criterion_id))
            comparisons = cursor.fetchall()

            if not comparisons:
                continue

            # Tạo ma trận cho từng chuyên gia
            expert_matrices = {}
            for alt1_id, alt2_id, value, expert_id in comparisons:
                if alt1_id not in alt_ids or alt2_id not in alt_ids:
                    continue
                if expert_id not in expert_matrices:
                    expert_matrices[expert_id] = np.ones((len(alt_ids), len(alt_ids)))
                i = alt_ids.index(alt1_id)
                j = alt_ids.index(alt2_id)
                expert_matrices[expert_id][i][j] = float(value)
                expert_matrices[expert_id][j][i] = 1 / float(value)

            # Tổng hợp ma trận từ nhiều chuyên gia
            matrices = list(expert_matrices.values())
            if matrices:
                aggregated_matrix = gmean(matrices, axis=0)
                col_sum = aggregated_matrix.sum(axis=0)
                if np.any(col_sum == 0):
                    continue
                norm_matrix = aggregated_matrix / col_sum
                scores = norm_matrix.mean(axis=1)

                weight = criteria_weights.get(criterion_id, 0.0)
                for i, alt_id in enumerate(alt_ids):
                    final_scores[alt_id] += float(scores[i]) * weight

        # Xóa các bản ghi cũ trong ahp_final_scores để tránh lặp
        cursor.execute("DELETE FROM ahp_final_scores WHERE customer_id = %s", (customer_id,))

        # Lưu điểm vào bảng ahp_final_scores (không làm tròn)
        for alt_id, score in final_scores.items():
            score_float = float(score)
            cursor.execute("""
                INSERT INTO ahp_final_scores (customer_id, alternative_id, final_score)
                VALUES (%s, %s, %s)
            """, (customer_id, alt_id, score_float))  # Không làm tròn

        conn.commit()

        # Lấy điểm cuối cùng (không làm tròn khi tính, chỉ làm tròn khi trả về nếu cần)
        cursor.execute("""
            SELECT alternatives.name, ahp_final_scores.final_score AS final_score
            FROM ahp_final_scores
            JOIN alternatives ON ahp_final_scores.alternative_id = alternatives.id
            WHERE ahp_final_scores.customer_id = %s
            ORDER BY final_score DESC
        """, (customer_id,))
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        # Trả về kết quả không làm tròn
        result = [{"alternative_name": row[0], "final_score": float(row[1])} for row in rows]
        return jsonify({"final_scores": result})

    except Exception as e:
        logger.error(f"Lỗi trong get_final_alternative_scores: {str(e)}")
        return jsonify({"error": str(e)}), 500
# ---------------- Run app ----------------
if __name__ == '__main__':
    app.run(debug=True)