import axios from "axios";

const API_URL = "http://localhost:5000"; // Điều chỉnh theo URL backend của bạn

// Cấu hình mặc định cho axios
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Timeout 10 giây
  headers: {
    "Content-Type": "application/json",
  },
});

// Hàm phụ để xử lý lỗi
const handleApiError = (error, defaultMessage) => {
  if (error.response) {
    const { data, status } = error.response;
    const message =
      data.error || data.message || `Lỗi từ server (HTTP ${status})`;
    throw new Error(message);
  } else if (error.request) {
    throw new Error(
      "Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối mạng."
    );
  } else {
    throw new Error(defaultMessage || "Đã xảy ra lỗi không xác định.");
  }
};

// Hàm mới: Cập nhật bảng alternatives từ danh sách customer_ids
export const updateAlternativesFromCustomers = async (customerIds) => {
  try {
    const response = await axiosInstance.post(
      "/update-alternatives-from-customers",
      {
        customer_ids: customerIds,
      }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, "Không thể cập nhật danh sách phương án");
  }
};

// Hàm mới: Lưu ma trận tiêu chí
export const saveCriteriaMatrix = async (matrix, customerId, expertId) => {
  try {
    const payload = {
      matrix: matrix,
      customer_id: customerId,
      expert_id: expertId,
    };
    const response = await axiosInstance.post("/save-criteria-matrix", payload);
    return response.data;
  } catch (error) {
    return handleApiError(error, "Không thể lưu ma trận tiêu chí");
  }
};

export const getExperts = async () => {
  try {
    const response = await axiosInstance.get("/get-experts");
    return response.data.experts || [];
  } catch (error) {
    return handleApiError(error, "Không thể lấy danh sách chuyên gia");
  }
};

export const getCustomers = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/get-customers", { params });
    console.log("API response:", response.data);
    return response.data.customers || [];
  } catch (error) {
    console.error("API error:", error);
    return handleApiError(error, "Không thể lấy danh sách khách hàng");
  }
};

export const getCriteria = async () => {
  try {
    const response = await axiosInstance.get("/get-criteria");
    return response.data.criteria || [];
  } catch (error) {
    return handleApiError(error, "Không thể lấy danh sách tiêu chí");
  }
};

export const getAlternatives = async () => {
  try {
    const response = await axiosInstance.get("/get-alternatives");
    return response.data.alternatives || [];
  } catch (error) {
    return handleApiError(error, "Không thể lấy danh sách phương án");
  }
};

export const calculateCriteriaWeights = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/calculate-criteria-weights",
      payload
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, "Không thể tính toán trọng số tiêu chí");
  }
};

export const calculateAlternativeScores = async (payload) => {
  try {
    // Lấy danh sách alternatives hiện tại
    const alternatives = await getAlternatives();
    const validAltIds = new Set(alternatives.map((alt) => alt.id));

    // Lọc comparisons để chỉ giữ lại các cặp có alt_ids tồn tại trong alternatives
    const filteredComparisons = payload.comparisons.filter(
      (comp) => validAltIds.has(comp.alt1_id) && validAltIds.has(comp.alt2_id)
    );

    if (filteredComparisons.length === 0) {
      throw new Error(
        "Không có phương án hợp lệ để so sánh. Vui lòng cập nhật danh sách phương án."
      );
    }

    // Cập nhật payload với danh sách comparisons đã lọc
    const updatedPayload = {
      ...payload,
      comparisons: filteredComparisons,
    };

    const response = await axiosInstance.post(
      "/calculate-alternative-scores",
      updatedPayload
    );
    return response.data;
  } catch (error) {
    return handleApiError(error, "Không thể tính toán điểm số phương án");
  }
};

export const getFinalAlternativeScores = async (params) => {
  try {
    console.log("Getting final scores with params:", params);
    const response = await axiosInstance.get("/get-final-alternative-scores", {
      params,
    });
    console.log("Final scores response:", response.data);

    // Đảm bảo dữ liệu trả về hợp lệ
    if (!response.data || !Array.isArray(response.data.final_scores)) {
      throw new Error(
        "Dữ liệu trả về không hợp lệ hoặc không có điểm số cuối cùng"
      );
    }

    return response.data;
  } catch (error) {
    throw handleApiError(error, "Không thể lấy kết quả cuối cùng");
  }
};
export const getCriteriaMatrix = async ({ customer_id, expert_id }) => {
  const response = await fetch(
    `http://localhost:5000/get-criteria-matrix?customer_id=${customer_id}&expert_id=${expert_id}`
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.matrix;
};

export const getAlternativeComparisons = async ({
  customer_id,
  expert_id,
  criterion_id,
}) => {
  const response = await fetch(
    `http://localhost:5000/get-alternative-comparisons?customer_id=${customer_id}&expert_id=${expert_id}&criterion_id=${criterion_id}`
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.comparisons;
};
