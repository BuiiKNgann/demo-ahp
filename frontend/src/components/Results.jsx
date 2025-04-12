import { useState, useEffect } from "react";
import { getFinalAlternativeScores } from "../services/api";

const Results = () => {
  const [finalScores, setFinalScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinalScores = async () => {
      try {
        const scores = await getFinalAlternativeScores();
        // Sắp xếp giảm dần theo điểm
        const sorted = [...scores].sort(
          (a, b) => b.final_score - a.final_score
        );
        setFinalScores(sorted);
        setLoading(false);
      } catch (error) {
        console.error("Error loading final results:", error);
        setLoading(false);
      }
    };

    fetchFinalScores();
  }, []);

  if (loading) {
    return <div className="text-center py-6">Đang tải kết quả...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-semibold mb-4">Kết quả cuối cùng</h2>

      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b border-r">Xếp hạng</th>
            <th className="py-2 px-4 border-b border-r">Phương án</th>
            <th className="py-2 px-4 border-b">Điểm tổng hợp</th>
          </tr>
        </thead>
        <tbody>
          {finalScores.map((alt, index) => (
            <tr
              key={alt.alternative_name}
              className={index === 0 ? "bg-green-50" : ""}
            >
              <td className="py-2 px-4 border-b border-r text-center font-bold">
                {index + 1}
              </td>
              <td className="py-2 px-4 border-b border-r">
                {alt.alternative_name}
              </td>
              <td className="py-2 px-4 border-b text-right font-medium">
                {alt.final_score.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Phân tích kết quả</h3>
        <p className="text-gray-700">
          Phương án{" "}
          <span className="font-bold">{finalScores[0]?.alternative_name}</span>{" "}
          có điểm số cao nhất ({finalScores[0]?.final_score.toFixed(4)}) và được
          khuyến nghị là lựa chọn tốt nhất.
        </p>
      </div>
    </div>
  );
};

export default Results;
