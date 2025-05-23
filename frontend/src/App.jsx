import { useState, useEffect, useCallback, useMemo } from "react";
import CustomerFilter from "./components/CustomerFilter.jsx";
import ExpertSelection from "./components/ExpertSelection.jsx";
import CriteriaMatrix from "./components/CriteriaMatrix.jsx";
import AlternativeMatrix from "./components/AlternativeMatrix.jsx";
import Results from "./components/Results.jsx";
import ExportExcel from "./components/ExportToExcel.jsx";
import ImportExcel from "./components/ImportExcel.jsx";
import {
  getCriteria,
  getFinalAlternativeScores,
  getAlternatives,
  updateAlternativesFromCustomers,
} from "./services/api";
import * as XLSX from "xlsx";
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
  const [criteriaCR, setCriteriaCR] = useState(null);
  const [alternativeCRs, setAlternativeCRs] = useState({});
  const [importedMatrices, setImportedMatrices] = useState({
    criteriaMatrix: null,
    alternativeMatrices: {},
  });

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
    setResultError(null);
    setCriteriaCR(null);
    setAlternativeCRs({});
    setImportedMatrices({ criteriaMatrix: null, alternativeMatrices: {} });
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
    setResultError(null);
    setCriteriaCR(null);
    setAlternativeCRs({});
    setImportedMatrices({ criteriaMatrix: null, alternativeMatrices: {} });
  }, []);

  const handleCriteriaWeightsCalculated = useCallback((result) => {
    console.log("handleCriteriaWeightsCalculated:", result);
    setCriteriaResults(result);
    setCriteriaCR(result.CR);
    if (result.CR <= 0.1) {
      setCriteriaWeights(result.weights || {});
      setCriteriaEvaluated(true);
      setMatrixSaved(true);
    } else {
      setMatrixSaved(false);
    }
  }, []);

  const handleAlternativeScoresCalculated = useCallback(
    (criteriaId, result) => {
      console.log("handleAlternativeScoresCalculated:", { criteriaId, result });
      setAlternativeCRs((prev) => ({
        ...prev,
        [criteriaId]: result.CR,
      }));
      if (result.CR <= 0.1) {
        setAlternativeScores((prev) => ({
          ...prev,
          [criteriaId]: result.scores || {},
        }));
      }
    },
    []
  );

  const handleImportMatrices = useCallback(
    ({ criteriaMatrix, alternativeMatrices }) => {
      setImportedMatrices({
        criteriaMatrix,
        alternativeMatrices,
      });
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

  const isPreviousMatrixValid = (currentCriteriaIndex) => {
    if (currentCriteriaIndex === 0) {
      return true;
    }

    if (criteriaCR !== null && criteriaCR > 0.1) {
      return false;
    }

    for (let i = 0; i < currentCriteriaIndex; i++) {
      const prevCriteriaId = criteria[i].id;
      if (
        alternativeCRs[prevCriteriaId] &&
        alternativeCRs[prevCriteriaId] > 0.1
      ) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const fetchFinalScores = async () => {
      if (
        allAlternativesEvaluated &&
        selectedCustomerIds.length > 0 &&
        selectedExpertId &&
        finalScores.length === 0 &&
        criteriaCR <= 0.1 &&
        Object.values(alternativeCRs).every((cr) => cr <= 0.1)
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
            `Không thể tải kết quả cuối cùng: ${
              err.response?.data?.error || err.message
            }`
          );
          console.error("Error fetching final scores:", {
            message: err.message,
            response: err.response?.data,
          });
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
    criteriaCR,
    alternativeCRs,
  ]);

  const handleRefreshResults = useCallback(
    async (e) => {
      e.preventDefault();
      if (
        !allAlternativesEvaluated ||
        criteriaCR > 0.1 ||
        Object.values(alternativeCRs).some((cr) => cr > 0.1)
      ) {
        setResultError(
          "Vui lòng hoàn thành đánh giá tất cả ma trận với tỷ số nhất quán (CR) ≤ 10%."
        );
        return;
      }
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
          `Không thể làm mới kết quả: ${
            err.response?.data?.error || err.message
          }`
        );
        console.error("Error refreshing final scores:", {
          message: err.message,
          response: err.response?.data,
        });
      } finally {
        setResultLoading(false);
      }
    },
    [
      selectedCustomerIds,
      selectedExpertId,
      allAlternativesEvaluated,
      criteriaCR,
      alternativeCRs,
    ]
  );

  const createTemplateFile = () => {
    if (selectedCustomers.length === 0 || criteria.length === 0) {
      setError(
        "Vui lòng chọn khách hàng và đảm bảo đã tải tiêu chí trước khi tạo file mẫu."
      );
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Tạo sheet cho CriteriaMatrix
    const criteriaMatrixData = Array(criteria.length + 1)
      .fill()
      .map(() => Array(criteria.length + 1).fill(""));
    criteriaMatrixData[0][0] = "";
    criteria.forEach((criterion, i) => {
      criteriaMatrixData[0][i + 1] = criterion.name;
      criteriaMatrixData[i + 1][0] = criterion.name;
      criteriaMatrixData[i + 1][i + 1] = 1;
    });
    const criteriaWs = XLSX.utils.aoa_to_sheet(criteriaMatrixData);
    XLSX.utils.book_append_sheet(
      workbook,
      criteriaWs,
      "Criteria Comparison Matrix"
    );

    // Tạo sheet cho mỗi AlternativeMatrix
    criteria.forEach((criterion) => {
      const size = selectedCustomers.length;
      const matrixData = Array(size + 1)
        .fill()
        .map(() => Array(size + 1).fill(""));
      matrixData[0][0] = "";
      selectedCustomers.forEach((customer, i) => {
        matrixData[0][i + 1] = customer.name;
        matrixData[i + 1][0] = customer.name;
        matrixData[i + 1][i + 1] = 1;
      });
      const ws = XLSX.utils.aoa_to_sheet(matrixData);
      const cleanSheetName = criterion.name
        .replace(/[:\\\/?*\[\]]/g, "")
        .slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, ws, cleanSheetName);
    });

    XLSX.writeFile(workbook, "AHP_Template.xlsx");
  };

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
              {selectedCustomers.length >= 4 && (
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={createTemplateFile}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Tạo file mẫu Excel
                  </button>
                  <ImportExcel
                    onImport={handleImportMatrices}
                    disabled={selectedCustomers.length < 4}
                    criteria={criteria}
                  />
                </div>
              )}
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
                criteria={criteria}
                importedMatrix={importedMatrices.criteriaMatrix}
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
                {criteria.map((criterion, index) => (
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
                    isPreviousMatrixValid={isPreviousMatrixValid(index)}
                    importedMatrix={
                      importedMatrices.alternativeMatrices[criterion.id]
                    }
                  />
                ))}
              </div>
            )}

          {criteriaEvaluated &&
            (criteriaCR > 0.1 ||
              Object.values(alternativeCRs).some((cr) => cr > 0.1)) && (
              <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                Một hoặc nhiều ma trận trước đó có tỷ số nhất quán (CR) vượt quá
                10%. Vui lòng điều chỉnh để tiếp tục.
              </div>
            )}

          {allAlternativesEvaluated &&
            criteriaCR <= 0.1 &&
            Object.values(alternativeCRs).every((cr) => cr <= 0.1) && (
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
                  <ExportExcel
                    criteria={criteria}
                    criteriaWeights={criteriaWeights}
                    criteriaResults={criteriaResults}
                    selectedCustomers={selectedCustomers}
                    alternativeScores={alternativeScores}
                    finalScores={finalScores}
                    selectedCustomerIds={selectedCustomerIds}
                    selectedExpertId={selectedExpertId}
                    disabled={resultLoading || finalScores.length === 0}
                  />
                </div>
                <h2 className="text-xl font-semibold mb-4">
                  Kết quả cuối cùng
                </h2>
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
