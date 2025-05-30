def matrix_sum_columns(matrix):
    """Tính tổng các cột của ma trận."""
    n = len(matrix)
    col_sums = [0.0] * n
    for j in range(n):
        for i in range(n):
            col_sums[j] += matrix[i][j]
    return col_sums

def matrix_normalize(matrix, col_sums):
    """Chuẩn hóa ma trận bằng cách chia mỗi phần tử cho tổng cột tương ứng."""
    n = len(matrix)
    normalized = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if col_sums[j] != 0:
                normalized[i][j] = matrix[i][j] / col_sums[j]
    return normalized

def matrix_row_means(matrix):
    """Tính trung bình các hàng của ma trận."""
    n = len(matrix)
    means = [0.0] * n
    for i in range(n):
        row_sum = sum(matrix[i])
        means[i] = row_sum / n if n > 0 else 0.0
    return means

def matrix_dot_vector(matrix, vector):
    """Tích ma trận với vector."""
    n = len(matrix)
    result = [0.0] * n
    for i in range(n):
        for j in range(n):
            result[i] += matrix[i][j] * vector[j]
    return result

def geometric_mean(values):
    """Tính trung bình hình học của một danh sách số dương """
    if not values or any(v <= 0 for v in values):
        return 0.0
    n = len(values)
    if n == 0:
        return 0.0
    
    # Tính tích của các giá trị
    product = 1.0
    for v in values:
        product *= v
    
    # Tính căn bậc n của tích bằng phương pháp lặp Newton
    def nth_root(x, n):
        if x == 0:
            return 0.0
        guess = x / n  # Giá trị ban đầu
        epsilon = 1e-10  # Độ chính xác
        while True:
            next_guess = ((n - 1) * guess + x / (guess ** (n - 1))) / n
            if abs(next_guess - guess) < epsilon:
                return next_guess
            guess = next_guess
    
    return nth_root(product, n)

def matrix_geometric_mean(matrices):
    """Tính trung bình hình học của các ma trận."""
    if not matrices:
        return []
    n = len(matrices[0])
    result = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            values = [matrix[i][j] for matrix in matrices if matrix[i][j] > 0]
            result[i][j] = geometric_mean(values) if values else 1.0
    return result