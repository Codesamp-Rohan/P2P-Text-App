/** @typedef {import('pear-interface')} */ /* global Pear */

import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";
const { teardown, updates } = Pear;

const swarm = new Hyperswarm();

teardown(() => swarm.destroy());

updates(() => Pear.reload());

// ********************************Image CODE*********************************//

// Function to convert an image to a Base64 string
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // Read file as Data URL (Base64 format)
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Handle image selection and send as a message
// Handle image selection and send as a message
document
  .querySelector("#image-upload")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0]; // Get the selected image file
    if (file) {
      try {
        const base64Image = await imageToBase64(file);
        const messageData = {
          name:
            userName ||
            b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6),
          message: base64Image,
          isImage: true, // Flag to indicate the message is an image
        };

        // Convert the message data to a Buffer and send it to all peers
        const messageBuffer = Buffer.from(JSON.stringify(messageData));
        const peers = [...swarm.connections];
        for (const peer of peers) peer.write(messageBuffer);

        onMessageAdded("You", base64Image, true); // Display the image in sender's chat
      } catch (error) {
        console.error("Image conversion failed: ", error);
      }
    }
  });

// **************************************************************************//

//******************************* POPUP Code**********************************//
let userName = "";
let prevName = "";

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

    const prevName =
      userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6);
    userName = newName;

    popup.classList.add("hidden");
    outerScreen.classList.add("hidden");

    nameInput.value = "";

    const changeName = {
      system: true,
      message: `${prevName} changed its name to ${newName}`,
    };

    const newNameMsgBuffer = Buffer.from(JSON.stringify(changeName));

    const peers = [...swarm.connections];
    for (const peer of peers) peer.write(newNameMsgBuffer);
  } else {
    console.log("Name input cannot be empty.");
  }
});

//**************** END ******************//

swarm.on("connection", (peer) => {
  const hexCode = b4a.toString(peer.remotePublicKey, "hex").substr(0, 6);

  peer.on("data", (message) => {
    const data = JSON.parse(message.toString()); // Parse the message data

    if (data.system) {
      // Display system messages differently
      onSystemMessageAdded(data.message);
    } else {
      const senderName = data.name || hexCode; // Use the sender's name or hex code
      const receivedMessage = data.message;
      const isImage = data.isImage;

      onMessageAdded(senderName, receivedMessage, isImage); // Display the message with the correct sender name
    } // Display the message with the correct sender name
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

  const joinName =
    userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6);

  const joinMessage = {
    system: true,
    message: `🥳 ${joinName} joined the chat 🥂🥂`,
  };

  const joinMessageBuffer = Buffer.from(JSON.stringify(joinMessage));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(joinMessageBuffer);
}

function sendMessage(e) {
  e.preventDefault();
  const message = document.querySelector("#message").value;
  document.querySelector("#message").value = "";

  if (message.trim() === "") return;

  const name =
    userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6); // Use the sender's name or 'You'

  onMessageAdded("You", message, false); // Display the message in the sender's system

  // Prepare the message data as an object
  const messageData = {
    name: name,
    message: message,
    isImage: false,
  };

  // Convert the message data to a Buffer and send it to all peers
  const messageBuffer = Buffer.from(JSON.stringify(messageData));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(messageBuffer);
}

function onMessageAdded(senderName, message, isImage) {
  const messagesContainer = document.querySelector("#messages");

  // Create the message wrapper
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message--div");

  // Create the message content element
  const messageElement = document.createElement("div");
  messageElement.classList.add(
    senderName === "You" ? "message-item-right" : "message-item-left"
  );

  // Check if the message is an image or text
  if (isImage) {
    const imgElement = document.createElement("img");
    imgElement.src = message;
    imgElement.style.maxWidth = "100%";
    messageElement.appendChild(imgElement);
  } else {
    messageElement.textContent = message;
  }

  // Create the sender's name element (for the "by" message)
  const senderElement = document.createElement("div");
  senderElement.classList.add(senderName === "You" ? "by-right" : "by-left");
  senderElement.textContent = senderName;

  // Append the sender's name and message content to the wrapper
  messageDiv.appendChild(messageElement);
  messageDiv.appendChild(senderElement);

  // Append the message to the chat window
  messagesContainer.appendChild(messageDiv);

  // Scroll to the bottom of the chat
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Message Edit
document.querySelector("#message").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();

    const messageInput = document.querySelector("#message");
    const cursorPosition = messageInput.selectionStart;

    const textBefore = messageInput.value.substring(0, cursorPosition);
    const textAfter = messageInput.value.substring(cursorPosition);

    // Update the message input value with a newline at the current cursor position
    messageInput.value = textBefore + "\n" + textAfter;

    // Move the cursor to the correct position after the newline
    messageInput.selectionStart = messageInput.selectionEnd =
      cursorPosition + 1;
  }
});

// System join message
function onSystemMessageAdded(message) {
  // Create a container div for system messages
  const $systemMessageDiv = document.createElement("div");
  $systemMessageDiv.classList.add("system-message");

  // Create the message element
  const $systemMessage = document.createElement("p");
  $systemMessage.textContent = message;
  $systemMessage.classList.add("system-message-text");

  // Append message to the container div
  $systemMessageDiv.appendChild($systemMessage);

  // Append the container div to the #messages
  const messagesContainer = document.querySelector("#messages");
  messagesContainer.appendChild($systemMessageDiv);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
