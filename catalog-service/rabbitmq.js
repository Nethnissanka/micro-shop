const amqp = require('amqp-connection-manager');
const Product = require('./Product');

const QUEUE_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const connection = amqp.connect([QUEUE_URL]);

const channelWrapper = connection.createChannel({
  setup: function(channel) {
    return Promise.all([
      channel.assertExchange('shopping_exchange', 'topic', { durable: true }),
      channel.assertQueue('catalog_queue', { durable: true }),
      channel.bindQueue('catalog_queue', 'shopping_exchange', 'order.placed'),
      channel.consume('catalog_queue', async (msg) => {
        if (msg !== null) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log('Catalog Service received order.placed for order:', content.orderId);
            
            for (let item of content.items) {
               await Product.updateOne(
                 { _id: item.productId },
                 { $inc: { stock: -item.quantity } }
               );
            }

            channel.ack(msg);
          } catch (err) {
            console.error('Error processing catalog queue:', err);
            channel.nack(msg);
          }
        }
      })
    ]);
  }
});

module.exports = channelWrapper;
