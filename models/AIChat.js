const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    query: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    action: {
        type: String,
        enum: ['message', 'search', 'connect', 'none', 'bio_updated', 'post_created', 'bio_and_post_created', 'profile', 'error', 'post_generated'],
        default: 'none'
    },
    actionData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIChat', aiChatSchema);