const express = require("express");
const authenticateAdmin = require("../middleware/adminAuth");
const router = express.Router();
const db = require("../db");

/*
|--------------------------------------------------------------------------
| Helper: Payment SELECT
|--------------------------------------------------------------------------
*/
const paymentSelect = `
    SELECT
        p.*,
        cp.id AS customer_profile_id,
        u2.name AS customer_name,
        u2.email AS customer_email,
        un.unit_number,

        (
            SELECT COALESCE(MAX(prev.paid_amount), 0)
            FROM payments prev
            WHERE prev.customer_id = p.customer_id
              AND prev.unit_id = p.unit_id
              AND prev.id < p.id
        ) AS previous_paid_amount,

        (
            p.paid_amount -
            (
                SELECT COALESCE(MAX(prev.paid_amount), 0)
                FROM payments prev
                WHERE prev.customer_id = p.customer_id
                  AND prev.unit_id = p.unit_id
                  AND prev.id < p.id
            )
        ) AS receipt_amount

    FROM payments p

    LEFT JOIN customer_profiles cp
        ON p.customer_id = cp.id

    LEFT JOIN users u2
        ON cp.user_id = u2.id

    LEFT JOIN units un
        ON p.unit_id = un.id
`;



/* --------------------------------------------------------------------------
| GET CUSTOMER PAYMENT DATA BY CUSTOMER LOGIN ID
| Direct lookup for AdminPayments. Total deal comes from customer property.
| -------------------------------------------------------------------------- */
router.get("/customer/:loginId", authenticateAdmin, (req, res) => {
    const loginId = String(req.params.loginId || "").trim();

    if (!loginId) {
        return res.status(400).json({ success: false, message: "Customer Login ID is required." });
    }

    const customerSql = `
        SELECT
            cp.id AS customer_id,
            cp.user_id,
            cp.phone AS customer_phone,
            cp.alternate_phone,
            cp.address,
            cp.city,
            cp.state,
            cp.pincode,
            u.name AS customer_name,
            u.email AS customer_email,
            cpr.id AS customer_property_id,
            cpr.customer_login_id,
            cpr.property_id,
            cpr.purchase_date,
            cpr.project_name,
            cpr.unit_number,
            cpr.unit_type,
            cpr.carpet_area,
            cpr.rate_per_sqft,
            cpr.base_value,
            cpr.agreement_value,
            cpr.estimated_total,
            cpr.property_value,
            cpr.paid_amount AS customer_record_paid_amount,
            cpr.remaining_amount AS customer_record_remaining_amount
        FROM customer_properties cpr
        INNER JOIN customer_profiles cp ON cp.id = cpr.customer_id
        INNER JOIN users u ON u.id = cp.user_id
        WHERE cpr.customer_login_id = ?
        ORDER BY cpr.id DESC
        LIMIT 1
    `;

    db.query(customerSql, [loginId], (err, customers) => {
        if (err) {
            console.error("CUSTOMER PAYMENT LOOKUP ERROR:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch customer data", error: err.message });
        }

        if (!customers.length) {
            return res.status(404).json({ success: false, message: "Customer Login ID not found." });
        }

        const customer = customers[0];
        const totalAmount = Number(customer.property_value || customer.estimated_total || customer.agreement_value || 0);

        const historySql = `
            ${paymentSelect}
            WHERE p.customer_id = ?
              AND p.unit_id = ?
            ORDER BY p.id ASC
        `;

        const findUnitSql = `
            SELECT id
            FROM units
            WHERE unit_number = ?
            LIMIT 1
        `;

        db.query(findUnitSql, [customer.unit_number], (unitErr, unitRows) => {
            if (unitErr) {
                console.error("CUSTOMER UNIT LOOKUP ERROR:", unitErr);
                return res.status(500).json({ success: false, message: "Customer found but unit could not be resolved", error: unitErr.message });
            }

            const resolvedUnitId = unitRows[0]?.id || customer.property_id || null;

            db.query(historySql, [customer.customer_id, resolvedUnitId], (historyErr, history) => {
            if (historyErr) {
                console.error("CUSTOMER PAYMENT HISTORY LOOKUP ERROR:", historyErr);
                return res.status(500).json({ success: false, message: "Customer found but payment history could not be loaded", error: historyErr.message });
            }

            const paidFromHistory = history.length
                ? Number(history[history.length - 1].paid_amount || 0)
                : 0;

            res.json({
                success: true,
                customer: {
                    ...customer,
                    unit_id: resolvedUnitId,
                    total_amount: totalAmount,
                    total_purchase_value: totalAmount,
                    history_paid_amount: paidFromHistory,
                    history_remaining_amount: Math.max(totalAmount - paidFromHistory, 0),
                    paid_installments: history.length,
                    total_installments: history.length ? Number(history[history.length - 1].total_installments || 0) : 0
                },
                payments: history
            });
        });
        });
    });
});

/*
|--------------------------------------------------------------------------
| GET ALL PAYMENTS
|--------------------------------------------------------------------------
*/
router.get("/", authenticateAdmin, (req, res) => {
    const sql = `
        ${paymentSelect}
        ORDER BY p.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("GET payments error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch payments",
                error: err.message
            });
        }

        res.json({
            success: true,
            payments: results
        });
    });
});


/*
|--------------------------------------------------------------------------
| GET PAYMENT HISTORY FOR ONE CUSTOMER + UNIT
|--------------------------------------------------------------------------
| Customer Dashboard ke liye
|
| Example:
| /api/payments/history/2/5
|--------------------------------------------------------------------------
*/
router.get("/history/:customerId/:unitId", (req, res) => {
    const { customerId, unitId } = req.params;

    const sql = `
        ${paymentSelect}
        WHERE p.customer_id = ?
          AND p.unit_id = ?
        ORDER BY p.id ASC
    `;

    db.query(
        sql,
        [customerId, unitId],
        (err, results) => {
            if (err) {
                console.error(
                    "GET customer payment history error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch customer payment history",
                    error: err.message
                });
            }

            res.json({
                success: true,
                payments: results
            });
        }
    );
});


/*
|--------------------------------------------------------------------------
| GET PAYMENT SUMMARY FOR SAME CUSTOMER + UNIT
|--------------------------------------------------------------------------
| 2nd receipt open karte waqt AdminPayments.jsx
| is endpoint ko call karega.
|--------------------------------------------------------------------------
*/
router.get("/summary/:customerId/:unitId", (req, res) => {
    const { customerId, unitId } = req.params;

    const sql = `
        SELECT
            p.id,
            p.customer_id,
            p.unit_id,
            p.total_amount,
            p.paid_amount,
            p.remaining_amount,
            p.installment_amount,
            p.total_installments,
            p.paid_installments,
            p.next_due_date,
            p.payment_status,
            p.receipt
        FROM payments p
        WHERE p.customer_id = ?
          AND p.unit_id = ?
        ORDER BY p.id DESC
        LIMIT 1
    `;

    db.query(
        sql,
        [customerId, unitId],
        (err, results) => {
            if (err) {
                console.error(
                    "GET payment summary error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch payment summary",
                    error: err.message
                });
            }

            /*
             * No previous receipt.
             * Means this is the first receipt.
             */
            if (results.length === 0) {
                return res.json({
                    success: true,
                    exists: false,
                    summary: null
                });
            }

            const latest = results[0];

            /*
             * Count already saved payment receipts.
             */
            const countSql = `
                SELECT COUNT(*) AS payment_count
                FROM payments
                WHERE customer_id = ?
                  AND unit_id = ?
                  AND paid_amount > 0
            `;

            db.query(
                countSql,
                [customerId, unitId],
                (countErr, countResults) => {
                    if (countErr) {
                        console.error(
                            "Payment count error:",
                            countErr
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Failed to calculate paid installments",
                            error: countErr.message
                        });
                    }

                    const paidInstallments =
                        Number(
                            countResults[0]?.payment_count || 0
                        );

                    res.json({
                        success: true,
                        exists: true,

                        summary: {
                            customer_id: latest.customer_id,
                            unit_id: latest.unit_id,

                            total_amount:
                                Number(latest.total_amount || 0),

                            previous_paid_amount:
                                Number(latest.paid_amount || 0),

                            remaining_amount:
                                Number(latest.remaining_amount || 0),

                            installment_amount:
                                Number(
                                    latest.installment_amount || 0
                                ),

                            total_installments:
                                Number(
                                    latest.total_installments || 0
                                ),

                            paid_installments:
                                paidInstallments,

                            next_due_date:
                                latest.next_due_date || null,

                            payment_status:
                                latest.payment_status || "Pending"
                        }
                    });
                }
            );
        }
    );
});


/*
|--------------------------------------------------------------------------
| GET ONE PAYMENT BY ID
|--------------------------------------------------------------------------
*/
router.get("/:id", authenticateAdmin, (req, res) => {
    const { id } = req.params;

    const sql = `
        ${paymentSelect}
        WHERE p.id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("GET payment error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment",
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.json({
            success: true,
            payment: results[0]
        });
    });
});


/*
|--------------------------------------------------------------------------
| ADD PAYMENT / ADD NEW RECEIPT
|--------------------------------------------------------------------------
|
| FIRST RECEIPT:
| User supplies:
| - total_amount
| - installment_amount
| - total_installments
| - paid_amount
|
| SECOND RECEIPT ONWARDS:
| Backend automatically takes:
| - total_amount
| - installment_amount
| - total_installments
| - previous paid amount
| - previous installment count
|
| User only needs to send NEW payment amount.
|--------------------------------------------------------------------------
*/
router.post("/", authenticateAdmin, (req, res) => {
    const {
        customer_id,
        unit_id,
        paid_amount,
        installment_amount,
        total_installments,
        next_due_date,
        payment_status,
        receipt
    } = req.body;

    if (!customer_id) {
        return res.status(400).json({ success: false, message: "Customer is required." });
    }
    if (!unit_id) {
        return res.status(400).json({ success: false, message: "Customer unit is required." });
    }

    const newPayment = Number(paid_amount || 0);
    if (newPayment <= 0) {
        return res.status(400).json({ success: false, message: "Please enter the new payment amount." });
    }

    const customerTotalSql = `
        SELECT
            cpr.property_value,
            cpr.estimated_total,
            cpr.agreement_value
        FROM customer_properties cpr
        WHERE cpr.customer_id = ?
        ORDER BY cpr.id DESC
        LIMIT 1
    `;

    db.query(customerTotalSql, [customer_id], (totalErr, totalRows) => {
        if (totalErr) {
            console.error("CUSTOMER TOTAL LOOKUP ERROR:", totalErr);
            return res.status(500).json({ success: false, message: "Failed to fetch customer total purchase value", error: totalErr.message });
        }

        const customerTotal = Number(
            totalRows[0]?.property_value ||
            totalRows[0]?.estimated_total ||
            totalRows[0]?.agreement_value ||
            0
        );

        if (customerTotal <= 0) {
            return res.status(400).json({ success: false, message: "Customer purchase/deal total is not available in customer record." });
        }

        const previousSql = `
            SELECT *
            FROM payments
            WHERE customer_id = ? AND unit_id = ?
            ORDER BY id ASC
        `;

        db.query(previousSql, [customer_id, unit_id], (previousErr, rows) => {
            if (previousErr) {
                console.error("Previous payment lookup error:", previousErr);
                return res.status(500).json({ success: false, message: "Failed to check previous payment", error: previousErr.message });
            }

            const previous = rows.length ? rows[rows.length - 1] : null;
            const previousPaid = Number(previous?.paid_amount || 0);
            const cumulativePaid = previousPaid + newPayment;
            const remaining = Math.max(customerTotal - cumulativePaid, 0);

            if (newPayment > Math.max(customerTotal - previousPaid, 0)) {
                return res.status(400).json({
                    success: false,
                    message: `Payment exceeds remaining amount. Remaining amount is ₹${Math.max(customerTotal - previousPaid, 0).toLocaleString("en-IN")}.`
                });
            }

            const savedInstallment = Number(previous?.installment_amount || installment_amount || 0);
            const savedTotalInstallments = Number(previous?.total_installments || total_installments || 0);
            const paidInstallments = rows.filter(row => Number(row.paid_amount || 0) > 0).length + 1;

            if (!previous && savedInstallment <= 0) {
                return res.status(400).json({ success: false, message: "Installment amount is required for the first receipt." });
            }
            if (!previous && savedTotalInstallments <= 0) {
                return res.status(400).json({ success: false, message: "Total installments are required for the first receipt." });
            }
            if (savedTotalInstallments > 0 && paidInstallments > savedTotalInstallments) {
                return res.status(400).json({ success: false, message: "All installments are already completed for this customer and unit." });
            }

            const status = remaining <= 0 ? "Paid" : (payment_status || "Partial");

            const sql = `
                INSERT INTO payments (
                    customer_id, unit_id, total_amount, paid_amount, remaining_amount,
                    installment_amount, total_installments, paid_installments,
                    next_due_date, payment_status, receipt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                customer_id,
                unit_id,
                customerTotal,
                cumulativePaid,
                remaining,
                savedInstallment,
                savedTotalInstallments,
                paidInstallments,
                next_due_date || null,
                status,
                receipt || null
            ];

            db.query(sql, values, (insertErr, result) => {
                if (insertErr) {
                    console.error("ADD payment error:", insertErr);
                    return res.status(500).json({ success: false, message: "Failed to add payment receipt", error: insertErr.message });
                }

                return res.json({
                    success: true,
                    message: "Payment receipt added successfully.",
                    paymentId: result.insertId,
                    payment: {
                        total_amount: customerTotal,
                        receipt_amount: newPayment,
                        previous_paid_amount: previousPaid,
                        paid_amount: cumulativePaid,
                        remaining_amount: remaining,
                        installment_amount: savedInstallment,
                        total_installments: savedTotalInstallments,
                        paid_installments: paidInstallments,
                        payment_status: status
                    }
                });
            });
        });
    });
});


router.put("/:id", authenticateAdmin, (req, res) => {
    const { id } = req.params;

    const {
        customer_id,
        unit_id,
        paid_amount,
        next_due_date,
        payment_status,
        receipt
    } = req.body;

    if (!unit_id) {
        return res.status(400).json({
            success: false,
            message: "Unit is required."
        });
    }

    const currentPaymentSql = `
        SELECT *
        FROM payments
        WHERE id = ?
        LIMIT 1
    `;

    db.query(
        currentPaymentSql,
        [id],
        (currentErr, currentRows) => {
            if (currentErr) {
                console.error(
                    "Find payment for update error:",
                    currentErr
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to find payment",
                    error: currentErr.message
                });
            }

            if (currentRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Payment not found."
                });
            }

            const current =
                currentRows[0];

            const finalCustomerId =
                customer_id ||
                current.customer_id;

            const finalUnitId =
                unit_id ||
                current.unit_id;

            /*
             * Get all other receipts.
             */
            const previousSql = `
                SELECT *
                FROM payments
                WHERE customer_id = ?
                  AND unit_id = ?
                  AND id <> ?
                ORDER BY id ASC
            `;

            db.query(
                previousSql,
                [
                    finalCustomerId,
                    finalUnitId,
                    id
                ],
                (previousErr, rows) => {
                    if (previousErr) {
                        console.error(
                            "Update previous payments error:",
                            previousErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Failed to calculate payment history",
                            error:
                                previousErr.message
                        });
                    }

                    const totalAmount =
                        Number(
                            current.total_amount || 0
                        );

                    const installmentAmount =
                        Number(
                            current.installment_amount || 0
                        );

                    const totalInstallments =
                        Number(
                            current.total_installments || 0
                        );

                    const previousPaid =
                        rows.reduce(
                            (
                                sum,
                                row
                            ) =>
                                sum +
                                Number(
                                    row.receipt_amount ||
                                    0
                                ),
                            0
                        );

                    /*
                     * Existing DB rows store cumulative paid_amount.
                     * Therefore derive current receipt amount from:
                     *
                     * current cumulative -
                     * previous cumulative.
                     */
                    let currentReceiptAmount =
                        Number(
                            paid_amount || 0
                        );

                    /*
                     * If frontend sends the old cumulative amount,
                     * convert it into the receipt amount.
                     */
                    if (
                        currentReceiptAmount >
                            totalAmount &&
                        Number(
                            current.paid_amount || 0
                        ) > 0
                    ) {
                        currentReceiptAmount =
                            Number(
                                current.paid_amount
                            );
                    }

                    if (
                        currentReceiptAmount <=
                        0
                    ) {
                        currentReceiptAmount =
                            Number(
                                current.paid_amount || 0
                            );
                    }

                    const newCumulativePaid =
                        previousPaid +
                        currentReceiptAmount;

                    if (
                        newCumulativePaid >
                        totalAmount
                    ) {
                        return res.status(400).json({
                            success: false,
                            message:
                                "Payment cannot exceed total deal amount."
                        });
                    }

                    const newRemaining =
                        Math.max(
                            totalAmount -
                                newCumulativePaid,
                            0
                        );

                    const paidInstallments =
                        rows.filter(
                            (row) =>
                                Number(
                                    row.paid_amount ||
                                    0
                                ) > 0
                        ).length + 1;

                    if (
                        totalInstallments > 0 &&
                        paidInstallments >
                            totalInstallments
                    ) {
                        return res.status(400).json({
                            success: false,
                            message:
                                "Paid installments cannot exceed total installments."
                        });
                    }

                    const finalStatus =
                        payment_status ||
                        (
                            newRemaining <= 0
                                ? "Paid"
                                : "Partial"
                        );

                    const sql = `
                        UPDATE payments
                        SET
                            customer_id = ?,
                            unit_id = ?,
                            total_amount = ?,
                            paid_amount = ?,
                            remaining_amount = ?,
                            installment_amount = ?,
                            total_installments = ?,
                            paid_installments = ?,
                            next_due_date = ?,
                            payment_status = ?,
                            receipt = ?
                        WHERE id = ?
                    `;

                    const values = [
                        finalCustomerId,
                        finalUnitId,
                        totalAmount,
                        newCumulativePaid,
                        newRemaining,
                        installmentAmount,
                        totalInstallments,
                        paidInstallments,
                        next_due_date ||
                            current.next_due_date ||
                            null,
                        finalStatus,
                        receipt ||
                            current.receipt ||
                            null,
                        id
                    ];

                    db.query(
                        sql,
                        values,
                        (updateErr) => {
                            if (updateErr) {
                                console.error(
                                    "UPDATE payment error:",
                                    updateErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Failed to update payment",
                                    error:
                                        updateErr.message
                                });
                            }

                            res.json({
                                success: true,
                                message:
                                    "Payment updated successfully.",
                                payment: {
                                    total_amount:
                                        totalAmount,
                                    receipt_amount:
                                        currentReceiptAmount,
                                    paid_amount:
                                        newCumulativePaid,
                                    remaining_amount:
                                        newRemaining,
                                    installment_amount:
                                        installmentAmount,
                                    total_installments:
                                        totalInstallments,
                                    paid_installments:
                                        paidInstallments,
                                    payment_status:
                                        finalStatus
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});


/*
|--------------------------------------------------------------------------
| DELETE PAYMENT
|--------------------------------------------------------------------------
*/
router.delete("/:id", authenticateAdmin, (req, res) => {
    const { id } = req.params;

    const sql =
        "DELETE FROM payments WHERE id = ?";

    db.query(
        sql,
        [id],
        (err, result) => {
            if (err) {
                console.error(
                    "DELETE payment error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Failed to delete payment",
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Payment not found"
                });
            }

            res.json({
                success: true,
                message:
                    "Payment deleted successfully"
            });
        }
    );
});


module.exports = router;