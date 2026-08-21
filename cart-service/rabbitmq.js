const amqp = require('amqp-connection-manager');
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

const QUEUE_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const connection = amqp.connect([QUEUE_URL]);

const channelWrapper = connection.createChannel({
  setup: function(channel) {
    return Promise.all([
      channel.assertExchange('shopping_exchange', 'topic', { durable: true }),
      channel.assertQueue('cart_queue', { durable: true }),
      channel.bindQueue('cart_queue', 'shopping_exchange', 'order.placed'),
      channel.consume('cart_queue', async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log('Cart Service received order.placed for user:', content.userId);
            await redisClient.del(`cart:${content.userId}`);
            channel.ack(msg);
          } catch (err) {
            console.error('Error processing cart queue:', err);
            channel.nack(msg);
          }
        }
      })
    ]);
  }
});

module.exports = channelWrapper;
