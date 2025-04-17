import { useState, useEffect } from "react";
import { getAlternatives, calculateAlternativeScores } from "../services/api";

const dropdownOptions = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "1/2", value: 1 / 2 },
  { label: "1/3", value: 1 / 3 },
  { label: "1/4", value: 1 / 4 },
  { label: "1/5", value: 1 / 5 },
  { label: "1/6", value: 1 / 6 },
  { label: "1/7", value: 1 / 7 },
  { label: "1/8", value: 1 / 8 },
  { label: "1/9", value: 1 / 9 },
];

const formatAlternativeName = (name) => {
  if (!name) return "";
  const match = name.match(/^A(\d+)$/);
  if (match) {
    const number = parseInt(match[1]);
    const letter = String.fromCharCode(64 + number);
    return `Khách hàng ${letter}`;
  }
  return name;
};

const formatResultKey = (key) => {
  if (!key) return "";
  const match = key.match(/^A(\d+)$/);
  if (match) {
    const number = parseInt(match[1]);
    const letter = String.fromCharCode(64 + number);
    return `Khách hàng ${letter}`;
  }
  return key;
};

const AlternativeMatrix = ({
  expertId,
  criteriaId,
  criteriaName,
  onScoresCalculated,
}) => {
  const [alternatives, setAlternatives] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyRatio, setConsistencyRatio] = useState(null);

  const decimalToFormattedString = (decimal) => {
    const reciprocal = 1 / decimal;
    const tolerance = 1.0e-6;

    for (let i = 1; i <= 9; i++) {
      if (Math.abs(decimal - i) < tolerance) return i.toString();
      if (Math.abs(reciprocal - i) < tolerance) return `1/${i}`;
    }
    return decimal.toFixed(2);
  };

  useEffect(() => {
    const fetchAlternatives = async () => {
      try {
        setLoading(true);
        const data = await getAlternatives();
        setAlternatives(data);
        const size = data.length;
        const initialMatrix = Array(size)
          .fill()
          .map((_, i) =>
            Array(size)
              .fill()
              .map((_, j) => (i === j ? 1 : 0))
          );
        setMatrix(initialMatrix);
      } catch {
        setError("Không thể tải danh sách phương án");
      } finally {
        setLoading(false);
      }
    };

    if (expertId && criteriaId) fetchAlternatives();
  }, [expertId, criteriaId]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    const newMatrix = [...matrix];
    newMatrix[rowIndex][colIndex] = value;
    if (rowIndex !== colIndex) {
      newMatrix[colIndex][rowIndex] = 1 / value;
    }
    setMatrix(newMatrix);
  };

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const result = await calculateAlternativeScores(
        expertId,
        criteriaId,
        matrix
      );
      const cr = result.cr;

      setConsistencyRatio(cr);
      if (cr >= 0.1) {
        setError("Ma trận không nhất quán (CR > 0.1). Hãy điều chỉnh lại.");
        setResults(null);
        setCalculating(false);
        return;
      }

      setResults(result);
      onScoresCalculated(criteriaId, result);
      setError(null);
    } catch (err) {
      console.log(err);
      setError("Lỗi khi tính toán điểm số phương án");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return <div className="py-6 text-center">Đang tải phương án...</div>;
  }

  if (error && !results) {
    return <div className="text-red-600 py-4">{error}</div>;
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow mt-4">
      <h3 className="text-lg font-semibold mb-3">
        Ma trận so sánh phương án theo tiêu chí: {criteriaName}
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 bg-white">
          <thead>
            <tr>
              <th className="border px-3 py-2"></th>
              {alternatives.map((alt) => (
                <th key={alt.id} className="border px-3 py-2">
                  {formatAlternativeName(alt.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alternatives.map((rowAlt, rowIndex) => (
              <tr key={rowAlt.id}>
                <td className="border px-3 py-2 font-medium">
                  {formatAlternativeName(rowAlt.name)}
                </td>
                {alternatives.map((colAlt, colIndex) => (
                  <td key={colAlt.id} className="border px-2 py-1">
                    {rowIndex === colIndex ? (
                      <span className="text-center block">1</span>
                    ) : rowIndex < colIndex ? (
                      <select
                        className="w-full px-1 py-1 border rounded"
                        value={matrix[rowIndex][colIndex] || ""}
                        onChange={(e) =>
                          handleMatrixChange(
                            rowIndex,
                            colIndex,
                            parseFloat(e.target.value)
                          )
                        }
                        disabled={consistencyRatio >= 0.1}
                      >
                        <option value="" disabled>
                          Chọn giá trị
                        </option>
                        {dropdownOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-center block text-gray-500">
                        {decimalToFormattedString(matrix[rowIndex][colIndex])}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-4 rounded disabled:bg-gray-400"
        >
          {calculating ? "Đang tính..." : "Tính điểm phương án"}
        </button>
      </div>

      {consistencyRatio !== null && (
        <div className="mt-3 text-sm">
          <p>
            <strong>Chỉ số nhất quán (CR):</strong>{" "}
            <span
              className={
                consistencyRatio < 0.1 ? "text-green-600" : "text-red-600"
              }
            >
              {typeof consistencyRatio === "number"
                ? consistencyRatio.toFixed(4)
                : "Không xác định"}
            </span>
          </p>
          {consistencyRatio >= 0.1 && (
            <p className="text-red-600 mt-1">
              ⚠️ CR quá cao (&gt; 0.1), ma trận không nhất quán. Vui lòng điều
              chỉnh lại các giá trị so sánh.
            </p>
          )}
        </div>
      )}

      {results && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <h4 className="font-medium mb-2">Kết quả điểm số phương án:</h4>
          <ul>
            {Object.entries(results.scores).map(([altId, score]) => {
              const alt = alternatives.find((a) => a.id === parseInt(altId));
              const displayName = alt
                ? formatAlternativeName(alt.name)
                : formatResultKey(altId);
              return (
                <li key={altId} className="flex justify-between">
                  <span>{displayName}:</span>
                  <span className="font-semibold">{score.toFixed(4)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AlternativeMatrix;
