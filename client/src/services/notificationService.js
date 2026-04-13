// services/notificationService.js

import axios from "axios";
import { getToken } from "./tokenService";

const API_URL   = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

// role = "BUYER" | "SELLER" | "LOGISTICS" | null (all)
export const getNotifications = async (role = null) => {
  const params = role ? { role } : {};
  return (await axios.get(`${API_URL}/notifications`, {
    headers: authHeader(),
    params,
  })).data;
};

export const markAsRead = async (id) =>
  (await axios.put(`${API_URL}/notifications/${id}/read`, {}, { headers: authHeader() })).data;

export const markAllAsRead = async (role = null) => {
  const params = role ? { role } : {};
  return (await axios.put(`${API_URL}/notifications/read-all`, {}, {
    headers: authHeader(),
    params,
  })).data;
};

export const deleteNotification = async (id) =>
  (await axios.delete(`${API_URL}/notifications/${id}`, { headers: authHeader() })).data;

export const deleteAllRead = async (role = null) => {
  const params = role ? { role } : {};
  return (await axios.delete(`${API_URL}/notifications/read`, {
    headers: authHeader(),
    params,
  })).data;
};