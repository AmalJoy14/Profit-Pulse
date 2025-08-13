"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Stock.module.css"

function Stock() {
  const { user } = useAuth()
  const [stockItems, setStockItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    itemName: "",
    costPrice: "",
    quantity: "",
    expiryDate: "",
  })

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
      const stockQuery = query(collection(db, "stock"), where("userId", "==", user.uid))
      const stockSnapshot = await getDocs(stockQuery)

      const items = []
      stockSnapshot.forEach((doc) => {
        const data = doc.data()
        items.push({ id: doc.id, ...data })
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

  const removeExpiredItems = async () => {
    const expiredItems = stockItems.filter((item) => item.expiryDate && getExpiryStatus(item.expiryDate) === "expired")

    if (expiredItems.length === 0) {
      alert("No expired items found")
      return
    }

    if (
      !confirm(`Are you sure you want to remove ${expiredItems.length} expired items? This will record them as losses.`)
    )
      return

    try {
      for (const item of expiredItems) {
        // Record as loss transaction
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          itemName: `${item.itemName} (Expired)`,
          costPrice: item.costPrice,
          sellingPrice: 0,
          quantity: item.quantity,
          profit: -(item.costPrice * item.quantity),
          transactionDate: new Date(),
          notes: `Expired item removed from stock. Original expiry: ${item.expiryDate.toDate().toLocaleDateString()}`,
        })

        // Remove from stock
        await deleteDoc(doc(db, "stock", item.id))
      }

      await fetchStockItems()
      alert(`Removed ${expiredItems.length} expired items and recorded losses`)
    } catch (error) {
      console.error("Error removing expired items:", error)
      alert("Error removing expired items")
    }
  }

  const deleteStockItem = async (itemId, itemName, item) => {
    const reason = prompt(
      `Why are you removing "${itemName}"?\n1. Expired\n2. Damaged\n3. Other\n\nEnter reason:`,
      "Expired",
    )

    if (!reason) return

    if (!confirm(`Are you sure you want to remove "${itemName}" from stock?`)) return

    try {
      // Record as loss if expired or damaged
      if (reason.toLowerCase().includes("expired") || reason.toLowerCase().includes("damaged")) {
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          itemName: `${itemName} (${reason})`,
          costPrice: item.costPrice,
          sellingPrice: 0,
          quantity: item.quantity,
          profit: -(item.costPrice * item.quantity),
          transactionDate: new Date(),
          notes: `Item removed from stock. Reason: ${reason}`,
        })
      }

      await deleteDoc(doc(db, "stock", itemId))
      await fetchStockItems()

      if (reason.toLowerCase().includes("expired") || reason.toLowerCase().includes("damaged")) {
        alert("Item removed and loss recorded")
      } else {
        alert("Item removed from stock")
      }
    } catch (error) {
      console.error("Error deleting stock item:", error)
      alert("Error removing item")
    }
  }

  const updateQuantity = async (itemId, currentQuantity, itemName) => {
    const newQuantity = prompt(`Update quantity for "${itemName}" (current: ${currentQuantity}):`, currentQuantity)

    if (newQuantity === null) return

    const quantity = Number.parseInt(newQuantity)
    if (isNaN(quantity) || quantity < 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (quantity === 0) {
      if (confirm("Quantity is 0. Remove this item from stock?")) {
        await deleteStockItem(
          itemId,
          itemName,
          stockItems.find((item) => item.id === itemId),
        )
      }
      return
    }

    try {
      await updateDoc(doc(db, "stock", itemId), {
        quantity: quantity,
      })
      await fetchStockItems()
      alert("Quantity updated successfully")
    } catch (error) {
      console.error("Error updating quantity:", error)
      alert("Error updating quantity")
    }
  }

  const addStockItem = async (e) => {
    e.preventDefault()

    if (!formData.itemName || !formData.costPrice || !formData.quantity || !formData.expiryDate) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await addDoc(collection(db, "stock"), {
        userId: user.uid,
        itemName: formData.itemName,
        costPrice: Number.parseFloat(formData.costPrice),
        quantity: Number.parseInt(formData.quantity),
        expiryDate: new Date(formData.expiryDate),
        addedDate: new Date(),
      })

      setFormData({
        itemName: "",
        costPrice: "",
        quantity: "",
        expiryDate: "",
      })
      setShowAddForm(false)
      await fetchStockItems()
      alert("Item added to stock successfully!")
    } catch (error) {
      console.error("Error adding stock item:", error)
      alert("Error adding item to stock")
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading stock items...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Stock Management</h1>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <button onClick={() => setShowAddForm(!showAddForm)} className={styles.addInventoryBtn}>
          {showAddForm ? "Cancel" : "Add Stock Item"}
        </button>
        <button
          onClick={removeExpiredItems}
          className={styles.removeExpiredBtn}
          disabled={
            stockItems.filter((item) => item.expiryDate && getExpiryStatus(item.expiryDate) === "expired").length === 0
          }
        >
          Remove All Expired (
          {stockItems.filter((item) => item.expiryDate && getExpiryStatus(item.expiryDate) === "expired").length})
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addStockItem} className={styles.addForm}>
          <h3>Add Item to Stock</h3>
          <div className={styles.formGrid}>
            <input
              type="text"
              placeholder="Item Name *"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Cost Price *"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Quantity *"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <input
              type="date"
              placeholder="Expiry Date *"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              required
            />
          </div>
          <button type="submit" className={styles.submitBtn}>
            Add to Stock
          </button>
        </form>
      )}

      {filteredItems.length === 0 ? (
        <div className={styles.noItems}>
          {stockItems.length === 0 ? "No stock items found. Add some items!" : "No items match your search."}
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
                  <p>Added: {item.addedDate.toDate().toLocaleDateString()}</p>
                  <p className={styles.expiryDate}>Expiry: {item.expiryDate.toDate().toLocaleDateString()}</p>
                  <div className={styles.statusBadge}>
                    {expiryStatus === "expired" && "EXPIRED"}
                    {expiryStatus === "nearExpiry" && "EXPIRES SOON"}
                    {expiryStatus === "good" && "GOOD"}
                  </div>
                </div>
                <div className={styles.stockActions}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity, item.itemName)}
                    className={styles.updateBtn}
                  >
                    Update Qty
                  </button>
                  <button onClick={() => deleteStockItem(item.id, item.itemName, item)} className={styles.deleteBtn}>
                    Remove
                  </button>
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
