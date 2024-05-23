# Описание 
## Архитектура
Проект состоит из трёх Docker контейнеров и тестеровщика:
1.	pg_arbitrator – арбитр;
2.	pg_master – мастер;
3.	pg_slave - слейв;

В качестве базового образа для контейнеров pg_master, pg_slave используется bitnami/postgresql:16.3.0 (https://github.com/bitnami/containers/blob/main/bitnami/postgresql/README.md).

Во всех контейнерах перечисленных выше контейнерах, крутиться программа-агент. Образы pg_master и pg_slave идентичны между собой, за исключением различных вариантов программ-агентов.

## Логика работы агента
Сценарий работы при потере сетевой связности:
- Программа-агент запущенная на pg_arbitrator, поднимает http лисинер на порту 8080. При потере связи с pg_master, начинает возвращать статус-код не 200, а 500.
- Программа-агент запущенная на pg_master, при обнаружении потери связи с pg_arbitrator и pg_slave - тушит СУБД на pg_master.
- Программа-агент запущенная на pg_slave, при потере связи с pg_master делает http запрос к лисенеру на pg_arbitrator и при получении 500 кода ответа выполняет promote до master-a.

## Логика работы тестировщика
1. При запуске, а также между тестовыми сценариями удаляет контейнеры и их разделы (для чистоты экспериментов);
2. Запускает один из четырёх сценариев:
a. Во время записи падает мастер при synchronous_commit = on;
b. Во время записи падает мастер при synchronous_commit = off;
c. Во время записи падает слейв при synchronous_commit = on;
d. Во время записи падает слейв при synchronous_commit = off;
3. По результатам тестов выводит статистику по:
- `Lost values` - числу потерянных значений (при выполнении запроса в мастер произошла ошибка и в слейв запись не появилась);
- `Inserted values (not confirmed)` - числу вставленных, но не подтверждённых значений (запрос на запись в мастер выполнился успешно, но в слейв запись не появилась);
- `Inserted values (confirmed)` - числу вставленных и подтверждённых значений (запрос на запись в мастер выполнился успешно, и в слейв запись появилась); 
- `Inserted values (unconfirmed but write)` - числу вставленных в слейв значений (запрос на запись в мастер выполнился с ошибкой, но слейв запись появилась); 
- `Scenario execution time (without random delays)` - время выполнения сценария;

# Эксплуатация
## Настройка
Настройка не требуется. 

DISCLAIMER

При использовании данного решения в бою - требуется сменить креды, хранящиеся в файлах переменных окружения:
```
./config/pg_arbitrator/.env
./config/pg_master/.env
./config/pg_slave/.env
./tester/.env
```

## Запуск
1. Установить [NodeJS](https://nodejs.org/en/download/package-manager).
2. Зайти в папку проекта, перейти в папку `tester`.
3. Загрузить недостающие зависимости, выполнив команду:
```
npm install
```
4. Запустить тестировщик командой:
```
node ./index.js
```

P.S.
Логи healthcheck-а не пишутся в stdout, их можно посмотреть с помощью команды:
```
docker inspect --format "{{json .State.Health }}" <container_name>
```

# Результаты
При выполнении сценариев получился следующий результат:
```
Statistics for scenario number 1
Scenario params: {"envKey":"POSTGRESQL_SYNCHRONOUS_COMMIT_MODE","envValue":"on","stopContainer":"pg_master"}
Lost values: 32
Inserted values (not confirmed): 0
Inserted values (confirmed): 4970
Inserted values (unconfirmed but write): 0
Scenario execution time (without random delays): 31903.5567ms


Statistics for scenario number 2
Scenario params: {"envKey":"POSTGRESQL_SYNCHRONOUS_COMMIT_MODE","envValue":"off","stopContainer":"pg_master"}
Lost values: 41
Inserted values (not confirmed): 0
Inserted values (confirmed): 4970
Inserted values (unconfirmed but write): 0
Scenario execution time (without random delays): 32363.99649999998ms


Statistics for scenario number 3
Scenario params: {"envKey":"POSTGRESQL_SYNCHRONOUS_COMMIT_MODE","envValue":"on","stopContainer":"pg_slave"}
Lost values: 0
Inserted values (not confirmed): 0
Inserted values (confirmed): 5000
Inserted values (unconfirmed but write): 0
Scenario execution time (without random delays): 31925.236800000013ms


Statistics for scenario number 4
Scenario params: {"envKey":"POSTGRESQL_SYNCHRONOUS_COMMIT_MODE","envValue":"off","stopContainer":"pg_slave"}
Lost values: 0
Inserted values (not confirmed): 0
Inserted values (confirmed): 5000
Inserted values (unconfirmed but write): 0
Scenario execution time (without random delays): 31449.898400000005ms
```