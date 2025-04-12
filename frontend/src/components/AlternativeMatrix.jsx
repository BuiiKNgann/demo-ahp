import { useState, useEffect } from "react";
import { getAlternatives, calculateAlternativeScores } from "../services/api";

const dropdownOptions = [
  { label: "1", value: 1 },
  { label: "1/2", value: 0.5 },
  { label: "1/3", value: 1 / 3 },
  { label: "1/4", value: 1 / 4 },
  { label: "1/5", value: 1 / 5 },
  { label: "1/6", value: 1 / 6 },
  { label: "1/7", value: 1 / 7 },
  { label: "1/8", value: 1 / 8 },
  { label: "1/9", value: 1 / 9 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
];

const AlternativeMatrix = ({
  expertId,
  criteriaId,
  criteriaName,
  onScoresCalculated,
  disabled,
}) => {
  const [alternatives, setAlternatives] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchAlternatives = async () => {
      try {
        setLoading(true);
        const alternativesData = await getAlternatives();
        setAlternatives(alternativesData);

        const size = alternativesData.length;
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
        setError("Không thể tải danh sách phương án");
        setLoading(false);
      }
    };

    if (expertId && criteriaId) {
      fetchAlternatives();
    }
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
      setResults(result);
      onScoresCalculated(criteriaId, result);
      setCalculating(false);
    } catch (err) {
      setError("Lỗi khi tính toán điểm số phương án");
      setCalculating(false);
      console.log(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        Đang tải phương án...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-3">{error}</div>;
  }

  return (
    <div
      className={`bg-white p-5 rounded-lg shadow-md mt-4 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <h3 className="text-lg font-semibold mb-3">
        Ma trận so sánh phương án theo tiêu chí: {criteriaName}
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-3 border-b border-r border-gray-300"></th>
              {alternatives.map((alternative) => (
                <th
                  key={alternative.id}
                  className="py-2 px-3 border-b border-r border-gray-300"
                >
                  {alternative.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alternatives.map((rowAlternative, rowIndex) => (
              <tr key={rowAlternative.id}>
                <td className="py-2 px-3 border-b border-r border-gray-300 font-medium">
                  {rowAlternative.name}
                </td>
                {alternatives.map((colAlternative, colIndex) => (
                  <td
                    key={colAlternative.id}
                    className="py-2 px-3 border-b border-r border-gray-300"
                  >
                    {rowIndex === colIndex ? (
                      <span className="text-center block">1</span>
                    ) : rowIndex < colIndex ? (
                      <select
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        value={matrix[rowIndex][colIndex] || ""}
                        onChange={(e) =>
                          handleMatrixChange(
                            rowIndex,
                            colIndex,
                            parseFloat(e.target.value)
                          )
                        }
                        disabled={disabled}
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

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={disabled || calculating}
          className="bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-4 rounded-md disabled:bg-gray-400"
        >
          {calculating ? "Đang tính..." : "Tính điểm phương án"}
        </button>
      </div>

      {results && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-md font-medium mb-2">
            Kết quả điểm số phương án:
          </h4>
          <ul className="space-y-1">
            {Object.entries(results.scores).map(([alternativeId, score]) => {
              const alternativeName =
                alternatives.find((a) => a.id === parseInt(alternativeId))
                  ?.name || alternativeId;
              return (
                <li key={alternativeId} className="flex justify-between">
                  <span>{alternativeName}:</span>
                  <span className="font-medium">{score.toFixed(4)}</span>
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
