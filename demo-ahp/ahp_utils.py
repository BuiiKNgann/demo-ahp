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
    # Tính giá trị chuẩn hóa:
                normalized[i][j] = matrix[i][j] / col_sums[j]
    return normalized

def matrix_row_means(matrix):
    """Tính trung bình các hàng của ma trận."""
    n = len(matrix)
    means = [0.0] * n
    for i in range(n):
        # Tính tổng hàng
        row_sum = sum(matrix[i]) 
        # Tính trung bình hàng
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

#  