const fs = require('fs');
const { exec, spawn } = require('child_process');

async function containers(commandType, names) {
    return new Promise((resolve, reject) => {
        let command;
        if (commandType == 'start') {
            command = `docker compose --project-directory ../ up -d ${names.join(' ')}`;
            console.log(`Up containers: ${names.join(',')}`);
        }
        else if (commandType == 'delete') {
            command = `docker compose -v --project-directory ../ down ${names.join(' ')}`;
            console.log(`Delete containers and his volumes: ${names.join(',')}`);
        }

        try {
          const child = exec(command); 
          
          child.stdout.on('data', (data) => {
            console.log(data.toString());
          });
          
          child.stderr.on('data', (data) => {
            console.error(data.toString());
          });
          
          child.on('close', (code) => {
            console.log(`Command ${commandType} ${names.join(', ')} executed: ${code}`);
            resolve();
          });
       }
       catch (err) {
        console.error(`Execute command error: ${err}`);
        process.exit(-1);
       }
      });
}

function changeEnvVariable(path, name, value) {
    try {
        const fileContent = fs.readFileSync(path, 'utf-8');
        const pattern = new RegExp(`${name}=.*`, 'g');
        const replacement = `${name}=${value}`;
        const newContent = fileContent.replaceAll(pattern, replacement);

        if (fileContent.search(pattern) === -1) {
            throw(`nothing to change`);
        }
        fs.writeFileSync(path, newContent);
        console.log(`In file '${path}' env variable '${name}' set value '${value}' successfully`);
    }
    catch (err) {
        console.log(`In file '${path}' env variable '${name}' set value '${value}' unsuccessfully, error: ${err}`);
        process.exit(-1);
    }
}

module.exports = { changeEnvVariable, containers };