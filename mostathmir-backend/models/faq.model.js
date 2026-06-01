const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    questionAr: { type: String, required: true },
    answerAr: { type: String, required: true },
    questionEn: { type: String, required: true },
    answerEn: { type: String, required: true },
    category: {
        type: String,
        enum: ['general', 'account', 'investment', 'technical'],
        default: 'general'
    },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('FAQ', faqSchema);