import { useState, useEffect, useCallback } from "react";
import CustomerFilter from "./components/CustomerFilter";
import ExpertSelection from "./components/ExpertSelection";
import CriteriaMatrix from "./components/CriteriaMatrix";
import AlternativeMatrix from "./components/AlternativeMatrix";
import Results from "./components/Results";
import { getCriteria, getFinalAlternativeScores } from "./services/api";

function App() {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [criteriaWeights, setCriteriaWeights] = useState({});
  const [alternativeScores, setAlternativeScores] = useState({});
  const [criteriaEvaluated, setCriteriaEvaluated] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFinalScores, setLoadingFinalScores] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        setLoading(true);
        const criteriaData = await getCriteria();
        setCriteria(criteriaData);
        setLoading(false);
      } catch (err) {
        setError("Không thể tải danh sách tiêu chí");
        console.error("Error fetching criteria:", err);
        setLoading(false);
      }
    };
    fetchCriteria();
  }, []);

  const handleCustomerSelect = (customers) => {
    setSelectedCustomers(customers);
    // Reset đánh giá tiêu chí khi thay đổi khách hàng
    setCriteriaEvaluated(false);
    setCriteriaWeights({});
    setAlternativeScores({});
    setFinalScores([]);
  };

  const handleExpertSelect = (expertId) => {
    setSelectedExpertId(expertId);
    // Reset đánh giá tiêu chí khi thay đổi chuyên gia
    setCriteriaEvaluated(false);
    setCriteriaWeights({});
    setAlternativeScores({});
    setFinalScores([]);
  };

  const handleCriteriaWeightsCalculated = (result) => {
    if (result.CR <= 0.1) {
      // Chỉ cập nhật khi CR <= 0.1
      setCriteriaWeights(result.weights || {});
      setCriteriaEvaluated(true);
    }
  };

  const handleAlternativeScoresCalculated = (criteriaId, result) => {
    setAlternativeScores((prev) => {
      const newScores = {
        ...prev,
        [criteriaId]: result.scores || {},
      };

      // Sau khi cập nhật điểm số, kiểm tra nếu đã đánh giá tất cả
      // nếu đã hoàn thành, thì tải kết quả cuối cùng
      if (
        criteriaEvaluated &&
        criteria.length > 0 &&
        Object.keys(newScores).length === criteria.length
      ) {
        fetchFinalScores();
      }

      return newScores;
    });
  };

  // Tạo hàm fetchFinalScores riêng để có thể gọi theo nhu cầu
  const fetchFinalScores = useCallback(async () => {
    if (!selectedCustomers.length || !selectedExpertId) return;

    try {
      setLoadingFinalScores(true);
      setError(null);
      console.log("Fetching final scores for:", {
        customer_id: selectedCustomers[0].id,
        expert_id: selectedExpertId,
      });

      const response = await getFinalAlternativeScores({
        customer_id: selectedCustomers[0].id,
        expert_id: selectedExpertId,
      });

      console.log("Final scores response:", response);
      setFinalScores(response.final_scores || []);
    } catch (err) {
      console.error("Error fetching final scores:", err);
      setError(
        "Không thể tải kết quả cuối cùng: " +
          (err.response?.data?.error || err.message)
      );
      setFinalScores([]);
    } finally {
      setLoadingFinalScores(false);
    }
  }, [selectedCustomers, selectedExpertId]);

  const allCriteriaEvaluated =
    criteriaEvaluated &&
    criteria.length > 0 &&
    Object.keys(alternativeScores).length === criteria.length;

  const allAlternativesEvaluated =
    allCriteriaEvaluated &&
    selectedCustomers.length > 0 &&
    selectedCustomers.every((customer) =>
      criteria.every(
        (criterion) =>
          alternativeScores[criterion.id]?.[customer.id] !== undefined
      )
    );

  if (loading) {
    return <div className="py-6 text-center">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4 text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 w-full">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Hệ thống hỗ trợ ra quyết định AHP
          </h1>
        </header>

        <main>
          {/* Bước 1: Chọn chuyên gia */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Bước 1: Chọn chuyên gia
            </h2>
            <ExpertSelection onExpertSelect={handleExpertSelect} />
          </div>

          {/* Bước 2: Chỉ hiển thị bộ lọc khách hàng sau khi đã chọn chuyên gia */}
          {selectedExpertId && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Bước 2: Chọn khách hàng để đánh giá
              </h2>
              <CustomerFilter onCustomerSelect={handleCustomerSelect} />
            </div>
          )}

          {/* Bước 3: Chỉ hiển thị đánh giá tiêu chí sau khi đã chọn khách hàng */}
          {selectedExpertId && selectedCustomers.length >= 4 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Bước 3: Đánh giá trọng số tiêu chí
              </h2>
              <CriteriaMatrix
                customerId={selectedCustomers[0]?.id}
                expertId={selectedExpertId}
                onWeightsCalculated={handleCriteriaWeightsCalculated}
                disabled={criteriaEvaluated} // Vô hiệu hóa sau khi tính xong
              />
            </div>
          )}

          {/* Bước 4: Chỉ hiển thị đánh giá khách hàng theo tiêu chí sau khi đã đánh giá tiêu chí */}
          {selectedExpertId &&
            selectedCustomers.length >= 4 &&
            criteriaEvaluated && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">
                  Bước 4: Đánh giá khách hàng theo từng tiêu chí
                </h2>
                {criteria.map((criterion) => (
                  <AlternativeMatrix
                    key={criterion.id}
                    expertId={selectedExpertId}
                    customerId={selectedCustomers[0]?.id}
                    criteriaId={criterion.id}
                    criteriaName={criterion.name}
                    customers={selectedCustomers}
                    onScoresCalculated={(criteriaId, result) =>
                      handleAlternativeScoresCalculated(criteriaId, result)
                    }
                    disabled={alternativeScores[criterion.id] !== undefined}
                  />
                ))}
              </div>
            )}

          {/* Hiển thị kết quả cuối cùng khi đã hoàn thành tất cả các bước */}
          {allAlternativesEvaluated && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">
                Kết quả cuối cùng
                {loadingFinalScores && (
                  <span className="ml-2 text-sm text-gray-500">
                    (Đang tải...)
                  </span>
                )}
              </h2>
              <Results
                customerId={selectedCustomers[0]?.id}
                customerName="Tổng hợp tất cả khách hàng"
                finalScores={finalScores}
                customers={selectedCustomers}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
