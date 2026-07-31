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
// user as signed out (App.jsx reads these keys), then send them to /login
// (covers a token lapsing mid-flow, e.g. during the slow AI call). We still
// reject so the caller can also react. Guard the redirect so we don't loop
// when the failing request IS the login call.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response object means the request never reached a running server
    // (network failure / CORS-with-no-header). On our free Render tier the
    // usual cause is a cold start: the backend spun down after idle and takes
    // 30-60s to wake, so the first request gets no answer. Flag it so it's
    // obvious in the console instead of looking like a CORS bug.
    if (!error.response && error.request) {
      console.warn(
        'Backend did not respond — likely a cold start (free-tier spin-up). Retry in ~30-60s.'
      )
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('sessionExpiresAt')
      const onAuthPage = ['/login', '/register'].includes(window.location.pathname)
      if (!onAuthPage) window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default api
