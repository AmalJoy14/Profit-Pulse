"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Transactions.module.css"

function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [formData, setFormData] = useState({
    itemName: "",
    sellingPrice: "",
    quantity: "",
    transactionDate: "",
  })
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)

  useEffect(() => {
    if (user) {
      fetchTransactions()
      fetchStockItems()
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

  const fetchStockItems = async () => {
    try {
      const q = query(collection(db, "stock"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const stockList = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.quantity > 0) {
          stockList.push({ id: doc.id, ...data })
        }
      })
      setStockItems(stockList)
    } catch (error) {
      console.error("Error fetching stock items:", error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (name === "itemName") {
      const stock = stockItems.find((item) => item.itemName === value)
      setSelectedStock(stock || null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!selectedStock) {
        alert("Please select a valid item from stock")
        setLoading(false)
        return
      }

      const quantity = Number.parseInt(formData.quantity)
      const sellingPrice = Number.parseFloat(formData.sellingPrice)

      if (quantity > selectedStock.quantity) {
        alert(`Not enough stock! Available: ${selectedStock.quantity}, Requested: ${quantity}`)
        setLoading(false)
        return
      }

      const costPrice = selectedStock.costPrice
      const profit = (sellingPrice - costPrice) * quantity

      const transactionData = {
        userId: user.uid,
        itemName: formData.itemName,
        costPrice,
        sellingPrice,
        quantity,
        profit,
        transactionDate: new Date(formData.transactionDate),
        stockId: selectedStock.id,
      }

      await addDoc(collection(db, "transactions"), transactionData)

      const newStockQuantity = selectedStock.quantity - quantity
      await updateDoc(doc(db, "stock", selectedStock.id), {
        quantity: newStockQuantity,
      })

      setFormData({
        itemName: "",
        sellingPrice: "",
        quantity: "",
        transactionDate: "",
      })
      setSelectedStock(null)

      await fetchTransactions()
      await fetchStockItems()
      alert("Transaction recorded successfully!")
    } catch (error) {
      console.error("Error adding transaction:", error)
      alert("Error recording transaction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sales Transactions</h1>

      <div className={styles.formCard}>
        <h2>Record New Sale</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="itemName">Select Item from Stock</label>
              <select id="itemName" name="itemName" value={formData.itemName} onChange={handleInputChange} required>
                <option value="">-- Select Item --</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.itemName}>
                    {item.itemName} (Available: {item.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="quantity">Quantity to Sell</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                max={selectedStock ? selectedStock.quantity : 1}
                required
              />
              {selectedStock && (
                <small className={styles.stockInfo}>
                  Max available: {selectedStock.quantity} | Cost: ${selectedStock.costPrice.toFixed(2)} each
                </small>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="sellingPrice">Selling Price per Unit ($)</label>
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
              {selectedStock && formData.sellingPrice && formData.quantity && (
                <small className={styles.profitInfo}>
                  Profit per unit: ${(Number.parseFloat(formData.sellingPrice) - selectedStock.costPrice).toFixed(2)} |
                  Total profit: $
                  {(
                    (Number.parseFloat(formData.sellingPrice) - selectedStock.costPrice) *
                    Number.parseInt(formData.quantity || 0)
                  ).toFixed(2)}
                </small>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="transactionDate">Sale Date</label>
              <input
                type="date"
                id="transactionDate"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading || !selectedStock} className={styles.submitButton}>
            {loading ? "Recording..." : "Record Sale"}
          </button>
        </form>
      </div>

      <div className={styles.transactionsList}>
        <h2>Recent Sales</h2>
        {transactions.length === 0 ? (
          <p className={styles.noTransactions}>No sales recorded yet.</p>
        ) : (
          <div className={styles.transactionsGrid}>
            {transactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionCard}>
                <h3>{transaction.itemName}</h3>
                <div className={styles.transactionDetails}>
                  <p>Quantity Sold: {transaction.quantity}</p>
                  <p>Cost per Unit: ${transaction.costPrice.toFixed(2)}</p>
                  <p>Selling Price: ${transaction.sellingPrice.toFixed(2)}</p>
                  <p className={transaction.profit >= 0 ? styles.profit : styles.loss}>
                    Total Profit: ${transaction.profit.toFixed(2)}
                  </p>
                  <p>Sale Date: {transaction.transactionDate.toDate().toLocaleDateString()}</p>
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
