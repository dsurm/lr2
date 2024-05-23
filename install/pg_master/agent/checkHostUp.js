const http = require('http');
const pg = require('pg');

// Генерация рандомной задержки между попытками подключения
function createJitter(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

// Проверка связи с арбитром
async function pingHTTP(connParams) {
  return new Promise((resolve, reject) => {
    try {
      const req = http.request(connParams, (res) => {
        resolve(true);
      });
  
      req.on('error', (e) => {
        resolve(false);
      });
  
      req.end();
    }
    catch (err) {
      resolve(false);
    }
  });
}

// Проверка связи с БД
async function pingPG(connParams) {
  const pool = new pg.Pool(connParams);
    
  pool.on('error', (err, client) => {
    return false;
  });

  try {
    const result = await pool.query('SELECT 1;'); // В соотвествии с ТЗ проверка работоспособности через `SELECT 1`;
    if (result.rows[0]["?column?"] !== 1) {
      console.log(`PG return incorrect SQL response data`);
      await pool.end();
      return false;
    }
    else {
      await pool.end();
      return true;
    }
  }
  catch (err) {
    console.log(`PG is down: ${err}`);
    await pool.end();
    return false;
  }
}

// 
async function checkHostUp(connAttempts, connParams) {
  while (connAttempts != 0) {
    if (connParams.type === "HTTP" && await pingHTTP(connParams)){
      return true;
    }
    else if (connParams.type === "PG" && await pingPG(connParams)) {
      return true;
    }

    connAttempts--;
    await new Promise(resolve => setTimeout(resolve, 1000 + createJitter(0, 200))); // Задержка между попытками установления соединения (не стал выносить в .env файл чтобы ещё сильнее не перегружать его)
  }
  console.log(`Connect to ${connParams.type} error`);
  return false;
}

module.exports = { checkHostUp };