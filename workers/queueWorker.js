import { parentPort, workerData } from 'worker_threads';
import { generateSong } from '../utils/songGenerator.js';
import { sendEmailWithSong } from '../utils/mailSender.js';
import { updateOrderStatus } from '../utils/userService.js';

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (err) {
      console.error(err.message);
    }
  };

(async () => {
    await connectDB();

    const { email, orderId, story, genre } = workerData;
    console.log('Worker', genre);

    try {
        const songData = await generateSong({ story, genre });
        await updateOrderStatus(email, orderId, 'completed', songData);
        await sendEmailWithSong(email, songData);
        await updateOrderStatus(email, orderId, 'emailSent', songData);
        parentPort.postMessage({ success: true });
    } catch (error) {
        console.error(`Ошибка при обработке заказа ${orderId}:`, error);
        await updateOrderStatus(email, orderId, 'failed');
        parentPort.postMessage({ success: false, error });
    }
})();
