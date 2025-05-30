// import { useState, useEffect } from "react";
// import { getCustomers } from "../services/api";

// const CustomerFilter = ({ onCustomerSelect }) => {
//   const [minLoan, setMinLoan] = useState("");
//   const [maxLoan, setMaxLoan] = useState("");
//   const [purpose, setPurpose] = useState("");
//   const [isSelectedForAhp, setIsSelectedForAhp] = useState("");
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedCustomers, setSelectedCustomers] = useState([]);
//   const [selectionError, setSelectionError] = useState(null);

//   const purposes = ["Mua nhà", "Mua ô tô", "Kinh doanh", "Tiêu dùng"];

//   useEffect(() => {
//     const fetchCustomers = async () => {
//       setLoading(true);
//       try {
//         const customersData = await getCustomers();
//         console.log("Fetched customers:", customersData);

//         // Đảm bảo customersData là mảng
//         if (Array.isArray(customersData)) {
//           setCustomers(customersData);
//         } else {
//           console.error(
//             "Dữ liệu khách hàng không phải là mảng:",
//             customersData
//           );
//           setCustomers([]);
//           setError("Định dạng dữ liệu khách hàng không hợp lệ");
//         }
//       } catch (err) {
//         console.error("Lỗi khi tải khách hàng:", err);
//         setError("Không thể tải danh sách khách hàng");
//         setCustomers([]); // Set empty array on error
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchCustomers();
//   }, []);

//   const handleFilter = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const params = {};
//       if (minLoan) params.min_loan = parseFloat(minLoan.replace(/,/g, ""));
//       if (maxLoan) params.max_loan = parseFloat(maxLoan.replace(/,/g, ""));
//       if (purpose) params.purpose = purpose;
//       if (isSelectedForAhp) params.is_selected = isSelectedForAhp;

//       console.log("Filter params:", params);
//       const filteredData = await getCustomers(params);
//       console.log("Filtered customers:", filteredData);

//       // Đảm bảo filteredData là mảng
//       if (Array.isArray(filteredData)) {
//         setCustomers(filteredData);
//       } else {
//         console.error("Dữ liệu lọc không phải là mảng:", filteredData);
//         setError("Định dạng dữ liệu lọc không hợp lệ");
//         setCustomers([]);
//       }

//       setSelectedCustomers([]); // Reset selection when filtering
//     } catch (err) {
//       console.error("Lỗi khi lọc khách hàng:", err);
//       setError("Không thể lọc khách hàng");
//       setCustomers([]); // Set empty array on error
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCustomerSelect = (customer) => {
//     setSelectionError(null);
//     setSelectedCustomers((prev) => {
//       if (prev.some((c) => c.id === customer.id)) {
//         return prev.filter((c) => c.id !== customer.id);
//       } else {
//         return [...prev, customer];
//       }
//     });
//   };

//   const handleProceed = () => {
//     if (selectedCustomers.length < 4) {
//       setSelectionError("Vui lòng chọn ít nhất 4 khách hàng để tiếp tục.");
//       return;
//     }
//     if (onCustomerSelect) {
//       onCustomerSelect(selectedCustomers);
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
//       <h2 className="text-xl font-semibold mb-4">Lọc khách hàng</h2>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Tổng tiền vay (VND)
//           </label>
//           <div className="flex space-x-2">
//             <input
//               type="number"
//               value={minLoan}
//               onChange={(e) => setMinLoan(e.target.value)}
//               placeholder="Từ tiền"
//               className="mt-1 p-2 border rounded w-full"
//             />
//             <input
//               type="number"
//               value={maxLoan}
//               onChange={(e) => setMaxLoan(e.target.value)}
//               placeholder="Đến tiền"
//               className="mt-1 p-2 border rounded w-full"
//             />
//           </div>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Mục đích vay
//           </label>
//           <select
//             value={purpose}
//             onChange={(e) => setPurpose(e.target.value)}
//             className="mt-1 p-2 border rounded w-full"
//           >
//             <option value="">Tất cả</option>
//             {purposes.map((p) => (
//               <option key={p} value={p}>
//                 {p}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Được chọn cho AHP
//           </label>
//           <select
//             value={isSelectedForAhp}
//             onChange={(e) => setIsSelectedForAhp(e.target.value)}
//             className="mt-1 p-2 border rounded w-full"
//           >
//             <option value="">Tất cả</option>
//             <option value="1">Có</option>
//             <option value="0">Không</option>
//           </select>
//         </div>
//       </div>

//       <button
//         onClick={handleFilter}
//         disabled={loading}
//         className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
//       >
//         {loading ? "Đang lọc..." : "Lọc"}
//       </button>

//       {error && <div className="text-red-500 mt-2">{error}</div>}

//       <div className="mt-4">
//         <h3 className="text-lg font-medium mb-2">Danh sách khách hàng</h3>
//         {!customers || customers.length === 0 ? (
//           <p>Không có khách hàng nào khớp với bộ lọc.</p>
//         ) : (
//           <ul className="space-y-2">
//             {customers.map((customer) => (
//               <li
//                 key={customer.id}
//                 className="flex items-center p-2 border rounded hover:bg-gray-100"
//               >
//                 <input
//                   type="checkbox"
//                   checked={selectedCustomers.some((c) => c.id === customer.id)}
//                   onChange={() => handleCustomerSelect(customer)}
//                   className="mr-2"
//                 />
//                 <span
//                   className={`flex-1 ${
//                     selectedCustomers.some((c) => c.id === customer.id)
//                       ? "bg-cyan-100"
//                       : ""
//                   } p-1 rounded`}
//                 >
//                   {customer.name} -{" "}
//                   {parseFloat(customer.loan_amount).toLocaleString("vi-VN")} VND
//                   - {customer.loan_purpose}{" "}
//                   {customer.is_selected_for_ahp ? "(AHP)" : ""}
//                   {customer.financial_description
//                     ? ` - ${customer.financial_description}`
//                     : ""}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {customers && customers.length > 0 && (
//         <div className="mt-4">
//           <p className="text-sm text-gray-600">
//             Đã chọn {selectedCustomers.length} khách hàng.
//           </p>
//           {selectionError && (
//             <p className="text-red-500 mt-1">{selectionError}</p>
//           )}
//           <button
//             onClick={handleProceed}
//             className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
//           >
//             Tiếp tục với khách hàng đã chọn
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomerFilter;
import { useState, useEffect } from "react";
import { getCustomers } from "../services/api";

const CustomerFilter = ({ onCustomerSelect }) => {
  const [minLoan, setMinLoan] = useState("");
  const [maxLoan, setMaxLoan] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isSelectedForAhp, setIsSelectedForAhp] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectionError, setSelectionError] = useState(null);

  const purposes = ["Mua nhà", "Mua ô tô", "Kinh doanh", "Tiêu dùng"];

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const customersData = await getCustomers();
        console.log("Fetched customers:", customersData);

        // Đảm bảo customersData là mảng
        if (Array.isArray(customersData)) {
          setCustomers(customersData);
        } else {
          console.error(
            "Dữ liệu khách hàng không phải là mảng:",
            customersData
          );
          setCustomers([]);
          setError("Định dạng dữ liệu khách hàng không hợp lệ");
        }
      } catch (err) {
        console.error("Lỗi khi tải khách hàng:", err);
        setError("Không thể tải danh sách khách hàng");
        setCustomers([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (minLoan) params.min_loan = parseFloat(minLoan.replace(/,/g, ""));
      if (maxLoan) params.max_loan = parseFloat(maxLoan.replace(/,/g, ""));
      if (purpose) params.purpose = purpose;
      if (isSelectedForAhp) params.is_selected = isSelectedForAhp;

      console.log("Filter params:", params);
      const filteredData = await getCustomers(params);
      console.log("Filtered customers:", filteredData);

      // Đảm bảo filteredData là mảng
      if (Array.isArray(filteredData)) {
        setCustomers(filteredData);
      } else {
        console.error("Dữ liệu lọc không phải là mảng:", filteredData);
        setError("Định dạng dữ liệu lọc không hợp lệ");
        setCustomers([]);
      }

      setSelectedCustomers([]); // Reset selection when filtering
    } catch (err) {
      console.error("Lỗi khi lọc khách hàng:", err);
      setError("Không thể lọc khách hàng");
      setCustomers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectionError(null);
    setSelectedCustomers((prev) => {
      if (prev.some((c) => c.id === customer.id)) {
        return prev.filter((c) => c.id !== customer.id);
      } else {
        return [...prev, customer];
      }
    });
  };

  const handleProceed = () => {
    if (selectedCustomers.length < 4) {
      setSelectionError("Vui lòng chọn ít nhất 4 khách hàng để tiếp tục.");
      return;
    }
    if (onCustomerSelect) {
      onCustomerSelect(selectedCustomers);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full mb-6">
      <h2 className="text-xl font-semibold mb-4">Lọc khách hàng</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tổng tiền vay (VND)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={minLoan}
              onChange={(e) => setMinLoan(e.target.value)}
              placeholder="Từ tiền"
              className="mt-1 p-2 border rounded w-full"
            />
            <input
              type="number"
              value={maxLoan}
              onChange={(e) => setMaxLoan(e.target.value)}
              placeholder="Đến tiền"
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mục đích vay
          </label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
          >
            <option value="">Tất cả</option>
            {purposes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Được chọn cho AHP
          </label>
          <select
            value={isSelectedForAhp}
            onChange={(e) => setIsSelectedForAhp(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
          >
            <option value="">Tất cả</option>
            <option value="1">Có</option>
            <option value="0">Không</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleFilter}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
      >
        {loading ? "Đang lọc..." : "Lọc"}
      </button>

      {error && <div className="text-red-500 mt-2">{error}</div>}

      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Danh sách khách hàng</h3>
        {!customers || customers.length === 0 ? (
          <p>Không có khách hàng nào khớp với bộ lọc.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto border rounded">
            <ul className="space-y-2 p-2">
              {customers.map((customer) => (
                <li
                  key={customer.id}
                  className="flex items-center p-2 border rounded hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.some(
                      (c) => c.id === customer.id
                    )}
                    onChange={() => handleCustomerSelect(customer)}
                    className="mr-2"
                  />
                  <span
                    className={`flex-1 ${
                      selectedCustomers.some((c) => c.id === customer.id)
                        ? "bg-cyan-100"
                        : ""
                    } p-1 rounded`}
                  >
                    {customer.name} -{" "}
                    {parseFloat(customer.loan_amount).toLocaleString("vi-VN")}{" "}
                    VND - {customer.loan_purpose}{" "}
                    {customer.is_selected_for_ahp ? "(AHP)" : ""}
                    {customer.financial_description
                      ? ` - ${customer.financial_description}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {customers && customers.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Đã chọn {selectedCustomers.length} khách hàng.
          </p>
          {selectionError && (
            <p className="text-red-500 mt-1">{selectionError}</p>
          )}
          <button
            onClick={handleProceed}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Tiếp tục với khách hàng đã chọn
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerFilter;
