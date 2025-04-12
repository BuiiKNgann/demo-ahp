import { useState, useEffect } from "react";
import { getCriteria, calculateCriteriaWeights } from "../services/api";

const CriteriaMatrix = ({ expertId, onWeightsCalculated, disabled }) => {
  const [criteria, setCriteria] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // Thang số AHP với cả giá trị phân số
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
    1 / 9, // Các giá trị phân số
  ];

  // Hàm chuyển đổi giá trị phân số thành dạng chuỗi
  const formatValue = (value) => {
    if (value === 1 / 2) return "1/2";
    if (value === 1 / 3) return "1/3";
    if (value === 1 / 4) return "1/4";
    if (value === 1 / 5) return "1/5";
    if (value === 1 / 6) return "1/6";
    if (value === 1 / 7) return "1/7";
    if (value === 1 / 8) return "1/8";
    if (value === 1 / 9) return "1/9";
    return value.toString(); // Trả về số nguyên hoặc giá trị khác
  };

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        setLoading(true);
        const criteriaData = await getCriteria();
        setCriteria(criteriaData);

        // Khởi tạo ma trận với giá trị mặc định
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
        setLoading(false);
      }
    };

    if (expertId) {
      fetchCriteria();
    }
  }, [expertId]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];

    // Chuyển đổi giá trị phân số (chẳng hạn như '1/2' thành 0.5)
    const parsedValue = value.includes("/") ? eval(value) : parseFloat(value);

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
  };

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const result = await calculateCriteriaWeights(expertId, matrix);
      setResults(result);
      onWeightsCalculated(result);
      setCalculating(false);
    } catch (err) {
      setError("Lỗi khi tính toán trọng số tiêu chí");
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        Đang tải tiêu chí...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow-md mt-6 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <h2 className="text-xl font-semibold mb-4">
        Ma trận so sánh cặp các tiêu chí
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
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
                <td className="py-2 px-4 border-b border-r border-gray-300 font-medium">
                  {rowCriterion.name}
                </td>
                {criteria.map((colCriterion, colIndex) => (
                  <td
                    key={colCriterion.id}
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
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        {dropdownOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatValue(option)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-center block text-gray-500">
                        {matrix[rowIndex][colIndex]
                          ? Number(matrix[rowIndex][colIndex]).toFixed(2)
                          : "0.00"}
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
          disabled={disabled || calculating}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:bg-gray-400"
        >
          {calculating ? "Đang tính..." : "Tính trọng số tiêu chí"}
        </button>
      </div>

      {results && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium mb-2">
            Kết quả trọng số tiêu chí:
          </h3>
          <ul className="space-y-1">
            {Object.entries(results.weights).map(([criteriaId, weight]) => {
              const criterionName =
                criteria.find((c) => c.id === parseInt(criteriaId))?.name ||
                criteriaId;
              return (
                <li key={criteriaId} className="flex justify-between">
                  <span>{criterionName}:</span>
                  <span className="font-medium">{weight.toFixed(4)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CriteriaMatrix;
