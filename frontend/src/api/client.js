import axios from 'axios'

// One configured axios instance for every backend call, so base URL + auth
// live in a single place instead of being copy-pasted per component.
// See .claude/roadmap/frontend-backend-integration.md (Step 1).
const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
})

// Attach the stored Supabase access token to every request when present. The
// login flow stores it under "accessToken" (see LoginForm).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On a 401 the session is no longer usable — clear it so the app treats the
// user as signed out (App.jsx reads these keys) and re-prompts for login. We
// still reject so the caller can react (e.g. redirect / show a message).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('sessionExpiresAt')
    }
    return Promise.reject(error)
  }
)

export default api
