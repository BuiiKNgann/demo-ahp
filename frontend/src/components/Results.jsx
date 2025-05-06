import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

// Hàm phụ để định dạng tên phương án
const formatAlternativeName = (name) => {
  if (!name) return "";
  const match = name.match(/^A(\d+)$/);
  if (match) {
    const number = parseInt(match[1]);
    const letter = String.fromCharCode(64 + number); // Chuyển số thành chữ cái (1 -> A, 2 -> B, ...)
    return `Phương án ${letter}`;
  }
  return name;
};

// Hàm phụ để đảm bảo giá trị là số
const ensureNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "number") return value;
  return Number(value) || 0;
};

// Mảng các màu sắc cho biểu đồ tròn
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
];

const Results = ({ customerId, customerName, customers, finalScores = [] }) => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const processScores = () => {
      if (!customerId) {
        setError("Vui lòng chọn khách hàng để xem kết quả");
        return;
      }

      try {
        // Xử lý dữ liệu từ props thay vì gọi API
        console.log("Processing scores for customer ID:", customerId);
        console.log("Final scores from props:", finalScores);

        // Xử lý an toàn nếu không có dữ liệu
        const dataToProcess = finalScores || [];

        // Định dạng dữ liệu để hiển thị và đảm bảo điểm số là kiểu số
        const formattedScores = dataToProcess.map((score) => ({
          alternativeId:
            customers.find((c) => c.name === score.alternative_name)?.id ||
            score.alternative_name,
          alternativeName: formatAlternativeName(score.alternative_name),
          finalScore: ensureNumber(score.final_score), // Đảm bảo là số
        }));

        // Sắp xếp lại theo điểm số
        const sortedScores = formattedScores.sort(
          (a, b) => b.finalScore - a.finalScore
        );

        console.log("Processed scores:", sortedScores);

        // Chuẩn bị dữ liệu cho biểu đồ tròn
        const chartDataPrep = sortedScores.map((score) => ({
          name: score.alternativeName,
          value: score.finalScore,
        }));

        setScores(sortedScores);
        setChartData(chartDataPrep);
        setError(null);
      } catch (err) {
        console.error("Error processing final scores:", err);
        setError(err.message || "Không thể xử lý kết quả");
      }
    };

    processScores();
  }, [customerId, customers, finalScores]);

  const formatScore = (score) => {
    try {
      const numScore = ensureNumber(score);
      if (isNaN(numScore)) throw new Error("Invalid score");
      return numScore.toFixed(4);
    } catch (err) {
      console.error("Error formatting score:", err);
      return "0.0000";
    }
  };

  // Custom tooltip cho biểu đồ
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-sm">
          <p className="font-medium">{`${payload[0].name}`}</p>
          <p className="text-sm">{`Điểm số: ${formatScore(
            payload[0].value
          )}`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="py-6 text-center">Đang tải kết quả...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">{error}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Kết quả cuối cùng cho khách hàng: {customerName || "Không xác định"}
      </h2>
      {scores.length === 0 ? (
        <p>
          Chưa có kết quả cuối cùng cho khách hàng này. Vui lòng hoàn thành các
          bước tính toán trước.
        </p>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-8 mb-6">
            {/* Biểu đồ tròn */}
            <div className="w-full md:w-1/2">
              <div className="border p-4 rounded-lg bg-gray-50 h-80">
                <h3 className="text-lg font-medium mb-2 text-center">
                  Biểu đồ phân bố điểm số phương án
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(1)}%`
                      }
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bảng điểm */}
            <div className="w-full md:w-1/2">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b">Xếp hạng</th>
                    <th className="py-2 px-4 border-b">Phương án</th>
                    <th className="py-2 px-4 border-b">Điểm tổng hợp</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <tr
                      key={score.alternativeId || index}
                      className={index === 0 ? "bg-green-100" : ""}
                    >
                      <td className="py-2 px-4 border-b text-center">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {score.alternativeName}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatScore(score.finalScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {scores.length > 0 && (
            <div className="mt-4">
              <p className="text-green-600">
                Phương án <strong>{scores[0].alternativeName}</strong> có điểm
                số cao nhất ({formatScore(scores[0].finalScore)}) và được khuyến
                nghị là lựa chọn tốt nhất.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Biểu đồ tròn thể hiện tỷ lệ phần trăm của mỗi phương án trong
                tổng điểm. Phương án có diện tích lớn hơn có điểm số cao hơn.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Results;
