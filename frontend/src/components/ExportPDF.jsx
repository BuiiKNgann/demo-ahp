import jsPDF from "jspdf";
import "jspdf-autotable";
import { useCallback, useState } from "react";
import { notoSansBase64 } from "../fonts/notoSansBase64.js";

const ExportPDF = ({
  criteria,
  criteriaWeights,
  criteriaResults,
  selectedCustomers,
  alternativeScores,
  finalScores,
  selectedCustomerIds,
  selectedExpertId,
  disabled,
  alternativeConsistencyMetrics,
}) => {
  const [exportError, setExportError] = useState(null);

  const createPieChart = (data) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");

    const centerX = 200;
    const centerY = 250;
    const radius = 120;

    const colors = [
      "#007bff", // Blue
      "#17a2b8", // Teal
      "#ffc107", // Yellow
      "#fd7e14", // Orange
      "#6f42c1", // Purple
      "#28a745", // Green
      "#dc3545", // Red
      "#6c757d", // Gray
    ];

    let currentAngle = -Math.PI / 2;

    if (!data || data.length === 0) {
      ctx.fillStyle = "#333";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Không có dữ liệu để hiển thị", centerX, centerY);
      return canvas;
    }

    data.forEach((item, index) => {
      const percentage = Number(item.percentage) || 0;
      const sliceAngle = (percentage / 100) * 2 * Math.PI;

      if (percentage > 0) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
          centerX,
          centerY,
          radius,
          currentAngle,
          currentAngle + sliceAngle
        );
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (percentage >= 3) {
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelRadius = radius * 0.75;
          const labelX = centerX + Math.cos(labelAngle) * labelRadius;
          const labelY = centerY + Math.sin(labelAngle) * labelRadius;

          ctx.fillStyle = "#fff";
          ctx.font = "bold 11px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 0.5;
          const text = `${percentage.toFixed(2)}%`;
          ctx.strokeText(text, labelX, labelY);
          ctx.fillText(text, labelX, labelY);
        }

        currentAngle += sliceAngle;
      }
    });

    ctx.fillStyle = "#333";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const legendX = 450;
    let legendY = 80;
    const legendItemHeight = 25;

    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Chú thích:", legendX, 50);

    data.forEach((item, index) => {
      const percentage = Number(item.percentage) || 0;

      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(legendX, legendY - 8, 16, 16);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX, legendY - 8, 16, 16);

      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const displayText = `${item.name}: ${percentage.toFixed(2)}%`;
      ctx.fillText(displayText, legendX + 22, legendY);

      legendY += legendItemHeight;
    });

    return canvas;
  };

  const exportToPDF = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        console.log("Exporting to PDF...");

        if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
          throw new Error("Danh sách tiêu chí không hợp lệ.");
        }
        if (!criteriaWeights || typeof criteriaWeights !== "object") {
          throw new Error("Trọng số tiêu chí không hợp lệ.");
        }
        if (!selectedCustomerIds || !selectedExpertId) {
          throw new Error("Thiếu thông tin khách hàng hoặc chuyên gia.");
        }

        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        try {
          doc.addFileToVFS("NotoSans-Regular.ttf", notoSansBase64);
          doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
          doc.addFont("NotoSans-Regular.ttf", "NotoSans", "bold");
          doc.setFont("NotoSans");
        } catch (fontError) {
          console.warn(
            "Failed to load NotoSans font, using Helvetica:",
            fontError
          );
          doc.setFont("Helvetica");
        }

        // Title
        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.text("BÁO CÁO KẾT QUẢ PHÂN TÍCH AHP", 105, yPosition, {
          align: "center",
        });
        yPosition += 15;

        doc.setFontSize(12);
        doc.setFont(undefined, "normal");
        doc.text(
          `Ngày tạo: ${new Date().toLocaleDateString("vi-VN")}`,
          20,
          yPosition
        );
        yPosition += 10;
        doc.text(`Chuyên gia ID: ${selectedExpertId}`, 20, yPosition);
        yPosition += 15;

        // 1. Criteria Comparison Matrix
        let matrixData = [];
        try {
          const response = await fetch(
            `http://localhost:5000/get-criteria-matrix?customer_id=${selectedCustomerIds[0]}&expert_id=${selectedExpertId}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }
          matrixData = data.matrix || [];
          const criteriaNames = criteria.map((c) => c.name);

          doc.setFontSize(14);
          doc.setFont(undefined, "bold");
          doc.text("1. MA TRẬN SO SÁNH CẶP TIÊU CHÍ", 20, yPosition);
          yPosition += 10;

          const matrixTableData = criteriaNames.map((_, i) => {
            const row = [criteriaNames[i]];
            criteriaNames.forEach((_, j) => {
              const value =
                matrixData.find(
                  (item) =>
                    item.criterion1_id === i + 1 && item.criterion2_id === j + 1
                )?.value || 1;
              row.push(Number(value.toFixed(4)));
            });
            return row;
          });

          const matrixHeaders = ["Tiêu chí", ...criteriaNames];

          doc.autoTable({
            head: [matrixHeaders],
            body: matrixTableData,
            startY: yPosition,
            styles: {
              fontSize: 8,
              cellPadding: 2,
              overflow: "linebreak",
              font: doc.getFont().fontName,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: "bold",
            },
            columnStyles: {
              0: { cellWidth: 30 },
            },
          });

          yPosition = doc.lastAutoTable.finalY + 15;
        } catch (err) {
          console.error("Error fetching criteria matrix:", err);
          doc.setFontSize(10);
          doc.text("Không thể tải ma trận tiêu chí.", 20, yPosition);
          yPosition += 10;
        }

        // 2. Criteria Weights
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("2. TRỌNG SỐ TIÊU CHÍ", 20, yPosition);
        yPosition += 10;

        const criteriaWeightsData = criteria.map((criterion, index) => {
          const criteriaKey = `C${index + 1}`;
          const weight = criteriaWeights[criteriaKey] || 0;
          const formattedWeight =
            weight > 0 ? Number(weight.toFixed(4)) : "0.0000";
          return [criterion.name, formattedWeight];
        });

        doc.autoTable({
          head: [["Tên tiêu chí", "Trọng số"]],
          body: criteriaWeightsData,
          startY: yPosition,
          styles: {
            fontSize: 10,
            cellPadding: 3,
            font: doc.getFont().fontName,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        // 3. Tính tỷ số nhất quán cho tiêu chí (Consistency Ratio)
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("3. CHỈ SỐ/TỶ SỐ CỦA TIÊU CHÍ", 20, yPosition);
        yPosition += 10;

        const consistencyMetricsData = [
          ["λ_max", criteriaResults?.lambda_max?.toFixed(4) || "N/A"],
          ["CI (Consistency Index)", criteriaResults?.CI?.toFixed(4) || "N/A"],
          ["CR (Consistency Ratio)", criteriaResults?.CR?.toFixed(4) || "N/A"],
        ];

        doc.autoTable({
          head: [["Chỉ số/Tỷ số", "Giá trị"]],
          body: consistencyMetricsData,
          startY: yPosition,
          styles: {
            fontSize: 10,
            cellPadding: 3,
            font: doc.getFont().fontName,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        // 4. Biểu đồ tròn (Pie Chart) - FIXED VERSION
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("4. BIỂU ĐỒ TRÒN PHÂN BỐ TRỌNG SỐ TIÊU CHÍ", 20, yPosition);
        yPosition += 5;

        try {
          // Calculate total weight first
          const totalWeight = Object.values(criteriaWeights).reduce(
            (sum, weight) => sum + (Number(weight) || 0),
            0
          );

          if (totalWeight === 0) {
            throw new Error(
              "Tổng trọng số tiêu chí bằng 0, không thể vẽ biểu đồ."
            );
          }

          // Create pie chart data with proper percentage calculation
          const pieChartData = criteria
            .map((criterion, index) => {
              const criteriaKey = `C${index + 1}`;
              const weight = Number(criteriaWeights[criteriaKey]) || 0;
              const percentage = (weight / totalWeight) * 100;

              console.log(
                `Criterion ${criterion.name}: weight=${weight}, total=${totalWeight}, percentage=${percentage}%`
              );

              return {
                name: criterion.name,
                percentage: isNaN(percentage)
                  ? 0
                  : Number(percentage.toFixed(2)),
              };
            })
            .filter((item) => item.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage);

          if (pieChartData.length === 0) {
            throw new Error("Không có dữ liệu hợp lệ để vẽ biểu đồ tròn.");
          }

          console.log("Pie chart data:", pieChartData);

          // Create pie chart using the fixed function
          const canvas = createPieChart(pieChartData);
          const imgData = canvas.toDataURL("image/png", 1.0);
          const imgWidth = 160; // Increased width to show legend properly
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          doc.addImage(imgData, "PNG", 25, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (err) {
          console.error("Error rendering pie chart:", err);
          doc.setFontSize(10);
          doc.setFont(undefined, "normal");
          doc.text(
            `Không thể xuất biểu đồ tròn: ${err.message}`,
            20,
            yPosition
          );
          yPosition += 10;
        }

        // 5. Alternative Comparison Matrices with Consistency Metrics
        for (const criterion of criteria) {
          try {
            if (yPosition > 200) {
              doc.addPage();
              yPosition = 20;
            }

            const response = await fetch(
              `http://localhost:5000/get-alternative-comparisons?customer_id=${selectedCustomerIds[0]}&expert_id=${selectedExpertId}&criterion_id=${criterion.id}`
            );
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log(
              "API Response for criterion",
              criterion.name,
              ":",
              data
            ); // Debug log
            if (data.error) {
              throw new Error(data.error);
            }
            const comparisons = data.comparisons || [];
            const altNames = selectedCustomers.map((c) => c.name);

            // Get consistency metrics from API response or alternativeConsistencyMetrics prop
            let { CR, CI, lambda_max } = data;

            // If not in API response, try to get from alternativeConsistencyMetrics prop
            if (
              alternativeConsistencyMetrics &&
              alternativeConsistencyMetrics[criterion.id]
            ) {
              const metrics = alternativeConsistencyMetrics[criterion.id];
              CR = CR || metrics.CR;
              CI = CI || metrics.CI;
              lambda_max = lambda_max || metrics.lambda_max;
            }

            // Default to "N/A" if still undefined
            CR = CR !== undefined ? CR : "N/A";
            CI = CI !== undefined ? CI : "N/A";
            lambda_max = lambda_max !== undefined ? lambda_max : "N/A";

            console.log(
              "Final metrics - CR:",
              CR,
              "CI:",
              CI,
              "lambda_max:",
              lambda_max
            ); // Debug log

            doc.setFontSize(12);
            doc.setFont(undefined, "bold");
            doc.text(
              `5.${
                criteria.indexOf(criterion) + 1
              }. MA TRẬN SO SÁNH THEO TIÊU CHÍ: ${criterion.name}`,
              20,
              yPosition
            );
            yPosition += 10;

            const altMatrixData = altNames.map((_, i) => {
              const row = [altNames[i]];
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
                row.push(Number(value.toFixed(4)));
              });
              return row;
            });

            const altHeaders = ["Phương án", ...altNames];

            doc.autoTable({
              head: [altHeaders],
              body: altMatrixData,
              startY: yPosition,
              styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: "linebreak",
                font: doc.getFont().fontName,
              },
              headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 25 },
              },
            });

            yPosition = doc.lastAutoTable.finalY + 15;

            // Add consistency metrics table for this criterion
            doc.setFontSize(12);
            doc.setFont(undefined, "bold");
            doc.text(
              ` CÁC CHỈ SỐ/TỶ SỐ CỦA PHƯƠNG ÁN THEO TIÊU CHÍ: ${criterion.name}`,
              20,
              yPosition
            );
            yPosition += 10;

            const consistencyData = [
              [
                "λ_max",
                typeof lambda_max === "number"
                  ? lambda_max.toFixed(4)
                  : lambda_max,
              ],
              [
                "CI (Consistency Index)",
                typeof CI === "number" ? CI.toFixed(4) : CI,
              ],
              [
                "CR (Consistency Ratio)",
                typeof CR === "number" ? CR.toFixed(4) : CR,
              ],
            ];

            doc.autoTable({
              head: [["Chỉ số", "Giá trị"]],
              body: consistencyData,
              startY: yPosition,
              styles: {
                fontSize: 10,
                cellPadding: 3,
                font: doc.getFont().fontName,
              },
              headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255,
                fontStyle: "bold",
              },
            });

            yPosition = doc.lastAutoTable.finalY + 15;

            // Add consistency status message
            if (typeof CR === "number") {
              doc.setFontSize(10);
              doc.setFont(undefined, "normal");
              const crStatus = CR <= 0.1 ? "NHẤT QUÁN" : "KHÔNG NHẤT QUÁN";
              const crColor = CR <= 0.1 ? [0, 128, 0] : [255, 0, 0]; // Green or Red
              doc.setTextColor(...crColor);
              doc.text(
                `Trạng thái: ${crStatus} (CR = ${CR.toFixed(4)} ${
                  CR <= 0.1 ? "≤" : ">"
                } 0.1)`,
                20,
                yPosition
              );
              doc.setTextColor(0, 0, 0); // Reset to black
              yPosition += 10;
            }
          } catch (err) {
            console.error(
              `Error fetching alternative matrix for criterion ${criterion.name}:`,
              err
            );
            doc.setFontSize(10);
            doc.text(
              `Không thể tải ma trận cho ${criterion.name}: ${err.message}`,
              20,
              yPosition
            );
            yPosition += 10;
          }
        }

        // 6. Alternative Scores
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("6. ĐIỂM SỐ PHƯƠNG ÁN THEO TỪNG TIÊU CHÍ", 20, yPosition);
        yPosition += 10;

        const alternativeScoresData = selectedCustomers.map((customer) => {
          const row = [customer.name];
          criteria.forEach((criterion) => {
            const score = alternativeScores[criterion.id]?.[customer.id] || 0;
            row.push(score > 0 ? Number(score.toFixed(4)) : "0.0000");
          });
          return row;
        });

        const altScoreHeaders = [
          "Tên khách hàng",
          ...criteria.map((c) => c.name),
        ];

        doc.autoTable({
          head: [altScoreHeaders],
          body: alternativeScoresData,
          startY: yPosition,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
            font: doc.getFont().fontName,
          },
          headStyles: {
            fillColor: [46, 204, 113],
            textColor: 255,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 30 },
          },
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        // 7. Summary of All Alternative Consistency Metrics
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("7. TỔNG HỢP CÁC CHỈ SỐ/TỶ SỐ CÁC PHƯƠNG ÁN", 20, yPosition);
        yPosition += 10;

        const summaryConsistencyData = criteria.map((criterion) => {
          const metrics = alternativeConsistencyMetrics?.[criterion.id] || {};
          return [
            criterion.name,
            typeof metrics.lambda_max === "number"
              ? metrics.lambda_max.toFixed(4)
              : "N/A",
            typeof metrics.CI === "number" ? metrics.CI.toFixed(4) : "N/A",
            typeof metrics.CR === "number" ? metrics.CR.toFixed(4) : "N/A",
            typeof metrics.CR === "number"
              ? metrics.CR <= 0.1
                ? "Nhất quán"
                : "Không nhất quán"
              : "N/A",
          ];
        });

        doc.autoTable({
          head: [["Tiêu chí", "λ_max", "CI", "CR", "Trạng thái"]],
          body: summaryConsistencyData,
          startY: yPosition,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            font: doc.getFont().fontName,
          },
          headStyles: {
            fillColor: [155, 89, 182],
            textColor: 255,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25, halign: "center" },
            2: { cellWidth: 25, halign: "center" },
            3: { cellWidth: 25, halign: "center" },
            4: { cellWidth: 35, halign: "center" },
          },
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        // Trong hàm exportToPDF, sau phần 8 (Final Scores), thêm phần 9 như sau:

        // ... (giữ nguyên mã trước phần 8)

        // 8. Final Scores
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("8. KẾT QUẢ CUỐI CÙNG", 20, yPosition);
        yPosition += 10;

        const finalScoresData = finalScores.map((score, index) => [
          index + 1,
          score.alternative_name,
          score.final_score > 0
            ? Number(score.final_score.toFixed(4))
            : "0.0000",
        ]);

        doc.autoTable({
          head: [["Xếp hạng", "Tên phương án", "Điểm tổng hợp"]],
          body: finalScoresData,
          startY: yPosition,
          styles: {
            fontSize: 11,
            cellPadding: 4,
            font: doc.getFont().fontName,
          },
          headStyles: {
            fillColor: [231, 76, 60],
            textColor: 255,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { halign: "center", cellWidth: 25 },
            1: { cellWidth: 80 },
            2: { halign: "center", cellWidth: 35 },
          },
        });

        yPosition = doc.lastAutoTable.finalY + 15;

        // 9. Biểu đồ tròn phân bố điểm số cuối cùng
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("9. BIỂU ĐỒ TRÒN PHÂN BỐ ĐIỂM SỐ CUỐI CÙNG", 20, yPosition);
        yPosition += 5;

        try {
          // Tính tổng điểm số cuối cùng
          const totalFinalScore = finalScores.reduce(
            (sum, score) => sum + (Number(score.final_score) || 0),
            0
          );

          if (totalFinalScore === 0) {
            throw new Error(
              "Tổng điểm số cuối cùng bằng 0, không thể vẽ biểu đồ."
            );
          }

          // Tạo dữ liệu cho biểu đồ tròn
          const finalScoresPieChartData = finalScores
            .map((score) => {
              const percentage = (score.final_score / totalFinalScore) * 100;
              return {
                name: score.alternative_name,
                percentage: isNaN(percentage)
                  ? 0
                  : Number(percentage.toFixed(2)),
              };
            })
            .filter((item) => item.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage);

          if (finalScoresPieChartData.length === 0) {
            throw new Error("Không có dữ liệu hợp lệ để vẽ biểu đồ tròn.");
          }

          console.log("Final scores pie chart data:", finalScoresPieChartData);

          // Sửa tiêu đề của biểu đồ trong hàm createPieChart
          const createFinalScoresPieChart = (data) => {
            const canvas = createPieChart(data); // Gọi hàm gốc
            const ctx = canvas.getContext("2d");
            // Ghi đè tiêu đề
            ctx.fillStyle = "#333";
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            // ctx.fillText("Biểu đồ phân bố điểm số cuối cùng", 200, 20); // Cập nhật tiêu đề
            return canvas;
          };

          // Tạo biểu đồ tròn
          const canvas = createFinalScoresPieChart(finalScoresPieChartData);
          const imgData = canvas.toDataURL("image/png", 1.0);
          const imgWidth = 160;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          doc.addImage(imgData, "PNG", 25, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (err) {
          console.error("Lỗi khi vẽ biểu đồ tròn điểm số cuối cùng:", err);
          doc.setFontSize(10);
          doc.setFont(undefined, "normal");
          doc.text(
            `Không thể xuất biểu đồ tròn điểm số cuối cùng: ${err.message}`,
            20,
            yPosition
          );
          yPosition += 10;
        }

        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont(undefined, "normal");
          doc.text(`Trang ${i} / ${pageCount}`, 105, 290, { align: "center" });
        }

        // Save the PDF
        doc.save("AHP_Results.pdf");
        console.log("PDF file exported successfully");
        setExportError(null);
      } catch (err) {
        console.error("Error exporting to PDF:", err);
        setExportError(`Không thể xuất file PDF: ${err.message}`);
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
      alternativeConsistencyMetrics, // Add this to dependency array
    ]
  );

  return (
    <div>
      <button
        onClick={exportToPDF}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        type="button"
        disabled={disabled}
      >
        Xuất ra PDF
      </button>
      {exportError && (
        <div className="text-red-600 py-2 mt-2">{exportError}</div>
      )}
    </div>
  );
};

export default ExportPDF;
