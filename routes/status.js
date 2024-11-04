// server/routes/status.js
import express from 'express';
import { getOrderStatus } from '../utils/userService.js';

const statusRouter = express.Router();

statusRouter.get('/order-status', async (req, res) => {
  const { email, orderId } = req.query;

  // Проверяем наличие необходимых параметров
  if (!email || !orderId) {
    return res.status(400).json({ message: 'Email and orderId are required' });
  }

  try {
    // Получаем статус заказа из базы данных
    const orderData = await getOrderStatus(email, orderId);

    if (!orderData) {
      // Если заказ не найден
      return res.status(404).json({ message: 'Order not found' });
    }

    const { paymentStatus, songUrl, videoUrl } = orderData;

    if (paymentStatus !== 'emailSent') {
      // Если заказ ещё не завершён
      return res.status(200).json({ paymentStatus: 'Pending' });
    } else {
      // Если заказ завершён и ссылки доступны
      return res.status(200).json({ paymentStatus: 'Completed', songUrl, videoUrl });
    }
  } catch (error) {
    console.error('Error fetching order status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default statusRouter;
