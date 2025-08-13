"use client"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Navigation.module.css"

function Navigation() {
  const { logout } = useAuth()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Failed to log out")
    }
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.logo}>
          ProfitPulse
        </Link>

        <div className={styles.links}>
          <Link to="/dashboard" className={`${styles.link} ${location.pathname === "/dashboard" ? styles.active : ""}`}>
            Dashboard
          </Link>
          <Link
            to="/transactions"
            className={`${styles.link} ${location.pathname === "/transactions" ? styles.active : ""}`}
          >
            Transactions
          </Link>
          <Link to="/stock" className={`${styles.link} ${location.pathname === "/stock" ? styles.active : ""}`}>
            Stock
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
