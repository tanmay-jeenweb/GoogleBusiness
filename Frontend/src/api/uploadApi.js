import apiClient from "./authApi";

export const uploadAccountActivitiesFile = async (file, company = "jeenweb") => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/upload/${company}/account-activities`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const uploadMasterAccountFile = async (file, company = "jeenweb") => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/upload/${company}/master-account`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const fetchUploadHistory = async (company = "all") => {
    return apiClient.get(`/upload/history?company=${company}`);
};

export const fetchTransactions = async (company = "all") => {
    return apiClient.get(`/upload/transactions?company=${company}`);
};

export const deleteUploadRecord = async (id) => {
    return apiClient.delete(`/upload/record/${id}`);
};

export const clearAccountActivitiesSql = async (company = "jeenweb") => {
    return apiClient.delete(`/upload/clear/${company}/account-activities`);
};

export const clearMasterAccountSql = async (company = "jeenweb") => {
    return apiClient.delete(`/upload/clear/${company}/master-account`);
};

export const clearAllUploadsSql = async (company = "all") => {
    return apiClient.delete(`/upload/clear/${company}/all`);
};
