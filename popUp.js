const detailsShowBtn = document.querySelector(".details--btn");
const detailsPopUp = document.querySelector(".details--popUp");
const outerScreen = document.querySelector(".outerScreen");

outerScreen.addEventListener("click", (e) => {
  e.preventDefault();
  whiteBoard.classList.add("hidden");
  whiteBoardControl.classList.add("hidden");
  detailsPopUp.classList.add("hidden");
  membersList.classList.add("hidden");
});

detailsShowBtn.addEventListener("click", (e) => {
  e.preventDefault();
  detailsPopUp.classList.toggle("hidden");
  outerScreen.classList.toggle("hidden");
});

document.querySelector(".add--btn").addEventListener("click", () => {
  document.querySelector(".add--popUp").classList.toggle("hidden");
});
document.querySelector(".add--popUp").addEventListener("click", () => {
  document.querySelector(".add--popUp").classList.add("hidden");
});

const termsPopUp = document.querySelector(".terms--popUp");
const termsShowBtn = document.querySelector(".terms--btn");
const termsCloseBtn = document.querySelector(".terms--close--btn");

termsShowBtn.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector("#chat").classList.add("hidden");
  termsPopUp.classList.remove("hidden");
  document.querySelector("#popup").classList.toggle("hidden");
  outerScreen.classList.add("hidden");
});

termsCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector("#chat").classList.remove("hidden");
  termsPopUp.classList.add("hidden");
});

const whiteBoard = document.querySelector("#whiteboard");
const whiteBoardBtn = document.querySelector(".whiteboard--btn");
const whiteBoardCloseBtn = document.querySelector(".whiteboard--close--btn");
const whiteBoardControl = document.querySelector(".canva--div");

whiteBoardBtn.addEventListener("click", (e) => {
  e.preventDefault();
  whiteBoard.classList.remove("hidden");
  outerScreen.classList.toggle("hidden");
  whiteBoardControl.classList.remove("hidden");
});

whiteBoardCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  whiteBoard.classList.add("hidden");
  outerScreen.classList.toggle("hidden");
  whiteBoardControl.classList.add("hidden");
});

const membersOpenBtn = document.querySelector(".peer--btn");
const membersList = document.querySelector(".members--list");
const memberListCloseBtn = document.querySelector(".members--close--btn");

membersOpenBtn.addEventListener("click", (e) => {
  e.preventDefault();
  membersList.classList.remove("hidden");
  outerScreen.classList.remove("hidden");
  detailsPopUp.classList.add("hidden");
});

memberListCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  membersList.classList.add("hidden");
  outerScreen.classList.add("hidden");
});

// Voice chat

const voiceRoomBtn = document.querySelector("#create--voice--room");
const voiceRoom = document.querySelector("#voiceRoom");
const voiceChatMic = document.querySelector(".voice--button");
const voiceChatMicImg = document.querySelector(".voice--chat--mic");
const voiceCloseBtn = document.querySelector(".closeVoice");

voiceRoomBtn.addEventListener("click", (e) => {
  e.preventDefault();
  voiceRoom.classList.remove("hidden");
});

voiceCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  voiceRoom.classList.add("hidden");
});
