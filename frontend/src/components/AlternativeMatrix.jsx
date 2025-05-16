import { useState, useEffect, useMemo } from "react";
import {
  calculateAlternativeScores,
  getAlternatives,
  updateAlternativesFromCustomers,
} from "../services/api"; // Import from your api.js

const AlternativeMatrix = ({
  expertId,
  customerId,
  criteriaId,
  criteriaName,
  customers,
  onScoresCalculated,
  disabled: propDisabled,
  isPreviousMatrixValid,
  importedMatrix,
}) => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);
  const [validAlternatives, setValidAlternatives] = useState([]);
  const [isCurrentMatrixValid, setIsCurrentMatrixValid] = useState(true);

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
      if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 0;
      return numerator / denominator;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const customersKey = useMemo(
    () => customers.map((c) => c.id).join(","),
    [customers]
  );

  useEffect(() => {
    const syncAlternativesAndInitMatrix = async () => {
      try {
        setLoading(true);
        const alternatives = await getAlternatives();
        setValidAlternatives(alternatives);

        if (customers && customers.length > 0) {
          const customerIds = customers.map((c) => c.id);
          const missingIds = customerIds.filter(
            (id) => !alternatives.some((alt) => alt.id === id)
          );
          if (missingIds.length > 0) {
            await updateAlternativesFromCustomers(customerIds);
            const updatedAlternatives = await getAlternatives();
            setValidAlternatives(updatedAlternatives);
          }
        }

        const size = customers.length;
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
                "Ma trận phương án không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
              );
            }
          } else {
            setError(
              "Kích thước ma trận phương án không khớp với số khách hàng"
            );
          }
        }

        setMatrix(initialMatrix);
        setResults(null);
        setConsistencyError(null);
        setError(null);
        setIsCurrentMatrixValid(true);
        setLoading(false);
      } catch (err) {
        setError(`Không thể tải danh sách phương án: ${err.message}`);
        setLoading(false);
      }
    };
    syncAlternativesAndInitMatrix();
  }, [customersKey, importedMatrix]);

  useEffect(() => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
    } else {
      if (
        error ===
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      ) {
        setError(null);
      }
    }
  }, [isPreviousMatrixValid]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
      return;
    }

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

    if (
      error ===
      "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
    ) {
      setError(null);
    }
  };

  const handleCalculate = async () => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
      return;
    }

    if (!customerId || !expertId || !criteriaId) {
      setError("Vui lòng chọn đầy đủ khách hàng, chuyên gia và tiêu chí");
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
      setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      setConsistencyError(null);

      const validCustomers = customers.filter((c) =>
        validAlternatives.some((alt) => alt.id === c.id)
      );
      if (validCustomers.length !== customers.length) {
        setError(
          "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng chọn lại khách hàng."
        );
        setCalculating(false);
        return;
      }

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
        comparisons,
      };

      const result = await calculateAlternativeScores(payload);
      setResults(result);

      const isValid = result.CR <= 0.1;
      setIsCurrentMatrixValid(isValid);

      if (!isValid) {
        setConsistencyError(
          `Tỷ số nhất quán (CR = ${result.CR.toFixed(
            4
          )}) vượt quá 10%. Vui lòng điều chỉnh lại ma trận so sánh.`
        );
        onScoresCalculated(criteriaId, { ...result, isValid: false });
      } else {
        setConsistencyError(null);
        onScoresCalculated(criteriaId, { ...result, isValid: true });
      }
      setCalculating(false);
    } catch (err) {
      setError(`Lỗi khi tính toán điểm số: ${err.message}`);
      setCalculating(false);
    }
  };

  const isMatrixDisabled = propDisabled || !isPreviousMatrixValid;

  const getSelectedValue = (rowIndex, colIndex) => {
    const value = matrix[rowIndex][colIndex];
    if (!value) return "";
    return findClosestFraction(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">Đang tải...</div>
    );
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {consistencyError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-red-700">{consistencyError}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className={`min-w-full bg-white border border-gray-300 ${
            isMatrixDisabled ? "opacity-70" : ""
          }`}
        >
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b border-r border-gray-300"></th>
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
                <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
                  {rowCustomer.name}
                </td>
                {customers.map((colCustomer, colIndex) => (
                  <td
                    key={colCustomer.id}
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
                        disabled={isMatrixDisabled}
                        className={`w-full px-2 py-1 border rounded ${
                          !matrix[rowIndex][colIndex]
                            ? "border-black-300 bg-white-50"
                            : "border-gray-300"
                        } ${
                          isMatrixDisabled
                            ? "bg-gray-100 cursor-not-allowed"
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => {
            if (isPreviousMatrixValid) {
              const size = customers.length;
              setMatrix(
                Array(size)
                  .fill()
                  .map((_, i) =>
                    Array(size)
                      .fill()
                      .map((_, j) => (i === j ? 1 : 0))
                  )
              );
              setResults(null);
              setConsistencyError(null);
              setError(null);
            }
          }}
          disabled={calculating || isMatrixDisabled}
          className={`px-4 py-2 rounded ${
            calculating || isMatrixDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gray-500 hover:bg-gray-600 text-white"
          }`}
        >
          Reset Ma trận
        </button>
        <button
          onClick={handleCalculate}
          disabled={calculating || isMatrixDisabled}
          className={`px-4 py-2 rounded ${
            calculating || isMatrixDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {calculating ? "Đang tính..." : "Tính điểm số"}
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
            Kết quả điểm số khách hàng:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
            {customers.map((customer) => {
              const score = results.scores[customer.id] || 0;
              return (
                <div key={customer.id} className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">{customer.name}: </span>
                  <span>{score.toFixed(4)}</span>
                </div>
              );
            })}
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
    </div>
  );
};

export default AlternativeMatrix;
