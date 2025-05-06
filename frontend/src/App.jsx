import { useState, useEffect, useCallback, useMemo } from "react";
import CustomerFilter from "./components/CustomerFilter";
import ExpertSelection from "./components/ExpertSelection";
import CriteriaMatrix from "./components/CriteriaMatrix";
import AlternativeMatrix from "./components/AlternativeMatrix";
import Results from "./components/Results";
import { getCriteria, getFinalAlternativeScores } from "./services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function App() {
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [criteriaWeights, setCriteriaWeights] = useState({});
  const [alternativeScores, setAlternativeScores] = useState({});
  const [criteriaEvaluated, setCriteriaEvaluated] = useState(false);
  const [criteriaResults, setCriteriaResults] = useState(null);
  const [finalScores, setFinalScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultLoading, setResultLoading] = useState(false); // Thêm state để theo dõi riêng việc tải kết quả
  const [error, setError] = useState(null);
  const [resultError, setResultError] = useState(null); // Thêm state để theo dõi lỗi riêng cho phần kết quả

  const selectedCustomerIds = useMemo(
    () => selectedCustomers.map((c) => c.id),
    [selectedCustomers]
  );

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

  const handleCustomerSelect = useCallback((customers) => {
    console.log("handleCustomerSelect:", customers);
    setSelectedCustomers([...customers]);
    setCriteriaEvaluated(false);
    setCriteriaWeights({});
    setAlternativeScores({});
    setCriteriaResults(null);
    setFinalScores([]);
  }, []);

  const handleExpertSelect = useCallback((expertId) => {
    console.log("handleExpertSelect:", expertId);
    setSelectedExpertId(expertId);
    setCriteriaEvaluated(false);
    setCriteriaWeights({});
    setAlternativeScores({});
    setCriteriaResults(null);
    setFinalScores([]);
  }, []);

  const handleCriteriaWeightsCalculated = useCallback((result) => {
    console.log("handleCriteriaWeightsCalculated:", result);
    setCriteriaResults(result);
    if (result.CR <= 0.1) {
      setCriteriaWeights(result.weights || {});
      setCriteriaEvaluated(true);
    }
  }, []);

  const handleAlternativeScoresCalculated = useCallback(
    (criteriaId, result) => {
      console.log("handleAlternativeScoresCalculated:", { criteriaId, result });
      setAlternativeScores((prev) => ({
        ...prev,
        [criteriaId]: result.scores || {},
      }));
    },
    []
  );

  const allCriteriaEvaluated = useMemo(
    () =>
      criteriaEvaluated &&
      criteria.length > 0 &&
      Object.keys(alternativeScores).length === criteria.length,
    [criteriaEvaluated, criteria, alternativeScores]
  );

  const allAlternativesEvaluated = useMemo(
    () =>
      allCriteriaEvaluated &&
      selectedCustomers.length > 0 &&
      selectedCustomers.every((customer) =>
        criteria.every(
          (criterion) =>
            alternativeScores[criterion.id]?.[customer.id] !== undefined
        )
      ),
    [allCriteriaEvaluated, selectedCustomers, criteria, alternativeScores]
  );

  // Tính toán kết quả cuối cùng sau khi tất cả các đánh giá được hoàn thành
  useEffect(() => {
    const fetchFinalScores = async () => {
      if (
        allAlternativesEvaluated &&
        selectedCustomerIds.length > 0 &&
        selectedExpertId &&
        // Chỉ gọi API khi chưa có kết quả hoặc khi người dùng yêu cầu làm mới
        finalScores.length === 0
      ) {
        console.log("Calculating final scores automatically");
        try {
          setResultLoading(true); // Chỉ set loading cho phần kết quả
          setResultError(null);
          const response = await getFinalAlternativeScores({
            customer_id: selectedCustomerIds[0],
            expert_id: selectedExpertId,
            customer_ids: selectedCustomerIds,
          });
          console.log("Final scores response:", response);
          setFinalScores(response.final_scores || []);
        } catch (err) {
          setResultError(
            "Không thể tải kết quả cuối cùng: " +
              (err.response?.data?.error || err.message)
          );
          console.error("Error fetching final scores:", err);
        } finally {
          setResultLoading(false);
        }
      }
    };

    fetchFinalScores();
  }, [
    allAlternativesEvaluated,
    selectedCustomerIds,
    selectedExpertId,
    finalScores.length,
  ]);

  const handleRefreshResults = useCallback(
    async (e) => {
      e.preventDefault();
      console.log("handleRefreshResults called");
      try {
        setResultLoading(true);
        setResultError(null);
        const response = await getFinalAlternativeScores({
          customer_id: selectedCustomerIds[0],
          expert_id: selectedExpertId,
          customer_ids: selectedCustomerIds,
        });
        console.log("Refreshed final scores:", response);
        setFinalScores(response.final_scores || []);
      } catch (err) {
        setResultError(
          "Không thể làm mới kết quả: " +
            (err.response?.data?.error || err.message)
        );
        console.error("Error refreshing final scores:", err);
      } finally {
        setResultLoading(false);
      }
    },
    [selectedCustomerIds, selectedExpertId]
  );

  const exportToExcel = useCallback(
    (e) => {
      e.preventDefault();
      try {
        console.log("Exporting to Excel...");
        const workbook = XLSX.utils.book_new();
        const criteriaWeightsData = criteria.map((criterion, index) => {
          const criteriaKey = `C${index + 1}`;
          const weight = criteriaWeights[criteriaKey] || 0;
          return {
            "Tên tiêu chí": criterion.name,
            "Trọng số": weight ? Number(weight.toFixed(4)) : 0,
          };
        });
        const criteriaWeightsSheet = XLSX.utils.json_to_sheet([
          {
            "Tên tiêu chí": "Tỷ số nhất quán (CR)",
            "Trọng số": criteriaResults?.CR?.toFixed(4) || "N/A",
          },
          {},
          ...criteriaWeightsData,
        ]);
        XLSX.utils.book_append_sheet(
          workbook,
          criteriaWeightsSheet,
          "Criteria Weights"
        );

        const alternativeScoresData = selectedCustomers.map((customer) => {
          const row = { "Tên khách hàng": customer.name };
          criteria.forEach((criterion) => {
            const score = alternativeScores[criterion.id]?.[customer.id] || 0;
            row[criterion.name] = score ? Number(score.toFixed(4)) : 0;
          });
          return row;
        });
        const alternativeScoresSheet = XLSX.utils.json_to_sheet(
          alternativeScoresData
        );
        XLSX.utils.book_append_sheet(
          workbook,
          alternativeScoresSheet,
          "Alternative Scores"
        );

        const finalScoresData = finalScores.map((score, index) => ({
          "Xếp hạng": index + 1,
          "Tên phương án": score.alternative_name,
          "Điểm tổng hợp": Number(score.final_score.toFixed(4)),
        }));
        const finalScoresSheet = XLSX.utils.json_to_sheet(finalScoresData);
        XLSX.utils.book_append_sheet(
          workbook,
          finalScoresSheet,
          "Final Scores"
        );

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const data = new Blob([excelBuffer], {
          type: "application/octet-stream",
        });
        saveAs(data, "AHP_Results.xlsx");
        console.log("Excel file exported successfully");
      } catch (err) {
        console.error("Error exporting to Excel:", err);
        setError("Không thể xuất file Excel. Vui lòng thử lại.");
      }
    },
    [
      criteria,
      criteriaWeights,
      criteriaResults,
      selectedCustomers,
      alternativeScores,
      finalScores,
    ]
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
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Bước 1: Chọn chuyên gia
            </h2>
            <ExpertSelection onExpertSelect={handleExpertSelect} />
          </div>

          {selectedExpertId && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Bước 2: Chọn khách hàng để đánh giá
              </h2>
              <CustomerFilter onCustomerSelect={handleCustomerSelect} />
            </div>
          )}

          {selectedExpertId && selectedCustomers.length >= 4 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Bước 3: Đánh giá trọng số tiêu chí
              </h2>
              <CriteriaMatrix
                customerId={selectedCustomers[0]?.id}
                expertId={selectedExpertId}
                onWeightsCalculated={handleCriteriaWeightsCalculated}
                disabled={criteriaEvaluated}
              />
            </div>
          )}

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
                    onScoresCalculated={handleAlternativeScoresCalculated}
                    disabled={alternativeScores[criterion.id] !== undefined}
                  />
                ))}
              </div>
            )}

          {allAlternativesEvaluated && (
            <div className="mt-8">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={handleRefreshResults}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  type="button"
                  disabled={resultLoading}
                >
                  {resultLoading ? "Đang làm mới..." : "Làm mới kết quả"}
                </button>
                <button
                  onClick={exportToExcel}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  type="button"
                  disabled={resultLoading || finalScores.length === 0}
                >
                  Xuất ra Excel
                </button>
              </div>
              <h2 className="text-xl font-semibold mb-4">Kết quả cuối cùng</h2>
              {resultError && (
                <div className="text-red-600 py-2 mb-4">{resultError}</div>
              )}
              <Results
                customerId={selectedCustomers[0]?.id}
                customerName="Tổng hợp tất cả khách hàng"
                finalScores={finalScores}
                customers={selectedCustomers}
                loading={resultLoading}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
