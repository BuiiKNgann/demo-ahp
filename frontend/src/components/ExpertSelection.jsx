import { useState, useEffect } from "react";
import { getExperts } from "../services/api";

const ExpertSelection = ({ onExpertSelect }) => {
  const [experts, setExperts] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        setLoading(true);
        const expertsData = await getExperts();
        setExperts(expertsData);
        setLoading(false);
      } catch (err) {
        setError("Không thể tải danh sách chuyên gia");
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  const handleExpertChange = (e) => {
    const expertId = e.target.value;
    setSelectedExpert(expertId);
    if (expertId) {
      onExpertSelect(parseInt(expertId));
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
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-xl font-semibold mb-4">Chọn chuyên gia</h2>
      <div className="mb-4">
        <label
          htmlFor="expert-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Chuyên gia:
        </label>
        <select
          id="expert-select"
          value={selectedExpert}
          onChange={handleExpertChange}
          className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Chọn chuyên gia --</option>
          {experts.map((expert) => (
            <option key={expert.id} value={expert.id}>
              {expert.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ExpertSelection;
