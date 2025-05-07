import { useState, useEffect, useCallback, useMemo } from "react";
import CustomerFilter from "./components/CustomerFilter";
import ExpertSelection from "./components/ExpertSelection";
import CriteriaMatrix from "./components/CriteriaMatrix";
import AlternativeMatrix from "./components/AlternativeMatrix";
import Results from "./components/Results";
import {
  getCriteria,
  getFinalAlternativeScores,
  getAlternatives,
  updateAlternativesFromCustomers,
} from "./services/api";
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
  const [resultLoading, setResultLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultError, setResultError] = useState(null);
  const [validAlternatives, setValidAlternatives] = useState([]);
  const [matrixSaved, setMatrixSaved] = useState(false);

  const selectedCustomerIds = useMemo(
    () => selectedCustomers.map((c) => c.id),
    [selectedCustomers]
  );

  useEffect(() => {
    const syncAlternatives = async () => {
      if (selectedCustomerIds.length > 0) {
        try {
          const alternatives = await getAlternatives();
          setValidAlternatives(alternatives);

          const missingIds = selectedCustomerIds.filter(
            (id) => !alternatives.some((alt) => alt.id === id)
          );
          if (missingIds.length > 0) {
            console.log("Updating alternatives with missing IDs:", missingIds);
            await updateAlternativesFromCustomers(selectedCustomerIds);
            const updatedAlternatives = await getAlternatives();
            setValidAlternatives(updatedAlternatives);
          }
        } catch (err) {
          setError(`Không thể đồng bộ danh sách phương án: ${err.message}`);
          console.error("Error syncing alternatives:", err);
        }
      }
    };
    syncAlternatives();
  }, [selectedCustomerIds]);

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
    setMatrixSaved(false);
  }, []);

  const handleExpertSelect = useCallback((expertId) => {
    console.log("handleExpertSelect:", expertId);
    setSelectedExpertId(expertId);
    setCriteriaEvaluated(false);
    setCriteriaWeights({});
    setAlternativeScores({});
    setCriteriaResults(null);
    setFinalScores([]);
    setMatrixSaved(false);
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

  useEffect(() => {
    const fetchFinalScores = async () => {
      if (
        allAlternativesEvaluated &&
        selectedCustomerIds.length > 0 &&
        selectedExpertId &&
        finalScores.length === 0
      ) {
        console.log("Calculating final scores automatically");
        try {
          setResultLoading(true);
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
    async (e) => {
      e.preventDefault();
      try {
        console.log("Exporting to Excel...");
        const workbook = XLSX.utils.book_new();

        // 1. Sheet: Criteria Comparison Matrix
        try {
          const response = await fetch(
            `http://localhost:5000/get-criteria-matrix?customer_id=${selectedCustomerIds[0]}&expert_id=${selectedExpertId}`
          );
          const data = await response.json();
          if (data.error) throw new Error(data.error);

          const matrixData = data.matrix;
          const criteriaNames = criteria.map((c) => c.name);
          const criteriaMatrix = criteriaNames.map((_, i) => {
            const row = { "Tiêu chí": criteriaNames[i] };
            criteriaNames.forEach((_, j) => {
              const value =
                matrixData.find(
                  (item) =>
                    item.criterion1_id === i + 1 && item.criterion2_id === j + 1
                )?.value || 1;
              row[criteriaNames[j]] = Number(value.toFixed(4));
            });
            return row;
          });
          const criteriaMatrixSheet = XLSX.utils.json_to_sheet(criteriaMatrix);
          XLSX.utils.book_append_sheet(
            workbook,
            criteriaMatrixSheet,
            "Criteria Comparison Matrix"
          );
        } catch (err) {
          console.error("Error fetching criteria matrix:", err);
        }
        // 2. Sheet: Criteria Weights
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
        // 3. Sheet: All Alternative Comparison Matrices
        const allAltMatrices = [];
        for (const criterion of criteria) {
          try {
            const response = await fetch(
              `http://localhost:5000/get-alternative-comparisons?customer_id=${selectedCustomerIds[0]}&expert_id=${selectedExpertId}&criterion_id=${criterion.id}`
            );
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const comparisons = data.comparisons;
            const altNames = selectedCustomers.map((c) => c.name);

            // Thêm tiêu đề cho ma trận
            allAltMatrices.push({
              "Phương án": `Ma trận so sánh cặp khách hàng theo tiêu chí: ${criterion.name}`,
            });
            allAltMatrices.push({});
            // Thêm hàng "Phương án Nguồn V:", mỗi phương án nằm trong một ô riêng
            const sourceRow = { "Phương án": "Phương án Nguồn V:" };
            altNames.forEach((name, index) => {
              sourceRow[altNames[index]] = name;
            });

            // Tạo ma trận, bao gồm hàng tiêu đề
            const altMatrix = [
              sourceRow, // Hàng "Phương án Nguồn V:" với từng phương án trong một ô
              ...altNames.map((_, i) => {
                const row = { "Phương án": altNames[i] };
                altNames.forEach((_, j) => {
                  const comparison = comparisons.find(
                    (comp) =>
                      (comp.alternative1_id === selectedCustomers[i].id &&
                        comp.alternative2_id === selectedCustomers[j].id) ||
                      (comp.alternative1_id === selectedCustomers[j].id &&
                        comp.alternative2_id === selectedCustomers[i].id)
                  );
                  let value = 1;
                  if (comparison) {
                    if (
                      comparison.alternative1_id === selectedCustomers[i].id &&
                      comparison.alternative2_id === selectedCustomers[j].id
                    ) {
                      value = comparison.value;
                    } else {
                      value = 1 / comparison.value;
                    }
                  }
                  row[altNames[j]] = Number(value.toFixed(4));
                });
                return row;
              }),
            ];

            allAltMatrices.push(...altMatrix);
            // Thêm hai hàng trống sau mỗi ma trận
            allAltMatrices.push({});
            allAltMatrices.push({});
          } catch (err) {
            console.error(
              `Error fetching alternative matrix for criterion ${criterion.name}:`,
              err
            );
          }
        }

        if (allAltMatrices.length > 0) {
          const allAltMatrixSheet = XLSX.utils.json_to_sheet(allAltMatrices);
          XLSX.utils.book_append_sheet(
            workbook,
            allAltMatrixSheet,
            "Alternative Comparison Matrices"
          );
        }

        // 4. Sheet: Alternative Scores
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

        // 5. Sheet: Final Scores
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

        // Xuất file Excel
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
      selectedCustomerIds,
      selectedExpertId,
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
              {matrixSaved && (
                <div className="mt-2 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
                  Ma trận tiêu chí đã được lưu thành công!
                </div>
              )}
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
                    customers={selectedCustomers.filter((c) =>
                      validAlternatives.some((alt) => alt.id === c.id)
                    )}
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
