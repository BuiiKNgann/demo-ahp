// src/services/api.js
import axios from "axios";

const API_URL = "http://localhost:5000";

export const getExperts = async () => {
  try {
    const response = await axios.get(`${API_URL}/get-experts`);
    return response.data.experts;
  } catch (error) {
    console.error("Error fetching experts:", error);
    throw error;
  }
};

export const getCriteria = async () => {
  try {
    const response = await axios.get(`${API_URL}/get-criteria`);
    return response.data.criteria;
  } catch (error) {
    console.error("Error fetching criteria:", error);
    throw error;
  }
};

export const getAlternatives = async () => {
  try {
    const response = await axios.get(`${API_URL}/get-alternatives`);
    return response.data.alternatives;
  } catch (error) {
    console.error("Error fetching alternatives:", error);
    throw error;
  }
};

export const calculateCriteriaWeights = async (expertId, comparisonMatrix) => {
  try {
    const response = await axios.post(`${API_URL}/calculate-criteria-weights`, {
      expert_id: expertId,
      comparison_matrix: comparisonMatrix,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("Backend Error:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    throw error;
  }
};

export const calculateAlternativeScores = async (
  expertId,
  criteriaId,
  comparisonMatrix
) => {
  try {
    const response = await axios.post(
      `${API_URL}/calculate-alternative-scores`,
      {
        expert_id: expertId,
        criteria_id: criteriaId,
        comparison_matrix: comparisonMatrix,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error calculating alternative scores:", error);
    throw error;
  }
};
export const getFinalAlternativeScores = async () => {
  try {
    const response = await axios.get(`${API_URL}/get-final-alternative-scores`);
    return response.data.final_scores;
  } catch (error) {
    console.error("Error fetching final scores:", error);
    throw error;
  }
};
