// models/notification.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    content:{type:String},
    sender:{ type: Schema.Types.ObjectId, ref: 'user', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true },  // Recipient of the notification
    type: { type: String, required: true },  // Type of notification (e.g., "follow", "comment", "like")
    message: { type: String, required: true },  // Notification message
    isRead: { type: Boolean, default: false },  // Track if notification has been read
    createdAt: { type: Date, default: Date.now },
    link:{type:String}
});

const Notifications = mongoose.model('Notification', notificationSchema);

module.exports = Notifications;
