const http = require('http');
const fs = require('fs');
const server = http.createServer((req, res) => {
    fs.appendFileSync('mock.log', `${req.method} ${req.url}\n`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: "mock_id_123", task_status: "SUCCESS" }));
});
server.listen(8081, () => console.log('Mock server listening on 8081'));
