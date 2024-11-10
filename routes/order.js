import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import {createOrUpdateOrder} from '../utils/userService.js';

dotenv.config();

const router = express.Router();

const isLocal = process.env.IS_LOCAL_ENV === 'true';

const stripe =  new Stripe(isLocal ? process.env.STRIPE_PUBLISHABLE_KEY_TEST : process.env.STRIPE_SECRET_KEY);

router.post('/create-checkout-session', async (req, res) => {
    const { story, genre, email } = req.body;
    console.log('create-checkout-session', req.body)
    const orderId = await createOrUpdateOrder(email, story, genre);

    console.log('orderId', orderId)
  
    try {
      const session = await stripe.checkout.sessions.create({
        // add key from .env file
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Custom Song Creation Service',
              },
              unit_amount: 399, // $3.99 in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/confirmation?email=${email}&orderId=${orderId}`,
        cancel_url: `${process.env.CLIENT_URL}`,
        customer_email: email,
        metadata: {
          story,
          genre,
          email,
          orderId,
        },
      });
  
      res.json({ url: session.url });
    } catch (error) {
      console.error('Ошибка при создании сессии оплаты:', error);
      res.status(500).send('Не удалось инициализировать оплату');
    }
});

export default router;