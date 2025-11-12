// ملف: models/investment.model.js

const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    investmentId: { // تمت الإضافة
        type: String,
        unique: true,
        required: true
    },
    investor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    investmentType: {
        type: String,
        enum: ['full', 'reservation'],
        required: true
    },
    amountPaidNow: {
        type: Number,
        default: 0
    },
    amountRemaining: {
        type: Number,
        default: 0
    },
    isReservation: {
        type: Boolean,
        default: false
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    }
}, { timestamps: true });

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;