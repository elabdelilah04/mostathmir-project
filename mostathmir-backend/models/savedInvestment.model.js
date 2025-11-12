const mongoose = require('mongoose');

const savedInvestmentSchema = new mongoose.Schema({
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
    // ************ الحقول الرئيسية التي يتم حفظها كمسودة ************
    investmentType: { // نوع الاستثمار المختار
        type: String,
        enum: ['full', 'reservation', 'custom'],
        default: 'full'
    },
    investmentAmount: { // المبلغ الذي أدخله المستخدم
        type: Number,
        default: 0
    },
    proposedTerms: { // تفاصيل الشراكة المخصصة
        type: String
    },
    partnershipType: { // نوع الشراكة المخصصة
        type: String,
        enum: ['strategic', 'expertise', 'advisory', 'hybrid', 'unspecified']
    },
    expertiseAreas: [String], // مجالات الخبرة المحددة
    termsAccepted: { // حالة موافقته على الشروط (لـ check box)
        type: Boolean,
        default: false
    },
    // *******************************************************************
    status: {
        type: String,
        enum: ['draft', 'submitted'],
        default: 'draft'
    }
}, { timestamps: true });

const SavedInvestment = mongoose.model('SavedInvestment', savedInvestmentSchema);
module.exports = SavedInvestment;