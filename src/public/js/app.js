const msgForm = document.querySelector('#message');
const nickForm = document.querySelector('#nickname');
const msgList = document.querySelector('#messageList');
const curNick = document.querySelector('#currentNickname');
const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener('open', handleOpen);

socket.addEventListener('message', handleMessage);

socket.addEventListener('close', handleClose);

msgForm.addEventListener('submit', handleSubmit);

nickForm.addEventListener('submit', handleNickSubmit);



// handlers
function handleOpen() {
  console.log('connected to server');
}

function handleClose() {
  console.log('disconnected from server');
}

function handleMessage(msg) {
  // udpate UI with message from backend
  const li = document.createElement('li');
  li.innerText = msg.data;
  msgList.append(li);
}

function handleSubmit(event) {
  // send msg to backend
  event.preventDefault();
  const input = msgForm.querySelector('input');
  const msg = convertToMessage('new_message', input.value);
  socket.send(msg);

  // udpate UI
  input.value = '';
}

function handleNickSubmit(event) {
  // send msg to backend
  event.preventDefault();
  const input = nickForm.querySelector('input');
  const msg = convertToMessage('nickname', input.value);
  socket.send(msg);

  // udpate UI
  curNick.innerText = `Current Nickname: ${input.value}`;
  input.value = '';
}



// utils
function convertToMessage(type, payload) {
  const msg = { type, payload };
  return JSON.stringify(msg);
}