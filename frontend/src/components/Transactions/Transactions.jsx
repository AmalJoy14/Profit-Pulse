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
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    transactionDate: "",
    customerName: "",
    customerEmail: "",
    amountPaid: "",
  })
  const [selectedItems, setSelectedItems] = useState([])
  const [loading, setLoading] = useState(false)

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

  const addItemToSelection = () => {
    setSelectedItems([
      ...selectedItems,
      {
        id: Date.now(),
        itemName: "",
        stockId: "",
        quantity: "",
        sellingPrice: "",
        availableQuantity: 0,
        costPrice: 0,
      },
    ])
  }

  const removeItemFromSelection = (id) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== id))
  }

  const updateSelectedItem = (id, field, value) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          if (field === "itemName") {
            const stock = stockItems.find((stockItem) => stockItem.itemName === value)
            if (stock) {
              updatedItem.stockId = stock.id
              updatedItem.availableQuantity = stock.quantity
              updatedItem.costPrice = stock.costPrice
            }
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (selectedItems.length === 0) {
        alert("Please add at least one item to the sale")
        setLoading(false)
        return
      }

      for (const item of selectedItems) {
        if (!item.itemName || !item.quantity || !item.sellingPrice) {
          alert("Please fill in all fields for each selected item")
          setLoading(false)
          return
        }

        const quantity = Number.parseInt(item.quantity)
        if (quantity > item.availableQuantity) {
          alert(`Not enough stock for ${item.itemName}! Available: ${item.availableQuantity}, Requested: ${quantity}`)
          setLoading(false)
          return
        }
      }

      const amountPaid = Number.parseFloat(formData.amountPaid)

      let totalAmount = 0
      let totalProfit = 0
      const itemDetails = []

      selectedItems.forEach((item) => {
        const quantity = Number.parseInt(item.quantity)
        const sellingPrice = Number.parseFloat(item.sellingPrice)
        const itemTotal = sellingPrice * quantity
        const itemProfit = (sellingPrice - item.costPrice) * quantity

        totalAmount += itemTotal
        totalProfit += itemProfit

        itemDetails.push({
          itemName: item.itemName,
          quantity,
          sellingPrice,
          costPrice: item.costPrice,
          itemTotal,
          itemProfit,
          stockId: item.stockId,
        })
      })

      const dueAmount = totalAmount - amountPaid

      if (amountPaid > totalAmount) {
        alert("Amount paid cannot be more than total amount")
        setLoading(false)
        return
      }

      const transactionData = {
        userId: user.uid,
        items: itemDetails,
        totalProfit,
        transactionDate: new Date(formData.transactionDate),
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        totalAmount,
        amountPaid,
        dueAmount,
        paymentStatus: dueAmount > 0 ? "partial" : "paid",
        itemCount: selectedItems.length,
      }

      await addDoc(collection(db, "transactions"), transactionData)

      if (dueAmount > 0) {
        const itemsList = itemDetails.map((item) => `${item.quantity} ${item.itemName}`).join(", ")
        await addDoc(collection(db, "dues"), {
          userId: user.uid,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          amount: dueAmount,
          description: `Sale of ${itemsList}`,
          dueDate: new Date(formData.transactionDate),
          createdAt: new Date(),
          status: "pending",
          transactionId: null,
        })
      }

      for (const item of itemDetails) {
        const currentStock = stockItems.find((stock) => stock.id === item.stockId)
        const newQuantity = currentStock.quantity - item.quantity
        await updateDoc(doc(db, "stock", item.stockId), {
          quantity: newQuantity,
        })
      }

      setFormData({
        transactionDate: "",
        customerName: "",
        customerEmail: "",
        amountPaid: "",
      })
      setSelectedItems([])

      await fetchTransactions()
      await fetchStockItems()
      alert(
        dueAmount > 0
          ? `Transaction recorded! Due amount of $${dueAmount.toFixed(2)} added to dues.`
          : "Transaction recorded successfully!",
      )
    } catch (error) {
      console.error("Error adding transaction:", error)
      alert("Error recording transaction")
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = selectedItems.reduce((total, item) => {
    if (item.quantity && item.sellingPrice) {
      return total + Number.parseFloat(item.sellingPrice) * Number.parseInt(item.quantity)
    }
    return total
  }, 0)

  const filteredTransactions = transactions.filter((transaction) =>
    (transaction.customerEmail || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sales Transactions</h1>

      <div className={styles.formCard}>
        <h2>Record New Sale</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="customerName">Customer Name</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="customerEmail">Customer Email</label>
              <input
                type="email"
                id="customerEmail"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="Enter customer email"
                required
              />
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

          <div className={styles.itemsSection}>
            <div className={styles.sectionHeader}>
              <h3>Items to Sell</h3>
              <button type="button" onClick={addItemToSelection} className={styles.addItemButton}>
                + Add Item
              </button>
            </div>

            {selectedItems.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemInputs}>
                  <div className={styles.inputGroup}>
                    <label>Select Item</label>
                    <select
                      value={item.itemName}
                      onChange={(e) => updateSelectedItem(item.id, "itemName", e.target.value)}
                      required
                    >
                      <option value="">-- Select Item --</option>
                      {stockItems.map((stockItem) => {
                        let dateStr = "";
                        if (stockItem.addedDate && typeof stockItem.addedDate.toDate === "function") {
                          dateStr = stockItem.addedDate.toDate().toLocaleDateString();
                        } else if (stockItem.addedDate) {
                          dateStr = new Date(stockItem.addedDate).toLocaleDateString();
                        }
                        return (
                          <option key={stockItem.id} value={stockItem.itemName}>
                            {stockItem.itemName} (Added: {dateStr || "N/A"}, Available: {stockItem.quantity})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateSelectedItem(item.id, "quantity", e.target.value)}
                      min="1"
                      max={item.availableQuantity || 1}
                      required
                    />
                    {item.availableQuantity > 0 && (
                      <small className={styles.stockInfo}>
                        Max: {item.availableQuantity} | Cost: ${item.costPrice.toFixed(2)} each
                      </small>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Selling Price per Unit ($)</label>
                    <input
                      type="number"
                      value={item.sellingPrice}
                      onChange={(e) => updateSelectedItem(item.id, "sellingPrice", e.target.value)}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => removeItemFromSelection(item.id)}
                      className={styles.removeItemButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {item.quantity && item.sellingPrice && item.costPrice > 0 && (
                  <div className={styles.itemSummary}>
                    <small>
                      Item Total: $
                      {(Number.parseFloat(item.sellingPrice) * Number.parseInt(item.quantity || 0)).toFixed(2)} |
                      Profit: $
                      {(
                        (Number.parseFloat(item.sellingPrice) - item.costPrice) *
                        Number.parseInt(item.quantity || 0)
                      ).toFixed(2)}
                    </small>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalAmount > 0 && (
            <div className={styles.paymentSection}>
              <div className={styles.totalAmount}>
                <h3>Total Amount: ${totalAmount.toFixed(2)}</h3>
              </div>

              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="amountPaid">Amount Paid ($)</label>
                  <input
                    type="number"
                    id="amountPaid"
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    required
                  />
                  {formData.amountPaid && (
                    <small className={styles.dueInfo}>
                      Due Amount: ${(totalAmount - Number.parseFloat(formData.amountPaid || 0)).toFixed(2)}
                    </small>
                  )}
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || selectedItems.length === 0} className={styles.submitButton}>
            {loading ? "Recording..." : "Record Sale"}
          </button>
        </form>
      </div>

      <div className={styles.transactionsList}>
        <div className={styles.sectionHeader}>
          <h2>Recent Sales</h2>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className={styles.noTransactions}>
            {searchTerm ? `No sales found for "${searchTerm}"` : "No sales recorded yet."}
          </p>
        ) : (
          <div className={styles.transactionsGrid}>
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionCard}>
                {transaction.items ? (
                  <>
                    <h3>Multi-Item Sale ({transaction.itemCount} items)</h3>
                    <div className={styles.customerInfo}>
                      <p>
                        <strong>Customer:</strong> {transaction.customerName}
                      </p>
                      <p>
                        <strong>Email:</strong> {transaction.customerEmail || "N/A"}
                      </p>
              
                    </div>
                    <div className={styles.itemsList}>
                      {transaction.items.map((item, index) => (
                        <div key={index} className={styles.transactionItem}>
                          <p>
                            <strong>{item.itemName}</strong>
                          </p>
                          <p>
                            Quantity: {item.quantity} × ${item.sellingPrice.toFixed(2)} = ${item.itemTotal.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className={styles.transactionDetails}>
                      <p>
                        <strong>Total Amount: ${transaction.totalAmount.toFixed(2)}</strong>
                      </p>
                      <p>Amount Paid: ${transaction.amountPaid.toFixed(2)}</p>
                      {transaction.dueAmount > 0 && (
                        <p className={styles.dueAmount}>Due: ${transaction.dueAmount.toFixed(2)}</p>
                      )}
                      <p className={transaction.totalProfit >= 0 ? styles.profit : styles.loss}>
                        Total Profit: ${transaction.totalProfit.toFixed(2)}
                      </p>
                      <p>Sale Date: {transaction.transactionDate.toDate().toLocaleDateString()}</p>
                      <p className={styles.paymentStatus}>
                        Payment: {transaction.paymentStatus === "paid" ? "✅ Paid" : "⏳ Partial"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>{transaction.itemName}</h3>
                    <div className={styles.customerInfo}>
                      <p>
                        <strong>Customer:</strong> {transaction.customerName}
                      </p>
                    </div>
                    <div className={styles.transactionDetails}>
                      <p>Quantity Sold: {transaction.quantity}</p>
                      <p>Selling Price: ${transaction.sellingPrice.toFixed(2)} each</p>
                      <p>
                        <strong>
                          Total Amount: $
                          {(transaction.totalAmount || transaction.sellingPrice * transaction.quantity).toFixed(2)}
                        </strong>
                      </p>
                      <p>
                        Amount Paid: $
                        {(
                          transaction.amountPaid ||
                          transaction.totalAmount ||
                          transaction.sellingPrice * transaction.quantity
                        ).toFixed(2)}
                      </p>
                      {transaction.dueAmount > 0 && (
                        <p className={styles.dueAmount}>Due: ${transaction.dueAmount.toFixed(2)}</p>
                      )}
                      <p className={transaction.profit >= 0 ? styles.profit : styles.loss}>
                        Total Profit: ${transaction.profit.toFixed(2)}
                      </p>
                      <p>Sale Date: {transaction.transactionDate.toDate().toLocaleDateString()}</p>
                      <p className={styles.paymentStatus}>
                        Payment: {transaction.paymentStatus === "paid" ? "✅ Paid" : "⏳ Partial"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Transactions
