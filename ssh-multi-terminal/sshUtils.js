import { Client } from 'ssh2';

export async function connectSSH({ host, username, password }) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn
            .on('ready', () => resolve({ conn }))
            .on('error', (err) => reject(new Error(`Connection Error: ${err.message}`)))
            .connect({ host, username, password });
    });
}

export function executeCommand(conn, command, sudoPassword = null) {
    return new Promise((resolve, reject) => {
        conn.exec(command, { pty: true }, (err, stream) => {
            if (err) return reject(err);

            let stdout = '';
            let stderr = '';
            let isSudoPasswordPrompt = false;

            stream
                .on('close', () => resolve({ stdout, stderr }))
                .on('data', (data) => {
                    const output = data.toString();
                    stdout += output;

                    // Detect sudo password prompt
                    if (output.includes('[sudo] password for')) {
                        isSudoPasswordPrompt = true;
                        if (sudoPassword) {
                            stream.write(`${sudoPassword}\n`); // Send the sudo password
                            isSudoPasswordPrompt = false;
                        } else {
                            reject(new Error('Sudo password required but not provided.'));
                        }
                    }
                })
                .stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    stderr += errorOutput;

                    if (isSudoPasswordPrompt) {
                        reject(new Error('Invalid sudo password.'));
                    }
                });
        });
    });
}

