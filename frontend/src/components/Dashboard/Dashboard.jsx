"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Dashboard.module.css"

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalProfit: 0,
    profitableDeals: 0,
    lossDeals: 0,
    totalStockItems: 0,
    nearExpiryItems: 0,
    expiredItems: 0,
    totalPendingDues: 0,
    overdueDues: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      const transactionsQuery = query(collection(db, "transactions"), where("userId", "==", user.uid))
      const stockQuery = query(collection(db, "stock"), where("userId", "==", user.uid))
      const duesQuery = query(collection(db, "dues"), where("userId", "==", user.uid))

      const [transactionsSnapshot, stockSnapshot, duesSnapshot] = await Promise.all([
        getDocs(transactionsQuery),
        getDocs(stockQuery),
        getDocs(duesQuery),
      ])

      let totalProfit = 0
      let profitableDeals = 0
      let lossDeals = 0

      transactionsSnapshot.forEach((doc) => {
        const data = doc.data()
        const profit = data.profit || 0

        totalProfit += profit

        if (profit > 0) {
          profitableDeals++
        } else if (profit < 0) {
          lossDeals++
        }
      })

      let totalStockItems = 0
      let nearExpiryItems = 0
      let expiredItems = 0

      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      stockSnapshot.forEach((doc) => {
        const data = doc.data()
        totalStockItems += data.quantity || 0

        if (data.expiryDate) {
          const expiryDate = data.expiryDate.toDate()
          if (expiryDate < now) {
            expiredItems++
          } else if (expiryDate <= sevenDaysFromNow) {
            nearExpiryItems++
          }
        }
      })

      let totalPendingDues = 0
      let overdueDues = 0

      duesSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.status === "pending") {
          totalPendingDues += data.amount || 0

          if (data.dueDate && data.dueDate.toDate() < now) {
            overdueDues++
          }
        }
      })

      setStats({
        totalProfit,
        profitableDeals,
        lossDeals,
        totalStockItems,
        nearExpiryItems,
        expiredItems,
        totalPendingDues,
        overdueDues,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading dashboard...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Profit/Loss</h3>
          <p className={stats.totalProfit >= 0 ? styles.profit : styles.loss}>${stats.totalProfit.toFixed(2)}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Profitable Sales</h3>
          <p className={styles.profit}>{stats.profitableDeals}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Loss Transactions</h3>
          <p className={styles.loss}>{stats.lossDeals}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Total Stock Items</h3>
          <p className={styles.info}>{stats.totalStockItems}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Near Expiry (7 days)</h3>
          <p className={styles.warning}>{stats.nearExpiryItems}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Expired Items</h3>
          <p className={styles.loss}>{stats.expiredItems}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Pending Dues</h3>
          <p className={styles.warning}>${stats.totalPendingDues.toFixed(2)}</p>
        </div>

        <div className={styles.statCard}>
          <h3>Overdue Payments</h3>
          <p className={styles.loss}>{stats.overdueDues}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
