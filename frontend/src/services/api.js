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
    const response = await axiosInstance.post(
      "/calculate-alternative-scores",
      payload
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
