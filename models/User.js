// models/User.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    story: { type: String, required: true },
    genre: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'paid', 'emailSent'], default: 'pending' },
    songUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    // Удаляем поле email из orderSchema
});

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    orders: [orderSchema],
});

const User = mongoose.model('User', userSchema);
export default User;
