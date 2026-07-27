import React from 'react'
import { useAuth } from "../hooks/useAuth"
import { Navigate } from "react-router"

const Protected = ({ children }) => {
    const { loading, user } = useAuth()

    if (loading) {
        return (
            <main className="loading-screen" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0f172a',
                color: '#f8fafc'
            }}>
                <h1>Loading application...</h1>
            </main>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

export default Protected