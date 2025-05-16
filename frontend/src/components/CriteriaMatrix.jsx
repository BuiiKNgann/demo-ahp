import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { calculateCriteriaWeights, saveCriteriaMatrix } from "../services/api"; // Import from your api.js

const CriteriaMatrix = ({
  onWeightsCalculated,
  disabled,
  customerId,
  expertId,
  criteria,
  importedMatrix,
}) => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FF6F61",
    "#6B7280",
    "#F472B6",
  ];

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
    if (!value) return "0";
    if (Math.abs(value - 1 / 2) < 0.001) return "1/2";
    if (Math.abs(value - 1 / 3) < 0.001) return "1/3";
    if (Math.abs(value - 1 / 4) < 0.001) return "1/4";
    if (Math.abs(value - 1 / 5) < 0.001) return "1/5";
    if (Math.abs(value - 1 / 6) < 0.001) return "1/6";
    if (Math.abs(value - 1 / 7) < 0.001) return "1/7";
    if (Math.abs(value - 1 / 8) < 0.001) return "1/8";
    if (Math.abs(value - 1 / 9) < 0.001) return "1/9";
    if (Number.isInteger(value)) return value.toString();
    for (const option of dropdownOptions) {
      if (Math.abs(value - option) < 0.001) return formatValue(option);
    }
    return value.toFixed(4);
  };

  const findClosestFraction = (decimal) => {
    if (!decimal || decimal === 0) return "";
    for (const option of dropdownOptions) {
      if (Math.abs(decimal - option) < 0.001) return option;
    }
    return decimal;
  };

  const parseMatrixValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    if (value.includes("/")) {
      const [numerator, denominator] = value.split("/").map(parseFloat);
      if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
        return 0;
      }
      return numerator / denominator;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (criteria && criteria.length > 0) {
      const size = criteria.length;
      let initialMatrix = Array(size)
        .fill()
        .map((_, i) =>
          Array(size)
            .fill()
            .map((_, j) => (i === j ? 1 : 0))
        );

      // Nếu có ma trận đã import, sử dụng nó
      if (importedMatrix) {
        if (
          importedMatrix.length === size &&
          importedMatrix.every((row) => row.length === size)
        ) {
          const isValid = importedMatrix.every((row, i) =>
            row.every((value, j) => {
              if (i === j) return value === 1;
              if (!value || value <= 0 || value > 9) return false;
              const reciprocal = importedMatrix[j][i];
              return Math.abs(value - 1 / reciprocal) < 0.01;
            })
          );

          if (isValid) {
            initialMatrix = importedMatrix;
            setError(null);
          } else {
            setError(
              "Ma trận tiêu chí không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
            );
          }
        } else {
          setError("Kích thước ma trận tiêu chí không khớp với số tiêu chí");
        }
      }

      setMatrix(initialMatrix);
      setLoading(false);
    } else {
      setError("Không có tiêu chí nào được cung cấp");
      setLoading(false);
    }
  }, [criteria, importedMatrix]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];
    const parsedValue = parseMatrixValue(value);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      newMatrix[rowIndex][colIndex] = parsedValue;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 1 / parsedValue;
      }
    } else {
      newMatrix[rowIndex][colIndex] = 0;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 0;
      }
    }

    setMatrix(newMatrix);
    setConsistencyError(null);
  };

  const handleCalculate = async () => {
    if (customerId === undefined || expertId === undefined) {
      setError(
        "Vui lòng chọn khách hàng và chuyên gia trước khi tính trọng số"
      );
      return;
    }

    const size = criteria.length;
    let isComplete = true;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j && (matrix[i][j] <= 0 || matrix[i][j] === undefined)) {
          isComplete = false;
          break;
        }
      }
      if (!isComplete) break;
    }

    if (!isComplete) {
      setError("Vui lòng điền đầy đủ giá trị cho ma trận so sánh");
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      setConsistencyError(null);
      setSuccessMessage("");

      // Lưu ma trận tiêu chí
      try {
        await saveCriteriaMatrix(matrix, customerId, expertId);
        setSuccessMessage("Lưu ma trận và tính toán trọng số thành công!");
      } catch (saveErr) {
        setError("Lưu ma trận thất bại: " + saveErr.message);
      }

      // Tính trọng số tiêu chí
      const result = await calculateCriteriaWeights({
        comparison_matrix: matrix,
        customer_id: customerId,
        expert_id: expertId,
      });

      setResults(result);

      if (result.CR > 0.1) {
        setConsistencyError(
          `Tỷ số nhất quán (CR = ${result.CR.toFixed(
            4
          )}) vượt quá 10%. Ma trận không nhất quán, vui lòng điều chỉnh lại giá trị so sánh.`
        );
      } else {
        onWeightsCalculated(result);
      }

      setCalculating(false);
    } catch (err) {
      if (err.message && err.message.includes("Consistency Ratio")) {
        setConsistencyError(
          `Tỷ số nhất quán (CR) vượt quá 10%. Ma trận không nhất quán, vui lòng điều chỉnh lại giá trị so sánh.`
        );
      } else {
        setError("Lỗi khi tính toán trọng số tiêu chí: " + err.message);
      }

      if (err.response?.data?.weights && err.response?.data?.CR) {
        setResults({
          weights: err.response.data.weights,
          CR: err.response.data.CR,
        });
      }

      setCalculating(false);
    }
  };

  const chartData = results
    ? criteria
        .map((criterion, index) => {
          const criteriaKey = `C${index + 1}`;
          const weight = results.weights[criteriaKey] || 0;
          return {
            name: criterion.name,
            value: weight,
          };
        })
        .filter((item) => item.value > 0)
    : [];

  if (loading) {
    return <div className="p-4 text-center">Đang tải tiêu chí...</div>;
  }

  const getSelectedValue = (rowIndex, colIndex) => {
    const value = matrix[rowIndex][colIndex];
    if (!value) return "";
    return findClosestFraction(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-4">
        Ma trận so sánh cặp các tiêu chí
      </h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-800 mb-2">
          Hướng dẫn đánh trọng số:
        </h3>
        <p className="text-blue-700">
          So sánh tầm quan trọng tương đối của các tiêu chí. Giá trị từ 1 đến 9
          thể hiện mức độ quan trọng hơn, giá trị từ 1/9 đến 1 thể hiện mức độ
          quan trọng kém hơn.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {consistencyError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <h3 className="font-medium text-red-800 mb-1">
            Cảnh báo độ nhất quán:
          </h3>
          <p className="text-red-700">{consistencyError}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b border-r border-gray-300"></th>
              {criteria.map((criterion) => (
                <th
                  key={criterion.id}
                  className="py-2 px-4 border-b border-r border-gray-300"
                >
                  {criterion.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((rowCriterion, rowIndex) => (
              <tr key={rowCriterion.id}>
                <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
                  {rowCriterion.name}
                </td>
                {criteria.map((colCriterion, colIndex) => (
                  <td
                    key={colCriterion.id}
                    className="py-2 px-4 border-b border-r border-gray-300"
                  >
                    {rowIndex === colIndex ? (
                      <span className="text-center block text-gray-500">1</span>
                    ) : rowIndex < colIndex ? (
                      <select
                        value={getSelectedValue(rowIndex, colIndex)}
                        onChange={(e) =>
                          handleMatrixChange(rowIndex, colIndex, e.target.value)
                        }
                        disabled={disabled}
                        className={`w-full px-2 py-1 border rounded ${
                          !matrix[rowIndex][colIndex]
                            ? "border-black-300 bg-white-50"
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
                        {matrix[rowIndex][colIndex]
                          ? formatValue(matrix[rowIndex][colIndex])
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

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={handleCalculate}
          disabled={calculating || disabled}
          className={`px-4 py-2 rounded ${
            disabled || calculating
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {calculating ? "Đang tính..." : "Tính trọng số tiêu chí"}
        </button>

        {results && (
          <div
            className={`text-sm ${
              results.CR <= 0.1 ? "text-green-600" : "text-red-600"
            }`}
          >
            CR = {results.CR.toFixed(4)}
            {results.CR > 0.1 && (
              <span className="ml-2">
                (CR phải ≤ 0.1 để dữ liệu được chấp nhận)
              </span>
            )}
          </div>
        )}
      </div>

      {results && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium mb-2">
            Kết quả trọng số tiêu chí:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
            {criteria.map((criterion, index) => {
              const criteriaKey = `C${index + 1}`;
              const weight =
                results.weights[criteriaKey] || results.weights[criterion.id];

              return (
                <div key={criterion.id} className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">{criterion.name}: </span>
                  <span>{weight ? weight.toFixed(4) : "0"}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">
              Biểu đồ phân bố trọng số tiêu chí:
            </h3>
            {chartData.length > 0 ? (
              <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(2)}%`
                      }
                      labelLine
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => value.toFixed(4)}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingLeft: "20px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500">
                Không có dữ liệu hợp lệ để hiển thị biểu đồ.
              </p>
            )}
          </div>

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

      {(customerId !== undefined || expertId !== undefined) && (
        <div className="mt-4 text-xs text-gray-500">
          <p>Customer ID: {customerId || "Chưa chọn"}</p>
          <p>Expert ID: {expertId || "Chưa chọn"}</p>
        </div>
      )}
    </div>
  );
};

export default CriteriaMatrix;
