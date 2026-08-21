const amqp = require('amqp-connection-manager');
const nodemailer = require('nodemailer');
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const connection = amqp.connect([RABBITMQ_URL]);

// Configure Nodemailer (Example using Mailtrap or Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify SMTP connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

const channelWrapper = connection.createChannel({
  setup: function(channel) {
    console.log('Setting up RabbitMQ channel, exchange and queue...');
    return Promise.all([
      channel.assertExchange('shopping_exchange', 'topic', { durable: true }),
      channel.assertQueue('email_queue', { durable: true }),
      channel.bindQueue('email_queue', 'shopping_exchange', 'order.placed'),
      channel.consume('email_queue', async (msg) => {
        if (msg !== null) {
          try {
            const content = msg.content.toString();
            console.log('Raw message received:', content);
            const orderData = JSON.parse(content);
            console.log('Parsed Order ID:', orderData.orderId, 'Target Email:', orderData.email);
            
            await sendEmail(orderData);
            channel.ack(msg);
            console.log('Message acknowledged successfully');
          } catch (err) {
            console.error('CRITICAL Error in consumer:', err.message);
            channel.nack(msg, false, false);
          }
        }
      })
    ]).then(() => console.log('RabbitMQ setup complete. Listening for order.placed events...'));
  }
});

async function sendEmail(orderData) {
  const receiver = orderData.email || process.env.RECEIVER_EMAIL;
  console.log('Attempting to send email to:', receiver);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('MISSING SMTP CREDENTIALS. Check your docker-compose.yml environment variables.');
    // Keep simulation for safety
    console.log('--- EMAIL SIMULATION ---');
    console.log('To:', receiver);
    console.log('--- END SIMULATION ---');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"ShopSwift Orders" <no-reply@shopswift.com>',
      to: receiver,
      subject: `Order Confirmation #${orderData.orderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Order Confirmed!</h1>
          <p>Hello <strong>${orderData.deliveryDetails?.fullName || 'Customer'}</strong>,</p>
          <p>Thank you for shopping with us. Your order <strong>#${orderData.orderId}</strong> has been successfully placed.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(orderData.total || 0).toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${orderData.paymentMethod?.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Shipping To:</strong> ${orderData.deliveryDetails?.address}, ${orderData.deliveryDetails?.city}</p>
          </div>

          <p>We'll send you another email as soon as your items are on the way!</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">ShopSwift Microservices Store Demo</p>
        </div>
      `
    });

    console.log('SUCCESS! Email sent to %s. Message ID: %s', receiver, info.messageId);
  } catch (error) {
    console.error('SMTP SEND FAILURE:', error.message);
    throw error; // Re-throw to nack the message
  }
}

connection.on('connect', () => console.log('Email Service connected to RabbitMQ'));
connection.on('disconnect', (err) => console.log('Email Service disconnected from RabbitMQ', err));
