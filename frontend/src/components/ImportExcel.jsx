// // src/components/ImportExcel.jsx
// import { useState } from "react";
// import * as XLSX from "xlsx";

// const ImportExcel = ({ onImport, disabled, criteria, criteriaId }) => {
//   const [fileName, setFileName] = useState("");
//   const [error, setError] = useState(null);

//   const handleFileUpload = (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     setFileName(file.name);
//     setError(null);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const data = new Uint8Array(e.target.result);
//         const workbook = XLSX.read(data, { type: "array" });

//         // Nếu không có criteriaId (tức là import cho CriteriaMatrix)
//         if (!criteriaId) {
//           const sheetName = workbook.SheetNames.find((name) =>
//             // name.includes("Ma trận so sánh cặp theo tiêu chí")
//             name.includes("Criteria Comparison Matrix")
//           );
//           if (!sheetName) {
//             setError("Không tìm thấy sheet cho ma trận tiêu chí");
//             return;
//           }

//           const sheet = workbook.Sheets[sheetName];
//           const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//           const matrixData = jsonData.slice(1).map((row) => row.slice(1));
//           onImport(matrixData);
//         } else {
//           // Nếu có criteriaId (tức là import cho AlternativeMatrix)
//           const criteriaName = criteria.find((c) => c.id === criteriaId)?.name;
//           const sheetName = workbook.SheetNames.find((name) =>
//             name.includes(`${criteriaName}`)
//           );
//           if (!sheetName) {
//             setError(`Không tìm thấy sheet cho tiêu chí: ${criteriaName}`);
//             return;
//           }

//           const sheet = workbook.Sheets[sheetName];
//           const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//           const matrixData = jsonData.slice(1).map((row) => row.slice(1));
//           onImport(matrixData);
//         }
//       } catch (err) {
//         setError("Không thể đọc file Excel: " + err.message);
//       }
//     };
//     reader.onerror = () => {
//       setError("Lỗi khi đọc file Excel");
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   return (
//     <div className="mb-4">
//       <label className="block text-sm font-medium text-gray-700 mb-2">
//         Nhập ma trận từ file Excel
//       </label>
//       <input
//         type="file"
//         accept=".xlsx, .xls"
//         onChange={handleFileUpload}
//         disabled={disabled}
//         className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
//       />
//       {fileName && (
//         <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
//       )}
//       {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
//     </div>
//   );
// };

// export default ImportExcel;
import { useState } from "react";
import * as XLSX from "xlsx";

const ImportExcel = ({ onImport, disabled, criteria, criteriaId }) => {
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

        // In danh sách sheet để debug
        console.log("Danh sách sheet trong file:", workbook.SheetNames);

        // Nếu không có criteriaId (tức là import cho CriteriaMatrix)
        if (!criteriaId) {
          const sheetName = workbook.SheetNames.find((name) =>
            name.toLowerCase().includes("criteria comparison matrix")
          );
          if (!sheetName) {
            setError("Không tìm thấy sheet cho ma trận tiêu chí");
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const matrixData = jsonData
            .slice(1)
            .map((row) => row.slice(1).map((val) => parseFloat(val) || 0));
          onImport(matrixData);
        } else {
          // Nếu có criteriaId (tức là import cho AlternativeMatrix)
          const criteriaName = criteria.find((c) => c.id === criteriaId)?.name;
          if (!criteriaName) {
            setError("Không tìm thấy tiêu chí tương ứng với criteriaId");
            return;
          }
          const sheetName = workbook.SheetNames.find((name) => {
            // Loại bỏ dấu nháy kép và bỏ qua hoa/thường
            const cleanedName = name.replace(/['"]/g, "").toLowerCase();
            return cleanedName.includes(criteriaName.toLowerCase());
          });
          if (!sheetName) {
            setError(`Không tìm thấy sheet cho tiêu chí: ${criteriaName}`);
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const matrixData = jsonData
            .slice(1)
            .map((row) => row.slice(1).map((val) => parseFloat(val) || 0));
          onImport(matrixData);
        }
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
        Nhập ma trận từ file Excel
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
