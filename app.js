/** @typedef {import('pear-interface')} */ /* global Pear */

import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
const { teardown, updates } = Pear;

const swarm = new Hyperswarm();

teardown(() => swarm.destroy());

updates(() => Pear.reload());

//******************************* POPUP Code**********************************//
let userName = "";

document.querySelector(".change--name").addEventListener("click", openPopUp);

const popup = document.querySelector(".popup");
const outerScreen = document.querySelector(".outerScreen");

function openPopUp() {
  popup.classList.remove("hidden");
  outerScreen.classList.remove("hidden");
}

outerScreen.addEventListener("click", closePopUp);

function closePopUp() {
  popup.classList.add("hidden");
  outerScreen.classList.add("hidden");
}

document.querySelector("#popup--form").addEventListener("submit", (e) => {
  e.preventDefault();

  const nameInput = document.querySelector("#popUp--input");
  const newName = nameInput.value.trim();

  if (newName != "") {
    console.log(`New name set: ${newName}`);

    userName = newName;

    popup.classList.add("hidden");
    outerScreen.classList.add("hidden");

    nameInput.value = "";
  } else {
    console.log("Name input cannot be empty.");
  }
});

//**************** END ******************//

swarm.on("connection", (peer) => {
  const hexCode = b4a.toString(peer.remotePublicKey, "hex").substr(0, 6);

  peer.on("data", (message) => {
    const data = JSON.parse(message.toString()); // Parse the message data
    const senderName = data.name || hexCode; // Use the sender's name or hex code
    const receivedMessage = data.message;

    onMessageAdded(senderName, receivedMessage); // Display the message with the correct sender name
  });

  peer.on("error", (e) => console.log(`Connection Error: ${e}`));
});

swarm.on("update", () => {
  document.querySelector("#peers-count").textContent = swarm.connections.size;
});

document
  .querySelector("#create--chat--room--btn")
  .addEventListener("click", createChatRoom);
document.querySelector("#join--form").addEventListener("submit", joinChatRoom);
document.querySelector("#message-form").addEventListener("submit", sendMessage);

async function createChatRoom() {
  console.log("Clicked the create btn");
  const seedBuffer = crypto.randomBytes(32);
  joinSwarm(seedBuffer);
}

async function joinChatRoom(e) {
  console.log("Clicked the join btn");
  e.preventDefault();
  const seedStr = document.querySelector("#join--room--btn--seed").value;
  const seedBuffer = b4a.from(seedStr, "hex");
  joinSwarm(seedBuffer);
}

async function joinSwarm(seedBuffer) {
  document.querySelector("#setup").classList.add("hidden");
  document.querySelector(".loading").classList.remove("hidden");

  const discovery = swarm.join(seedBuffer, { client: true, server: true });
  await discovery.flushed();

  const seed = b4a.toString(seedBuffer, "hex");
  document.querySelector("#chat-room-seed").innerHTML = seed;
  document.querySelector(".loading").classList.add("hidden");
  document.querySelector("#chat").classList.remove("hidden");
}

function sendMessage(e) {
  const message = document.querySelector("#message").value;
  document.querySelector("#message").value = "";
  e.preventDefault();

  const name = userName || "You"; // Use the sender's name or 'You'

  onMessageAdded(name, message); // Display the message in the sender's system

  // Prepare the message data as an object
  const messageData = {
    name: name,
    message: message,
  };

  // Convert the message data to a Buffer and send it to all peers
  const messageBuffer = Buffer.from(JSON.stringify(messageData));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(messageBuffer);
}

function onMessageAdded(from, message) {
  // Create a container div
  const $messageDiv = document.createElement("div");
  $messageDiv.classList.add("message--div");

  // Create the message element
  const $message = document.createElement("p");
  $message.textContent = message;
  $message.classList.add("message-item");

  // Create the sender element
  const $sender = document.createElement("p");
  $sender.textContent = from;
  $sender.classList.add("by");

  // Append message and sender to the container div
  $messageDiv.appendChild($message);
  $messageDiv.appendChild($sender);

  // Append the container div to the #messages
  document.querySelector("#messages").appendChild($messageDiv);
}
