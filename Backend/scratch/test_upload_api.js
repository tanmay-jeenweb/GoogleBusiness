const fs = require('fs');
const http = require('http');
const path = require('path');

// Test if server is listening on port 5000
const req = http.get('http://localhost:5000/api/health', (res) => {
    console.log('Backend health status:', res.statusCode);
});
req.on('error', (err) => {
    console.error('Backend health check error:', err.message);
});
