import { io, Socket } from 'socket.io-client';

const socket: Socket = io();
const myFace: HTMLVideoElement = document.getElementById("myFace") as HTMLVideoElement;
const muteBtn: HTMLButtonElement = document.getElementById("mute") as HTMLButtonElement;
const cameraBtn: HTMLButtonElement = document.getElementById("camera") as HTMLButtonElement;
const camerasSelect: HTMLSelectElement = document.getElementById("cameras") as HTMLSelectElement;
const call: HTMLDivElement = document.getElementById("call") as HTMLDivElement;

call.hidden = true;

let myStream: MediaStream;
let muted: boolean = false;
let cameraOff: boolean = false;
let roomName: string;
let myPeerConnection: RTCPeerConnection;
let myDataChannel: RTCDataChannel;

async function getCameras(): Promise<void> {
  try {
    const devices: MediaDeviceInfo[] = await navigator.mediaDevices.enumerateDevices();
    const cameras: MediaDeviceInfo[] = devices.filter((device) => device.kind === "videoinput");
    const currentCamera: MediaTrackSettings | undefined = myStream.getVideoTracks()[0]?.getSettings();
    cameras.forEach((camera) => {
      const option: HTMLOptionElement = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label || "";
      if (currentCamera.deviceId === camera.deviceId) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId?: string): Promise<void> {
  const initialConstraints: MediaStreamConstraints = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints: MediaStreamConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

// ... Rest of the code remains the same, just with TypeScript type annotations ...

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender: RTCRtpSender | undefined = myPeerConnection
      .getSenders()
      .find((sender) => sender.track!.kind === "video");
    videoSender!.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome: HTMLElement | null = document.getElementById("welcome");
const welcomeForm: HTMLFormElement | null = welcome!.querySelector("form");

async function initCall() {
  welcome!.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm!.querySelector("input");
  await initCall();
  socket.emit("join_room", input!.value);
  roomName = input!.value;
  input!.value = "";
}

welcomeForm!.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => console.log(event.data));
  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      console.log(event.data)
    );
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

function makeConnection(): void {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener<"icecandidate">("icecandidate", handleIce);
  myPeerConnection.addEventListener<"track">("track", handleTrack);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(ev: RTCPeerConnectionIceEvent): void {
  socket.emit("ice", ev.candidate, roomName);
}

function handleTrack(ev: RTCTrackEvent): void {
  const peerFace: HTMLVideoElement = document.getElementById("peerFace") as HTMLVideoElement;
  peerFace.srcObject = ev.streams[0];
}