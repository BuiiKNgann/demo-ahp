

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import numpy as np
from scipy.stats import gmean
import uuid

app = Flask(__name__)
CORS(app)

# ---------------- Kết nối DB ----------------
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",
        database="ahp_demo1"
    )

# ---------------- API: GET ----------------
@app.route('/get-experts', methods=['GET'])
def get_experts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM experts")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"experts": [{"id": row[0], "name": row[1]} for row in rows]})

@app.route('/get-customers', methods=['GET'])
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT id, name, loan_amount, loan_purpose, financial_description, is_selected_for_ahp FROM customers"
    params = []

    # Xây dựng điều kiện WHERE dựa trên tham số query
    conditions = []
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
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM criteria")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"criteria": [{"id": row[0], "name": row[1]} for row in rows]})

@app.route('/get-alternatives', methods=['GET'])
def get_alternatives():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM alternatives")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"alternatives": [{"id": row[0], "name": row[1]} for row in rows]})

# ---------------- API: POST ----------------
@app.route('/add-expert', methods=['POST'])
def add_expert():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400
    conn = get_db_connection()
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
    if not name:
        return jsonify({"error": "Name is required"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO alternatives (name) VALUES (%s)", (name,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Alternative added successfully"}), 201

# ---------------- AHP: Tính trọng số tiêu chí ----------------
@app.route('/calculate-criteria-weights', methods=['POST'])
def calculate_criteria_weights():
    try:
        data = request.get_json()
        if 'comparison_matrix' not in data or 'customer_id' not in data or 'expert_id' not in data:
            return jsonify({"error": "Thiếu tham số comparison_matrix, customer_id hoặc expert_id"}), 400

        matrix = np.array(data['comparison_matrix'], dtype=float)
        customer_id = data['customer_id']
        expert_id = data['expert_id']

        if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1]:
            return jsonify({"error": "Comparison matrix phải là ma trận vuông"}), 400

        if not np.all(matrix > 0):
            return jsonify({"error": "Tất cả giá trị trong ma trận phải là số dương"}), 400

        col_sum = matrix.sum(axis=0)
        if np.any(col_sum == 0):
            return jsonify({"error": "Ma trận chứa cột có tổng bằng 0, không thể chuẩn hóa"}), 400

        normalized_matrix = matrix / col_sum
        weights = normalized_matrix.mean(axis=1)

        if np.any(weights == 0):
            return jsonify({"error": "Trọng số chứa giá trị 0, không thể tính Consistency Ratio"}), 400

        n = matrix.shape[0]
        weighted_sum = matrix.dot(weights)
        lambda_max = np.sum(weighted_sum / weights) / n
        CI = (lambda_max - n) / (n - 1)

        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        CR = CI / RI if RI != 0 else 0

        if CR > 0.1:
            return jsonify({
                "message": "Consistency Ratio (CR) exceeds 10%. Data not saved.",
                "weights": {f"C{i+1}": round(float(w), 4) for i, w in enumerate(weights)},
                "CR": round(CR, 4)
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        for i, weight in enumerate(weights):
            criterion_id = i + 1
            cursor.execute(
                "INSERT INTO criteria_weights (customer_id, expert_id, criterion_id, weight) VALUES (%s, %s, %s, %s)",
                (customer_id, expert_id, criterion_id, round(float(weight), 4))
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Weights calculated and stored successfully.",
            "weights": {f"C{i+1}": round(float(w), 4) for i, w in enumerate(weights)},
            "CR": round(CR, 4)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- AHP: Tính điểm phương án ----------------
@app.route('/calculate-alternative-scores', methods=['POST'])
def calculate_alternative_scores():
    try:
        data = request.get_json()
        expert_id = data['expert_id']
        criterion_id = data['criteria_id']
        comparisons = data['comparisons']
        customer_id = data.get('customer_id')  # Kiểm tra nếu không có thì báo lỗi
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
        cursor = conn.cursor()

        # Kiểm tra và thêm alt_ids vào bảng alternatives nếu chưa tồn tại
        if not alt_ids:
            cursor.close()
            conn.close()
            return jsonify({"error": "Danh sách ID phương án trống"}), 400

        placeholders = ','.join(['%s'] * len(alt_ids))
        query = f"SELECT id FROM alternatives WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(alt_ids))
        existing_alt_ids = {row[0] for row in cursor.fetchall()}

        # Lấy thông tin khách hàng để thêm vào alternatives
        query = f"SELECT id, name FROM customers WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(alt_ids))
        customer_data = cursor.fetchall()
        customer_dict = {row[0]: row[1] for row in customer_data}

        # Thêm các alt_ids chưa tồn tại vào bảng alternatives
        for alt_id in alt_ids:
            if alt_id not in existing_alt_ids:
                if alt_id not in customer_dict:
                    cursor.close()
                    conn.close()
                    return jsonify({
                        "error": f"Không tìm thấy khách hàng với ID: {alt_id} trong bảng customers."
                    }), 400
                cursor.execute(
                    "INSERT INTO alternatives (id, name) VALUES (%s, %s)",
                    (alt_id, customer_dict[alt_id])
                )
        conn.commit()

        # Khởi tạo ma trận
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

        # Lưu dữ liệu nếu CR < 0.1
        if CR < 0.1:
            # Xóa các bản ghi cũ nếu tồn tại
            cursor.execute(
                "DELETE FROM alternative_comparisons WHERE expert_id = %s AND criterion_id = %s AND customer_id = %s",
                (expert_id, criterion_id, customer_id)
            )
            # Lưu các so sánh mới
            for comp in comparisons:
                cursor.execute(
                    "INSERT INTO alternative_comparisons (customer_id, expert_id, criterion_id, alternative1_id, alternative2_id, value) VALUES (%s, %s, %s, %s, %s, %s)",
                    (customer_id, expert_id, criterion_id, comp['alt1_id'], comp['alt2_id'], comp['value'])
                )
            conn.commit()

        cursor.close()
        conn.close()

        # Trả về scores với key là alt_id (customer.id)
        scores = {str(alt_id): round(float(weight), 4) for alt_id, weight in zip(alt_ids, weights)}

        return jsonify({
            "message": "Alternative scores calculated successfully." if CR < 0.1 else "Consistency Ratio (CR) exceeds 10%. Data not saved.",
            "scores": scores,
            "CR": round(CR, 4)
        })

    except KeyError as e:
        return jsonify({"error": f"Thiếu trường bắt buộc trong payload: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500

# ---------------- API: GET trọng số và điểm ----------------
@app.route('/get-criteria-weights', methods=['GET'])
def get_criteria_weights():
    conn = get_db_connection()
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
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500
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
                    continue  # Bỏ qua nếu alternative không tồn tại trong danh sách
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
                scores = norm_matrix.mean(axis=1)  # Trọng số của phương án theo tiêu chí

                weight = criteria_weights.get(criterion_id, 0.0)
                for i, alt_id in enumerate(alt_ids):
                    final_scores[alt_id] += float(scores[i]) * weight

        # Xóa các bản ghi cũ trong ahp_final_scores để tránh lặp
        cursor.execute("DELETE FROM ahp_final_scores WHERE customer_id = %s", (customer_id,))

        # Lưu điểm vào bảng ahp_final_scores, đảm bảo không lặp
        for alt_id, score in final_scores.items():
            score_float = float(score)
            cursor.execute("""
                INSERT INTO ahp_final_scores (customer_id, alternative_id, final_score)
                VALUES (%s, %s, %s)
            """, (customer_id, alt_id, round(score_float, 4)))

        conn.commit()

        # Lấy điểm cuối cùng, không lặp lại (dùng GROUP BY cho MySQL)
        cursor.execute("""
            SELECT alternatives.name, MAX(ahp_final_scores.final_score) AS final_score
            FROM ahp_final_scores
            JOIN alternatives ON ahp_final_scores.alternative_id = alternatives.id
            WHERE ahp_final_scores.customer_id = %s
            GROUP BY alternatives.name
            ORDER BY final_score DESC
        """, (customer_id,))
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        # Chuyển đổi và trả về kết quả
        result = [{"alternative_name": row[0], "final_score": float(row[1])} for row in rows]
        return jsonify({"final_scores": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ---------------- Run app ----------------
if __name__ == '__main__':
    app.run(debug=True)