import { useState } from "react";
import * as XLSX from "xlsx";

const ImportExcel = ({ onImport, disabled, criteria }) => {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        console.log("Danh sách sheet trong file:", workbook.SheetNames);

        // Đọc ma trận tiêu chí
        const criteriaSheetName = workbook.SheetNames.find((name) =>
          name.toLowerCase().includes("criteria comparison matrix")
        );
        if (!criteriaSheetName) {
          setError("Không tìm thấy sheet cho ma trận tiêu chí");
          return;
        }

        const criteriaSheet = workbook.Sheets[criteriaSheetName];
        const criteriaJsonData = XLSX.utils.sheet_to_json(criteriaSheet, {
          header: 1,
        });
        const criteriaMatrix = criteriaJsonData
          .slice(1)
          .map((row) => row.slice(1).map((val) => parseFloat(val) || 0));

        // Đọc ma trận phương án cho từng tiêu chí
        const alternativeMatrices = {};
        criteria.forEach((criterion) => {
          const sheetName = workbook.SheetNames.find((name) => {
            const cleanedName = name.replace(/['"]/g, "").toLowerCase();
            return cleanedName.includes(criterion.name.toLowerCase());
          });

          if (sheetName) {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const matrixData = jsonData
              .slice(1)
              .map((row) => row.slice(1).map((val) => parseFloat(val) || 0));
            alternativeMatrices[criterion.id] = matrixData;
          }
        });

        // Kiểm tra xem có ma trận phương án nào được đọc không
        if (Object.keys(alternativeMatrices).length === 0) {
          setError("Không tìm thấy sheet nào cho ma trận phương án");
          return;
        }

        // Gọi callback với dữ liệu đã đọc
        onImport({
          criteriaMatrix,
          alternativeMatrices,
        });
      } catch (err) {
        setError("Không thể đọc file Excel: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Lỗi khi đọc file Excel");
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Nhập tất cả ma trận từ file Excel
      </label>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        disabled={disabled}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />
      {fileName && (
        <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default ImportExcel;
