import apiClient from "./authApi";

export const fetchFinancialOverview = async (month = "All Months") => {
    return apiClient.get(`/dashboard/financial-overview?month=${encodeURIComponent(month)}`);
};

export const fetchActivityBreakdown = async (month = "All Months") => {
    return apiClient.get(`/dashboard/activity-breakdown?month=${encodeURIComponent(month)}`);
};

export const fetchAvailableMonths = async () => {
    return apiClient.get(`/dashboard/available-months`);
};
