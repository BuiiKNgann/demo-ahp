import { useState, useEffect } from "react";
import { getCriteria, calculateCriteriaWeights } from "../services/api";

const CriteriaMatrix = ({ expertId, onWeightsCalculated, disabled }) => {
  const [criteria, setCriteria] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

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
      if (Math.abs(decimal - i) < tolerance) return i.toString(); // 1 -> 9
      if (Math.abs(reciprocal - i) < tolerance) return `1/${i}`; // Corrected to display proper format 1/2, 1/3...
    }

    // If no match, return as fraction
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
        setLoading(false);
      }
    };

    if (expertId) {
      fetchCriteria();
    }
  }, [expertId]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];
    // Fix: Handle string values properly
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
  };

  const handleCalculate = async () => {
    // Validate if all matrix values are filled
    const size = criteria.length;
    let isComplete = true;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j && (matrix[i][j] === 0 || matrix[i][j] === undefined)) {
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
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl font-semibold mb-4">
        Ma trận so sánh cặp các tiêu chí
      </h2>

      {/* Added guidance instruction box */}
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

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={calculating || disabled}
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
            {criteria.map((criterion, index) => {
              const criteriaKey = `C${index + 1}`;
              const weight =
                results.weights[criteriaKey] || results.weights[criterion.id];

              return (
                <li key={criterion.id} className="flex justify-between">
                  <span>{criterion.name}:</span>
                  <span className="font-medium">
                    {weight ? weight.toFixed(4) : "0"}
                  </span>
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
