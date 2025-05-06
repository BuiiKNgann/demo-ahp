import { useState, useEffect } from "react";
import { calculateAlternativeScores } from "../services/api";

const AlternativeMatrix = ({
  expertId,
  customerId,
  criteriaId,
  criteriaName,
  customers,
  onScoresCalculated,
  disabled,
}) => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);

  const dropdownOptions = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    1 / 2,
    1 / 3,
    1 / 4,
    1 / 5,
    1 / 6,
    1 / 7,
    1 / 8,
    1 / 9,
  ];

  const formatValue = (value) => {
    if (!value) return "";
    const fractionMap = {
      0.5: "1/2",
      0.3333333333333333: "1/3",
      0.25: "1/4",
      0.2: "1/5",
      0.16666666666666666: "1/6",
      0.14285714285714285: "1/7",
      0.125: "1/8",
      0.1111111111111111: "1/9",
    };
    return fractionMap[value] || value.toString();
  };

  useEffect(() => {
    if (customers && customers.length > 0) {
      const size = customers.length;
      const initialMatrix = Array(size)
        .fill()
        .map(
          (_, i) =>
            Array(size)
              .fill()
              .map((_, j) => (i === j ? 1 : 0)) // Khởi tạo mặc định là 0 cho các ô không phải đường chéo
        );
      setMatrix(initialMatrix);
      setLoading(false);
    }
  }, [customers]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue) && parsedValue > 0 && parsedValue <= 9) {
      newMatrix[rowIndex][colIndex] = parsedValue;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 1 / parsedValue;
      }
      setMatrix(newMatrix);
      setConsistencyError(null);
      setError(null);
    } else {
      newMatrix[rowIndex][colIndex] = 0;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 0;
      }
      setMatrix(newMatrix);
      setError("Vui lòng nhập giá trị hợp lệ (số dương từ 1/9 đến 9)");
    }
  };

  const handleCalculate = async () => {
    if (!customerId || !expertId || !criteriaId) {
      setError("Vui lòng đảm bảo đã chọn khách hàng, chuyên gia và tiêu chí");
      return;
    }

    const size = customers.length;
    let isComplete = true;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (
          i !== j &&
          (matrix[i][j] <= 0 ||
            matrix[i][j] === undefined ||
            isNaN(matrix[i][j]))
        ) {
          isComplete = false;
          break;
        }
      }
      if (!isComplete) break;
    }

    if (!isComplete) {
      setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      setConsistencyError(null);

      const comparisons = [];
      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          if (matrix[i][j] !== 1) {
            comparisons.push({
              alt1_id: customers[i].id,
              alt2_id: customers[j].id,
              value: matrix[i][j],
            });
          }
        }
      }

      const payload = {
        expert_id: expertId,
        customer_id: customerId,
        criteria_id: criteriaId,
        comparisons: comparisons,
      };
      console.log("Sending payload:", payload);

      const result = await calculateAlternativeScores(payload);
      setResults(result);

      if (result.CR > 0.1) {
        setConsistencyError(
          `Tỷ số nhất quán (CR = ${result.CR.toFixed(
            4
          )}) vượt quá 10%. Vui lòng điều chỉnh lại ma trận.`
        );
      } else {
        onScoresCalculated(criteriaId, result);
      }
      setCalculating(false);
    } catch (err) {
      console.error("API Error:", err);
      let errorMessage = "Lỗi không xác định";
      if (err.response && err.response.data) {
        errorMessage =
          err.response.data.error ||
          err.response.data.message ||
          "Lỗi từ server";
        if (errorMessage.includes("foreign key constraint fails")) {
          errorMessage =
            "Một hoặc nhiều ID khách hàng không hợp lệ. Vui lòng kiểm tra dữ liệu khách hàng.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(`Lỗi khi tính toán điểm số: ${errorMessage}`);
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">Đang tải...</div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
      <h3 className="text-lg font-medium mb-4">
        Ma trận so sánh cặp khách hàng theo tiêu chí: {criteriaName}
      </h3>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-700">
          So sánh tầm quan trọng tương đối của các khách hàng theo tiêu chí{" "}
          {criteriaName}. Giá trị từ 1 đến 9 thể hiện mức độ quan trọng hơn, giá
          trị từ 1/9 đến 1 thể hiện mức độ quan trọng kém hơn.
        </p>
      </div>

      {consistencyError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-red-700">{consistencyError}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-r"></th>
              {customers.map((customer) => (
                <th
                  key={customer.id}
                  className="py-2 px-4 border-b border-r border-gray-300"
                >
                  {customer.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((rowCustomer, rowIndex) => (
              <tr key={rowCustomer.id}>
                <td className="py-2 px-4 border-b border-r font-medium">
                  {rowCustomer.name}
                </td>
                {customers.map((colCustomer, colIndex) => (
                  <td
                    key={colCustomer.id}
                    className="py-2 px-4 border-b border-r border-gray-300"
                  >
                    {rowIndex === colIndex ? (
                      <span className="text-center block">1</span>
                    ) : rowIndex < colIndex ? (
                      <select
                        value={matrix[rowIndex][colIndex] || ""}
                        onChange={(e) =>
                          handleMatrixChange(rowIndex, colIndex, e.target.value)
                        }
                        disabled={disabled}
                        className={`w-full px-2 py-1 border rounded ${
                          !matrix[rowIndex][colIndex]
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Chọn giá trị</option>
                        {dropdownOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatValue(option)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-center block text-gray-500">
                        {matrix[colIndex][rowIndex]
                          ? formatValue(1 / matrix[colIndex][rowIndex])
                          : "0"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={calculating || disabled}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
        >
          {calculating ? "Đang tính..." : "Tính điểm số"}
        </button>
      </div>

      {results && !consistencyError && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-md font-medium mb-2">Kết quả điểm số:</h4>
          <ul className="space-y-1">
            {customers.map((customer) => {
              const score = results.scores[customer.id] || 0;
              return (
                <li key={customer.id} className="flex justify-between">
                  <span>{customer.name}:</span>
                  <span className="font-medium">{score.toFixed(4)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between">
              <span>Tỷ số nhất quán (CR):</span>
              <span
                className={`font-medium ${
                  results.CR > 0.1 ? "text-red-600" : "text-green-600"
                }`}
              >
                {results.CR.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlternativeMatrix;
