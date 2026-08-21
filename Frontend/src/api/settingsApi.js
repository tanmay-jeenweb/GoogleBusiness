import apiClient from "./authApi";

export const fetchKeywordRules = async () => {
    return apiClient.get("/settings/rules");
};

export const createKeywordRule = async (ruleData) => {
    return apiClient.post("/settings/rules", ruleData);
};

export const updateKeywordRule = async (id, ruleData) => {
    return apiClient.put(`/settings/rules/${id}`, ruleData);
};

export const deleteKeywordRule = async (id) => {
    return apiClient.delete(`/settings/rules/${id}`);
};
