const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        enum: ['عام', 'اقتراح شراكة', 'اقتراح استثمار'],
        default: 'عام'
    },
    relatedProject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;