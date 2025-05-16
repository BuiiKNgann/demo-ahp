import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  getCriteria,
  calculateCriteriaWeights,
  saveCriteriaMatrix,
} from "../services/api";
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
  criteria,
}) => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [fileName, setFileName] = useState("");

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

  // Các giá trị có thể chọn trong dropdown
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

  // Hàm định dạng hiển thị giá trị
  const formatValue = (value) => {
    if (!value) return "0";

    // Xử lý giá trị phân số chính xác
    if (Math.abs(value - 1 / 2) < 0.001) return "1/2";
    if (Math.abs(value - 1 / 3) < 0.001) return "1/3";
    if (Math.abs(value - 1 / 4) < 0.001) return "1/4";
    if (Math.abs(value - 1 / 5) < 0.001) return "1/5";
    if (Math.abs(value - 1 / 6) < 0.001) return "1/6";
    if (Math.abs(value - 1 / 7) < 0.001) return "1/7";
    if (Math.abs(value - 1 / 8) < 0.001) return "1/8";
    if (Math.abs(value - 1 / 9) < 0.001) return "1/9";

    // Xử lý các giá trị số nguyên
    if (Number.isInteger(value)) return value.toString();

    // Xử lý các giá trị thập phân khớp với phân số
    for (const option of dropdownOptions) {
      if (Math.abs(value - option) < 0.001) {
        return formatValue(option);
      }
    }

    return value.toFixed(4);
  };

  // Hàm tìm giá trị phân số thích hợp từ số thập phân
  const findClosestFraction = (decimal) => {
    if (!decimal || decimal === 0) return "";

    // Kiểm tra các giá trị phân số phổ biến với độ chính xác cao hơn
    for (const option of dropdownOptions) {
      if (Math.abs(decimal - option) < 0.001) {
        return option;
      }
    }

    // Nếu không tìm thấy giá trị phù hợp, trả về giá trị thô
    return decimal;
  };

  // Hàm chuyển đổi giá trị từ chuỗi phân số sang số thập phân
  const parseMatrixValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;

    // Nếu là chuỗi phân số như "1/3", chuyển thành số
    if (value.includes("/")) {
      const [numerator, denominator] = value.split("/").map(parseFloat);
      if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
        return 0;
      }
      return numerator / denominator;
    }

    // Nếu là số dưới dạng chuỗi, chuyển thành số
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (criteria && criteria.length > 0) {
      const size = criteria.length;
      const initialMatrix = Array(size)
        .fill()
        .map((_, i) =>
          Array(size)
            .fill()
            .map((_, j) => (i === j ? 1 : 0))
        );
      setMatrix(initialMatrix);
      setLoading(false);
    } else {
      setError("Không có tiêu chí nào được cung cấp");
      setLoading(false);
    }
  }, [criteria]);

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

      try {
        await saveCriteriaMatrix(matrix, customerId, expertId);
        setSuccessMessage("Lưu ma trận và tính toán trọng số thành công!");
      } catch (saveErr) {
        setError("Lưu ma trận thất bại: " + saveErr.message);
      }

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

  const handleImportMatrix = (importedMatrix) => {
    if (disabled) {
      setError("Chức năng nhập file bị vô hiệu hóa.");
      return;
    }

    const size = criteria.length;
    if (
      importedMatrix.length !== size ||
      importedMatrix.some((row) => row.length !== size)
    ) {
      setError("Kích thước ma trận không khớp với số tiêu chí");
      return;
    }

    // Kiểm tra giá trị hợp lệ (số dương, đối xứng nghịch đảo với sai số nhỏ)
    const isValid = importedMatrix.every((row, i) =>
      row.every((value, j) => {
        if (i === j) return value === 1;
        if (!value || value <= 0 || value > 9) return false;
        const reciprocal = importedMatrix[j][i];
        return Math.abs(value - 1 / reciprocal) < 0.01; // Chấp nhận sai số 0.01
      })
    );

    if (!isValid) {
      setError(
        "Ma trận không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
      );
      return;
    }

    setMatrix(importedMatrix);
    setFileName("");
    setError(null);
    setConsistencyError(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        console.log("Danh sách sheet trong file:", workbook.SheetNames); // Debug

        const sheetName = workbook.SheetNames.find((name) =>
          name.toLowerCase().includes("criteria comparison matrix")
        );
        if (!sheetName) {
          setError("Không tìm thấy sheet cho ma trận tiêu chí");
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const matrixData = jsonData
          .slice(1)
          .map((row) => row.slice(1).map(parseMatrixValue));
        handleImportMatrix(matrixData);
      } catch (err) {
        setError("Không thể đọc file Excel: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Lỗi khi đọc file Excel");
    };
    reader.readAsArrayBuffer(file);
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
        .filter((item) => item.value > 0)
    : [];

  if (loading) {
    return <div className="p-4 text-center">Đang tải tiêu chí...</div>;
  }

  // Hàm để xác định giá trị hiển thị trong dropdown
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nhập ma trận từ file Excel
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={disabled}
          className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
            disabled ? "cursor-not-allowed opacity-50" : ""
          }`}
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
        )}
      </div>

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
