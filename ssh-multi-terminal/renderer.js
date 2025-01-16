document.addEventListener('DOMContentLoaded', async () => {
    const connectionList = document.getElementById('connectionList');
    const commandForm = document.getElementById('commandForm');
    const resultDiv = document.getElementById('result');
    const connections = await window.electronAPI.getConnections();

    function renderConnections() {
        connectionList.innerHTML = '';
        connections.forEach((conn) => {
            const option = document.createElement('option');
            option.value = conn.host;
            option.textContent = conn.host;
            connectionList.appendChild(option);
        });
    }

    document.getElementById('addConnectionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const host = document.getElementById('host').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        await window.electronAPI.addConnection({ host, username, password });
        renderConnections();
    });

    commandForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const command = document.getElementById('command').value;
        const target = document.getElementById('connectionList').value;
        resultDiv.textContent = 'Executing command...';

        const results = await window.electronAPI.executeCommand({ command, target });
        resultDiv.innerHTML = results
            .map((res) => `<p><strong>${res.server}:</strong><br>${res.stdout || res.stderr}</p>`)
            .join('');
    });

    renderConnections();
});

