#!/usr/bin/env node
'use strict';

import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk'; // Import Chalk
import { connectSSH, executeCommand } from './sshUtils.js';
import { getCommandSuggestion, getCommandDescription } from './chatgptUtils.js';

const CONNECTIONS_FILE = 'connections.json';
let connections = [];
let activeConnection = null;
let pendingSuggestion = null;

function loadConnections() {
    if (fs.existsSync(CONNECTIONS_FILE)) {
        connections = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
    }
}

function saveConnections() {
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green.bold('$ > '), // Styled prompt
});

async function shellMode() {
    console.log(chalk.blueBright(`Connected to ${activeConnection.host}. Type "exit" to disconnect.`));
    rl.setPrompt(chalk.green.bold('$ > '));
    rl.prompt();

    rl.removeAllListeners('line');
    rl.on('line', async (line) => {
        const command = line.trim();

        if (command.toLowerCase() === 'exit') {
            console.log(chalk.yellowBright(`Disconnected from ${activeConnection.host}.`));
            activeConnection.conn.end();
            activeConnection = null;
            showOptions();
            return;
        }

        if (command.toLowerCase() === 'clear') {
            console.clear();
            rl.prompt();
            return;
        }

        if (pendingSuggestion) {
            const confirmation = command.toLowerCase();
            if (confirmation === 'y' || confirmation === 'yes') {
                try {
                    const { stdout, stderr } = await executeCommand(activeConnection.conn, pendingSuggestion);
                    if (stdout) console.log(chalk.green(stdout.trim()));
                    if (stderr) console.error(chalk.red(stderr.trim()));
                } catch (err) {
                    console.error(chalk.redBright(`Error executing command: ${err.message}`));
                }
                pendingSuggestion = null;
            } else {
                console.log(chalk.cyan('Command not executed.'));
                pendingSuggestion = null;
            }
            rl.prompt();
            return;
        }

        if (command.startsWith('?')) {
            const query = command.slice(1).trim();
            if (!query) {
                console.log(chalk.red('Please provide a query after "?".'));
                rl.prompt();
                return;
            }

            console.log(chalk.blueBright('Fetching command suggestion...'));
            try {
                const suggestion = await getCommandSuggestion(query);
                const description = await getCommandDescription(suggestion);
                console.log(chalk.magenta(`\nSuggested Command: ${suggestion}`));
                console.log(chalk.cyan(`Description: ${description}`));
                console.log(chalk.yellowBright('Do you want to execute this command? (y/n)'));
                pendingSuggestion = suggestion;
            } catch (err) {
                console.error(chalk.redBright(`ChatGPT Error: ${err.message}`));
            }
            rl.prompt();
            return;
        }

        if (command) {
            try {
                const { stdout, stderr } = await executeCommand(activeConnection.conn, command);
                if (stdout) console.log(chalk.green(stdout.trim()));
                if (stderr) console.error(chalk.red(stderr.trim()));
            } catch (err) {
                console.error(chalk.redBright(`Error executing command: ${err.message}`));
            }
        }
        rl.prompt();
    });
}

function showOptions() {
    console.log(chalk.yellow('\nOptions:'));
    console.log(chalk.blue('1.') + ' List all connections');
    console.log(chalk.blue('2.') + ' Add a new connection');
    console.log(chalk.blue('3.') + ' Connect to a server');
    console.log(chalk.blue('4.') + ' Exit');
    rl.setPrompt(chalk.green.bold('Choose an option: '));
    rl.prompt();
}

function listConnections() {
    console.log(chalk.yellow('\nSaved Connections:'));
    if (connections.length === 0) {
        console.log(chalk.red('No connections saved.'));
    } else {
        connections.forEach((conn, index) => {
            console.log(chalk.green(`${index + 1}. ${conn.host}`) + chalk.cyan(` (Username: ${conn.username})`));
        });
    }
}

function addConnection() {
    rl.question(chalk.blueBright('Enter host: '), (host) => {
        rl.question(chalk.blueBright('Enter username: '), (username) => {
            rl.question(chalk.blueBright('Enter password: '), (password) => {
                connections.push({ host, username, password });
                saveConnections();
                console.log(chalk.green('Connection saved.'));
                showOptions();
            });
        });
    });
}

function connectToServer() {
    if (connections.length === 0) {
        console.log(chalk.red('No saved connections. Add one first.'));
        showOptions();
        return;
    }

    listConnections();
    rl.question(chalk.cyan('Enter the number of the connection to use: '), async (input) => {
        const index = parseInt(input, 10) - 1;
        if (isNaN(index) || !connections[index]) {
            console.log(chalk.red('Invalid selection.'));
            showOptions();
            return;
        }

        const target = connections[index];
        console.log(chalk.blueBright(`Connecting to ${target.host}...`));

        try {
            const { conn } = await connectSSH(target);
            activeConnection = { ...target, conn };
            shellMode();
        } catch (err) {
            console.error(chalk.redBright(`Error connecting to ${target.host}: ${err.message}`));
            showOptions();
        }
    });
}

function startCLI() {
    console.log(chalk.yellowBright('Welcome to the SSH Multi-Terminal!'));
    loadConnections();
    showOptions();

    rl.on('line', (line) => {
        switch (line.trim()) {
            case '1':
                listConnections();
                showOptions();
                break;
            case '2':
                addConnection();
                break;
            case '3':
                connectToServer();
                break;
            case '4':
                rl.close();
                break;
            default:
                console.log(chalk.red('Invalid option.'));
                showOptions();
        }
    }).on('close', () => {
        console.log(chalk.green('Goodbye!'));
        process.exit(0);
    });
}

startCLI();
