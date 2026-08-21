const amqp = require('amqp-connection-manager');

const QUEUE_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const connection = amqp.connect([QUEUE_URL]);

const channelWrapper = connection.createChannel({
  json: true,
  setup: function(channel) {
    return channel.assertExchange('shopping_exchange', 'topic', { durable: true });
  }
});

const publishOrder = async (orderData) => {
  try {
    await channelWrapper.publish('shopping_exchange', 'order.placed', orderData, { persistent: true });
    console.log('Order event published to RabbitMQ:', orderData.id || orderData.orderId);
  } catch (err) {
    console.error('RabbitMQ Publish Error:', err);
  }
};

module.exports = { publishOrder };
