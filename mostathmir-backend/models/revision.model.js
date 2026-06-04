const mongoose = require('mongoose');

const revisionRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sections: [String],
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: { type: String },
    updatedData: { type: Object }, // سنخزن هنا كل بيانات المشروع الجديدة كـ JSON

}, { timestamps: true });

module.exports = mongoose.model('RevisionRequest', revisionRequestSchema);