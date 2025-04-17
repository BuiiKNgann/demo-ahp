 
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import numpy as np

app = Flask(__name__)
CORS(app)

# ---------------- Kết nối DB ----------------
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345",
        database="ahp"
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

# ---------------- AHP: Tính trọng số tiêu chí ----------------
  
@app.route('/calculate-criteria-weights', methods=['POST'])
def calculate_criteria_weights():
    try:
        data = request.get_json()
        matrix = np.array(data['comparison_matrix'], dtype=float)
        expert_id = data['expert_id']
        
        # Tổng từng cột
        col_sum = matrix.sum(axis=0)
        
        # Chuẩn hóa ma trận
        normalized_matrix = matrix / col_sum
        
        # Tính trọng số (trung bình dòng)
        weights = normalized_matrix.mean(axis=1)
        
        # Tính CR - Consistency Ratio
        n = matrix.shape[0]
        weighted_sum = matrix.dot(weights)
        lambda_max = np.sum(weighted_sum / weights) / n
        CI = (lambda_max - n) / (n - 1)
        
        #chỉ số tham chiếu theo số tiêu chí
        RI_dict = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45}
        RI = RI_dict.get(n, 1.49)
        CR = CI / RI if RI != 0 else 0
        
        # Kiểm tra nếu CR > 10% thì không lưu vào DB
        if CR > 0.1:
            return jsonify({
                "message": "Consistency Ratio (CR) exceeds 10%. Data not saved.",
                "weights": {f"C{i+1}": round(float(w), 4) for i, w in enumerate(weights)},
                "CR": round(CR, 4)
            }), 400
        
        # Nếu CR <= 10%, ghi vào DB
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for i, weight in enumerate(weights):
            criteria_id = i + 1
            cursor.execute(
                "INSERT INTO criteria_weights (expert_id, criteria_id, weight) VALUES (%s, %s, %s)",
                (expert_id, criteria_id, round(float(weight), 4))
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
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
# ---------------- AHP: Tính điểm phương án ----------------
 
@app.route('/calculate-alternative-scores', methods=['POST'])
def calculate_alternative_scores():
    try:
        data = request.get_json()
        matrix = np.array(data['comparison_matrix'], dtype=float)
        expert_id = data['expert_id']
        criteria_id = data['criteria_id']

        n = matrix.shape[0]

        # Tổng cột , chuẩn hóa ma trận 
        col_sum = matrix.sum(axis=0)
        norm_matrix = matrix / col_sum

        # Tính vector trọng số phương án
        weights = norm_matrix.mean(axis=1)

        # Tính CR
        weighted_sum = np.dot(matrix, weights)
        lambda_max = (weighted_sum / weights).mean()
        ci = (lambda_max - n) / (n - 1)

        # Chỉ số ngẫu nhiên RI theo kích thước n (tối đa đến n=10)
        RI_dict = {
            1: 0.00,
            2: 0.00,
            3: 0.58,
            4: 0.90,
            5: 1.12,
            6: 1.24,
            7: 1.32,
            8: 1.41,
            9: 1.45,
            10: 1.49
        }
        ri = RI_dict.get(n, 1.49)  # Nếu n > 10, dùng giá trị gần nhất

        cr = ci / ri if ri != 0 else 0

        # Chỉ lưu nếu CR hợp lệ
        if cr < 0.1:
            conn = get_db_connection()
            cursor = conn.cursor()

            for i, score in enumerate(weights):
                alternative_id = i + 1
                cursor.execute(
                    "INSERT INTO alternative_scores (expert_id, criteria_id, alternative_id, score) VALUES (%s, %s, %s, %s)",
                    (expert_id, criteria_id, alternative_id, round(float(score), 4))
                )

            conn.commit()
            cursor.close()
            conn.close()

        return jsonify({
            "message": "Alternative scores calculated successfully.",
            "scores": {f"A{i+1}": round(float(s), 4) for i, s in enumerate(weights)},
            "cr": round(cr, 4)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- API: GET trọng số và điểm ----------------
@app.route('/get-criteria-weights', methods=['GET'])
def get_criteria_weights():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT criteria.name, criteria_weights.weight
        FROM criteria_weights
        JOIN criteria ON criteria_weights.criteria_id = criteria.id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"criteria_weights": [{"criteria_name": row[0], "weight": row[1]} for row in rows]})

@app.route('/get-alternative-scores', methods=['GET'])
def get_alternative_scores():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT alternatives.name, alternative_scores.score
        FROM alternative_scores
        JOIN alternatives ON alternative_scores.alternative_id = alternatives.id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"alternative_scores": [{"alternative_name": row[0], "score": row[1]} for row in rows]})

   
@app.route('/get-final-alternative-scores', methods=['GET'])
def get_final_alternative_scores():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Lấy danh sách tất cả phương án
        cursor.execute("SELECT id, name FROM alternatives")
        alternatives = cursor.fetchall()  # [(1, 'A1'), (2, 'A2'), ...]

        # Lấy trọng số tiêu chí
        cursor.execute("SELECT criteria_id, weight FROM criteria_weights")
        criteria_weights = cursor.fetchall()  # [(1, 0.3), (2, 0.4), ...]

        # Khởi tạo điểm tổng cho mỗi phương án
        final_scores = {alt_id: 0.0 for alt_id, _ in alternatives}

        # Tính điểm cuối cho từng phương án theo từng tiêu chí
        for criteria_id, weight in criteria_weights:
            cursor.execute("""
                SELECT alternative_id, score FROM alternative_scores
                WHERE criteria_id = %s
            """, (criteria_id,))
            rows = cursor.fetchall()
            for alt_id, score in rows:
                final_scores[alt_id] += score * weight

        # Ghi điểm vào bảng final_alternative_scores
        for alt_id, score in final_scores.items():
            cursor.execute("""
                INSERT INTO final_alternative_scores (alternative_id, final_score)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE final_score = %s
            """, (alt_id, round(score, 4), round(score, 4)))

        conn.commit()

        # Chuẩn bị dữ liệu trả về (hiển thị tên thay vì ID)
        result = []
        for alt_id, score in final_scores.items():
            alt_name = next((name for (aid, name) in alternatives if aid == alt_id), f"A{alt_id}")
            result.append({"alternative_name": alt_name, "final_score": round(score, 4)})

        cursor.close()
        conn.close()

        return jsonify({"final_scores": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
# ---------------- Run app ----------------
if __name__ == '__main__':
    app.run(debug=True)