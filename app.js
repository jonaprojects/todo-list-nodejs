const http = require("http");

const route = require("./routers/router");

const server = http.createServer((req, res, next) => {
  route(req, res, next);
});

server.listen(3000);
