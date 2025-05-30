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
  getConsistencyMetricsCriteria,
  getConsistencyMetricsAlternatives,
} from "./services/api";
import * as XLSX from "xlsx";
import ExportPDF from "./components/ExportPDF.jsx";

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
  const [criteriaConsistencyMetrics, setCriteriaConsistencyMetrics] =
    useState(null);
  const [alternativeConsistencyMetrics, setAlternativeConsistencyMetrics] =
    useState({});
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

  // Lấy dữ liệu độ nhất quán của ma trận tiêu chí
  useEffect(() => {
    const fetchCriteriaConsistencyMetrics = async () => {
      if (selectedCustomerIds.length > 0 && selectedExpertId) {
        try {
          const metrics = await getConsistencyMetricsCriteria({
            customer_id: selectedCustomerIds[0],
            expert_id: selectedExpertId,
          });
          if (metrics.length > 0) {
            setCriteriaConsistencyMetrics(metrics[0]);
          }
        } catch (err) {
          console.error("Error fetching criteria consistency metrics:", err);
        }
      }
    };
    fetchCriteriaConsistencyMetrics();
  }, [selectedCustomerIds, selectedExpertId]);

  // Lấy dữ liệu độ nhất quán của ma trận phương án
  useEffect(() => {
    const fetchAlternativeConsistencyMetrics = async () => {
      if (
        selectedCustomerIds.length > 0 &&
        selectedExpertId &&
        criteria.length > 0
      ) {
        const metricsByCriteria = {};
        for (const criterion of criteria) {
          try {
            const metrics = await getConsistencyMetricsAlternatives({
              customer_id: selectedCustomerIds[0],
              expert_id: selectedExpertId,
              criterion_id: criterion.id,
            });
            if (metrics.length > 0) {
              metricsByCriteria[criterion.id] = metrics[0];
            }
          } catch (err) {
            console.error(
              `Error fetching alternative consistency metrics for criterion ${criterion.id}:`,
              err
            );
          }
        }
        setAlternativeConsistencyMetrics(metricsByCriteria);
      }
    };
    fetchAlternativeConsistencyMetrics();
  }, [selectedCustomerIds, selectedExpertId, criteria]);

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
    setCriteriaConsistencyMetrics(null);
    setAlternativeConsistencyMetrics({});
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
    setCriteriaConsistencyMetrics(null);
    setAlternativeConsistencyMetrics({});
    setImportedMatrices({ criteriaMatrix: null, alternativeMatrices: {} });
  }, []);

  const handleCriteriaWeightsCalculated = useCallback((result) => {
    console.log("handleCriteriaWeightsCalculated:", result);
    setCriteriaResults(result);
    setCriteriaConsistencyMetrics({
      lambda_max: result.lambda_max,
      CI: result.CI,
      CR: result.CR,
    });
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
      setAlternativeConsistencyMetrics((prev) => ({
        ...prev,
        [criteriaId]: {
          lambda_max: result.lambda_max,
          CI: result.CI,
          CR: result.CR,
        },
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

  // Cập nhật logic kiểm tra ma trận trước đó có hợp lệ không
  const isPreviousMatrixValid = (currentCriteriaIndex) => {
    // Kiểm tra ma trận tiêu chí trước tiên
    if (criteriaConsistencyMetrics && criteriaConsistencyMetrics.CR > 0.1) {
      return false;
    }

    // Kiểm tra tất cả các ma trận phương án trước ma trận hiện tại
    for (let i = 0; i < currentCriteriaIndex; i++) {
      const prevCriteriaId = criteria[i].id;
      const prevMetrics = alternativeConsistencyMetrics[prevCriteriaId];

      // Nếu ma trận trước đó chưa được đánh giá hoặc có CR > 0.1
      if (!prevMetrics || prevMetrics.CR > 0.1) {
        return false;
      }
    }
    return true;
  };

  // Kiểm tra xem ma trận hiện tại có thể được kích hoạt không
  const isCurrentMatrixEnabled = (currentCriteriaIndex) => {
    // Ma trận đầu tiên luôn được kích hoạt (sau khi ma trận tiêu chí hợp lệ)
    if (currentCriteriaIndex === 0) {
      return criteriaConsistencyMetrics && criteriaConsistencyMetrics.CR <= 0.1;
    }

    // Các ma trận tiếp theo chỉ được kích hoạt khi tất cả ma trận trước đó hợp lệ
    return isPreviousMatrixValid(currentCriteriaIndex);
  };

  useEffect(() => {
    const fetchFinalScores = async () => {
      if (
        allAlternativesEvaluated &&
        selectedCustomerIds.length > 0 &&
        selectedExpertId &&
        finalScores.length === 0 &&
        criteriaConsistencyMetrics &&
        criteriaConsistencyMetrics.CR <= 0.1 &&
        Object.values(alternativeConsistencyMetrics).every(
          (metric) => metric.CR <= 0.1
        )
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
    criteriaConsistencyMetrics,
    alternativeConsistencyMetrics,
  ]);

  const handleRefreshResults = useCallback(
    async (e) => {
      e.preventDefault();
      if (
        !allAlternativesEvaluated ||
        (criteriaConsistencyMetrics && criteriaConsistencyMetrics.CR > 0.1) ||
        Object.values(alternativeConsistencyMetrics).some(
          (metric) => metric.CR > 0.1
        )
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
      criteriaConsistencyMetrics,
      alternativeConsistencyMetrics,
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

  // Tìm ma trận phương án đầu tiên có CR > 0.1
  const getFirstInvalidMatrixIndex = () => {
    for (let i = 0; i < criteria.length; i++) {
      const criteriaId = criteria[i].id;
      const metrics = alternativeConsistencyMetrics[criteriaId];
      if (metrics && metrics.CR > 0.1) {
        return i;
      }
    }
    return -1;
  };

  const firstInvalidMatrixIndex = getFirstInvalidMatrixIndex();

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
                consistencyMetrics={criteriaConsistencyMetrics}
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

                {/* Hiển thị cảnh báo nếu có ma trận không hợp lệ */}
                {firstInvalidMatrixIndex !== -1 && (
                  <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                    <strong>Lưu ý:</strong> Ma trận "
                    {criteria[firstInvalidMatrixIndex].name}" có tỷ số nhất quán
                    (CR) vượt quá 10%. Vui lòng điều chỉnh ma trận này trước khi
                    tiếp tục với các ma trận tiếp theo.
                  </div>
                )}

                {criteria.map((criterion, index) => {
                  const isEnabled = isCurrentMatrixEnabled(index);
                  const currentMetrics =
                    alternativeConsistencyMetrics[criterion.id];
                  const isCompleted =
                    alternativeScores[criterion.id] !== undefined;

                  return (
                    <div key={criterion.id} className="mb-6">
                      {/* Hiển thị trạng thái của ma trận */}
                      <div className="mb-3 flex items-center space-x-4">
                        <span className="font-medium text-gray-700">
                          Ma trận {index + 1}: {criterion.name}
                        </span>
                        {!isEnabled && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-sm rounded">
                            Bị vô hiệu hóa
                          </span>
                        )}
                        {isCompleted &&
                          currentMetrics &&
                          currentMetrics.CR <= 0.1 && (
                            <span className="px-2 py-1 bg-green-200 text-green-700 text-sm rounded">
                              Hoàn thành (CR: {currentMetrics.CR.toFixed(4)})
                            </span>
                          )}
                        {currentMetrics && currentMetrics.CR > 0.1 && (
                          <span className="px-2 py-1 bg-red-200 text-red-700 text-sm rounded">
                            CR vượt quá 10% ({currentMetrics.CR.toFixed(4)})
                          </span>
                        )}
                      </div>

                      <AlternativeMatrix
                        expertId={selectedExpertId}
                        customerId={selectedCustomers[0]?.id}
                        criteriaId={criterion.id}
                        criteriaName={criterion.name}
                        customers={selectedCustomers.filter((c) =>
                          validAlternatives.some((alt) => alt.id === c.id)
                        )}
                        onScoresCalculated={handleAlternativeScoresCalculated}
                        disabled={isCompleted || !isEnabled}
                        isPreviousMatrixValid={isEnabled}
                        importedMatrix={
                          importedMatrices.alternativeMatrices[criterion.id]
                        }
                        consistencyMetrics={currentMetrics}
                      />
                    </div>
                  );
                })}
              </div>
            )}

          {allAlternativesEvaluated &&
            criteriaConsistencyMetrics?.CR <= 0.1 &&
            Object.values(alternativeConsistencyMetrics).every(
              (metric) => metric.CR <= 0.1
            ) && (
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

                  <ExportPDF
                    criteria={criteria}
                    criteriaWeights={criteriaWeights}
                    criteriaResults={criteriaResults}
                    selectedCustomers={selectedCustomers}
                    alternativeScores={alternativeScores}
                    finalScores={finalScores}
                    selectedCustomerIds={selectedCustomerIds}
                    selectedExpertId={selectedExpertId}
                    disabled={resultLoading || finalScores.length === 0}
                    alternativeConsistencyMetrics={
                      alternativeConsistencyMetrics
                    } // Thêm prop này
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
