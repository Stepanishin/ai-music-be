import express from 'express';
import cors from 'cors';
import router from './routes/order.js';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { updateOrderStatus } from './utils/userService.js';

import { Worker } from 'worker_threads';
import statusRouter from './routes/status.js';

import https from 'https';
import fs from 'fs';
import http from 'http';
import User from './models/User.js';

const app = express();
app.use(cors());

const isLocal = process.env.IS_LOCAL_ENV === 'true';

const stripe = new Stripe(isLocal ? process.env.STRIPE_PUBLISHABLE_KEY_TEST : process.env.STRIPE_SECRET_KEY);

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


connectDB();

// Настройка сертификатов для HTTPS
const httpsOptions = {
  key: isLocal ? '' : fs.readFileSync('/etc/letsencrypt/live/api.my-aimusic.com/privkey.pem'),
  cert: isLocal ? '' : fs.readFileSync('/etc/letsencrypt/live/api.my-aimusic.com/fullchain.pem'),
};

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('Webhook получен');
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
    let event;
  
    try {
      // Используем сырой body (req.body)
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Ошибка проверки подписи Webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log('event.type:', event.type);
    // Обработка события
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // Обработка заказа
      console.log('checkout.session.completed:');
      await handleCheckoutSession(session);
    }
  
    res.json({ received: true });
  });

async function handleCheckoutSession(session) {
    const { story, genre, email, orderId } = session.metadata;
    console.log('Обработка заказа:', orderId);
    await updateOrderStatus(email, orderId, 'paid');

    // Запускаем воркер
    const worker = new Worker('./workers/queueWorker.js', {
      workerData: { email, orderId, story, genre },
    });
  
    worker.on('message', (message) => {
      if (message.success) {
        console.log(`Песня для заказа ${orderId} успешно обработана`);
      } else {
        console.error(`Ошибка при обработке заказа ${orderId}:`, message.error);
      }
    });
  
    worker.on('error', (error) => {
      console.error(`Ошибка в воркере для заказа ${orderId}:`, error);
    });
  
    worker.on('exit', (code) => {
      if (code !== 0)
        console.error(`Воркер для заказа ${orderId} завершился с кодом ${code}`);
    });
}

app.use(express.json());

app.use('/api', router);
app.use('/api', statusRouter);

const PORT = process.env.PORT || 5000;
if (isLocal) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
  }).listen(80, () => {
    console.log('HTTP сервер запущен для перенаправления на HTTPS');
  });
  
  // HTTPS сервер
  https.createServer(httpsOptions, app).listen(443, () => {
    console.log('HTTPS сервер запущен на порту 443');
  });
}

// add function to find all users with order with status 'failed' and stry to generate song again
const retryFailedOrders = async () => {
  const failedUsers = await User.find({ 'orders.paymentStatus': 'failed' });
  console.log('failedUsers:', failedUsers);

  for (const user of failedUsers) {
    for (const order of user.orders) {
      if (order.paymentStatus === 'failed') {
        console.log('retry order:', order);
        console.log('orderId:', order._id);
        // my orderId is new ObjectId("673630ecf377129424d3a7c4") need to convert it to string
        const orderIdString = order._id.toString();
        console.log('orderIdString:', orderIdString);
        // run worker
        const worker = new Worker('./workers/queueWorker.js', {
          workerData: { email: user.email, orderId: orderIdString, story: order.story, genre: order.genre },
        });

        worker.on('message', (message) => {
          console.log(`Песня для заказа ${order._id} успешно обработана`);
        });

        worker.on('error', (error) => {
          console.error(`Ошибка в воркере для заказа ${order._id}:`, error);
        });

        worker.on('exit', (code) => {
          if (code !== 0)
            console.error(`Воркер для заказа ${order._id} завершился с кодом ${code}`);
        });
      }
    }
  }


  // for (const order of failedOrders) {
  //   await generateSong(order.story, order.genre);
  // }
}

// setInterval(retryFailedOrders, 1000 * 60 * 60 * 24); // 24h

setInterval(retryFailedOrders, 1000 * 60 * 10); // 5 min




