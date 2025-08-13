"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Transactions.module.css"

function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [formData, setFormData] = useState({
    itemName: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "",
    transactionDate: "",
    expiryDate: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        orderBy("transactionDate", "desc"),
      )

      const querySnapshot = await getDocs(q)
      const transactionsList = []
      querySnapshot.forEach((doc) => {
        transactionsList.push({ id: doc.id, ...doc.data() })
      })

      setTransactions(transactionsList)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const costPrice = Number.parseFloat(formData.costPrice)
      const sellingPrice = Number.parseFloat(formData.sellingPrice)
      const quantity = Number.parseInt(formData.quantity)
      const profit = (sellingPrice - costPrice) * quantity

      const transactionData = {
        userId: user.uid,
        itemName: formData.itemName,
        costPrice,
        sellingPrice,
        quantity,
        profit,
        transactionDate: new Date(formData.transactionDate),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
      }

      await addDoc(collection(db, "transactions"), transactionData)

      setFormData({
        itemName: "",
        costPrice: "",
        sellingPrice: "",
        quantity: "",
        transactionDate: "",
        expiryDate: "",
      })

      fetchTransactions()
    } catch (error) {
      console.error("Error adding transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Transactions</h1>

      <div className={styles.formCard}>
        <h2>Add New Transaction</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="itemName">Item Name</label>
              <input
                type="text"
                id="itemName"
                name="itemName"
                value={formData.itemName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="costPrice">Cost Price ($)</label>
              <input
                type="number"
                id="costPrice"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="sellingPrice">Selling Price ($)</label>
              <input
                type="number"
                id="sellingPrice"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="transactionDate">Transaction Date</label>
              <input
                type="date"
                id="transactionDate"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="expiryDate">Expiry Date (Optional)</label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Adding..." : "Add Transaction"}
          </button>
        </form>
      </div>

      <div className={styles.transactionsList}>
        <h2>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className={styles.noTransactions}>No transactions yet.</p>
        ) : (
          <div className={styles.transactionsGrid}>
            {transactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionCard}>
                <h3>{transaction.itemName}</h3>
                <div className={styles.transactionDetails}>
                  <p>Quantity: {transaction.quantity}</p>
                  <p>Cost: ${transaction.costPrice.toFixed(2)}</p>
                  <p>Selling: ${transaction.sellingPrice.toFixed(2)}</p>
                  <p className={transaction.profit >= 0 ? styles.profit : styles.loss}>
                    Profit: ${transaction.profit.toFixed(2)}
                  </p>
                  <p>Date: {transaction.transactionDate.toDate().toLocaleDateString()}</p>
                  {transaction.expiryDate && <p>Expires: {transaction.expiryDate.toDate().toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Transactions
