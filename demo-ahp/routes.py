from flask import request, jsonify
import logging
from db import get_db_connection
from ahp_utils import (
    matrix_sum_columns, matrix_normalize, matrix_row_means,
    matrix_dot_vector, 
)

# Thiết lập logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# ---------------- API: GET ----------------
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
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Alternative added successfully"}), 201

def update_alternatives_from_customers():
    try:
        data = request.get_json()
        customer_ids = data.get('customer_ids')
        if not customer_ids or not isinstance(customer_ids, list):
            return jsonify({"error": "customer_ids must be a non-empty list"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Xóa các bảng liên quan trước 
        logger.info("Bắt đầu xóa dữ liệu từ các bảng liên quan")
        cursor.execute("DELETE FROM alternative_comparisons")
        cursor.execute("DELETE FROM criteria_weights")
        cursor.execute("DELETE FROM ahp_final_scores")
        cursor.execute("DELETE FROM alternatives")
        cursor.execute("DELETE FROM criteria_matrix")
        logger.info("Đã xóa dữ liệu từ các bảng liên quan")

        # Đặt lại is_selected_for_ahp về 0 chỉ cho các khách hàng không có trong customer_ids
        logger.info("Đặt lại is_selected_for_ahp cho các khách hàng không được chọn")
        placeholders = ','.join(['%s'] * len(customer_ids))
        query = f"UPDATE customers SET is_selected_for_ahp = 0 WHERE id NOT IN ({placeholders})"
        cursor.execute(query, tuple(customer_ids))
        logger.info(f"Số bản ghi được cập nhật trong customers (is_selected_for_ahp): {cursor.rowcount}")

        # Kiểm tra và thêm các khách hàng được chọn vào alternatives
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
def save_criteria_matrix():
    try:
        data = request.get_json()
        if 'matrix' not in data or 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số matrix, customer_id hoặc expert_id"}), 400

        matrix = data['matrix']
        customer_id = data['customer_id']
        expert_id = data['expert_id']
# Đảm bảo matrix là một danh sách.
        if not isinstance(matrix, list) or not all(isinstance(row, list) for row in matrix):
            return jsonify({"error": "Matrix phải là một danh sách các danh sách"}), 400
# Kiểm tra ma trận vuông
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
def calculate_criteria_weights():
    # nhận một ma trận so sánh đôi
    try:
        data = request.get_json()
        if 'comparison_matrix' not in data or 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số comparison_matrix, customer_id hoặc expert_id"}), 400
        matrix = data['comparison_matrix']
        customer_id = data['customer_id']
        expert_id = data['expert_id']
        # Kiểm tra ma trận vuông
        n = len(matrix)
        if n == 0 or any(len(row) != n for row in matrix):
            return jsonify({"error": "Comparison matrix phải là ma trận vuông"}), 400
        # Kiểm tra giá trị dương
        if any(matrix[i][j] <= 0 for i in range(n) for j in range(n)):
            return jsonify({"error": "Tất cả giá trị trong ma trận phải là số dương"}), 400
        # Tính tổng cột
        col_sums = matrix_sum_columns(matrix)
        # Chuẩn hóa ma trận
        normalized_matrix = matrix_normalize(matrix, col_sums)
        # Tính trọng số (trung bình hàng)
        weights = matrix_row_means(normalized_matrix)
        # Kiểm tra trọng số
        if any(w == 0 for w in weights):
            return jsonify({"error": "Trọng số chứa giá trị 0, không thể tính Consistency Ratio"}), 400
        # Tính weighted sum
        weighted_sum = matrix_dot_vector(matrix, weights)


        # Tính chi tiết phép nhân: matrix[i][j] * weights[j]
        matrix_dot_details = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                matrix_dot_details[i][j] = matrix[i][j] * weights[j]
        # Tính lambda_max
        lambda_max = sum(ws / w for ws, w in zip(weighted_sum, weights) if w != 0) / n if n > 0 else 0.0
        # Tính chỉ số nhất quán
        CI = (lambda_max - n) / (n - 1) if n > 1 else 0.0
        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        CR = CI / RI if RI != 0 else 0.0
        # Tính vector nhất quán (Consistency vector)
        consistency_vector = [ws / w if w != 0 else 0.0 for ws, w in zip(weighted_sum, weights)]
        consistency_vector_data = [
            {
                "criterion": f"C{i+1}",
                "weightedSum": float(weighted_sum[i]),
                "criteriaWeight": float(weights[i]),
                "consistencyVector": float(consistency_vector[i])
            } for i in range(n)
        ]

        if CR > 0.1:
            return jsonify({
                "message": "Tỷ số nhất quán (CR) vượt quá 10%.",
                "normalized_matrix": [[float(x) for x in row] for row in normalized_matrix],
                "weights": {f"C{i+1}": float(w) for i, w in enumerate(weights)},
                "CR": float(CR),
                "lambda_max": float(lambda_max),
                "CI": float(CI),
                "column_sums": [float(cs) for cs in col_sums],
                "consistency_vector": consistency_vector_data,
                "matrix_dot_details": [[float(x) for x in row] for row in matrix_dot_details]
            }), 400

        # Lưu dữ liệu vào cơ sở dữ liệu
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Lưu ma trận gốc
        cursor.execute(
            "DELETE FROM criteria_matrix WHERE customer_id = %s AND expert_id = %s",
            (customer_id, expert_id)
        )
        for i in range(n):
            for j in range(n):
        # Lưu ma trận gốc vào bảng criteria_matrix
                cursor.execute(
                    "INSERT INTO criteria_matrix (customer_id, expert_id, criterion1_id, criterion2_id, value, created_at) VALUES (%s, %s, %s, %s, %s, NOW())",
                    (customer_id, expert_id, i + 1, j + 1, float(matrix[i][j]))
                )

        # Lưu trọng số, tổng cột, Consistency Vector, và Weighted Sum
        cursor.execute(
            "DELETE FROM criteria_weights WHERE customer_id = %s AND expert_id = %s",
            (customer_id, expert_id)
        )
        for i, (weight, col_sum_value, cv, ws) in enumerate(zip(weights, col_sums, consistency_vector, weighted_sum)):
            cursor.execute(
                "INSERT INTO criteria_weights (customer_id, expert_id, criterion_id, weight, column_sum, consistency_vector, weighted_sum, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())",
                (customer_id, expert_id, i + 1, float(weight), float(col_sum_value), float(cv), float(ws))
            )


        cursor.execute(
            "DELETE FROM consistency_metrics_criteria WHERE customer_id = %s AND expert_id = %s",
            (customer_id, expert_id)
        )
        #         # Lưu consistency metrics lambda_max, CI, CR
        cursor.execute(
            "INSERT INTO consistency_metrics_criteria (customer_id, expert_id, lambda_max, CI, CR, created_at) VALUES (%s, %s, %s, %s, %s, NOW())",
            (customer_id, expert_id, float(lambda_max), float(CI), float(CR))
        )

        conn.commit()
        cursor.close()
        conn.close()

        # Định dạng bảng cuối cùng để hiển thị
        criteria_names = ["Tổng tài sản", "Tỷ lệ vay/tài sản", "Hạng tín dụng", "Lịch sử nợ", "Độ dài lịch sử tín dụng", "Quyền sở hữu nhà"]
        criteria_weights_table = {
            "criteria": criteria_names,
            "weights": [float(w) for w in weights]
        }

        return jsonify({
            "message": "Trọng số đã được tính toán và lưu thành công.",
            "normalized_matrix": [[float(x) for x in row] for row in normalized_matrix],
            "weights": {f"C{i+1}": float(w) for i, w in enumerate(weights)},
            "criteria_weights_table": criteria_weights_table,
            "CR": float(CR),
            "lambda_max": float(lambda_max),
            "CI": float(CI),
            "column_sums": [float(cs) for cs in col_sums],
            "consistency_vector": consistency_vector_data,
            "matrix_dot_details": [[float(x) for x in row] for row in matrix_dot_details]  # Thêm chi tiết phép nhân
        })

    except Exception as e:
        logger.error(f"Lỗi trong calculate_criteria_weights: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500

# ---------------- AHP: Tính điểm phương án ----------------
def calculate_alternative_scores():
    try:
        data = request.get_json()
        expert_id = data['expert_id']
        criterion_id = data['criteria_id']
        comparisons = data['comparisons']
        customer_id = data.get('customer_id')
        if not customer_id:
            return jsonify({"error": "customer_id is required"}), 400

        alt_ids_set = set()
        for comp in comparisons:
            alt_ids_set.add(comp['alt1_id'])
            alt_ids_set.add(comp['alt2_id'])
        alt_ids = list(alt_ids_set)
        n = len(alt_ids)

        if n < 2:
            return jsonify({"error": "Cần ít nhất 2 phương án để so sánh"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Kiểm tra xem các phương án có tồn tại trong bảng alternatives không
        placeholders = ','.join(['%s'] * len(alt_ids))
        query = f"SELECT id, name FROM alternatives WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(alt_ids))
        alternatives = cursor.fetchall()
        existing_alt_ids = {row[0] for row in alternatives}
        alt_names = {row[0]: row[1] for row in alternatives}

        if len(existing_alt_ids) != len(alt_ids):
            missing_ids = set(alt_ids) - existing_alt_ids
            cursor.close()
            conn.close()
            return jsonify({
                "error": f"Các phương án với ID {missing_ids} không tồn tại trong bảng alternatives"
            }), 400

        # Khởi tạo ma trận
        matrix = [[1.0] * n for _ in range(n)]
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
        # Tính tổng cột
        col_sums = matrix_sum_columns(matrix)
        # Chuẩn hóa ma trận
        norm_matrix = matrix_normalize(matrix, col_sums)
        # Tính trọng số (trọng số PA - trung bình hàng)
        weights = matrix_row_means(norm_matrix)
        # Tính weighted sum (Sum Weight)
        weighted_sum = matrix_dot_vector(matrix, weights)

        # Tính chi tiết phép nhân: matrix[i][j] * weights[j] cho từng phần tử
        matrix_dot_details = []
        for i in range(n):
            row_details = []
            for j in range(n):
                product = matrix[i][j] * weights[j]
                row_details.append({
                    "matrix_value": float(matrix[i][j]),
                    "weight": float(weights[j]),
                    "product": float(product)
                })
            matrix_dot_details.append(row_details)
        # Tính lambda_max
        lambda_max = sum(ws / w for ws, w in zip(weighted_sum, weights) if w != 0) / n if n > 0 else 0.0
        # Tính chỉ số nhất quán
        CI = (lambda_max - n) / (n - 1) if n > 1 else 0.0
        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        # Tính chỉ số nhất quán tỷ lệ (Consistency Ratio - CR)
        CR = CI / RI if RI != 0 else 0.0

        # Tính vector nhất quán (Consistency vector)
        consistency_vector = [ws / w if w != 0 else 0.0 for ws, w in zip(weighted_sum, weights)]
        # Tạo dữ liệu chi tiết (consistency_vector_data)
        consistency_vector_data = [
            {
                "alternative": alt_names[alt_ids[i]],
                "weightedSum": float(weighted_sum[i]),
                "alternativeWeight": float(weights[i]),
                "consistencyVector": float(consistency_vector[i])
            }
            for i in range(n)
        ]

        # Xóa và lưu dữ liệu vào cơ sở dữ liệu nếu CR < 0.1
        cursor.execute(
            "DELETE FROM alternative_comparisons WHERE customer_id = %s AND expert_id = %s AND criterion_id = %s",
            (customer_id, expert_id, criterion_id)
        )
        logger.info(f"Xóa {cursor.rowcount} bản ghi cũ trong alternative_comparisons")

        cursor.execute(
            "DELETE FROM consistency_metrics_alternatives WHERE customer_id = %s AND expert_id = %s AND criterion_id = %s",
            (customer_id, expert_id, criterion_id)
        )
        logger.info(f"Xóa {cursor.rowcount} bản ghi cũ trong consistency_metrics_alternatives")

# nếu CR < 0.1
        if CR < 0.1:
            for comp in comparisons:
                # Lưu so sánh đôi vào bảng alternative_comparisons
                cursor.execute(
                    "INSERT INTO alternative_comparisons (customer_id, expert_id, criterion_id, alternative1_id, alternative2_id, value) VALUES (%s, %s, %s, %s, %s, %s)",
                    (customer_id, expert_id, criterion_id, comp['alt1_id'], comp['alt2_id'], comp['value'])
                )
                # Lưu chỉ số nhất quán vào bảng consistency_metrics_alternatives
            cursor.execute(
                "INSERT INTO consistency_metrics_alternatives (customer_id, expert_id, criterion_id, lambda_max, CI, CR) VALUES (%s, %s, %s, %s, %s, %s)",
                (customer_id, expert_id, criterion_id, float(lambda_max), float(CI), float(CR))
            )
            conn.commit()

        cursor.close()
        conn.close()
# Tạo dictionary điểm số (scores) ánh xạ ID của tiêu chí (alt_id) với trọng số (weight) tương ứng.
        scores = {str(alt_id): float(weight) for alt_id, weight in zip(alt_ids, weights)}

#  Trả về phản hồi JSON
        return jsonify({
            "message": "Alternative scores calculated successfully." if CR < 0.1 else "Consistency Ratio (CR) exceeds 10%. Data not saved.",
            "scores": scores,
            "CR": float(CR),
            "lambda_max": float(lambda_max),
            "CI": float(CI),
            "consistency_vector_data": consistency_vector_data,
            "matrix_dot_details": matrix_dot_details,  # Trả về chi tiết phép nhân
            "weighted_sum": [float(ws) for ws in weighted_sum],  # Trả về weighted sum để đối chiếu
            "weights": [float(w) for w in weights]  # Trả về trọng số PA
        })

    except KeyError as e:
        logger.error(f"Thiếu trường bắt buộc trong payload: {str(e)}")
        return jsonify({"error": f"Thiếu trường bắt buộc trong payload: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Lỗi trong calculate_alternative_scores: {str(e)}")
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500

# ---------------- API: GET trọng số và điểm ----------------
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

def get_consistency_metrics_criteria():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        
        cursor = conn.cursor()
        query = """
            SELECT customer_id, expert_id, lambda_max, CI, CR, created_at
            FROM consistency_metrics_criteria
        """
        params = []
        conditions = []

        if request.args.get('customer_id'):
            conditions.append("customer_id = %s")
            params.append(int(request.args.get('customer_id')))
        if request.args.get('expert_id'):
            conditions.append("expert_id = %s")
            params.append(int(request.args.get('expert_id')))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({
            "consistency_metrics": [{
                "customer_id": row[0],
                "expert_id": row[1],
                "lambda_max": float(row[2]),
                "CI": float(row[3]),
                "CR": float(row[4]),
                "created_at": row[5].isoformat()
            } for row in rows]
        })

    except Exception as e:
        logger.error(f"Lỗi trong get_consistency_metrics_criteria: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500
    
def get_consistency_metrics_alternatives():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        
        cursor = conn.cursor()
        query = """
            SELECT customer_id, expert_id, criterion_id, lambda_max, CI, CR, created_at
            FROM consistency_metrics_alternatives
        """
        params = []
        conditions = []

        if request.args.get('customer_id'):
            conditions.append("customer_id = %s")
            params.append(int(request.args.get('customer_id')))
        if request.args.get('expert_id'):
            conditions.append("expert_id = %s")
            params.append(int(request.args.get('expert_id')))
        if request.args.get('criterion_id'):
            conditions.append("criterion_id = %s")
            params.append(int(request.args.get('criterion_id')))

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify({
            "consistency_metrics": [{
                "customer_id": row[0],
                "expert_id": row[1],
                "criterion_id": row[2],
                "lambda_max": float(row[3]),
                "CI": float(row[4]),
                "CR": float(row[5]),
                "created_at": row[6].isoformat()
            } for row in rows]
        })

    except Exception as e:
        logger.error(f"Lỗi trong get_consistency_metrics_alternatives: {str(e)}")
        if conn:
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500

  
def get_final_alternative_scores():
 try:
        customer_id = request.args.get('customer_id')
        if not customer_id:
            return jsonify({"error": "customer_id là bắt buộc"}), 400
        
        # Kết nối cơ sở dữ liệu
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor()

        # Lấy danh sách tất cả các phương án
        cursor.execute("SELECT id, name FROM alternatives")
        alternatives = cursor.fetchall()
        if not alternatives:
            cursor.close()
            conn.close()
            return jsonify({"error": "Không tìm thấy phương án nào trong bảng alternatives"}), 400
        alt_ids = [alt_id for alt_id, _ in alternatives]
        alt_names = {alt_id: name for alt_id, name in alternatives}

        # Lấy danh sách tiêu chí
        cursor.execute("SELECT id FROM criteria")
        criteria = cursor.fetchall()
        criterion_ids = [c_id for c_id, in criteria]
        if not criterion_ids:
            cursor.close()
            conn.close()
            return jsonify({"error": "Không tìm thấy tiêu chí nào"}), 400

        # Khởi tạo điểm cuối cùng
        final_scores = {alt_id: 0.0 for alt_id in alt_ids}

        # Lấy trọng số tiêu chí
        cursor.execute(
            "SELECT criterion_id, weight FROM criteria_weights WHERE customer_id = %s",
            (customer_id,)
        )
        criteria_weights = {row[0]: float(row[1]) for row in cursor.fetchall()}
        if not criteria_weights:
            cursor.close()
            conn.close()
            return jsonify({"error": "Không có trọng số tiêu chí cho customer_id này"}), 400

        # Tính điểm cho từng tiêu chí
        for criterion_id in criterion_ids:
            # Lấy dữ liệu so sánh cặp cho tiêu chí
            cursor.execute("""
                SELECT alternative1_id, alternative2_id, value
                FROM alternative_comparisons
                WHERE customer_id = %s AND criterion_id = %s
            """, (customer_id, criterion_id))
            comparisons = cursor.fetchall()

            if not comparisons:
                continue
            # Tạo ma trận so sánh cho chuyên gia  
            matrix = [[1.0] * len(alt_ids) for _ in range(len(alt_ids))]
            for alt1_id, alt2_id, value in comparisons:
                if alt1_id not in alt_ids or alt2_id not in alt_ids:
                    continue
                i = alt_ids.index(alt1_id)
                j = alt_ids.index(alt2_id)
                matrix[i][j] = float(value)
                matrix[j][i] = 1.0 / float(value)

            # Tính tổng cột
            col_sums = matrix_sum_columns(matrix)  
            if any(cs == 0 for cs in col_sums):
                continue
            norm_matrix = matrix_normalize(matrix, col_sums)  # Chuẩn hóa ma trận
            scores = matrix_row_means(norm_matrix)  # Tính điểm số (trung bình hàng)

            # Cộng điểm vào điểm số cuối cùng
            weight = criteria_weights.get(criterion_id, 0.0)
            for i, alt_id in enumerate(alt_ids):
                final_scores[alt_id] += float(scores[i]) * weight

        # Xóa các bản ghi cũ trong ahp_final_scores
        cursor.execute("DELETE FROM ahp_final_scores WHERE customer_id = %s", (customer_id,))

        # Lưu điểm vào bảng ahp_final_scores
        for alt_id, score in final_scores.items():
            cursor.execute("""
                INSERT INTO ahp_final_scores (customer_id, alternative_id, final_score)
                VALUES (%s, %s, %s)
            """, (customer_id, alt_id, float(score)))

        conn.commit()

        # Lấy điểm cuối cùng
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

        result = [{"alternative_name": row[0], "final_score": float(row[1])} for row in rows]
        return jsonify({"final_scores": result})
 except Exception as e:
        logger.error(f"Lỗi trong get_final_alternative_scores: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500
def get_consistency_vector_data():
    try:
        data = request.get_json()
        if 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số customer_id hoặc expert_id"}), 400

        customer_id = data['customer_id']
        expert_id = data['expert_id']

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Không thể kết nối cơ sở dữ liệu"}), 500
        cursor = conn.cursor(dictionary=True)

        # Lấy vector trọng số và weighted_sum
        query = """
        SELECT 
            cw.criterion_id,
            c.name AS criterion_name,
            cw.weight AS criteria_weight,
            cw.weighted_sum,
            cw.consistency_vector
        FROM criteria_weights cw
        JOIN criteria c ON cw.criterion_id = c.id
        WHERE cw.customer_id = %s AND cw.expert_id = %s
        """
        cursor.execute(query, (customer_id, expert_id))
        rows = cursor.fetchall()

        if not rows:
            return jsonify({
                "message": "Không tìm thấy dữ liệu cho customer_id và expert_id đã chọn",
                "consistency_vector_data": [],
                "matrix_dot_details": []
            }), 404

        consistency_vector_data = [
            {
                "criterion": row["criterion_name"],
                "weightedSum": float(row["weighted_sum"]) if row["weighted_sum"] is not None else 0.0,
                "criteriaWeight": float(row["criteria_weight"]) if row["criteria_weight"] is not None else 0.0,
                "consistencyVector": float(row["consistency_vector"]) if row["consistency_vector"] is not None else 0.0
            }
            for row in rows
        ]

        # Lấy ma trận so sánh cặp từ criteria_matrix
        cursor.execute("""
            SELECT criterion1_id, criterion2_id, value
            FROM criteria_matrix
            WHERE customer_id = %s AND expert_id = %s
        """, (customer_id, expert_id))
        matrix_rows = cursor.fetchall()

        # Lấy vector trọng số và chuyển thành float
        weights = [float(row["criteria_weight"]) for row in rows]
        n = len(weights)

        # Tái tạo ma trận so sánh cặp
        matrix = [[1.0] * n for _ in range(n)]
        for row in matrix_rows:
            i = row["criterion1_id"] - 1
            j = row["criterion2_id"] - 1
            matrix[i][j] = float(row["value"])  # Đảm bảo chuyển thành float
            matrix[j][i] = 1.0 / float(row["value"]) if i != j else 1.0

        # Tính chi tiết phép nhân: matrix[i][j] * weights[j]
        matrix_dot_details = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                matrix_dot_details[i][j] = matrix[i][j] * weights[j]

        cursor.close()
        conn.close()

        return jsonify({
            "message": "Lấy dữ liệu thành công",
            "consistency_vector_data": consistency_vector_data,
            "matrix_dot_details": [[float(x) for x in row] for row in matrix_dot_details]
        })

    except Exception as e:
        logger.error(f"Lỗi trong get_consistency_vector_data: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return jsonify({"error": str(e)}), 500