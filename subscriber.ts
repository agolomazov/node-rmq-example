import { connect } from 'amqplib';

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
    // Создаем очередь в которую будем кидать сообщения
    const queue = await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Создаем связь между exchange и очередью по названию команды (routing_key)
    await channel.bindQueue(queue.queue, EXCHANGE_NAME, COMMAND_NAME);

    // Получаем сообщение из очереди
    channel.consume(queue.queue, (message) => {
      // Если сообщений нет, то ничего не делаем
      if (!message) {
        return;
      }

      // обрабатываем сообщение
      console.log(
        `[SUBSCRIBER] Получил сообщение: ${message.content.toString()}`
      );

      // Проверяем, есть ли указание на то, что на сообщение нужно ответить
      if (message.properties.replyTo) {
        // console.log(message.properties);
        channel.sendToQueue(
          message.properties.replyTo,
          Buffer.from(`Ответ на ${message.properties.correlationId}`),
          { correlationId: message.properties.correlationId }
        );
      }

      // сообщаем брокеру что сообщение было обработано и может быть удалено
      channel.ack(message);
    });
  } catch (err) {
    console.log(err);
  }
};

run();
