// // import { useState, useEffect, useMemo } from "react";
// // import {
// //   calculateAlternativeScores,
// //   getAlternatives,
// //   updateAlternativesFromCustomers,
// // } from "../services/api";

// // const AlternativeMatrix = ({
// //   expertId,
// //   customerId,
// //   criteriaId,
// //   criteriaName,
// //   customers,
// //   onScoresCalculated,
// //   disabled: propDisabled,
// //   isPreviousMatrixValid,
// // }) => {
// //   const [matrix, setMatrix] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [calculating, setCalculating] = useState(false);
// //   const [error, setError] = useState(null);
// //   const [results, setResults] = useState(null);
// //   const [consistencyError, setConsistencyError] = useState(null);
// //   const [validAlternatives, setValidAlternatives] = useState([]);
// //   const [isCurrentMatrixValid, setIsCurrentMatrixValid] = useState(true);

// //   const dropdownOptions = [
// //     1,
// //     2,
// //     3,
// //     4,
// //     5,
// //     6,
// //     7,
// //     8,
// //     9,
// //     1 / 2,
// //     1 / 3,
// //     1 / 4,
// //     1 / 5,
// //     1 / 6,
// //     1 / 7,
// //     1 / 8,
// //     1 / 9,
// //   ];

// //   const formatValue = (value) => {
// //     if (!value) return "";
// //     const fractionMap = {
// //       1: "1",
// //       0.5: "1/2",
// //       0.3333333333333333: "1/3",
// //       0.25: "1/4",
// //       0.2: "1/5",
// //       0.16666666666666666: "1/6",
// //       0.14285714285714285: "1/7",
// //       0.125: "1/8",
// //       0.1111111111111111: "1/9",
// //     };
// //     return fractionMap[value] || value.toString();
// //   };

// //   const customersKey = useMemo(
// //     () => customers.map((c) => c.id).join(","),
// //     [customers]
// //   );

// //   useEffect(() => {
// //     const syncAlternativesAndInitMatrix = async () => {
// //       try {
// //         setLoading(true);
// //         const alternatives = await getAlternatives();
// //         setValidAlternatives(alternatives);

// //         if (customers && customers.length > 0) {
// //           const customerIds = customers.map((c) => c.id);
// //           const missingIds = customerIds.filter(
// //             (id) => !alternatives.some((alt) => alt.id === id)
// //           );
// //           if (missingIds.length > 0) {
// //             await updateAlternativesFromCustomers(customerIds);
// //             const updatedAlternatives = await getAlternatives();
// //             setValidAlternatives(updatedAlternatives);
// //           }
// //         }

// //         const size = customers.length;
// //         setMatrix(
// //           Array(size)
// //             .fill()
// //             .map((_, i) =>
// //               Array(size)
// //                 .fill()
// //                 .map((_, j) => (i === j ? 1 : null))
// //             )
// //         );
// //         setResults(null);
// //         setConsistencyError(null);
// //         setError(null);
// //         setIsCurrentMatrixValid(true);
// //         setLoading(false);
// //       } catch (err) {
// //         setError(`Không thể tải danh sách phương án: ${err.message}`);
// //         setLoading(false);
// //       }
// //     };
// //     syncAlternativesAndInitMatrix();
// //   }, [customersKey]);

// //   // Kiểm tra bất kỳ khi nào trạng thái isPreviousMatrixValid thay đổi
// //   useEffect(() => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //     } else {
// //       // Xóa thông báo lỗi nếu ma trận trước hợp lệ
// //       if (
// //         error ===
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       ) {
// //         setError(null);
// //       }
// //     }
// //   }, [isPreviousMatrixValid]);

// //   const handleMatrixChange = (rowIndex, colIndex, value) => {
// //     if (!isPreviousMatrixValid) {
// //       // Hiển thị thông báo lỗi khi cố gắng thay đổi ma trận
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //       return;
// //     }

// //     const parsedValue = parseFloat(value);
// //     if (
// //       value === "" ||
// //       isNaN(parsedValue) ||
// //       parsedValue <= 0 ||
// //       parsedValue > 9
// //     ) {
// //       return;
// //     }

// //     const newMatrix = [...matrix.map((row) => [...row])];
// //     newMatrix[rowIndex][colIndex] = parsedValue;
// //     if (rowIndex !== colIndex) {
// //       newMatrix[colIndex][rowIndex] = 1 / parsedValue;
// //     }
// //     setMatrix(newMatrix);
// //     setConsistencyError(null);

// //     // Xóa thông báo lỗi khi người dùng bắt đầu sửa ma trận
// //     if (
// //       error ===
// //       "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //     ) {
// //       setError(null);
// //     }
// //   };

// //   const handleCalculate = async () => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //       return;
// //     }

// //     if (!customerId || !expertId || !criteriaId) {
// //       setError("Vui lòng chọn đầy đủ khách hàng, chuyên gia và tiêu chí");
// //       return;
// //     }

// //     const size = customers.length;
// //     let isComplete = true;

// //     for (let i = 0; i < size; i++) {
// //       for (let j = 0; j < size; j++) {
// //         if (
// //           i !== j &&
// //           (matrix[i][j] === null || isNaN(matrix[i][j]) || matrix[i][j] <= 0)
// //         ) {
// //           isComplete = false;
// //           break;
// //         }
// //       }
// //       if (!isComplete) break;
// //     }

// //     if (!isComplete) {
// //       setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
// //       return;
// //     }

// //     try {
// //       setCalculating(true);
// //       setError(null);
// //       setConsistencyError(null);

// //       const validCustomers = customers.filter((c) =>
// //         validAlternatives.some((alt) => alt.id === c.id)
// //       );
// //       if (validCustomers.length !== customers.length) {
// //         setError(
// //           "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng chọn lại khách hàng."
// //         );
// //         setCalculating(false);
// //         return;
// //       }

// //       const comparisons = [];
// //       for (let i = 0; i < size; i++) {
// //         for (let j = i + 1; j < size; j++) {
// //           if (matrix[i][j] !== 1) {
// //             comparisons.push({
// //               alt1_id: customers[i].id,
// //               alt2_id: customers[j].id,
// //               value: matrix[i][j],
// //             });
// //           }
// //         }
// //       }

// //       const payload = {
// //         expert_id: expertId,
// //         customer_id: customerId,
// //         criteria_id: criteriaId,
// //         comparisons,
// //       };

// //       const result = await calculateAlternativeScores(payload);
// //       setResults(result);

// //       // Cập nhật trạng thái hợp lệ của ma trận hiện tại
// //       const isValid = result.CR <= 0.1;
// //       setIsCurrentMatrixValid(isValid);

// //       if (!isValid) {
// //         setConsistencyError(
// //           `Tỷ số nhất quán (CR = ${(result.CR * 100).toFixed(
// //             2
// //           )}%) vượt quá 10%. Vui lòng điều chỉnh lại ma trận so sánh.`
// //         );
// //         // Thông báo lên parent component rằng ma trận này không hợp lệ
// //         onScoresCalculated(criteriaId, { ...result, isValid: false });
// //       } else {
// //         setConsistencyError(null);
// //         onScoresCalculated(criteriaId, { ...result, isValid: true });
// //       }
// //       setCalculating(false);
// //     } catch (err) {
// //       let errorMessage = "Lỗi không xác định";
// //       if (err.response && err.response.data) {
// //         errorMessage =
// //           err.response.data.error ||
// //           err.response.data.message ||
// //           "Lỗi từ server";
// //         if (errorMessage.includes("không tồn tại trong bảng alternatives")) {
// //           errorMessage += " Vui lòng cập nhật danh sách phương án.";
// //         }
// //       } else if (err.message) {
// //         errorMessage = err.message;
// //       }
// //       setError(`Lỗi khi tính toán điểm số: ${errorMessage}`);
// //       setCalculating(false);
// //     }
// //   };

// //   if (loading) {
// //     return (
// //       <div className="flex justify-center items-center py-10">Đang tải...</div>
// //     );
// //   }

// //   const isMatrixDisabled = propDisabled || !isPreviousMatrixValid;

// //   return (
// //     <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
// //       <h3 className="text-lg font-medium mb-4">
// //         Ma trận so sánh cặp khách hàng theo tiêu chí: {criteriaName}
// //       </h3>
// //       {/*
// //       {!isPreviousMatrixValid && (
// //         <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
// //           <p className="text-yellow-700 font-medium">
// //             Bạn cần điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10%
// //             trước khi tiếp tục đánh giá ma trận này.
// //           </p>
// //         </div>
// //       )} */}

// //       <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
// //         <p className="text-blue-700">
// //           So sánh tầm quan trọng tương đối của các khách hàng theo tiêu chí{" "}
// //           {criteriaName}. Giá trị từ 1 đến 9 thể hiện mức độ quan trọng hơn, giá
// //           trị từ 1/9 đến 1 thể hiện mức độ quan trọng kém hơn.
// //         </p>
// //       </div>

// //       {error && (
// //         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
// //           <p className="text-red-700">{error}</p>
// //         </div>
// //       )}

// //       {consistencyError && (
// //         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
// //           <p className="text-red-700">{consistencyError}</p>
// //         </div>
// //       )}

// //       <div className="overflow-x-auto">
// //         <table
// //           className={`min-w-full bg-white border border-gray-300 ${
// //             isMatrixDisabled ? "opacity-70" : ""
// //           }`}
// //         >
// //           <thead>
// //             <tr>
// //               <th className="py-2 px-4 border-b border-r"></th>
// //               {customers.map((customer) => (
// //                 <th
// //                   key={customer.id}
// //                   className="py-2 px-4 border-b border-r border-gray-300"
// //                 >
// //                   {customer.name}
// //                 </th>
// //               ))}
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {customers.map((rowCustomer, rowIndex) => (
// //               <tr key={rowCustomer.id}>
// //                 <td className="py-2 px-4 border-b border-r font-medium">
// //                   {rowCustomer.name}
// //                 </td>
// //                 {customers.map((colCustomer, colIndex) => (
// //                   <td
// //                     key={colCustomer.id}
// //                     className="py-2 px-4 border-b border-r border-gray-300"
// //                   >
// //                     {rowIndex === colIndex ? (
// //                       <span className="text-center block">1</span>
// //                     ) : rowIndex < colIndex ? (
// //                       <select
// //                         value={matrix[rowIndex][colIndex] ?? ""}
// //                         onChange={(e) =>
// //                           handleMatrixChange(rowIndex, colIndex, e.target.value)
// //                         }
// //                         disabled={isMatrixDisabled}
// //                         className={`w-full px-2 py-1 border rounded ${
// //                           matrix[rowIndex][colIndex] === null
// //                             ? "border-red-300 bg-red-50"
// //                             : "border-gray-300"
// //                         } ${
// //                           isMatrixDisabled
// //                             ? "bg-gray-100 cursor-not-allowed"
// //                             : ""
// //                         }`}
// //                       >
// //                         <option value="">Chọn giá trị</option>
// //                         {dropdownOptions.map((option) => (
// //                           <option key={option} value={option}>
// //                             {formatValue(option)}
// //                           </option>
// //                         ))}
// //                       </select>
// //                     ) : (
// //                       <span className="text-center block text-gray-500">
// //                         {matrix[colIndex][rowIndex] !== null &&
// //                         !isNaN(matrix[colIndex][rowIndex])
// //                           ? formatValue(1 / matrix[colIndex][rowIndex])
// //                           : "0"}
// //                       </span>
// //                     )}
// //                   </td>
// //                 ))}
// //               </tr>
// //             ))}
// //           </tbody>
// //         </table>
// //       </div>

// //       <div className="mt-4 flex justify-end space-x-4">
// //         <button
// //           onClick={() => {
// //             if (isPreviousMatrixValid) {
// //               const size = customers.length;
// //               setMatrix(
// //                 Array(size)
// //                   .fill()
// //                   .map((_, i) =>
// //                     Array(size)
// //                       .fill()
// //                       .map((_, j) => (i === j ? 1 : null))
// //                   )
// //               );
// //               setResults(null);
// //               setConsistencyError(null);
// //               setError(null);
// //             }
// //           }}
// //           disabled={calculating || isMatrixDisabled}
// //           className={`bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md ${
// //             calculating || isMatrixDisabled
// //               ? "bg-gray-400 cursor-not-allowed"
// //               : ""
// //           }`}
// //         >
// //           Reset Ma trận
// //         </button>
// //         <button
// //           onClick={handleCalculate}
// //           disabled={calculating || isMatrixDisabled}
// //           className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md ${
// //             calculating || isMatrixDisabled
// //               ? "bg-gray-400 cursor-not-allowed"
// //               : ""
// //           }`}
// //         >
// //           {calculating ? "Đang tính..." : "Tính điểm số"}
// //         </button>
// //       </div>

// //       {results && (
// //         <div className="mt-6 p-4 bg-gray-50 rounded-md">
// //           <h4 className="text-md font-medium mb-2">Kết quả điểm số:</h4>
// //           <ul className="space-y-1">
// //             {customers.map((customer) => (
// //               <li key={customer.id} className="flex justify-between">
// //                 <span>{customer.name}:</span>
// //                 <span className="font-medium">
// //                   {(results.scores[customer.id] || 0).toFixed(4)}
// //                 </span>
// //               </li>
// //             ))}
// //           </ul>
// //           <div className="mt-3 pt-3 border-t border-gray-200">
// //             <div className="flex justify-between">
// //               <span>Tỷ số nhất quán (CR):</span>
// //               <span
// //                 className={`font-medium ${
// //                   results.CR > 0.1 ? "text-red-600" : "text-green-600"
// //                 }`}
// //               >
// //                 {(results.CR * 100).toFixed(2)}%
// //                 {results.CR > 0.1 && (
// //                   <span className="ml-2 text-sm font-normal text-red-600">
// //                     (Cần điều chỉnh lại ma trận)
// //                   </span>
// //                 )}
// //               </span>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default AlternativeMatrix;
// // import { useState, useEffect, useMemo } from "react";
// // import * as XLSX from "xlsx";
// // import {
// //   calculateAlternativeScores,
// //   getAlternatives,
// //   updateAlternativesFromCustomers,
// // } from "../services/api";

// // const AlternativeMatrix = ({
// //   expertId,
// //   customerId,
// //   criteriaId,
// //   criteriaName,
// //   customers,
// //   onScoresCalculated,
// //   disabled: propDisabled,
// //   isPreviousMatrixValid,
// // }) => {
// //   const [matrix, setMatrix] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [calculating, setCalculating] = useState(false);
// //   const [error, setError] = useState(null);
// //   const [results, setResults] = useState(null);
// //   const [consistencyError, setConsistencyError] = useState(null);
// //   const [validAlternatives, setValidAlternatives] = useState([]);
// //   const [isCurrentMatrixValid, setIsCurrentMatrixValid] = useState(true);
// //   const [fileName, setFileName] = useState("");

// //   const dropdownOptions = [
// //     1,
// //     2,
// //     3,
// //     4,
// //     5,
// //     6,
// //     7,
// //     8,
// //     9,
// //     1 / 2,
// //     1 / 3,
// //     1 / 4,
// //     1 / 5,
// //     1 / 6,
// //     1 / 7,
// //     1 / 8,
// //     1 / 9,
// //   ];

// //   const formatValue = (value) => {
// //     if (!value) return "";
// //     const fractionMap = {
// //       1: "1",
// //       0.5: "1/2",
// //       0.3333333333333333: "1/3",
// //       0.25: "1/4",
// //       0.2: "1/5",
// //       0.16666666666666666: "1/6",
// //       0.14285714285714285: "1/7",
// //       0.125: "1/8",
// //       0.1111111111111111: "1/9",
// //     };
// //     return fractionMap[value] || value.toString();
// //   };

// //   const customersKey = useMemo(
// //     () => customers.map((c) => c.id).join(","),
// //     [customers]
// //   );

// //   useEffect(() => {
// //     const syncAlternativesAndInitMatrix = async () => {
// //       try {
// //         setLoading(true);
// //         const alternatives = await getAlternatives();
// //         setValidAlternatives(alternatives);

// //         if (customers && customers.length > 0) {
// //           const customerIds = customers.map((c) => c.id);
// //           const missingIds = customerIds.filter(
// //             (id) => !alternatives.some((alt) => alt.id === id)
// //           );
// //           if (missingIds.length > 0) {
// //             await updateAlternativesFromCustomers(customerIds);
// //             const updatedAlternatives = await getAlternatives();
// //             setValidAlternatives(updatedAlternatives);
// //           }
// //         }

// //         const size = customers.length;
// //         setMatrix(
// //           Array(size)
// //             .fill()
// //             .map((_, i) =>
// //               Array(size)
// //                 .fill()
// //                 .map((_, j) => (i === j ? 1 : null))
// //             )
// //         );
// //         setResults(null);
// //         setConsistencyError(null);
// //         setError(null);
// //         setIsCurrentMatrixValid(true);
// //         setLoading(false);
// //       } catch (err) {
// //         setError(`Không thể tải danh sách phương án: ${err.message}`);
// //         setLoading(false);
// //       }
// //     };
// //     syncAlternativesAndInitMatrix();
// //   }, [customersKey]);

// //   useEffect(() => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //     } else {
// //       if (
// //         error ===
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       ) {
// //         setError(null);
// //       }
// //     }
// //   }, [isPreviousMatrixValid]);

// //   const handleMatrixChange = (rowIndex, colIndex, value) => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //       return;
// //     }

// //     const parsedValue = parseFloat(value);
// //     if (
// //       value === "" ||
// //       isNaN(parsedValue) ||
// //       parsedValue <= 0 ||
// //       parsedValue > 9
// //     ) {
// //       return;
// //     }

// //     const newMatrix = [...matrix.map((row) => [...row])];
// //     newMatrix[rowIndex][colIndex] = parsedValue;
// //     if (rowIndex !== colIndex) {
// //       newMatrix[colIndex][rowIndex] = 1 / parsedValue;
// //     }
// //     setMatrix(newMatrix);
// //     setConsistencyError(null);

// //     if (
// //       error ===
// //       "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //     ) {
// //       setError(null);
// //     }
// //   };

// //   const handleCalculate = async () => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
// //       );
// //       return;
// //     }

// //     if (!customerId || !expertId || !criteriaId) {
// //       setError("Vui lòng chọn đầy đủ khách hàng, chuyên gia và tiêu chí");
// //       return;
// //     }

// //     const size = customers.length;
// //     let isComplete = true;

// //     for (let i = 0; i < size; i++) {
// //       for (let j = 0; j < size; j++) {
// //         if (
// //           i !== j &&
// //           (matrix[i][j] === null || isNaN(matrix[i][j]) || matrix[i][j] <= 0)
// //         ) {
// //           isComplete = false;
// //           break;
// //         }
// //       }
// //       if (!isComplete) break;
// //     }

// //     if (!isComplete) {
// //       setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
// //       return;
// //     }

// //     try {
// //       setCalculating(true);
// //       setError(null);
// //       setConsistencyError(null);

// //       const validCustomers = customers.filter((c) =>
// //         validAlternatives.some((alt) => alt.id === c.id)
// //       );
// //       if (validCustomers.length !== customers.length) {
// //         setError(
// //           "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng chọn lại khách hàng."
// //         );
// //         setCalculating(false);
// //         return;
// //       }

// //       const comparisons = [];
// //       for (let i = 0; i < size; i++) {
// //         for (let j = i + 1; j < size; j++) {
// //           if (matrix[i][j] !== 1) {
// //             comparisons.push({
// //               alt1_id: customers[i].id,
// //               alt2_id: customers[j].id,
// //               value: matrix[i][j],
// //             });
// //           }
// //         }
// //       }

// //       const payload = {
// //         expert_id: expertId,
// //         customer_id: customerId,
// //         criteria_id: criteriaId,
// //         comparisons,
// //       };

// //       const result = await calculateAlternativeScores(payload);
// //       setResults(result);

// //       const isValid = result.CR <= 0.1;
// //       setIsCurrentMatrixValid(isValid);

// //       if (!isValid) {
// //         setConsistencyError(
// //           `Tỷ số nhất quán (CR = ${(result.CR * 100).toFixed(
// //             2
// //           )}%) vượt quá 10%. Vui lòng điều chỉnh lại ma trận so sánh.`
// //         );
// //         onScoresCalculated(criteriaId, { ...result, isValid: false });
// //       } else {
// //         setConsistencyError(null);
// //         onScoresCalculated(criteriaId, { ...result, isValid: true });
// //       }
// //       setCalculating(false);
// //     } catch (err) {
// //       let errorMessage = "Lỗi không xác định";
// //       if (err.response && err.response.data) {
// //         errorMessage =
// //           err.response.data.error ||
// //           err.response.data.message ||
// //           "Lỗi từ server";
// //         if (errorMessage.includes("không tồn tại trong bảng alternatives")) {
// //           errorMessage += " Vui lòng cập nhật danh sách phương án.";
// //         }
// //       } else if (err.message) {
// //         errorMessage = err.message;
// //       }
// //       setError(`Lỗi khi tính toán điểm số: ${errorMessage}`);
// //       setCalculating(false);
// //     }
// //   };

// //   const handleImportMatrix = (importedMatrix) => {
// //     if (!isPreviousMatrixValid) {
// //       setError(
// //         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi import."
// //       );
// //       return;
// //     }

// //     const size = customers.length;
// //     if (
// //       importedMatrix.length !== size ||
// //       importedMatrix.some((row) => row.length !== size)
// //     ) {
// //       setError("Kích thước ma trận không khớp với số khách hàng");
// //       return;
// //     }

// //     // Kiểm tra giá trị hợp lệ (số dương, đối xứng nghịch đảo với sai số nhỏ)
// //     const isValid = importedMatrix.every((row, i) =>
// //       row.every((value, j) => {
// //         if (i === j) return value === 1;
// //         if (!value || value <= 0 || value > 9) return false;
// //         const reciprocal = importedMatrix[j][i];
// //         return Math.abs(value - 1 / reciprocal) < 0.01; // Chấp nhận sai số 0.01
// //       })
// //     );

// //     if (!isValid) {
// //       setError(
// //         "Ma trận không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
// //       );
// //       return;
// //     }

// //     setMatrix(importedMatrix);
// //     setFileName("");
// //     setError(null);
// //     setConsistencyError(null);
// //   };

// //   const handleFileUpload = (event) => {
// //     const file = event.target.files[0];
// //     if (!file) return;

// //     setFileName(file.name);
// //     setError(null);

// //     const reader = new FileReader();
// //     reader.onload = (e) => {
// //       try {
// //         const data = new Uint8Array(e.target.result);
// //         const workbook = XLSX.read(data, { type: "array" });
// //         const sheetName = workbook.SheetNames.find((name) =>
// //           name.includes(`Alternative Comparison Matrices: ${criteriaName}`)
// //         );
// //         if (!sheetName) {
// //           setError(`Không tìm thấy sheet cho tiêu chí: ${criteriaName}`);
// //           return;
// //         }

// //         const sheet = workbook.Sheets[sheetName];
// //         const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
// //         const matrixData = jsonData
// //           .slice(1)
// //           .map((row) => row.slice(1).map(parseFloat));
// //         handleImportMatrix(matrixData);
// //       } catch (err) {
// //         setError("Không thể đọc file Excel: " + err.message);
// //       }
// //     };
// //     reader.onerror = () => {
// //       setError("Lỗi khi đọc file Excel");
// //     };
// //     reader.readAsArrayBuffer(file);
// //   };

// //   const isMatrixDisabled = propDisabled || !isPreviousMatrixValid;

// //   if (loading) {
// //     return (
// //       <div className="flex justify-center items-center py-10">Đang tải...</div>
// //     );
// //   }

// //   return (
// //     <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
// //       <h3 className="text-lg font-medium mb-4">
// //         Ma trận so sánh cặp khách hàng theo tiêu chí: {criteriaName}
// //       </h3>

// //       <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
// //         <p className="text-blue-700">
// //           So sánh tầm quan trọng tương đối của các khách hàng theo tiêu chí{" "}
// //           {criteriaName}. Giá trị từ 1 đến 9 thể hiện mức độ quan trọng hơn, giá
// //           trị từ 1/9 đến 1 thể hiện mức độ quan trọng kém hơn.
// //         </p>
// //       </div>

// //       {error && (
// //         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
// //           <p className="text-red-700">{error}</p>
// //         </div>
// //       )}

// //       {consistencyError && (
// //         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
// //           <p className="text-red-700">{consistencyError}</p>
// //         </div>
// //       )}

// //       <div className="mb-4">
// //         <label className="block text-sm font-medium text-gray-700 mb-2">
// //           Nhập ma trận từ file Excel
// //         </label>
// //         <input
// //           type="file"
// //           accept=".xlsx, .xls"
// //           onChange={handleFileUpload}
// //           disabled={isMatrixDisabled}
// //           className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
// //             isMatrixDisabled ? "cursor-not-allowed opacity-50" : ""
// //           }`}
// //         />
// //         {fileName && (
// //           <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
// //         )}
// //       </div>

// //       <div className="overflow-x-auto">
// //         <table
// //           className={`min-w-full bg-white border border-gray-300 ${
// //             isMatrixDisabled ? "opacity-70" : ""
// //           }`}
// //         >
// //           <thead>
// //             <tr>
// //               <th className="py-2 px-4 border-b border-r"></th>
// //               {customers.map((customer) => (
// //                 <th
// //                   key={customer.id}
// //                   className="py-2 px-4 border-b border-r border-gray-300"
// //                 >
// //                   {customer.name}
// //                 </th>
// //               ))}
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {customers.map((rowCustomer, rowIndex) => (
// //               <tr key={rowCustomer.id}>
// //                 <td className="py-2 px-4 border-b border-r font-medium">
// //                   {rowCustomer.name}
// //                 </td>
// //                 {customers.map((colCustomer, colIndex) => (
// //                   <td
// //                     key={colCustomer.id}
// //                     className="py-2 px-4 border-b border-r border-gray-300"
// //                   >
// //                     {rowIndex === colIndex ? (
// //                       <span className="text-center block">1</span>
// //                     ) : rowIndex < colIndex ? (
// //                       <select
// //                         value={matrix[rowIndex][colIndex] ?? ""}
// //                         onChange={(e) =>
// //                           handleMatrixChange(rowIndex, colIndex, e.target.value)
// //                         }
// //                         disabled={isMatrixDisabled}
// //                         className={`w-full px-2 py-1 border rounded ${
// //                           matrix[rowIndex][colIndex] === null
// //                             ? "border-red-300 bg-red-50"
// //                             : "border-gray-300"
// //                         } ${
// //                           isMatrixDisabled
// //                             ? "bg-gray-100 cursor-not-allowed"
// //                             : ""
// //                         }`}
// //                       >
// //                         <option value="">Chọn giá trị</option>
// //                         {dropdownOptions.map((option) => (
// //                           <option key={option} value={option}>
// //                             {formatValue(option)}
// //                           </option>
// //                         ))}
// //                       </select>
// //                     ) : (
// //                       <span className="text-center block text-gray-500">
// //                         {matrix[colIndex][rowIndex] !== null &&
// //                         !isNaN(matrix[colIndex][rowIndex])
// //                           ? formatValue(1 / matrix[colIndex][rowIndex])
// //                           : "0"}
// //                       </span>
// //                     )}
// //                   </td>
// //                 ))}
// //               </tr>
// //             ))}
// //           </tbody>
// //         </table>
// //       </div>

// //       <div className="mt-4 flex justify-end space-x-4">
// //         <button
// //           onClick={() => {
// //             if (isPreviousMatrixValid) {
// //               const size = customers.length;
// //               setMatrix(
// //                 Array(size)
// //                   .fill()
// //                   .map((_, i) =>
// //                     Array(size)
// //                       .fill()
// //                       .map((_, j) => (i === j ? 1 : null))
// //                   )
// //               );
// //               setResults(null);
// //               setConsistencyError(null);
// //               setError(null);
// //             }
// //           }}
// //           disabled={calculating || isMatrixDisabled}
// //           className={`bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md ${
// //             calculating || isMatrixDisabled
// //               ? "bg-gray-400 cursor-not-allowed"
// //               : ""
// //           }`}
// //         >
// //           Reset Ma trận
// //         </button>
// //         <button
// //           onClick={handleCalculate}
// //           disabled={calculating || isMatrixDisabled}
// //           className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md ${
// //             calculating || isMatrixDisabled
// //               ? "bg-gray-400 cursor-not-allowed"
// //               : ""
// //           }`}
// //         >
// //           {calculating ? "Đang tính..." : "Tính điểm số"}
// //         </button>
// //       </div>

// //       {results && (
// //         <div className="mt-6 p-4 bg-gray-50 rounded-md">
// //           <h4 className="text-md font-medium mb-2">Kết quả điểm số:</h4>
// //           <ul className="space-y-1">
// //             {customers.map((customer) => (
// //               <li key={customer.id} className="flex justify-between">
// //                 <span>{customer.name}:</span>
// //                 <span className="font-medium">
// //                   {(results.scores[customer.id] || 0).toFixed(4)}
// //                 </span>
// //               </li>
// //             ))}
// //           </ul>
// //           <div className="mt-3 pt-3 border-t border-gray-200">
// //             <div className="flex justify-between">
// //               <span>Tỷ số nhất quán (CR):</span>
// //               <span
// //                 className={`font-medium ${
// //                   results.CR > 0.1 ? "text-red-600" : "text-green-600"
// //                 }`}
// //               >
// //                 {(results.CR * 100).toFixed(2)}%
// //                 {results.CR > 0.1 && (
// //                   <span className="ml-2 text-sm font-normal text-red-600">
// //                     (Cần điều chỉnh lại ma trận)
// //                   </span>
// //                 )}
// //               </span>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default AlternativeMatrix;
// import { useState, useEffect, useMemo } from "react";
// import * as XLSX from "xlsx";
// import {
//   calculateAlternativeScores,
//   getAlternatives,
//   updateAlternativesFromCustomers,
// } from "../services/api";

// const AlternativeMatrix = ({
//   expertId,
//   customerId,
//   criteriaId,
//   criteriaName,
//   customers,
//   onScoresCalculated,
//   disabled: propDisabled,
//   isPreviousMatrixValid,
// }) => {
//   const [matrix, setMatrix] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [calculating, setCalculating] = useState(false);
//   const [error, setError] = useState(null);
//   const [results, setResults] = useState(null);
//   const [consistencyError, setConsistencyError] = useState(null);
//   const [validAlternatives, setValidAlternatives] = useState([]);
//   const [isCurrentMatrixValid, setIsCurrentMatrixValid] = useState(true);
//   const [fileName, setFileName] = useState("");

//   // Các giá trị có thể chọn trong dropdown - giống CriteriaMatrix
//   const dropdownOptions = [
//     1,
//     2,
//     3,
//     4,
//     5,
//     6,
//     7,
//     8,
//     9,
//     1 / 2,
//     1 / 3,
//     1 / 4,
//     1 / 5,
//     1 / 6,
//     1 / 7,
//     1 / 8,
//     1 / 9,
//   ];

//   // Hàm định dạng hiển thị giá trị - giống CriteriaMatrix
//   const formatValue = (value) => {
//     if (!value) return "0";

//     // Xử lý giá trị phân số chính xác
//     if (Math.abs(value - 1 / 2) < 0.001) return "1/2";
//     if (Math.abs(value - 1 / 3) < 0.001) return "1/3";
//     if (Math.abs(value - 1 / 4) < 0.001) return "1/4";
//     if (Math.abs(value - 1 / 5) < 0.001) return "1/5";
//     if (Math.abs(value - 1 / 6) < 0.001) return "1/6";
//     if (Math.abs(value - 1 / 7) < 0.001) return "1/7";
//     if (Math.abs(value - 1 / 8) < 0.001) return "1/8";
//     if (Math.abs(value - 1 / 9) < 0.001) return "1/9";

//     // Xử lý các giá trị số nguyên
//     if (Number.isInteger(value)) return value.toString();

//     // Xử lý các giá trị thập phân khớp với phân số
//     for (const option of dropdownOptions) {
//       if (Math.abs(value - option) < 0.001) {
//         return formatValue(option);
//       }
//     }

//     return value.toFixed(4);
//   };

//   // Hàm tìm giá trị phân số thích hợp từ số thập phân - giống CriteriaMatrix
//   const findClosestFraction = (decimal) => {
//     if (!decimal || decimal === 0) return "";

//     // Kiểm tra các giá trị phân số phổ biến với độ chính xác cao hơn
//     for (const option of dropdownOptions) {
//       if (Math.abs(decimal - option) < 0.001) {
//         return option;
//       }
//     }

//     // Nếu không tìm thấy giá trị phù hợp, trả về giá trị thô
//     return decimal;
//   };

//   // Hàm chuyển đổi giá trị từ chuỗi phân số sang số thập phân - giống CriteriaMatrix
//   const parseMatrixValue = (value) => {
//     if (typeof value === "number") return value;
//     if (typeof value !== "string") return 0;

//     // Nếu là chuỗi phân số như "1/3", chuyển thành số
//     if (value.includes("/")) {
//       const [numerator, denominator] = value.split("/").map(parseFloat);
//       if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
//         return 0;
//       }
//       return numerator / denominator;
//     }

//     // Nếu là số dưới dạng chuỗi, chuyển thành số
//     const parsed = parseFloat(value);
//     return isNaN(parsed) ? 0 : parsed;
//   };

//   const customersKey = useMemo(
//     () => customers.map((c) => c.id).join(","),
//     [customers]
//   );

//   useEffect(() => {
//     const syncAlternativesAndInitMatrix = async () => {
//       try {
//         setLoading(true);
//         const alternatives = await getAlternatives();
//         setValidAlternatives(alternatives);

//         if (customers && customers.length > 0) {
//           const customerIds = customers.map((c) => c.id);
//           const missingIds = customerIds.filter(
//             (id) => !alternatives.some((alt) => alt.id === id)
//           );
//           if (missingIds.length > 0) {
//             await updateAlternativesFromCustomers(customerIds);
//             const updatedAlternatives = await getAlternatives();
//             setValidAlternatives(updatedAlternatives);
//           }
//         }

//         const size = customers.length;
//         setMatrix(
//           Array(size)
//             .fill()
//             .map((_, i) =>
//               Array(size)
//                 .fill()
//                 .map((_, j) => (i === j ? 1 : 0))
//             )
//         );
//         setResults(null);
//         setConsistencyError(null);
//         setError(null);
//         setIsCurrentMatrixValid(true);
//         setLoading(false);
//       } catch (err) {
//         setError(`Không thể tải danh sách phương án: ${err.message}`);
//         setLoading(false);
//       }
//     };
//     syncAlternativesAndInitMatrix();
//   }, [customersKey]);

//   useEffect(() => {
//     if (!isPreviousMatrixValid) {
//       setError(
//         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
//       );
//     } else {
//       if (
//         error ===
//         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
//       ) {
//         setError(null);
//       }
//     }
//   }, [isPreviousMatrixValid]);

//   const handleMatrixChange = (rowIndex, colIndex, value) => {
//     if (!isPreviousMatrixValid) {
//       setError(
//         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
//       );
//       return;
//     }

//     const newMatrix = [...matrix];
//     const parsedValue =
//       typeof value === "string" && value.includes("/")
//         ? eval(value)
//         : parseFloat(value);

//     if (!isNaN(parsedValue) && parsedValue > 0) {
//       newMatrix[rowIndex][colIndex] = parsedValue;
//       if (rowIndex !== colIndex) {
//         newMatrix[colIndex][rowIndex] = 1 / parsedValue;
//       }
//     } else {
//       newMatrix[rowIndex][colIndex] = 0;
//       if (rowIndex !== colIndex) {
//         newMatrix[colIndex][rowIndex] = 0;
//       }
//     }

//     setMatrix(newMatrix);
//     setConsistencyError(null);

//     if (
//       error ===
//       "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
//     ) {
//       setError(null);
//     }
//   };

//   const handleCalculate = async () => {
//     if (!isPreviousMatrixValid) {
//       setError(
//         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
//       );
//       return;
//     }

//     if (!customerId || !expertId || !criteriaId) {
//       setError("Vui lòng chọn đầy đủ khách hàng, chuyên gia và tiêu chí");
//       return;
//     }

//     const size = customers.length;
//     let isComplete = true;

//     for (let i = 0; i < size; i++) {
//       for (let j = 0; j < size; j++) {
//         if (i !== j && (matrix[i][j] <= 0 || matrix[i][j] === undefined)) {
//           isComplete = false;
//           break;
//         }
//       }
//       if (!isComplete) break;
//     }

//     if (!isComplete) {
//       setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
//       return;
//     }

//     try {
//       setCalculating(true);
//       setError(null);
//       setConsistencyError(null);

//       const validCustomers = customers.filter((c) =>
//         validAlternatives.some((alt) => alt.id === c.id)
//       );
//       if (validCustomers.length !== customers.length) {
//         setError(
//           "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng chọn lại khách hàng."
//         );
//         setCalculating(false);
//         return;
//       }

//       const comparisons = [];
//       for (let i = 0; i < size; i++) {
//         for (let j = i + 1; j < size; j++) {
//           if (matrix[i][j] !== 1) {
//             comparisons.push({
//               alt1_id: customers[i].id,
//               alt2_id: customers[j].id,
//               value: matrix[i][j],
//             });
//           }
//         }
//       }

//       const payload = {
//         expert_id: expertId,
//         customer_id: customerId,
//         criteria_id: criteriaId,
//         comparisons,
//       };

//       const result = await calculateAlternativeScores(payload);
//       setResults(result);

//       const isValid = result.CR <= 0.1;
//       setIsCurrentMatrixValid(isValid);

//       if (!isValid) {
//         setConsistencyError(
//           `Tỷ số nhất quán (CR = ${result.CR.toFixed(
//             4
//           )}) vượt quá 10%. Vui lòng điều chỉnh lại ma trận so sánh.`
//         );
//         onScoresCalculated(criteriaId, { ...result, isValid: false });
//       } else {
//         setConsistencyError(null);
//         onScoresCalculated(criteriaId, { ...result, isValid: true });
//       }
//       setCalculating(false);
//     } catch (err) {
//       let errorMessage = "Lỗi không xác định";
//       if (err.response && err.response.data) {
//         errorMessage =
//           err.response.data.error ||
//           err.response.data.message ||
//           "Lỗi từ server";
//         if (errorMessage.includes("không tồn tại trong bảng alternatives")) {
//           errorMessage += " Vui lòng cập nhật danh sách phương án.";
//         }
//       } else if (err.message) {
//         errorMessage = err.message;
//       }
//       setError(`Lỗi khi tính toán điểm số: ${errorMessage}`);
//       setCalculating(false);
//     }
//   };

//   const handleImportMatrix = (importedMatrix) => {
//     if (!isPreviousMatrixValid) {
//       setError(
//         "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi import."
//       );
//       return;
//     }

//     const size = customers.length;
//     if (
//       importedMatrix.length !== size ||
//       importedMatrix.some((row) => row.length !== size)
//     ) {
//       setError("Kích thước ma trận không khớp với số khách hàng");
//       return;
//     }

//     // Kiểm tra giá trị hợp lệ (số dương, đối xứng nghịch đảo với sai số nhỏ)
//     const isValid = importedMatrix.every((row, i) =>
//       row.every((value, j) => {
//         if (i === j) return value === 1;
//         if (!value || value <= 0 || value > 9) return false;
//         const reciprocal = importedMatrix[j][i];
//         return Math.abs(value - 1 / reciprocal) < 0.01; // Chấp nhận sai số 0.01
//       })
//     );

//     if (!isValid) {
//       setError(
//         "Ma trận không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
//       );
//       return;
//     }

//     setMatrix(importedMatrix);
//     setFileName("");
//     setError(null);
//     setConsistencyError(null);
//   };

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
//         console.log("Danh sách sheet trong file:", workbook.SheetNames); // Debug

//         // Tìm sheet cho tiêu chí hiện tại
//         const sheetName = workbook.SheetNames.find((name) =>
//           name.toLowerCase().includes(criteriaName.toLowerCase())
//         );

//         if (!sheetName) {
//           setError(`Không tìm thấy sheet cho tiêu chí: ${criteriaName}`);
//           return;
//         }

//         const sheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//         const matrixData = jsonData
//           .slice(1)
//           .map((row) => row.slice(1).map(parseMatrixValue));
//         handleImportMatrix(matrixData);
//       } catch (err) {
//         setError("Không thể đọc file Excel: " + err.message);
//       }
//     };
//     reader.onerror = () => {
//       setError("Lỗi khi đọc file Excel");
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const isMatrixDisabled = propDisabled || !isPreviousMatrixValid;

//   // Hàm để xác định giá trị hiển thị trong dropdown - giống CriteriaMatrix
//   const getSelectedValue = (rowIndex, colIndex) => {
//     const value = matrix[rowIndex][colIndex];
//     if (!value) return "";
//     return findClosestFraction(value);
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center py-10">Đang tải...</div>
//     );
//   }

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
//       <h3 className="text-lg font-medium mb-4">
//         Ma trận so sánh cặp khách hàng theo tiêu chí: {criteriaName}
//       </h3>

//       <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
//         <p className="text-blue-700">
//           So sánh tầm quan trọng tương đối của các khách hàng theo tiêu chí{" "}
//           {criteriaName}. Giá trị từ 1 đến 9 thể hiện mức độ quan trọng hơn, giá
//           trị từ 1/9 đến 1 thể hiện mức độ quan trọng kém hơn.
//         </p>
//       </div>

//       {error && (
//         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
//           <p className="text-red-700">{error}</p>
//         </div>
//       )}

//       {consistencyError && (
//         <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
//           <p className="text-red-700">{consistencyError}</p>
//         </div>
//       )}

//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Nhập ma trận từ file Excel
//         </label>
//         <input
//           type="file"
//           accept=".xlsx, .xls"
//           onChange={handleFileUpload}
//           disabled={isMatrixDisabled}
//           className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
//             isMatrixDisabled ? "cursor-not-allowed opacity-50" : ""
//           }`}
//         />
//         {fileName && (
//           <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
//         )}
//       </div>

//       <div className="overflow-x-auto">
//         <table
//           className={`min-w-full bg-white border border-gray-300 ${
//             isMatrixDisabled ? "opacity-70" : ""
//           }`}
//         >
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="py-2 px-4 border-b border-r border-gray-300"></th>
//               {customers.map((customer) => (
//                 <th
//                   key={customer.id}
//                   className="py-2 px-4 border-b border-r border-gray-300"
//                 >
//                   {customer.name}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {customers.map((rowCustomer, rowIndex) => (
//               <tr key={rowCustomer.id}>
//                 <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
//                   {rowCustomer.name}
//                 </td>
//                 {customers.map((colCustomer, colIndex) => (
//                   <td
//                     key={colCustomer.id}
//                     className="py-2 px-4 border-b border-r border-gray-300"
//                   >
//                     {rowIndex === colIndex ? (
//                       <span className="text-center block text-gray-500">1</span>
//                     ) : rowIndex < colIndex ? (
//                       <select
//                         value={getSelectedValue(rowIndex, colIndex)}
//                         onChange={(e) =>
//                           handleMatrixChange(rowIndex, colIndex, e.target.value)
//                         }
//                         disabled={isMatrixDisabled}
//                         className={`w-full px-2 py-1 border rounded ${
//                           !matrix[rowIndex][colIndex]
//                             ? "border-black-300 bg-white-50"
//                             : "border-gray-300"
//                         } ${
//                           isMatrixDisabled
//                             ? "bg-gray-100 cursor-not-allowed"
//                             : ""
//                         }`}
//                       >
//                         <option value="">Chọn giá trị</option>
//                         {dropdownOptions.map((option) => (
//                           <option key={option} value={option}>
//                             {formatValue(option)}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       <span className="text-center block text-gray-500">
//                         {matrix[rowIndex][colIndex]
//                           ? formatValue(matrix[rowIndex][colIndex])
//                           : "0"}
//                       </span>
//                     )}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-4 flex justify-between items-center">
//         <button
//           onClick={() => {
//             if (isPreviousMatrixValid) {
//               const size = customers.length;
//               setMatrix(
//                 Array(size)
//                   .fill()
//                   .map((_, i) =>
//                     Array(size)
//                       .fill()
//                       .map((_, j) => (i === j ? 1 : 0))
//                   )
//               );
//               setResults(null);
//               setConsistencyError(null);
//               setError(null);
//             }
//           }}
//           disabled={calculating || isMatrixDisabled}
//           className={`px-4 py-2 rounded ${
//             calculating || isMatrixDisabled
//               ? "bg-gray-300 cursor-not-allowed"
//               : "bg-gray-500 hover:bg-gray-600 text-white"
//           }`}
//         >
//           Reset Ma trận
//         </button>
//         <button
//           onClick={handleCalculate}
//           disabled={calculating || isMatrixDisabled}
//           className={`px-4 py-2 rounded ${
//             calculating || isMatrixDisabled
//               ? "bg-gray-300 cursor-not-allowed"
//               : "bg-blue-500 hover:bg-blue-600 text-white"
//           }`}
//         >
//           {calculating ? "Đang tính..." : "Tính điểm số"}
//         </button>

//         {results && (
//           <div
//             className={`text-sm ${
//               results.CR <= 0.1 ? "text-green-600" : "text-red-600"
//             }`}
//           >
//             CR = {results.CR.toFixed(4)}
//             {results.CR > 0.1 && (
//               <span className="ml-2">
//                 (CR phải ≤ 0.1 để dữ liệu được chấp nhận)
//               </span>
//             )}
//           </div>
//         )}
//       </div>

//       {results && (
//         <div className="mt-6 p-4 bg-gray-50 rounded-md">
//           <h3 className="text-lg font-medium mb-2">
//             Kết quả điểm số khách hàng:
//           </h3>
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
//             {customers.map((customer) => {
//               const score = results.scores[customer.id] || 0;

//               return (
//                 <div key={customer.id} className="bg-gray-50 p-2 rounded">
//                   <span className="font-medium">{customer.name}: </span>
//                   <span>{score.toFixed(4)}</span>
//                 </div>
//               );
//             })}
//           </div>

//           <div className="mt-3 pt-3 border-t border-gray-200">
//             <div className="flex justify-between">
//               <span>Tỷ số nhất quán (CR):</span>
//               <span
//                 className={`font-medium ${
//                   results.CR > 0.1 ? "text-red-600" : "text-green-600"
//                 }`}
//               >
//                 {results.CR.toFixed(4)}
//               </span>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AlternativeMatrix;
import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  calculateAlternativeScores,
  getAlternatives,
  updateAlternativesFromCustomers,
} from "../services/api";

const AlternativeMatrix = ({
  expertId,
  customerId,
  criteriaId,
  criteriaName,
  customers,
  onScoresCalculated,
  disabled: propDisabled,
  isPreviousMatrixValid,
  importedMatrix,
}) => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [consistencyError, setConsistencyError] = useState(null);
  const [validAlternatives, setValidAlternatives] = useState([]);
  const [isCurrentMatrixValid, setIsCurrentMatrixValid] = useState(true);
  const [fileName, setFileName] = useState("");

  const dropdownOptions = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    1 / 2,
    1 / 3,
    1 / 4,
    1 / 5,
    1 / 6,
    1 / 7,
    1 / 8,
    1 / 9,
  ];

  const formatValue = (value) => {
    if (!value) return "0";
    if (Math.abs(value - 1 / 2) < 0.001) return "1/2";
    if (Math.abs(value - 1 / 3) < 0.001) return "1/3";
    if (Math.abs(value - 1 / 4) < 0.001) return "1/4";
    if (Math.abs(value - 1 / 5) < 0.001) return "1/5";
    if (Math.abs(value - 1 / 6) < 0.001) return "1/6";
    if (Math.abs(value - 1 / 7) < 0.001) return "1/7";
    if (Math.abs(value - 1 / 8) < 0.001) return "1/8";
    if (Math.abs(value - 1 / 9) < 0.001) return "1/9";
    if (Number.isInteger(value)) return value.toString();
    for (const option of dropdownOptions) {
      if (Math.abs(value - option) < 0.001) return formatValue(option);
    }
    return value.toFixed(4);
  };

  const findClosestFraction = (decimal) => {
    if (!decimal || decimal === 0) return "";
    for (const option of dropdownOptions) {
      if (Math.abs(decimal - option) < 0.001) return option;
    }
    return decimal;
  };

  const parseMatrixValue = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    if (value.includes("/")) {
      const [numerator, denominator] = value.split("/").map(parseFloat);
      if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 0;
      return numerator / denominator;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const customersKey = useMemo(
    () => customers.map((c) => c.id).join(","),
    [customers]
  );

  useEffect(() => {
    const syncAlternativesAndInitMatrix = async () => {
      try {
        setLoading(true);
        const alternatives = await getAlternatives();
        setValidAlternatives(alternatives);

        if (customers && customers.length > 0) {
          const customerIds = customers.map((c) => c.id);
          const missingIds = customerIds.filter(
            (id) => !alternatives.some((alt) => alt.id === id)
          );
          if (missingIds.length > 0) {
            await updateAlternativesFromCustomers(customerIds);
            const updatedAlternatives = await getAlternatives();
            setValidAlternatives(updatedAlternatives);
          }
        }

        const size = customers.length;
        setMatrix(
          Array(size)
            .fill()
            .map((_, i) =>
              Array(size)
                .fill()
                .map((_, j) => (i === j ? 1 : 0))
            )
        );
        setResults(null);
        setConsistencyError(null);
        setError(null);
        setIsCurrentMatrixValid(true);
        setLoading(false);
      } catch (err) {
        setError(`Không thể tải danh sách phương án: ${err.message}`);
        setLoading(false);
      }
    };
    syncAlternativesAndInitMatrix();
  }, [customersKey]);

  useEffect(() => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
    } else {
      if (
        error ===
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      ) {
        setError(null);
      }
    }
  }, [isPreviousMatrixValid]);

  useEffect(() => {
    if (importedMatrix && !propDisabled && isPreviousMatrixValid) {
      handleImportMatrix(importedMatrix);
    }
  }, [importedMatrix, propDisabled, isPreviousMatrixValid]);

  const handleMatrixChange = (rowIndex, colIndex, value) => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
      return;
    }

    const newMatrix = [...matrix];
    const parsedValue =
      typeof value === "string" && value.includes("/")
        ? eval(value)
        : parseFloat(value);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      newMatrix[rowIndex][colIndex] = parsedValue;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 1 / parsedValue;
      }
    } else {
      newMatrix[rowIndex][colIndex] = 0;
      if (rowIndex !== colIndex) {
        newMatrix[colIndex][rowIndex] = 0;
      }
    }

    setMatrix(newMatrix);
    setConsistencyError(null);

    if (
      error ===
      "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
    ) {
      setError(null);
    }
  };

  const handleCalculate = async () => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi tiếp tục."
      );
      return;
    }

    if (!customerId || !expertId || !criteriaId) {
      setError("Vui lòng chọn đầy đủ khách hàng, chuyên gia và tiêu chí");
      return;
    }

    const size = customers.length;
    let isComplete = true;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i !== j && (matrix[i][j] <= 0 || matrix[i][j] === undefined)) {
          isComplete = false;
          break;
        }
      }
      if (!isComplete) break;
    }

    if (!isComplete) {
      setError("Vui lòng điền đầy đủ giá trị hợp lệ cho ma trận so sánh");
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      setConsistencyError(null);

      const validCustomers = customers.filter((c) =>
        validAlternatives.some((alt) => alt.id === c.id)
      );
      if (validCustomers.length !== customers.length) {
        setError(
          "Một số khách hàng không tồn tại trong danh sách phương án. Vui lòng chọn lại khách hàng."
        );
        setCalculating(false);
        return;
      }

      const comparisons = [];
      for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
          if (matrix[i][j] !== 1) {
            comparisons.push({
              alt1_id: customers[i].id,
              alt2_id: customers[j].id,
              value: matrix[i][j],
            });
          }
        }
      }

      const payload = {
        expert_id: expertId,
        customer_id: customerId,
        criteria_id: criteriaId,
        comparisons,
      };

      const result = await calculateAlternativeScores(payload);
      setResults(result);

      const isValid = result.CR <= 0.1;
      setIsCurrentMatrixValid(isValid);

      if (!isValid) {
        setConsistencyError(
          `Tỷ số nhất quán (CR = ${result.CR.toFixed(
            4
          )}) vượt quá 10%. Vui lòng điều chỉnh lại ma trận so sánh.`
        );
        onScoresCalculated(criteriaId, { ...result, isValid: false });
      } else {
        setConsistencyError(null);
        onScoresCalculated(criteriaId, { ...result, isValid: true });
      }
      setCalculating(false);
    } catch (err) {
      let errorMessage = "Lỗi không xác định";
      if (err.response && err.response.data) {
        errorMessage =
          err.response.data.error ||
          err.response.data.message ||
          "Lỗi từ server";
        if (errorMessage.includes("không tồn tại trong bảng alternatives")) {
          errorMessage += " Vui lòng cập nhật danh sách phương án.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(`Lỗi khi tính toán điểm số: ${errorMessage}`);
      setCalculating(false);
    }
  };

  const handleImportMatrix = (importedMatrix) => {
    if (!isPreviousMatrixValid) {
      setError(
        "Vui lòng điều chỉnh ma trận trước đó để có tỷ số nhất quán (CR) ≤ 10% trước khi import."
      );
      return;
    }

    if (propDisabled) {
      setError("Chức năng nhập file bị vô hiệu hóa.");
      return;
    }

    const size = customers.length;
    if (
      importedMatrix.length !== size ||
      importedMatrix.some((row) => row.length !== size)
    ) {
      setError("Kích thước ma trận không khớp với số khách hàng");
      return;
    }

    const isValid = importedMatrix.every((row, i) =>
      row.every((value, j) => {
        if (i === j) return value === 1;
        if (!value || value <= 0 || value > 9) return false;
        const reciprocal = importedMatrix[j][i];
        return Math.abs(value - 1 / reciprocal) < 0.01;
      })
    );

    if (!isValid) {
      setError(
        "Ma trận không hợp lệ: Vui lòng kiểm tra giá trị và tính đối xứng"
      );
      return;
    }

    setMatrix(importedMatrix);
    setFileName("");
    setError(null);
    setConsistencyError(null);
  };

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

        const sheetName = workbook.SheetNames.find((name) =>
          name.toLowerCase().includes(criteriaName.toLowerCase())
        );

        if (!sheetName) {
          setError(`Không tìm thấy sheet cho tiêu chí: ${criteriaName}`);
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const matrixData = jsonData
          .slice(1)
          .map((row) => row.slice(1).map(parseMatrixValue));
        handleImportMatrix(matrixData);
      } catch (err) {
        setError("Không thể đọc file Excel: " + err.message);
      }
    };
    reader.onerror = () => {
      setError("Lỗi khi đọc file Excel");
    };
    reader.readAsArrayBuffer(file);
  };

  const isMatrixDisabled = propDisabled || !isPreviousMatrixValid;

  const getSelectedValue = (rowIndex, colIndex) => {
    const value = matrix[rowIndex][colIndex];
    if (!value) return "";
    return findClosestFraction(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">Đang tải...</div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
      <h3 className="text-lg font-medium mb-4">
        Ma trận so sánh cặp khách hàng theo tiêu chí: {criteriaName}
      </h3>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-700">
          So sánh tầm quan trọng tương đối của các khách hàng theo tiêu chí{" "}
          {criteriaName}. Giá trị từ 1 đến 9 thể hiện mức độ quan trọng hơn, giá
          trị từ 1/9 đến 1 thể hiện mức độ quan trọng kém hơn.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {consistencyError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
          <p className="text-red-700">{consistencyError}</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nhập ma trận từ file Excel
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={isMatrixDisabled}
          className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
            isMatrixDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">Đã chọn: {fileName}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table
          className={`min-w-full bg-white border border-gray-300 ${
            isMatrixDisabled ? "opacity-70" : ""
          }`}
        >
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b border-r border-gray-300"></th>
              {customers.map((customer) => (
                <th
                  key={customer.id}
                  className="py-2 px-4 border-b border-r border-gray-300"
                >
                  {customer.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((rowCustomer, rowIndex) => (
              <tr key={rowCustomer.id}>
                <td className="py-2 px-4 border-b border-r border-gray-300 font-medium bg-gray-50">
                  {rowCustomer.name}
                </td>
                {customers.map((colCustomer, colIndex) => (
                  <td
                    key={colCustomer.id}
                    className="py-2 px-4 border-b border-r border-gray-300"
                  >
                    {rowIndex === colIndex ? (
                      <span className="text-center block text-gray-500">1</span>
                    ) : rowIndex < colIndex ? (
                      <select
                        value={getSelectedValue(rowIndex, colIndex)}
                        onChange={(e) =>
                          handleMatrixChange(rowIndex, colIndex, e.target.value)
                        }
                        disabled={isMatrixDisabled}
                        className={`w-full px-2 py-1 border rounded ${
                          !matrix[rowIndex][colIndex]
                            ? "border-black-300 bg-white-50"
                            : "border-gray-300"
                        } ${
                          isMatrixDisabled
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <option value="">Chọn giá trị</option>
                        {dropdownOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatValue(option)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-center block text-gray-500">
                        {matrix[rowIndex][colIndex]
                          ? formatValue(matrix[rowIndex][colIndex])
                          : "0"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => {
            if (isPreviousMatrixValid) {
              const size = customers.length;
              setMatrix(
                Array(size)
                  .fill()
                  .map((_, i) =>
                    Array(size)
                      .fill()
                      .map((_, j) => (i === j ? 1 : 0))
                  )
              );
              setResults(null);
              setConsistencyError(null);
              setError(null);
            }
          }}
          disabled={calculating || isMatrixDisabled}
          className={`px-4 py-2 rounded ${
            calculating || isMatrixDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gray-500 hover:bg-gray-600 text-white"
          }`}
        >
          Reset Ma trận
        </button>
        <button
          onClick={handleCalculate}
          disabled={calculating || isMatrixDisabled}
          className={`px-4 py-2 rounded ${
            calculating || isMatrixDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {calculating ? "Đang tính..." : "Tính điểm số"}
        </button>

        {results && (
          <div
            className={`text-sm ${
              results.CR <= 0.1 ? "text-green-600" : "text-red-600"
            }`}
          >
            CR = {results.CR.toFixed(4)}
            {results.CR > 0.1 && (
              <span className="ml-2">
                (CR phải ≤ 0.1 để dữ liệu được chấp nhận)
              </span>
            )}
          </div>
        )}
      </div>

      {results && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium mb-2">
            Kết quả điểm số khách hàng:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
            {customers.map((customer) => {
              const score = results.scores[customer.id] || 0;
              return (
                <div key={customer.id} className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">{customer.name}: </span>
                  <span>{score.toFixed(4)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between">
              <span>Tỷ số nhất quán (CR):</span>
              <span
                className={`font-medium ${
                  results.CR > 0.1 ? "text-red-600" : "text-green-600"
                }`}
              >
                {results.CR.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlternativeMatrix;
