const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    investmentType: {
        type: String,
        enum: ['custom', 'full', 'reservation'],
        required: true
    },
    // البيانات المشتركة
    investmentAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    // بيانات الشراكة المخصصة
    partnershipType: {
        type: String,
        enum: ['strategic', 'expertise', 'advisory', 'hybrid', 'unspecified'],
        default: 'unspecified'
    },
    expertiseAreas: [String],
    proposedTerms: {
        type: String,
        required: function () { return this.investmentType === 'custom'; } // مطلوب فقط للعروض المخصصة
    },
    contactMethod: {
        type: String,
        enum: ['platform', 'direct', 'meeting'],
        default: 'platform'
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'accepted', 'rejected'],
        default: 'pending'
    },
    responseMessage: { type: String, trim: true }, // رسالة الرد من صاحب الفكرة
    respondedAt: { type: Date } // تاريخ الرد
}, { timestamps: true });

const Proposal = mongoose.model('Proposal', proposalSchema);
module.exports = Proposal;