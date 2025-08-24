/**
 * FoundrConnect Social Feature Models
 * Defines database schemas for connections and profile views
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Message functionality has been removed
 */

/**
 * Profile View Schema
 * Tracks when a user views another user's profile
 */
const ProfileViewSchema = new Schema({
    profile: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    viewer: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

/**
 * Notification Schema
 * Represents a notification for a user
 */
const NotificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    type: {
        type: String,
        enum: ['connection_request', 'connection_accepted', 'post_like', 'post_comment'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    reference: {
        type: Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['post']
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create models from schemas
const ProfileView = mongoose.model('profileView', ProfileViewSchema);
const Notification = mongoose.model('notification', NotificationSchema);

// Export models
module.exports = {
    ProfileView,
    Notification
};