import apiClient from "./authApi";

export const uploadAccountActivitiesFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/upload/account-activities", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const uploadMasterAccountFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/upload/master-account", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const fetchUploadHistory = async () => {
    return apiClient.get("/upload/history");
};

export const deleteUploadRecord = async (id) => {
    return apiClient.delete(`/upload/record/${id}`);
};
