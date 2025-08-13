"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Stock.module.css"

function Stock() {
  const { user } = useAuth()
  const [stockItems, setStockItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStockItems()
    }
  }, [user])

  useEffect(() => {
    const filtered = stockItems.filter((item) => item.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredItems(filtered)
  }, [stockItems, searchTerm])

  const fetchStockItems = async () => {
    try {
      const q = query(collection(db, "transactions"), where("userId", "==", user.uid))

      const querySnapshot = await getDocs(q)
      const items = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.expiryDate) {
          items.push({ id: doc.id, ...data })
        }
      })

      setStockItems(items)
    } catch (error) {
      console.error("Error fetching stock items:", error)
    } finally {
      setLoading(false)
    }
  }

  const getExpiryStatus = (expiryDate) => {
    const now = new Date()
    const expiry = expiryDate.toDate()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (expiry < now) {
      return "expired"
    } else if (expiry <= sevenDaysFromNow) {
      return "nearExpiry"
    }
    return "good"
  }

  if (loading) {
    return <div className={styles.loading}>Loading stock items...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Stock & Expiry Tracking</h1>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className={styles.noItems}>
          {stockItems.length === 0 ? "No stock items with expiry dates found." : "No items match your search."}
        </div>
      ) : (
        <div className={styles.stockGrid}>
          {filteredItems.map((item) => {
            const expiryStatus = getExpiryStatus(item.expiryDate)
            return (
              <div key={item.id} className={`${styles.stockCard} ${styles[expiryStatus]}`}>
                <h3>{item.itemName}</h3>
                <div className={styles.stockDetails}>
                  <p>Quantity: {item.quantity}</p>
                  <p>Cost Price: ${item.costPrice.toFixed(2)}</p>
                  <p>Selling Price: ${item.sellingPrice.toFixed(2)}</p>
                  <p>Transaction Date: {item.transactionDate.toDate().toLocaleDateString()}</p>
                  <p className={styles.expiryDate}>Expiry: {item.expiryDate.toDate().toLocaleDateString()}</p>
                  <div className={styles.statusBadge}>
                    {expiryStatus === "expired" && "EXPIRED"}
                    {expiryStatus === "nearExpiry" && "EXPIRES SOON"}
                    {expiryStatus === "good" && "GOOD"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Stock
