const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        required: true,
        enum: [
            'PROJECT_STATUS_UPDATE',
            'NEW_INVESTMENT',
            'NEW_FOLLOWER',
            'PROJECT_UNFOLLOW',
            'NEW_USER_FOLLOWER',
            'USER_UNFOLLOW',
            'NEW_PROPOSAL',
            'PROPOSAL_RESPONSE',
            'NEW_MESSAGE',
            'FUNDING_GOAL_REACHED',
            'CAMPAIGN_ENDING_SOON',
            'FUNDING_COMPLETED_GENERAL',
            'RESERVATION_PAYMENT_DUE'
        ]
    },
    message: { // أصبح اختياريًا للتوافق مع البيانات القديمة
        type: String 
    },
    messageKey: { // أصبح إلزاميًا للبيانات الجديدة
        type: String,
        required: true
    },
    messageParams: { // لتخزين المتغيرات مثل اسم المستخدم والمشروع
        type: Object 
    },
    note: {
        type: String,
        trim: true
    },
    link: {
        type: String
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    read: {
        type: Boolean,
        default: false
    },

    amount: { type: Number },
    currency: { type: String },
    investmentType: { type: String },
    amountPaidNow: { type: Number },
    amountRemaining: { type: Number },

    partnershipType: { type: String },
    proposedTerms: { type: String },
    expertiseAreas: [String],

    responseMessage: { type: String },
    responseStatus: { type: String, enum: ['accepted', 'rejected'] }

}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;