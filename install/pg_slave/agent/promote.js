const { spawn } = require('child_process');
const http = require('http');

// Получение статуса Мастера по статус-коду Арбитра
async function arbitratorMasterIsUp(connParams) {
    return new Promise((resolve, reject) => {
        try {
          const req = http.request(connParams, (res) => {
            if (res.statusCode === 500) {
              resolve(false); // Мастер лежит
            }
            else {
              console.log(`Arbitrator return status code ${res.statusCode}`)
              resolve(true);
            }
          });
      
          req.on('error', (e) => {
            console.log(`Arbitrator return error: ${e}`);
            resolve(true); // По ТЗ потеря связи с Арбитром не влёчёт promote 
          });
      
          req.end();
        }
        catch (err) {
          console.log(`Slave can't connect to Arbitrator: ${err}`);
          resolve(true); // По ТЗ потеря связи с Арбитром не влёчёт promote 
        }
    });
}

// Выполнение операции promote slave до master
async function setPromote(dbEnv) {
  // В PgSQL 16 переменная promote_trigger_file была удалена (https://www.postgresql.org/docs/current/release-16.html, `Remove server variable promote_trigger_file (Simon Riggs)`)
  // Для выполнения promote будем использовать команду: pg_ctl promote
  return new Promise((resolve, reject) => {
    try {
      console.log(`Start promote Slave`)
      const child = spawn('pg_ctl', ['promote'], {
        env: {...dbEnv, "PGDATA":"/bitnami/postgresql/data"}
      }); 
      
      child.stdout.on('data', (data) => {
        console.log(`Promote stdout: ${data.toString()}`);
      });
      
      child.stderr.on('data', (data) => {
        console.error(`Promote stderr: ${data.toString()}`);
      });
      
      child.on('close', (code) => {
        console.log(`Promote end with code: ${code}`);
        resolve(true);
      });
   }
   catch (err) {
    console.log(`Set Promote error: ${err}`);
    resolve(false);
   }
  });
}

module.exports = { arbitratorMasterIsUp, setPromote };