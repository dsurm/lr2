const { checkHostUp } = require('./checkHostUp.js');
const { arbitratorMasterIsUp , setPromote } = require('./promote.js');

const connAttempts = 3; // Число попыток установления соединения перед выполнением promote

// Зададим параметры подключения к арбитру и мастеру
const connArbitrator = {
  hostname: process.env.PG_ARBITRATOR_HOST,
  port: process.env.PG_ARBITRATOR_PORT,
  type: "HTTP"
}
const connMaster = {
  host: process.env.PG_MASTER_HOST,
  port: process.env.PG_MASTER_PORT,
  user: process.env.PG_MASTER_USERNAME,
  password: process.env.PG_MASTER_PASSWORD,
  type: "PG"
}

// Проверим соединение с арбитром и мастером
return (async () => {
  if (! await checkHostUp(connAttempts, connMaster)) {
    console.log(`Master DB have a problem. Check Arbitrator status`);

    if (! await checkHostUp(connAttempts, connArbitrator)) {
        console.log(`Arbitrator connection error. Slave not promote to Master`);
    }
    else if (await arbitratorMasterIsUp(connArbitrator)) {
      console.log(`Arbitrator says Master is OK. Slave not promote to Master`);
    }
    else {
      console.log(`Arbitrator says Master is DOWN. Slave promote to Master`);
      await setPromote(process.env);
    }
  }
  else {
    console.log(`Status: OK`);
  }
})();