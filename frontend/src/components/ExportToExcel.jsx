import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useCallback, useState } from "react";

const ExportExcel = ({
  criteria,
  criteriaWeights,
  criteriaResults,
  selectedCustomers,
  alternativeScores,
  finalScores,
  selectedCustomerIds,
  selectedExpertId,
  disabled,
}) => {
  const [exportError, setExportError] = useState(null);

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

            allAltMatrices.push({
              "Phương án": `Ma trận so sánh cặp khách hàng theo tiêu chí: ${criterion.name}`,
            });
            allAltMatrices.push({});
            const sourceRow = { "Phương án": "Phương án Nguồn V:" };
            altNames.forEach((name, index) => {
              sourceRow[altNames[index]] = name;
            });

            const altMatrix = [
              sourceRow,
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

        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const data = new Blob([excelBuffer], {
          type: "application/octet-stream",
        });
        saveAs(data, "AHP_Results.xlsx");
        console.log("Excel file exported successfully");
        setExportError(null);
      } catch (err) {
        console.error("Error exporting to Excel:", err);
        setExportError("Không thể xuất file Excel. Vui lòng thử lại.");
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

  return (
    <div>
      <button
        onClick={exportToExcel}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        type="button"
        disabled={disabled}
      >
        Xuất ra Excel
      </button>
      {exportError && (
        <div className="text-red-600 py-2 mt-2">{exportError}</div>
      )}
    </div>
  );
};

export default ExportExcel;
