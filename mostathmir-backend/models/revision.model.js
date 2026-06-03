const mongoose = require('mongoose');

const revisionRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sections: [String], // الأقسام التي يريد تعديلها
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RevisionRequest', revisionRequestSchema);