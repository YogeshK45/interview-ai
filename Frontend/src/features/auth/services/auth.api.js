import axios from "axios"

// Dynamically select API URL from Vite environment variables or fallback to Render backend
const API_URL = import.meta.env.VITE_API_URL || "https://interview-ai-backend-hlcw.onrender.com";

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
})

export async function register({ username, email, password }) {
    try {
        const response = await api.post("/api/auth/register", {
            username,
            email,
            password
        })
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Registration failed. Please try again."
        throw new Error(message)
    }
}

export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", {
            email,
            password
        })
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Login failed. Please check credentials."
        throw new Error(message)
    }
}

export async function logout() {
    try {
        const response = await api.get("/api/auth/logout")
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Logout failed."
        throw new Error(message)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me")
        return response.data
    } catch (err) {
        const message = err.response?.data?.message || "Failed to fetch user profile."
        throw new Error(message)
    }
}