import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const TOKEN_KEY = "second_brain_token";

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function saveTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (!token) {
    return false;
  }

  setToken(token);
  url.searchParams.delete("token");
  window.history.replaceState({}, "", url.toString());
  return true;
}

export default api;
