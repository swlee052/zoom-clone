import express from 'express';
import http from 'http';
import WebSocket from 'ws';

const app = express();
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => res.render('home'));
app.get('/*', (req, res) => res.redirect('/'));

const handleListen = () => console.log(`Listening on http://localhost:3000`)

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const sockets = [];

wss.on('connection', (socket) => {
  socket['nickname'] = 'anonymous';
  sockets.push(socket);
  socket.on('close', () => {
    console.log('disconnected from client')
  })
  socket.on('message', (msg) => {
    const parsedMsg = JSON.parse(msg);
    console.log(parsedMsg)
    switch(parsedMsg.type) {
      case 'new_message':
        sockets.forEach(s => s.send(`${socket.nickname}: ${parsedMsg.payload}`));
        console.log(`${socket.nickname}: ${parsedMsg.payload}`);
        break;
      case 'nickname':
        socket['nickname'] = parsedMsg.payload;
        break;
    }
  })
})
server.listen(3000, handleListen);