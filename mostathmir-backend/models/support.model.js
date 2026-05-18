const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['tech', 'inquiry', 'suggestion', 'other'],
        required: true 
    },
    message: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'replied', 'closed'], 
        default: 'pending' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Support', supportSchema);