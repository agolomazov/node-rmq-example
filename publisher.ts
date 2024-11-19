import { connect } from 'amqplib';
import { v4 as uuid4 } from 'uuid';

const EXCHANGE_NAME = 'test.exch';
const COMMAND_NAME = 'my.command';
const QUEUE_NAME = 'my-cool';

const run = async () => {
  try {
    // Подключаемся к серверу
    const connection = await connect('amqp://localhost');
    // Создаем канал
    const channel = await connection.createChannel();

    // Создаем exchange через который будем слать сообщения
    channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Создаем очередь для получения ответа от подписчика
    const replyQueue = await channel.assertQueue('', { exclusive: true });

    channel.consume(replyQueue.queue, (message) => {
      console.log(
        `[PUBLISHER] Получил ответ от subscriber на сообщение ${
          message?.properties?.correlationId
        }: "${message?.content?.toString()}"`
      );
    });

    // Создаем очередь в которую будем кидать сообщения
    const queue = await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Создаем связь между exchange и очередью по названию команды (routing_key)
    await channel.bindQueue(queue.queue, EXCHANGE_NAME, COMMAND_NAME);

    // Метод отправки тестового сообщения
    const sendMessage = async () => {
      const replyId = uuid4();
      // Отправляем сообщение в очередь
      await channel.publish(
        EXCHANGE_NAME,
        COMMAND_NAME,
        Buffer.from('Работает!'),
        {
          replyTo: replyQueue.queue,
          correlationId: replyId,
        }
      );
    };

    setInterval(sendMessage, 5_000);
  } catch (err) {
    console.log(err);
  }
};

run();
