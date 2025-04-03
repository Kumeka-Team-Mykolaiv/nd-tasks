// Замість старого способу використання listen, використовуємо async/await

const fastify = require('fastify')();
const { google } = require('googleapis');
require('dotenv').config();

// Створення сервера для OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// URL для отримання авторизації
const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

// Підготовка Fastify для відправки запитів
fastify.get('/', (request, reply) => {
    reply.send(`<a href="/auth">Авторизуватися через Google</a>`);
});

// Маршрут для отримання посилання на авторизацію
fastify.get('/auth', (request, reply) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    reply.redirect(authUrl);
});

// Маршрут для callback після авторизації
fastify.get('/callback', async (request, reply) => {
    const { code } = request.query;

    if (!code) {
        return reply.send('Не вдалося отримати код авторизації.');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Тепер користувач авторизований, можна отримати списки задач
        const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

        // Отримуємо список списків задач
        const res = await tasks.tasklists.list();  // Справжній виклик API для отримання списків задач

        const tasklists = res.data.items;
        if (tasklists.length === 0) {
            return reply.send('Немає списків задач.');
        }

        let tasklistHtml = '<h1>Ваші списки задач</h1><ul>';
        tasklists.forEach(tasklist => {
            tasklistHtml += `<li>${tasklist.title}</li>`;
        });
        tasklistHtml += '</ul>';

        reply.send(tasklistHtml);
    } catch (error) {
        console.error(error);
        reply.send('Сталася помилка під час обробки авторизації.');
    }
});

// Запуск сервера з async/await
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port: port });
        console.log('Сервер запущено на http://localhost:3000');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
