
from flask import Flask
from flask_cors import CORS
from routes import (
    get_experts, get_customers, get_criteria, get_alternatives,
    get_criteria_matrix, get_alternative_comparisons, add_expert,
    add_customer, add_criterion, add_alternative,
    update_alternatives_from_customers, save_criteria_matrix,
    calculate_criteria_weights, calculate_alternative_scores,
    get_criteria_weights, get_consistency_metrics_criteria,
    get_consistency_metrics_alternatives, get_final_alternative_scores,
    get_consistency_vector_data
)

app = Flask(__name__)
CORS(app)

# Đăng ký các route
app.route('/get-experts', methods=['GET'])(get_experts)
app.route('/get-customers', methods=['GET'])(get_customers)
app.route('/get-criteria', methods=['GET'])(get_criteria)
app.route('/get-alternatives', methods=['GET'])(get_alternatives)
app.route('/get-criteria-matrix', methods=['GET'])(get_criteria_matrix)
app.route('/get-alternative-comparisons', methods=['GET'])(get_alternative_comparisons)
app.route('/add-expert', methods=['POST'])(add_expert)
app.route('/add-customer', methods=['POST'])(add_customer)
app.route('/add-criterion', methods=['POST'])(add_criterion)
app.route('/add-alternative', methods=['POST'])(add_alternative)
app.route('/update-alternatives-from-customers', methods=['POST'])(update_alternatives_from_customers)
app.route('/save-criteria-matrix', methods=['POST'])(save_criteria_matrix)
app.route('/calculate-criteria-weights', methods=['POST'])(calculate_criteria_weights)
app.route('/calculate-alternative-scores', methods=['POST'])(calculate_alternative_scores)
app.route('/get-criteria-weights', methods=['GET'])(get_criteria_weights)
app.route('/get-consistency-metrics-criteria', methods=['GET'])(get_consistency_metrics_criteria)
app.route('/get-consistency-metrics-alternatives', methods=['GET'])(get_consistency_metrics_alternatives)
app.route('/get-final-alternative-scores', methods=['GET'])(get_final_alternative_scores)
app.route('/get-consistency-vector-data', methods=['POST'])(get_consistency_vector_data)

# Chạy ứng dụng
if __name__ == '__main__':
    app.run(debug=True)