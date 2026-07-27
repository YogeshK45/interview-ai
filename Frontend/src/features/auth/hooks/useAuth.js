import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../auth.context"
import { login, register, logout, getMe } from "../services/auth.api"

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }

    const { user, setUser, loading, setLoading } = context
    const [ authError, setAuthError ] = useState("")

    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        setAuthError("")
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return true
        } catch (err) {
            setAuthError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        setAuthError("")
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            return true
        } catch (err) {
            setAuthError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        setAuthError("")
        try {
            await logout()
            setUser(null)
        } catch (err) {
            setAuthError(err.message)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        const getAndSetUser = async () => {
            try {
                const data = await getMe()
                if (isMounted) setUser(data.user)
            } catch (err) {
                if (isMounted) setUser(null)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        getAndSetUser()
        return () => {
            isMounted = false
        }
    }, [])

    return { user, loading, authError, setAuthError, handleRegister, handleLogin, handleLogout }
}