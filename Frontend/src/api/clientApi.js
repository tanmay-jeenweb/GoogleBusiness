import apiClient from "./authApi";

export const fetchClients = async () => {
    return apiClient.get("/clients");
};

export const createClient = async (data) => {
    return apiClient.post("/clients", data);
};

export const deleteClient = async (id) => {
    return apiClient.delete(`/clients/${id}`);
};

export const createSubClient = async (parentId, data) => {
    return apiClient.post(`/clients/${parentId}/subclient`, data);
};

export const deleteSubClient = async (id) => {
    return apiClient.delete(`/clients/subclient/${id}`);
};

export const fetchUnassignedDomains = async () => {
    return apiClient.get("/clients/unassigned-domains");
};

export const assignDomain = async (data) => {
    return apiClient.post("/clients/assign-domain", data);
};

export const unassignDomain = async (domain_name) => {
    return apiClient.post("/clients/unassign-domain", { domain_name });
};
