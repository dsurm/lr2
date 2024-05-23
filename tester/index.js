const dotenv = require('dotenv');
const { changeEnvVariable, containers } = require('./dockerUsage.js');
const { sleep, bench } = require('./bench.js');

const masterEnvPath = '../config/pg_master/.env';
const agentEnvPath = './.env';
const dockerContainers = ['pg_arbitrator', 'pg_master', 'pg_slave'];
const insertValues = 5000;

dotenv.config({ path: agentEnvPath });

return (async () => {
    // Зададим параметры подключения к базам
    const conn = {
        pg_master: {
            database: process.env.PG_MASTER_DATABASE,
            host: process.env.PG_MASTER_HOSTS,
            port: process.env.PG_MASTER_PORT,
            user: process.env.PG_MASTER_USER,
            password: process.env.PG_MASTER_PASSWORD,
            type: "PG"
        },
        pg_slave: {
            database: process.env.PG_SLAVE_DATABASE,
            host: process.env.PG_SLAVE_HOSTS,
            port: process.env.PG_SLAVE_PORT,
            user: process.env.PG_SLAVE_USER,
            password: process.env.PG_SLAVE_PASSWORD,
            type: "PG"
        }
    };

    // Зададим параметры сценариев
    const scenarios = [
        {
            envKey: "POSTGRESQL_SYNCHRONOUS_COMMIT_MODE",
            envValue: "on",
            stopContainer: "pg_master" 
        },
        {
            envKey: "POSTGRESQL_SYNCHRONOUS_COMMIT_MODE",
            envValue: "off",
            stopContainer: "pg_master" 
        },
        {
            envKey: "POSTGRESQL_SYNCHRONOUS_COMMIT_MODE",
            envValue: "on",
            stopContainer: "pg_slave" 
        },
        {
            envKey: "POSTGRESQL_SYNCHRONOUS_COMMIT_MODE",
            envValue: "off",
            stopContainer: "pg_slave" 
        }
    ] 

    // Прогоним параметры тестирования кластеров
    let scenariosStatistic = [];
    for (let scenario of scenarios) {
        console.log(`\n\nRun scenario with params: ${JSON.stringify(scenario)}`);
        await containers('delete', dockerContainers);
        await changeEnvVariable(masterEnvPath, scenario.envKey, scenario.envValue);
        await containers('start', dockerContainers);
        await sleep(10000);
        scenariosStatistic.push(await bench(insertValues, conn, scenario.stopContainer));
    }
    await containers('delete', dockerContainers); // Почистим за собой контейнеры

    // Выведем статистику по сценариям
    for (let i = 0; i < scenariosStatistic.length; i++) {
        console.log(`\n\nStatistics for scenario number ${i+1}`);
        console.log(`Scenario params: ${JSON.stringify(scenarios[i])}`);
        console.log(`Lost values: ${scenariosStatistic[i].lost}`);
        console.log(`Inserted values (not confirmed): ${scenariosStatistic[i].insertedUnconfirmed}`);
        console.log(`Inserted values (confirmed): ${scenariosStatistic[i].insertedConfirmed}`);
        console.log(`Inserted values (unconfirmed but write): ${scenariosStatistic[i].insertedUnconfirmedWrite}`);
        console.log(`Scenario execution time (without random delays): ${scenariosStatistic[i].time}ms`);
    }
})();