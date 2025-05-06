import { useState, useEffect } from "react";
import { getCriteria, calculateCriteriaWeights } from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CriteriaMatrix = ({
  onWeightsCalculated,
  disabled,
  customerId,
  expertId,
}) => {
  const [criteria, setCriteria] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Mảng màu cho biểu đồ
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
    if (value === 1 / 2) return "1/2";
    if (value === 1 / 3) return "1/3";
    if (value === 1 / 4) return "1/4";
    if (value === 1 / 5) return "1/5";
    if (value === 1 / 6) return "1/6";
    if (value === 1 / 7) return "1/7";
    if (value === 1 / 8) return "1/8";
    if (value === 1 / 9) return "1/9";
    return value.toString();
  };

  const decimalToFormattedString = (decimal) => {
    const reciprocal = 1 / decimal;
    const tolerance = 1.0e-6;

    for (let i = 1; i <= 9; i++) {
      if (Math.abs(decimal - i) < tolerance) return i.toString();
      if (Math.abs(reciprocal - i) < tolerance) return `1/${i}`;
    }

    let h1 = 1,
      h2 = 0,
      k1 = 0,
      k2 = 1,
      b = decimal;
    do {
      const a = Math.floor(b);
      let temp = h1;
      h1 = a * h1 + h2;
      h2 = temp;
      temp = k1;
      k1 = a * k1 + k2;
      k2 = temp;
      b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

    if (k1 === 1) return h1.toString();
    return `${h1}/${k1}`;
  };

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        setLoading(true);
        const criteriaData = await getCriteria();
        setCriteria(criteriaData);

        const size = criteriaData.length;
        const initialMatrix = Array(size)
          .fill()
          .map((_, i) =>
            Array(size)
              .fill()
              .map((_, j) => (i === j ? 1 : 0))
          );
        setMatrix(initialMatrix);
        setLoading(false);
      } catch (err) {
        setError("Không thể tải danh sách tiêu chí");
        console.error("Error fetching criteria:", err);
        setLoading(false);
      }
    };

    fetchCriteria();
  }, []);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];
    const parsedValue =
      typeof value === "string" && value.includes("/")
        ? eval(value)
        : parseFloat(value);

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
    if (
      (customerId === undefined || expertId === undefined) &&
      (customerId || expertId)
    ) {
      setError(
        "Vui lòng chọn chuyên gia và khách hàng trước khi tính trọng số"
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

      const result = await calculateCriteriaWeights({
        comparison_matrix: matrix,
        customer_id: customerId || null,
        expert_id: expertId || null,
      });

      setResults(result);
      setSuccessMessage("Tính toán trọng số thành công!");

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
      if (
        err.response &&
        err.response.data &&
        err.response.data.message &&
        err.response.data.message.includes("Consistency Ratio")
      ) {
        setConsistencyError(
          `Tỷ số nhất quán (CR) vượt quá 10%. Ma trận không nhất quán, vui lòng điều chỉnh lại giá trị so sánh.`
        );
      } else {
        setError("Lỗi khi tính toán trọng số tiêu chí");
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

  // Chuẩn bị dữ liệu cho biểu đồ tròn
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
        .filter((item) => item.value > 0) // Lọc bỏ các giá trị 0
    : [];

  if (loading) {
    return <div className="p-4 text-center">Đang tải tiêu chí...</div>;
  }

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
                        value={matrix[rowIndex][colIndex] || ""}
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
                          ? decimalToFormattedString(matrix[rowIndex][colIndex])
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
