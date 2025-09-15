"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import styles from "./Dues.module.css"

function Dues() {
  const { user } = useAuth()
  const [dues, setDues] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentAmount, setPaymentAmount] = useState({})

  useEffect(() => {
    if (user) {
      fetchDues()
    }
  }, [user])

  const fetchDues = async () => {
    try {
      const q = query(collection(db, "dues"), where("userId", "==", user.uid), where("status", "==", "pending"))
      const querySnapshot = await getDocs(q)
      const duesData = []

      querySnapshot.forEach((doc) => {
        duesData.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      const groupedDues = duesData.reduce((acc, due) => {
        const customerKey = due.customerEmail || due.customerName || "Unknown"
        if (!acc[customerKey]) {
          acc[customerKey] = []
        }
        acc[customerKey].push(due)
        return acc
      }, {})

      setDues(groupedDues)
    } catch (error) {
      console.error("Error fetching dues:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePartialPayment = async (dueId, currentAmount) => {
    const paymentAmountValue = Number.parseFloat(paymentAmount[dueId] || 0)

    if (paymentAmountValue <= 0 || paymentAmountValue > currentAmount) {
      alert("Please enter a valid payment amount")
      return
    }

    try {
      const newAmount = currentAmount - paymentAmountValue

      if (newAmount <= 0) {
        await updateDoc(doc(db, "dues", dueId), {
          status: "paid",
          paidAt: new Date(),
          remainingAmount: 0,
        })
      } else {
        await updateDoc(doc(db, "dues", dueId), {
          remainingAmount: newAmount,
          lastPayment: paymentAmountValue,
          lastPaymentDate: new Date(),
        })
      }

      setPaymentAmount({ ...paymentAmount, [dueId]: "" })
      fetchDues()
    } catch (error) {
      console.error("Error processing payment:", error)
    }
  }

  const markAsPaid = async (dueId) => {
    try {
      await updateDoc(doc(db, "dues", dueId), {
        status: "paid",
        paidAt: new Date(),
        remainingAmount: 0,
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

  const totalPending = Object.values(dues)
    .flat()
    .reduce((sum, due) => {
      return sum + (due.remainingAmount || due.amount)
    }, 0)

  if (loading) {
    return <div className={styles.loading}>Loading dues...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pending Dues</h1>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h3>Total Pending</h3>
          <p className={styles.amount}>${totalPending.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard}>
          <h3>Customers with Dues</h3>
          <p className={styles.count}>{Object.keys(dues).length}</p>
        </div>
      </div>

      <div className={styles.duesList}>
        {Object.keys(dues).length === 0 ? (
          <p className={styles.noDues}>No pending dues.</p>
        ) : (
          Object.entries(dues).map(([customerKey, customerDues]) => {
            const totalCustomerDue = customerDues.reduce((sum, due) => sum + (due.remainingAmount || due.amount), 0)
            const repDue = customerDues[0] || {}
            return (
              <div key={customerKey} className={styles.customerSection}>
                <h2 className={styles.customerName}>
                  {repDue.customerName || "Unknown"} <span style={{fontWeight:400, fontSize:'0.9em'}}>({repDue.customerEmail || customerKey})</span> - ${totalCustomerDue.toFixed(2)}
                </h2>
                <div className={styles.dueCard}>
                  <div className={styles.dueInfo}>
                    <div className={styles.transactionDetails}>
                      <p>
                        <strong>Remaining Due:</strong> ${totalCustomerDue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <div className={styles.paymentSection}>
                      <input
                        type="number"
                        step="0.01"
                        max={totalCustomerDue}
                        placeholder="Payment amount"
                        value={paymentAmount[customerKey] || ""}
                        onChange={(e) => setPaymentAmount({ ...paymentAmount, [customerKey]: e.target.value })}
                        className={styles.paymentInput}
                      />
                      <button
                        onClick={async () => {
                          const payAmt = Number.parseFloat(paymentAmount[customerKey] || 0)
                          if (payAmt <= 0 || payAmt > totalCustomerDue) {
                            alert("Please enter a valid payment amount")
                            return
                          }
                          for (const due of customerDues) {
                            const dueAmt = due.remainingAmount || due.amount
                            if (payAmt <= 0) break
                            if (dueAmt > 0) {
                              const payThis = Math.min(dueAmt, payAmt)
                              await handlePartialPayment(due.id, dueAmt < payAmt ? dueAmt : payAmt)
                              payAmt -= payThis
                            }
                          }
                          setPaymentAmount({ ...paymentAmount, [customerKey]: "" })
                          fetchDues()
                        }}
                        className={styles.paymentButton}
                      >
                        Pay
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        for (const due of customerDues) {
                          await markAsPaid(due.id)
                        }
                        fetchDues()
                      }}
                      className={styles.paidButton}
                    >
                      Mark Fully Paid
                    </button>
                    <button
                      onClick={async () => {
                        for (const due of customerDues) {
                          await deleteDue(due.id)
                        }
                        fetchDues()
                      }}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Dues
