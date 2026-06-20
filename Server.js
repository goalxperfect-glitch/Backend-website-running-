const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ message: 'Business Handler Backend is running!' });
});

app.post('/create-subscription', async (req, res) => {
  try {
    const { paymentMethodId, businessData } = req.body;

    const existingCustomers = await stripe.customers.list({
      email: businessData?.email,
      limit: 1,
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: businessData?.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        metadata: {
          businessName: businessData?.businessName,
          businessType: businessData?.businessType,
        },
      });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Business Handler - Weekly Subscription',
            },
            unit_amount: 1000000,
            recurring: {
              interval: 'week',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
    });

    console.log('✅ Subscription created:', subscription.id);

    res.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      status: subscription.status,
      nextPaymentDate: new Date(subscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error('Subscription Error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const subscription = await stripe.subscriptions.del(subscriptionId);
    res.json({ 
      message: 'Subscription cancelled',
      subscription 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
