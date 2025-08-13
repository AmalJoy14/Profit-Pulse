"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { useAuth } from "./contexts/AuthContext"
import Login from "./components/Login/Login"
import Dashboard from "./components/Dashboard/Dashboard"
import Transactions from "./components/Transactions/Transactions"
import Stock from "./components/Stock/Stock"
import Navigation from "./components/Navigation/Navigation"
import Dues from "./components/Dues/Dues"
import styles from "./App.module.css"

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.app}>
      {user && <Navigation />}
      <main className={styles.main}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/transactions" element={user ? <Transactions /> : <Navigate to="/login" />} />
          <Route path="/stock" element={user ? <Stock /> : <Navigate to="/login" />} />
          <Route path="/dues" element={user ? <Dues /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
