import User from '../models/User.js';
import mongoose from 'mongoose';
// Создать или найти пользователя и добавить заказ
export async function createOrUpdateOrder(email, story, genre, paymentStatus = 'pending') {
    console.log('Создание или обновление заказа для пользователя:', email);
    try {
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({ email, orders: [] });
        }

        const newOrder = {
            story,
            genre,
            paymentStatus,
        };

        user.orders.push(newOrder);
        const savedUser = await user.save();

        // Вернем ID последнего заказа
        const orderId = savedUser.orders[savedUser.orders.length - 1]._id.toString();
        console.log('Заказ успешно добавлен для пользователя:', email, 'Order ID:', orderId);
        return orderId;
    } catch (error) {
        console.error('Ошибка при создании или обновлении заказа:', error);
        throw error;
    }
}


// Обновление статуса и ссылки на песню после завершения заказа

export async function updateOrderStatus(email, orderId, status, songData = {
    songUrl: '',
    videoUrl: '',
}) {
    const { songUrl, videoUrl } = songData;
    try {
        // Используем `new` для создания ObjectId
        const orderObjectId = new mongoose.Types.ObjectId(orderId);

        // Найдем пользователя и обновим заказ по orderId
        const user = await User.findOneAndUpdate(
            { email, 'orders._id': orderObjectId },
            {
                $set: {
                    'orders.$.paymentStatus': status,
                    'orders.$.songUrl': songUrl,
                    'orders.$.videoUrl': videoUrl,
                },
            },
            { new: true } // возвращает обновленный документ
        );

        if (!user) {
            console.error(`Пользователь с email ${email} или заказ с ID ${orderId} не найдены.`);
            return null;
        }

        // Проверяем, что статус заказа обновлен
        const updatedOrder = user.orders.find(order => order._id.equals(orderObjectId));
        if (updatedOrder && updatedOrder.paymentStatus === status) {
            console.log(`Статус заказа успешно обновлен для пользователя ${email}:`, status);
        } else {
            console.warn(`Статус заказа для пользователя ${email} не был обновлен. Текущий статус:`, updatedOrder.paymentStatus);
        }

        return user;
    } catch (error) {
        console.error('Ошибка при обновлении статуса заказа:', error);
        throw error;
    }
}

export async function getOrderStatus(email, orderId) {
    try {
      const user = await User.findOne({ email });
      if (!user) return null;
  
      const order = user.orders.id(orderId);
      if (!order) return null;
  
      return {
        paymentStatus: order.paymentStatus, // Изменили на order.paymentStatus
        songUrl: order.songUrl,
        videoUrl: order.videoUrl,
      };
    } catch (error) {
      console.error('Error in getOrderStatus:', error);
      throw error;
    }
  }
  
