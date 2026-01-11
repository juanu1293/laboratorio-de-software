// src/apiService.js

//Normaliza la URL base del API desde la variable de entorno Vite o usa localhost en desarrollo
const envBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE_URL = envBase.replace(/\/$/, "") + "/api";

// Función para obtener el token (de localStorage o sessionStorage)
const getToken = () => {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
};

/**
 * Realiza una solicitud fetch autenticada
 * @param {string} endpoint - El endpoint de la API (ej: "/auth/login" o "/cards")
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {object} [body] - El cuerpo de la solicitud para POST/PUT
 * @returns {Promise<object>} - La respuesta JSON del servidor
 */
const request = async (endpoint, method, body = null) => {
  const token = getToken();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  }

  const config = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    config.body = JSON.stringify(body);
  }

  try {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      // Intentar leer JSON de error si existe
      let errorText = `Error en la solicitud ${method} ${url}`;
      try {
        const errorData = await response.json();
        errorText = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        // no JSON en body
      }
      const err = new Error(errorText);
      err.status = response.status;
      throw err;
    }

    if (response.status === 204) return {};

    return response.json();
  } catch (error) {
    console.error(`Error en la solicitud API (${method} ${endpoint}):`, error);
    throw error;
  }
};

// Exportamos métodos específicos para facilidad de uso
const apiService = {
  get: (endpoint) => request(endpoint, "GET"),
  post: (endpoint, body) => request(endpoint, "POST", body),
  put: (endpoint, body) => request(endpoint, "PUT", body),
  patch: (endpoint, body) => request(endpoint, "PATCH", body),
  delete: (endpoint) => request(endpoint, "DELETE"),
};

export default apiService;

