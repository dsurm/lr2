const dotenv = require('dotenv');
const pg = require('pg');
const http = require('http');
const { checkHostUp } = require('./checkHostUp.js');

dotenv.config({ path: '/.env' });

let masterOk = true;
const connAttempts = 3;  // Число попыток установления соединения с мастером перед тем как счесть его упавшим

// Поднимем простой http лисинер
const port = process.env.LISTENER_PORT || 8080;
const server = http.createServer((req, res) => {
    if (masterOk) {
        res.statusCode = 200;
    }
    else {
        res.statusCode = 500;
    }
    res.end();
});
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// Зададим параметры подключения к мастеру
const connMaster = {
    host: process.env.PG_MASTER_HOST,
    port: process.env.PG_MASTER_PORT,
    user: process.env.PG_MASTER_USER,
    password: process.env.PG_MASTER_PASSWORD,
    type: "PG"
}

return (async () => {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Дадим сервисам прогрузиться
    while (masterOk) {
        // Проверим соединение с мастером
        if (! await checkHostUp(connAttempts, connMaster)) {
            masterOk = false;
            console.log(`Master is down, set promote flag to true`);
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Задержка между проверками соединения
    }
})();