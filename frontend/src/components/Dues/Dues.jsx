"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Dues.module.css"

function Dues() {
  const { user } = useAuth()
  const [dues, setDues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    description: "",
    dueDate: "",
  })

  useEffect(() => {
    if (user) {
      fetchDues()
    }
  }, [user])

  const fetchDues = async () => {
    try {
      const q = query(collection(db, "dues"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const duesData = []

      querySnapshot.forEach((doc) => {
        duesData.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setDues(duesData)
    } catch (error) {
      console.error("Error fetching dues:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, "dues"), {
        ...formData,
        amount: Number.parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate),
        userId: user.uid,
        createdAt: new Date(),
        status: "pending",
      })

      setFormData({
        customerName: "",
        amount: "",
        description: "",
        dueDate: "",
      })
      setShowForm(false)
      fetchDues()
    } catch (error) {
      console.error("Error adding due:", error)
    }
  }

  const markAsPaid = async (dueId) => {
    try {
      await updateDoc(doc(db, "dues", dueId), {
        status: "paid",
        paidAt: new Date(),
      })
      fetchDues()
    } catch (error) {
      console.error("Error marking as paid:", error)
    }
  }

  const deleteDue = async (dueId) => {
    try {
      await deleteDoc(doc(db, "dues", dueId))
      fetchDues()
    } catch (error) {
      console.error("Error deleting due:", error)
    }
  }

  const totalPending = dues.filter((due) => due.status === "pending").reduce((sum, due) => sum + due.amount, 0)

  if (loading) {
    return <div className={styles.loading}>Loading dues...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pending Dues</h1>
        <button onClick={() => setShowForm(!showForm)} className={styles.addButton}>
          {showForm ? "Cancel" : "Add Due"}
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h3>Total Pending</h3>
          <p className={styles.amount}>${totalPending.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>Pending Count</h3>
          <p className={styles.count}>{dues.filter((due) => due.status === "pending").length}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this payment for?"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Add Due
          </button>
        </form>
      )}

      <div className={styles.duesList}>
        {dues.length === 0 ? (
          <p className={styles.noDues}>No dues recorded yet.</p>
        ) : (
          dues.map((due) => {
            const dueDate = due.dueDate.toDate()
            const isOverdue = dueDate < new Date() && due.status === "pending"

            return (
              <div
                key={due.id}
                className={`${styles.dueCard} ${due.status === "paid" ? styles.paid : ""} ${isOverdue ? styles.overdue : ""}`}
              >
                <div className={styles.dueInfo}>
                  <h3>{due.customerName}</h3>
                  <p className={styles.dueAmount}>${due.amount.toFixed(2)}</p>
                  <p className={styles.description}>{due.description}</p>
                  <p className={styles.dueDate}>
                    Due: {dueDate.toLocaleDateString()}
                    {isOverdue && <span className={styles.overdueLabel}> (Overdue)</span>}
                  </p>
                  <p className={styles.status}>Status: {due.status}</p>
                </div>

                <div className={styles.actions}>
                  {due.status === "pending" && (
                    <button onClick={() => markAsPaid(due.id)} className={styles.paidButton}>
                      Mark Paid
                    </button>
                  )}
                  <button onClick={() => deleteDue(due.id)} className={styles.deleteButton}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Dues;