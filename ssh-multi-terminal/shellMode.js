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
                if (pendingSuggestion.startsWith('sudo')) {
                    // Handle sudo commands from ChatGPT
                    rl.question(chalk.blueBright('Enter sudo password: '), async (password) => {
                        try {
                            const { stdout, stderr } = await executeCommand(activeConnection.conn, pendingSuggestion, password);
                            if (stdout) console.log(chalk.green(stdout.trim()));
                            if (stderr) console.error(chalk.red(stderr.trim()));
                        } catch (err) {
                            console.error(chalk.redBright(`Error executing command: ${err.message}`));
                        }
                        pendingSuggestion = null;
                        rl.prompt();
                    });
                } else {
                    // Handle non-sudo commands from ChatGPT
                    try {
                        const { stdout, stderr } = await executeCommand(activeConnection.conn, pendingSuggestion);
                        if (stdout) console.log(chalk.green(stdout.trim()));
                        if (stderr) console.error(chalk.red(stderr.trim()));
                    } catch (err) {
                        console.error(chalk.redBright(`Error executing command: ${err.message}`));
                    }
                    pendingSuggestion = null;
                    rl.prompt();
                }
                return;
            } else {
                console.log(chalk.cyan('Command not executed.'));
                pendingSuggestion = null;
                rl.prompt();
                return;
            }
        }

        if (command.startsWith('?')) {
            const query = command.slice(1).trim();
            if (!query) {
                console.log(chalk.red('Please provide a query after "?".'));
                rl.prompt();
                return;
            }

            console.log(chalk.blueBright('Fetching command suggestion from ChatGPT...'));
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

        if (command.startsWith('sudo')) {
            rl.question(chalk.blueBright('Enter sudo password: '), async (password) => {
                try {
                    const { stdout, stderr } = await executeCommand(activeConnection.conn, command, password);
                    if (stdout) console.log(chalk.green(stdout.trim()));
                    if (stderr) console.error(chalk.red(stderr.trim()));
                } catch (err) {
                    console.error(chalk.redBright(`Error executing command: ${err.message}`));
                }
                rl.prompt();
            });
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

