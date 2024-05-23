const { checkHostUp } = require('./checkHostUp.js');

const connAttempts = 3; // Число попыток установления соединения перед выключением мастера

// Зададим параметры подключения к арбитру и cлейву
const connArbitrator = {
  hostname: process.env.PG_ARBITRATOR_HOST,
  port: process.env.PG_ARBITRATOR_PORT,
  type: "HTTP"
}
const connSlave = {
  host: process.env.PG_SLAVE_HOST,
  port: process.env.PG_SLAVE_PORT,
  user: process.env.PG_SLAVE_USERNAME,
  password: process.env.PG_SLAVE_PASSWORD,
  type: "PG"
}

return (async () => {
  // Мониторим доступность арбитра и слейва, при потере соединения ложим мастера
  if (! await checkHostUp(connAttempts, connArbitrator) && ! await checkHostUp(connAttempts, connSlave)) {
    console.log(`Killing PG process using docker healthcheck`);
    process.exit(1);
  }
  else {
    console.log(`Status: OK`);
    process.exit(0);
  }
})();