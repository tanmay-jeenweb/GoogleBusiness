import apiClient from "./authApi";

export const fetchAccountsRegistry = async () => {
    return apiClient.get("/accounts");
};

export const fetchAccountDetail = async (domainName) => {
    return apiClient.get(`/accounts/detail/${encodeURIComponent(domainName)}`);
};
