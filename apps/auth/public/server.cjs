const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 8080);
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
};

function resolveFile(requestUrl) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
    } catch {
        return null;
    }

    const requested = path.resolve(root, `.${pathname}`);
    if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) return null;
    if (fs.existsSync(requested) && fs.statSync(requested).isFile()) return requested;
    return path.join(root, 'index.html');
}

http.createServer((request, response) => {
    const file = resolveFile(request.url || '/');
    if (!file) {
        response.writeHead(400);
        response.end('Bad request');
        return;
    }

    fs.readFile(file, (error, content) => {
        if (error) {
            response.writeHead(500);
            response.end('Internal server error');
            return;
        }

        const extension = path.extname(file).toLowerCase();
        if (extension === '.js' || extension === '.css' || file.includes(`${path.sep}assets${path.sep}`)) {
            response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
        response.end(content);
    });
}).listen(port, '0.0.0.0');
