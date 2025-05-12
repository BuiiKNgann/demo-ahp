import { useState, useEffect, useMemo } from "react";
import {
  calculateAlternativeScores,
  getAlternatives,
  updateAlternativesFromCustomers,
} from "../services/api";

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
  const [validAlternatives, setValidAlternatives] = useState([]);

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
      1: "1",
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

  // Tạo key duy nhất dựa trên customers để xác định khi nào cần reset ma trận
  const customersKey = useMemo(
    () => customers.map((c) => c.id).join(","),
    [customers]
  );

  // Đồng bộ hóa và khởi tạo ma trận
  useEffect(() => {
    const syncAlternativesAndInitMatrix = async () => {
      try {
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

        // Khởi tạo ma trận nếu chưa có hoặc customers thay đổi
        const size = customers.length;
        setMatrix((prevMatrix) => {
          // Nếu ma trận đã tồn tại và kích thước không đổi, giữ nguyên
          if (prevMatrix.length === size) {
            return prevMatrix;
          }
          // Nếu không, khởi tạo mới
          return Array(size)
            .fill()
            .map((_, i) =>
              Array(size)
                .fill()
                .map((_, j) => (i === j ? 1 : null))
            );
        });
        setLoading(false);
      } catch (err) {
        setError(`Không thể tải danh sách phương án: ${err.message}`);
        setLoading(false);
      }
    };
    syncAlternativesAndInitMatrix();
  }, [customersKey]); // Chỉ chạy lại khi customers thay đổi

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const parsedValue = parseFloat(value);
    if (
      value === "" ||
      isNaN(parsedValue) ||
      parsedValue <= 0 ||
      parsedValue > 9
    ) {
      return;
    }

    const newMatrix = [...matrix];
    newMatrix[rowIndex][colIndex] = parsedValue;
    if (rowIndex !== colIndex) {
      newMatrix[colIndex][rowIndex] = 1 / parsedValue;
    }
    setMatrix(newMatrix);
    setConsistencyError(null);
    setError(null);
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
        if (i !== j) {
          const value = matrix[i][j];
          if (value === null || isNaN(value) || value <= 0) {
            isComplete = false;
            break;
          }
        }
      }
      if (!isComplete) break;
    }

    if (!isComplete) {
      setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
      console.log("Matrix state:", matrix);
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
          "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng cập nhật danh sách phương án."
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
        if (errorMessage.includes("không tồn tại trong bảng alternatives")) {
          errorMessage +=
            " Vui lòng cập nhật danh sách phương án bằng cách chọn lại khách hàng.";
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
                        value={
                          matrix[rowIndex][colIndex] !== null
                            ? matrix[rowIndex][colIndex]
                            : ""
                        }
                        onChange={(e) =>
                          handleMatrixChange(rowIndex, colIndex, e.target.value)
                        }
                        disabled={disabled}
                        className={`w-full px-2 py-1 border rounded ${
                          matrix[rowIndex][colIndex] === null
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
                      // <span className="text-center block text-gray-500">
                      //   {matrix[colIndex][rowIndex] &&
                      //   matrix[colIndex][rowIndex] !== 1
                      //     ? formatValue(1 / matrix[colIndex][rowIndex])
                      //     : "0"}
                      // </span>
                      <span className="text-center block text-gray-500">
                        {matrix[colIndex][rowIndex] !== null &&
                        !isNaN(matrix[colIndex][rowIndex])
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

      <div className="mt-4 flex justify-end space-x-4">
        <button
          onClick={() => {
            const size = customers.length;
            setMatrix(
              Array(size)
                .fill()
                .map((_, i) =>
                  Array(size)
                    .fill()
                    .map((_, j) => (i === j ? 1 : null))
                )
            );
            setResults(null);
            setConsistencyError(null);
          }}
          disabled={calculating || disabled}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
        >
          Reset Ma trận
        </button>
        <button
          onClick={handleCalculate}
          disabled={calculating || disabled}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
        >
          {calculating ? "Đang tính..." : "Tính điểm số"}
        </button>
      </div>

      {results && (
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
