import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {
    const navigate = useNavigate()
    const { loading, authError, handleRegister } = useAuth()

    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ localError, setLocalError ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLocalError("")

        if (!username.trim() || !email.trim() || !password) {
            setLocalError("Please fill in all fields.")
            return
        }

        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters long.")
            return
        }

        const success = await handleRegister({
            username: username.trim(),
            email: email.trim(),
            password
        })

        if (success) {
            navigate("/app")
        }
    }

    const activeError = localError || authError

    return (
        <main>
            <div className="form-container">
                <Link className="back-link" to="/">← Back to Home</Link>
                <h1>Register</h1>

                {activeError && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem'
                    }}>
                        {activeError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter email address"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter password (min 6 characters)"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="button primary-button"
                        disabled={loading}
                    >
                        {loading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <p>Already have an account? <Link to="/login">Login</Link></p>
            </div>
        </main>
    )
}

export default Register