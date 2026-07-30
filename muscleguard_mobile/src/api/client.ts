import axios from 'axios';
import { Platform } from 'react-native';

// For iOS simulator/device use local machine IP, for Android emulator use 10.0.2.2
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://172.20.10.4:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const ApiServices = {
  async login(username: string, pass: string) {
    const res = await api.post('/login', { username, password: pass });
    return res.data;
  },

  async register(username: string, pass: string, role: string) {
    const res = await api.post('/register', { username, password: pass, role });
    return res.data;
  },

  async getProfile(userId: string) {
    const res = await api.get(`/profile/${userId}`);
    return res.data;
  },

  async saveProfile(profile: any) {
    const res = await api.post('/profile', profile);
    return res.data;
  },

  async predict(data: any) {
    const res = await api.post('/predict', data);
    return res.data;
  },

  async saveResult(data: any) {
    const res = await api.post('/save', data);
    return res.data;
  },

  async getHistory(userId: string) {
    const res = await api.get(`/history/${userId}`);
    return res.data;
  },

  async getCoach(userId: string) {
    const res = await api.get(`/client/coach/${userId}`);
    return res.data;
  },

  async linkCoach(clientId: string, coachCode: string) {
    const res = await api.post('/coach/link', { client_id: clientId, coach_code: coachCode });
    return res.data;
  },

  async unlinkClient(coachId: string, clientId: string) {
    const res = await api.post('/coach/unlink', { coach_id: coachId, client_id: clientId });
    return res.data;
  },

  async getMessages(userId: string, otherId: string) {
    const res = await api.get(`/messages/${userId}/${otherId}`);
    return res.data;
  },

  async sendMessage(senderId: string, receiverId: string, content: string, msgType: string = 'message') {
    const res = await api.post('/messages/send', { sender_id: senderId, receiver_id: receiverId, content, msg_type: msgType });
    return res.data;
  },

  async getUnreadCount(userId: string) {
    const res = await api.get(`/messages/unread/${userId}`);
    return res.data;
  },

  async markMessagesRead(userId: string, senderId: string) {
    const res = await api.post('/messages/read', { user_id: userId, sender_id: senderId });
    return res.data;
  },

  async getCoachClients(coachId: string) {
    const res = await api.get(`/coach/clients/${coachId}`);
    return res.data;
  },

  async getClientProgress(clientId: string) {
    const res = await api.get(`/coach/client-progress/${clientId}`);
    return res.data;
  },

  async onboard(data: any) {
    const res = await api.post('/onboard', data);
    return res.data;
  },
};
