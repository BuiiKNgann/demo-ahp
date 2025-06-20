import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { calculateAlternativeScores } from "../services/api";

const AlternativeMatrix = ({
  expertId,
  customerId,
  criteriaId,
  criteriaName,
  customers,
  onScoresCalculated,
  disabled,
  isPreviousMatrixValid,
  importedMatrix,
  // consistencyMetrics,
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
    if (!customers) {
      setError("Danh sách khách hàng không được cung cấp");
      setLoading(false);
      return;
    }
    if (customers.length === 0) {
      setError("Không có khách hàng nào được chọn");
      setLoading(false);
      return;
    }

    const size = customers.length;
    let initialMatrix = Array(size)
      .fill()
      .map((_, i) =>
        Array(size)
          .fill()
          .map((_, j) => (i === j ? 1 : 0))
      );

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
            "Ma trận phương án không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
          );
        }
      } else {
        setError("Kích thước ma trận phương án không khớp với số khách hàng");
      }
    }

    setMatrix(initialMatrix);
    setLoading(false);
  }, [customers, importedMatrix]);

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
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng hoàn thành và đảm bảo độ nhất quán của các ma trận trước đó (CR ≤ 0.1)"
      );
      return;
    }

    if (
      customerId === undefined ||
      expertId === undefined ||
      criteriaId === undefined
    ) {
      setError(
        "Vui lòng chọn khách hàng, chuyên gia và tiêu chí trước khi tính điểm"
      );
      return;
    }

    const size = customers.length;
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

      const comparisons = [];
      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          comparisons.push({
            alt1_id: customers[i].id,
            alt2_id: customers[j].id,
            value: matrix[i][j],
          });
        }
      }

      const payload = {
        customer_id: customerId,
        expert_id: expertId,
        criteria_id: criteriaId,
        comparisons,
      };

      const result = await calculateAlternativeScores(payload);

      setResults(result);

      if (result.CR > 0.1) {
        setConsistencyError(
          `Tỷ số nhất quán (CR = ${result.CR.toFixed(
            4
          )}) vượt quá 10%. Ma trận không nhất quán, vui lòng điều chỉnh lại giá trị so sánh.`
        );
      }

      // Always call onScoresCalculated to ensure App.jsx updates alternativeConsistencyMetrics
      onScoresCalculated(criteriaId, result);

      setCalculating(false);
    } catch (err) {
      if (err.message && err.message.includes("Consistency Ratio")) {
        setConsistencyError(
          `Tỷ số nhất quán (CR) vượt quá 10%. Ma trận không nhất quán, vui lòng điều chỉnh lại giá trị so sánh.`
        );
      } else {
        setError("Lỗi khi tính toán điểm số phương án: " + err.message);
      }

      if (err.response?.data?.scores && err.response?.data?.CR) {
        const result = {
          scores: err.response.data.scores,
          CR: err.response.data.CR,
          lambda_max: err.response.data.lambda_max,
          CI: err.response.data.CI,
          matrix_dot_details: err.response.data.matrix_dot_details || [],
          weighted_sum: err.response.data.weighted_sum || [],
          weights: err.response.data.weights || [],
          consistency_vector_data:
            err.response.data.consistency_vector_data || [],
        };
        setResults(result);
        onScoresCalculated(criteriaId, result); // Call onScoresCalculated even on error with CR
      }

      setCalculating(false);
    }
  };

  const getSelectedValue = (rowIndex, colIndex) => {
    const value = matrix[rowIndex][colIndex];
    if (!value) return "";
    return findClosestFraction(value);
  };

  // Reset function to allow editing again
  const handleReset = () => {
    setResults(null);
    setConsistencyError(null);
  };

  // Determine if the current matrix should be disabled due to CR > 0.1
  const isCurrentMatrixDisabled = results && results.CR > 0.1;

  if (loading) {
    return <div className="p-4 text-center">Đang tải...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h3 className="text-lg font-semibold mb-4">
        So sánh các phương án theo tiêu chí: {criteriaName}
      </h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
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

      {!isPreviousMatrixValid && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Ma trận này bị vô hiệu hóa do một hoặc nhiều ma trận trước đó chưa đạt
          tỷ số nhất quán (CR ≤ 0.1). Vui lòng hoàn thành và điều chỉnh các ma
          trận trước đó.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b border-r border-gray-300"></th>
              {Array.isArray(customers) && customers.length > 0 ? (
                customers.map((customer) => (
                  <th
                    key={customer.id}
                    className="py-2 px-4 border-b border-r border-gray-300"
                  >
                    {customer.name}
                  </th>
                ))
              ) : (
                <th className="py-2 px-4 border-b border-r border-gray-300">
                  Không có khách hàng
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(customers) && customers.length > 0 ? (
              customers.map((rowCustomer, rowIndex) => (
                <tr key={rowCustomer.id}>
                  <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
                    {rowCustomer.name}
                  </td>
                  {customers.map((colCustomer, colIndex) => (
                    <td
                      key={colCustomer.id}
                      className="py-2 px-4 border-b border-r border-gray-300"
                    >
                      {rowIndex === colIndex ? (
                        <span className="text-center block text-gray-500">
                          1
                        </span>
                      ) : rowIndex < colIndex ? (
                        <select
                          value={getSelectedValue(rowIndex, colIndex)}
                          onChange={(e) =>
                            handleMatrixChange(
                              rowIndex,
                              colIndex,
                              e.target.value
                            )
                          }
                          disabled={
                            disabled ||
                            !isPreviousMatrixValid ||
                            isCurrentMatrixDisabled
                          }
                          className={`w-full px-2 py-1 border rounded ${
                            !matrix[rowIndex][colIndex]
                              ? "border-black-300 bg-white-50"
                              : "border-gray-300"
                          } ${
                            disabled ||
                            !isPreviousMatrixValid ||
                            isCurrentMatrixDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : ""
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
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="py-2 px-4 border-b border-r border-gray-300 text-center"
                >
                  Không có khách hàng để hiển thị
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={handleCalculate}
            disabled={
              calculating ||
              disabled ||
              !isPreviousMatrixValid ||
              isCurrentMatrixDisabled
            }
            className={`px-4 py-2 rounded ${
              disabled ||
              calculating ||
              !isPreviousMatrixValid ||
              isCurrentMatrixDisabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {calculating ? "Đang tính..." : "Tính điểm phương án"}
          </button>

          {isCurrentMatrixDisabled && (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Chỉnh sửa lại
            </button>
          )}
        </div>

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
        <div className="mt-6 rounded-lg p-6">
          {/* Existing Table and CR Message */}
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Chi tiết phép nhân ma trận với trọng số PA:
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-3 text-left font-medium text-gray-700 border-b border-r border-gray-300 w-[110px]">
                    Phương án
                  </th>
                  {customers.map((customer, index) => (
                    <th
                      key={`product-${index}`}
                      className="py-3 px-2 text-center font-medium text-gray-700 border-b border-r border-gray-300 w-[90px]"
                    >
                      {customer.name}
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center font-medium text-gray-700 border-b border-r border-gray-300 w-[100px]">
                    Weighted Sum
                  </th>
                  <th className="py-3 px-2 text-center font-medium text-gray-700 border-b border-r border-gray-300 w-[90px]">
                    Trọng số PA
                  </th>
                  <th className="py-3 px-2 text-center font-medium text-gray-700 border-b border-gray-300 w-[120px]">
                    Consistency Vector
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((rowCustomer, rowIndex) => (
                  <tr
                    key={rowCustomer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
                      {rowCustomer.name}
                    </td>
                    {results.matrix_dot_details &&
                    results.matrix_dot_details[rowIndex]
                      ? results.matrix_dot_details[rowIndex].map(
                          (detail, colIndex) => (
                            <td
                              key={`product-${colIndex}`}
                              className="py-3 px-2 text-center text-gray-700 border-b border-r border-gray-200"
                            >
                              {detail.product.toFixed(4)}
                            </td>
                          )
                        )
                      : customers.map((_, colIndex) => (
                          <td
                            key={`product-${colIndex}`}
                            className="py-3 px-2 text-center text-gray-700 border-b border-r border-gray-200"
                          >
                            0.0000
                          </td>
                        ))}
                    <td className="py-3 px-2 text-center text-blue-700 border-b border-r border-gray-200">
                      {results.weighted_sum && results.weighted_sum[rowIndex]
                        ? results.weighted_sum[rowIndex].toFixed(4)
                        : "0.0000"}
                    </td>
                    <td className="py-3 px-2 text-center text-green-700 border-b border-r border-gray-200">
                      {results.weights && results.weights[rowIndex]
                        ? results.weights[rowIndex].toFixed(4)
                        : "0.0000"}
                    </td>
                    <td className="py-3 px-2 text-center text-purple-700 border-b border-gray-200">
                      {results.consistency_vector_data &&
                      results.consistency_vector_data[rowIndex]
                        ? results.consistency_vector_data[
                            rowIndex
                          ].consistencyVector.toFixed(4)
                        : "0.0000"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* New Section: Consistency Ratio Report Like the Image */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 className="text-md font-semibold text-gray-800 mb-3">
              {/* Tình tỷ số nhất quán (Consistency Ratio) */}
            </h4>
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-blue-50">
                  <th className="py-2 px-4 text-left font-medium border-b border-gray-200">
                    Các chỉ số/tỷ số
                  </th>
                  <th className="py-2 px-4 text-right font-medium border-b border-gray-200">
                    Giá trị
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-4 border-b border-gray-200">λ_max</td>
                  <td className="py-2 px-4 text-right border-b border-gray-200">
                    {results.lambda_max
                      ? results.lambda_max.toFixed(4)
                      : "0.0000"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-gray-200">
                    CI (Consistency Index)
                  </td>
                  <td className="py-2 px-4 text-right border-b border-gray-200">
                    {results.CI ? results.CI.toFixed(4) : "0.0000"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b border-gray-200">
                    CR (Consistency Ratio)
                  </td>
                  <td className="py-2 px-4 text-right border-b border-gray-200">
                    {results.CR ? results.CR.toFixed(4) : "0.0000"}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500">
              Ghi chú: CR nên ≤ 0.1 để ma trận được coi là hợp quán.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

AlternativeMatrix.propTypes = {
  expertId: PropTypes.number,
  customerId: PropTypes.number,
  criteriaId: PropTypes.number,
  criteriaName: PropTypes.string,
  customers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  onScoresCalculated: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isPreviousMatrixValid: PropTypes.bool,
  importedMatrix: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  consistencyMetrics: PropTypes.shape({
    lambda_max: PropTypes.number,
    CI: PropTypes.number,
    CR: PropTypes.number,
  }),
};

export default AlternativeMatrix;
