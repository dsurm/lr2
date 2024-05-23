const { Pool } = require('pg');
const { containers } = require('./dockerUsage.js');

function createJitter(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}  

async function sleep(ms, noMsg = false) {
    if (! noMsg) {
        console.log(`Sleeping ${ms}ms`);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function bench(insertValues, connParams, stopContainer) {
    let statistics = {
        lost: 0,
        insertedUnconfirmedWrite: 0,
        insertedUnconfirmed: 0,
        insertedConfirmed: 0,
        time: 0
    };

    // Создадим подключения к master и slave
    const connMaster = new Pool(connParams.pg_master);
    const connSlave = new Pool(connParams.pg_slave);
    let pool = connMaster;
    connMaster.on('error', (err, client) => {
        console.log(`Connection to master error: ${err}`);
        pool = connSlave;
    });
    connSlave.on('error', (err, client) => {
        console.log(`Connection to slave error: ${err}`);
    });

    // Создадим тестовую таблицу в базе
    try {
        await pool.query('CREATE TABLE IF NOT EXISTS test (id int);');
        console.log(`Test table created successfully`);
    }
    catch (err) {
        console.log(`Create table error: ${err}`)
        process.exit(-1);
    }

    // Начнём запись значений в базу
    let promisesResult = [];
    console.log(`Start inserting values in test table`);
    const startTime = performance.now();
    for (let i = 1; i <= insertValues; i++) {
        // Зададим произвольную задержку между записью значений
        const jitterTime = createJitter(0, 50);
        statistics.time -= jitterTime; // Не будем учитывать jitter в статистике времени выполнения сценария
        await sleep(jitterTime, true);

        // При записи половины значений грохнем контейнер
        if (i == Math.floor(insertValues/2)) {
            console.log(`Killing ${stopContainer} container, after ${i} inseret value`);
            containers('delete', [stopContainer]);
            if (stopContainer == "pg_master") {
                pool = connSlave; // Переключимся на slave
            }
        }

        // Запишем значение в базу
        promisesResult.push({
            insertValue: i,
            promise: pool.query(`INSERT INTO test (id) VALUES ($1);`, [i]).catch(e => {console.error(`Insert error: ${e}`)})
        }); 
    }
    console.log(`End inserting values in test table`);
    
    // Подождём как выполнятся все запросы и получим результаты их выполнения
    let result = {};
    for (let promise of promisesResult) {
        try {
            promise.res = await promise.promise;
            if (promise.res.rowCount == 1) {
                result[promise.insertValue] = 1; // запрос обработан успешно
            }
            else {
                result[promise.insertValue] = 0;
            }
        }
        catch (err) {
            result[promise.insertValue] = 0;
        }
    }

    // Рассчитаем время конца обработки всех запросов
    statistics.time += performance.now() - startTime;

    // Посчитаем число подтверждено выполненных запросов
    let confirmed;
    try {
        confirmed = await pool.query(`SELECT * FROM test;`);
        for (let row of confirmed.rows) {
            if (! result[row.id]) {
                result[row.id] = 2;
            }
            else {
                result[row.id] += 2;
            }
        }
    }
    catch (err) {
        console.log(`Get insert data error: ${err}`);
        process.exit(-1);
    }

    // Подведём статистику
    for (let i = 1; i <= insertValues; i++) {
        /*
            0/nan - не записано и не подтверждено
            1 - записано, но не подтверждено
            2 - не записано, но подтверждено
            3 - записано и подтверждено
        */
        if (! result[i] || result[i] == 0) {
            statistics.lost++;
        }
        else if (result[i] == 1) {
             statistics.insertedUnconfirmed++;
        }
        else if (result[i] == 2) {
            statistics.insertedUnconfirmedWrite++;
        }
        else if (result[i] == 3) {
            statistics.insertedConfirmed++;
        }
    }

    return statistics;
}

module.exports = { sleep, bench };