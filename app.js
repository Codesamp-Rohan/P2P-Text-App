/** @typedef {import('pear-interface')} */ /* global Pear */

import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";
import b4a from "b4a";

const { teardown, updates } = Pear;

const swarm = new Hyperswarm();

teardown(() => swarm.destroy());

updates(() => Pear.reload());

// DECLARATION
const detailsPopUp = document.querySelector(".details--popUp");

const polls = {};

const processedMessageIds = new Set(); // Track processed message IDs
const userReactions = new Map();
const peerReactions = new Map();

const shareLocationBtn = document.querySelector(".share--location--btn");

shareLocationBtn.addEventListener("click", getLocation);

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(sendLocation, showError);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function sendLocation() {
  const longitude = position.coords.longitude;
  const latitude = position.coords.latitude;

  console.log(longitude, latitude);

  // Here you can send this message in the chat
  sendMessage(locationMessage);
}

function showError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Location information is unavailable.");
      break;
    case error.TIMEOUT:
      alert("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
      alert("An unknown error occurred.");
      break;
  }
}

// CANVA CODE

// Canvas setup
const canvas = document.getElementById("whiteboard");
const context = canvas.getContext("2d");
const canvaPencil = document.querySelector("#canva--pencil--btn");

context.strokeStyle = "black";
context.lineWidth = 1;

let drawing = false;
let isDragging = false;
let draggedText = null; // Variable to hold the currently dragged text
let textObjects = []; // Array to hold text objects

function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

let active = 0;

// Toggle pencil drawing mode
canvaPencil.addEventListener("click", (e) => {
  e.preventDefault();
  active++;
  drawing = active % 2 === 1; // Toggle drawing mode based on active state
  console.log(drawing ? "Pencil mode activated" : "Pencil mode deactivated");

  canvaPencil.classList.toggle(".canva--highlight");
});

// Mouse down event for starting the drawing or dragging
let isDrawing = false; // Flag to track if the user is drawing

// Mouse down event for starting the drawing or dragging
canvas.addEventListener("mousedown", (e) => {
  const pos = getMousePos(e);
  if (isPointInText(pos.x, pos.y)) {
    isDragging = true; // Set dragging state
    draggedText = getTextAtPosition(pos.x, pos.y); // Get the dragged text object
  } else if (drawing) {
    isDrawing = true; // Set drawing state to true on mouse down
    context.beginPath(); // Begin a new path each time the mouse is pressed
    context.moveTo(pos.x, pos.y); // Set the start position for drawing
  }
});

// Mouse move event for drawing or dragging
canvas.addEventListener("mousemove", (e) => {
  const pos = getMousePos(e);
  if (isDrawing && !isDragging) {
    // Draw a line to the new mouse position if drawing state is active
    context.lineTo(pos.x, pos.y);
    context.stroke();
    sendDrawingData("draw", pos.x, pos.y); // Send the drawing action to peers
  } else if (isDragging && draggedText) {
    // Update the dragged text position
    draggedText.x = pos.x;
    draggedText.y = pos.y;
    clearCanvas(); // Clear the canvas to redraw everything
    redrawAllTexts(); // Redraw all texts
  }
});

// Mouse up event to stop drawing or dragging
canvas.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false; // Reset dragging state
  } else if (isDrawing) {
    isDrawing = false; // Stop drawing on mouse up
    context.closePath(); // End the current drawing path
  }
});

// Stop drawing or dragging if the mouse leaves the canvas
canvas.addEventListener("mouseleave", () => {
  if (isDragging) {
    isDragging = false;
  } else if (isDrawing) {
    isDrawing = false; // Stop drawing if the mouse leaves the canvas
    context.closePath(); // Close the drawing path
  }
});

// Handle clear canvas button
function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to draw text and keep track of text objects
function drawText(text, x, y) {
  context.fillStyle = "black";
  context.font = "20px Arial";
  context.fillText(text, x, y);

  const textObject = { text, x, y };
  textObjects.push(textObject); // Store the text object for future reference

  // Send text drawing data to other peers
  sendDrawingData("text", x, y, text); // Send the text action
}

// Button event for adding text
const drawTextBtn = document.getElementById("draw-text-btn");
drawTextBtn.addEventListener("click", () => {
  const textInput = document.getElementById("text-input");
  const text = textInput.value;
  const x = 50; // X position to draw text
  const y = 50; // Y position to draw text

  drawText(text, x, y);
  textInput.value = ""; // Clear the input field
});

// Function to check if mouse position is inside any text object
function isPointInText(mouseX, mouseY) {
  return textObjects.some((textObject) => {
    const textWidth = context.measureText(textObject.text).width;
    const textHeight = 20; // Approximate text height
    return (
      mouseX >= textObject.x &&
      mouseX <= textObject.x + textWidth &&
      mouseY >= textObject.y - textHeight &&
      mouseY <= textObject.y
    );
  });
}

// Function to get the text object at a specific position
function getTextAtPosition(mouseX, mouseY) {
  return textObjects.find((textObject) => {
    const textWidth = context.measureText(textObject.text).width;
    const textHeight = 20; // Approximate text height
    return (
      mouseX >= textObject.x &&
      mouseX <= textObject.x + textWidth &&
      mouseY >= textObject.y - textHeight &&
      mouseY <= textObject.y
    );
  });
}

// Function to redraw all texts on the canvas
function redrawAllTexts() {
  context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  textObjects.forEach((textObject) => {
    drawText(textObject.text, textObject.x, textObject.y); // Redraw each text
  });
}

// Updated sendDrawingData function
export function sendDrawingData(actionType, x, y, textContent) {
  const drawingData = {
    actionType, // Type of action: 'draw', 'text', 'clear'
    x,
    y,
    textContent: textContent || "", // Optional text content
  };

  const messageBuffer = Buffer.from(JSON.stringify(drawingData));
  const peers = [...swarm.connections];
  for (const peer of peers) {
    peer.write(messageBuffer);
  }
}

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

function convertVideoToBinary(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Event handler for successful file read
    reader.onload = function (event) {
      const arrayBuffer = event.target.result; // Contains binary data
      resolve(arrayBuffer);
    };

    // Event handler for file read errors
    reader.onerror = function (event) {
      reject(new Error("Error reading file: " + event.target.error));
    };

    // Read the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}

document
  .querySelector("#video-upload")
  .addEventListener("change", async (e) => {
    const videoFile = e.target.files[0];
    if (videoFile) {
      try {
        const videoBinary = await convertVideoToBinary(videoFile);
        const base64Video = b4a.toString(new Uint8Array(videoBinary), "base64");
        console.log("Base64 Video Data:", base64Video); // Debugging line

        const messageData = {
          name:
            userName ||
            b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6),
          message: base64Video,
          isVideo: true,
        };

        const messageBuffer = Buffer.from(JSON.stringify(messageData));
        const peers = [...swarm.connections];
        for (const peer of peers) peer.write(messageBuffer);

        onMessageAdded("You", base64Video, false, false, false, true);
      } catch (error) {
        console.error("Video conversion failed: ", error);
      }
    }
  });

document.querySelector("#file-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0]; // Get the selected file
  if (file) {
    try {
      const base64Data = await fileToBase64(file);
      const messageData = {
        name:
          userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6),
        message: base64Data,
        isFile: true,
        fileType: file.type, // Store the file type for later processing
      };

      const messageBuffer = Buffer.from(JSON.stringify(messageData));
      const peers = [...swarm.connections];
      for (const peer of peers) peer.write(messageBuffer);

      onMessageAdded(
        "You",
        base64Data,
        false,
        false,
        false,
        false,
        false,
        file.type
      ); // Display the file in sender's chat
    } catch (error) {
      console.error("File conversion failed: ", error);
    }
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result); // Get the file data
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file); // Read the file as Data URL (Base64 format)
  });
}

document
  .querySelector("#audio-upload")
  .addEventListener("change", async (e) => {
    const audioFile = e.target.files[0];
    if (audioFile) {
      try {
        const audioData = await fileToBase64(audioFile); // Convert audio to Base64
        const messageData = {
          name:
            userName ||
            b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6),
          message: audioData,
          isAudio: true,
        };

        const messageBuffer = Buffer.from(JSON.stringify(messageData));
        const peers = [...swarm.connections];
        for (const peer of peers) peer.write(messageBuffer);

        onMessageAdded("You", audioData, false, false, false, false, true); // Display the audio in sender's chat
      } catch (error) {
        console.error("Audio conversion failed: ", error);
      }
    }
  });

// **************************************************************************//

document.querySelector("#leaving--btn").addEventListener("click", (e) => {
  e.preventDefault();
  notifyUserLeft(); // Notify others that the user is leaving
  setTimeout(() => location.reload(), 100); // Delay reload to allow message to send
});

// Function to notify other members that a user has left
function notifyUserLeft() {
  document.querySelector(".leaving").classList.remove("hidden");
  document.querySelector("#chat").classList.add("hidden");
  console.log("Hidden removed");

  const leaveMessage = {
    system: true,
    message: `${
      userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6)
    } has left the chat.`,
  };

  const leaveMessageBuffer = Buffer.from(JSON.stringify(leaveMessage));
  const peers = [...swarm.connections];
  for (const peer of peers) {
    peer.write(leaveMessageBuffer);
  }

  userList = userList.filter((member) => member !== userName);

  setTimeout(() => {
    leavingDiv.classList.add("hidden");
  }, 3000);
}

//******************************* POPUP Code**********************************//
let userName = "";
let isAdmin = false;
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
  grp_PopUp.classList.add("hidden");
  detailsPopUp.classList.add("hidden");
}

document.querySelector("#popup--form").addEventListener("submit", (e) => {
  e.preventDefault();

  const nameInput = document.querySelector("#popUp--input");
  const newName = nameInput.value.trim();

  if (newName !== "") {
    console.log(`New name set: ${newName}`);

    let prevName =
      userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6);
    userName = newName;

    // Update userList by finding the index of prevName and changing their name to newName
    const userIndex = userList.indexOf(prevName);
    if (userIndex !== -1) {
      userList[userIndex] = newName; // Update the name in the userList
    } else {
      userList.push(newName); // If prevName is not found, just add the new name
    }

    // Call this function to update the UI member list

    // Hide the popup after the name is changed
    popup.classList.add("hidden");
    outerScreen.classList.add("hidden");

    nameInput.value = "";

    // Notify other peers about the name change
    const changeName = {
      system: true,
      message: `${prevName} changed its name to ${newName}`,
    };

    const newNameMsgBuffer = Buffer.from(JSON.stringify(changeName));

    const peers = [...swarm.connections];
    for (const peer of peers) peer.write(newNameMsgBuffer);
    updateMemberList();
  } else {
    console.log("Name input cannot be empty.");
  }
});

const eraseBtn = document.getElementById("canva--erase--btn");
eraseBtn.addEventListener("click", () => {
  clearCanvas();
});
//**************** END ******************//
function updateMemberList() {
  const membersListElement = document.getElementById("members");
  membersListElement.innerHTML = "";

  userList.forEach((member) => {
    console.log(member);

    const listItem = document.createElement("li");
    listItem.textContent = member;
    membersListElement.appendChild(listItem);
  });
}
// Member list show js

//

let userList = [];

swarm.on("connection", (peer) => {
  const hexCode = b4a.toString(peer.remotePublicKey, "hex").substr(0, 6);

  userList.push(hexCode);
  updateMemberList();

  peer.on("data", (message) => {
    console.log("Message:", message);
    const data = JSON.parse(message.toString()); // Parse the message data

    console.log(b4a.toString(message, "hex"));

    if (data.system) {
      // Display system messages differently
      onSystemMessageAdded(data.message);
      if (data.message.includes("joined the chat")) {
        const newMemberName = data.message.split(" ")[1];
        if (!userList.includes(newMemberName)) {
          userList.push(newMemberName);
          updateMemberList();
        }
      }
      if (data.message.includes("has left the chat")) {
        const leftMemberName = data.message.split(" ")[0];
        userList = userList.filter((members) => members !== leftMemberName);
        updateMemberList();
      }
    } else if (data.actionType === "addReaction") {
      const { emoji, messageId, userId } = data;
      if (emoji && messageId && userId) {
        // Ensure data completeness
        if (!peerReactions.has(messageId)) {
          peerReactions.set(messageId, new Map());
        }
        const reactionsMap = peerReactions.get(messageId);

        // If the reaction is new for this user and message, add it
        if (!reactionsMap.has(userId) || reactionsMap.get(userId) !== emoji) {
          reactionsMap.set(userId, emoji);
          const messageDiv = document.querySelector(`[data-id='${messageId}']`);
          if (messageDiv) {
            updateReactionCount(messageDiv, emoji, 1); // Update reaction count
          }
        }
      }
    } else if (data.actionType === "pin") {
      console.log("Pin message received:", data.pinMsg); // Debugging line
      document.querySelector(".pinned--message").classList.remove("hidden");
      document.querySelector(".pinned--messageMsg").textContent = data.pinMsg;
    } else if (data.actionType === "unPin") {
      document.querySelector(".pinned--message").classList.add("hidden");
      document.querySelector(".pinned--messageMsg").textContent = data.pinMsg;
    } else if (data.actionType === "editMsg") {
      const messageElements = document.querySelectorAll(
        ".message-item-left, .message-item-right"
      );
      messageElements.forEach((messageElement) => {
        if (messageElement.textContent === data.originalMessage) {
          messageElement.textContent = data.message;
        }
      });
    } else if (data.actionType === "deleteMsg") {
      const messageId = data.messageId;

      // Find and delete the message with the matching data-id
      const messageElement = document.querySelector(`[data-id='${messageId}']`);
      if (messageElement) {
        messageElement.textContent = "message deleted";
      } else {
        console.log(`Message with ID ${messageId} not found.`);
      }
    } else if (data.isFile) {
      const fileType = data.fileType;
      onMessageAdded(
        data.name,
        data.message,
        false,
        false,
        false,
        false,
        false,
        fileType
      );
    } else if (data.action === "clear") {
      clearCanvas(); // Call clearCanvas to clear the canvas
    } else if (data.actionType === "draw") {
      // Draw on the canvas based on the received coordinates
      context.lineTo(data.x, data.y);
      context.stroke();
      context.moveTo(data.x, data.y);
    } else {
      let senderName = data.name || hexCode;
      let receivedMessage = data.message;
      let isImage = data.isImage;
      let isAdmin = data.isAdmin;
      let isSticker = data.isSticker;
      let isVideo = data.isVideo;
      let isAudio = data.isAudio;
      let messageId = data.messageId;

      onMessageAdded(
        senderName,
        receivedMessage,
        isImage,
        isAdmin,
        isSticker,
        isVideo,
        isAudio,
        "",
        messageId
      ); // Display the message with the correct sender name
    } // Display the message with the correct sender name
  });

  peer.on("error", (e) => console.log(`Connection Error: ${e}`));
});

swarm.on("update", () => {
  document.querySelector("#peers-count").textContent =
    swarm.connections.size + 1;

  updateMemberList();
});

const createChatRoomBtn = document.querySelector("#create--chat--room--btn");
const grp_PopUp = document.querySelector("#grpName--popup");

createChatRoomBtn.addEventListener("click", grpPopUp);
document.querySelector("#join--form").addEventListener("submit", joinChatRoom);
document.querySelector("#message-form").addEventListener("submit", sendMessage);
document.querySelector("#message").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (e.shiftKey) {
      return;
    }
    e.preventDefault();
    sendMessage(e);
  }
});

function grpPopUp() {
  grp_PopUp.classList.remove("hidden");
  outerScreen.classList.remove("hidden");
  document
    .querySelector("#grp--popup--form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      outerScreen.classList.add("hidden");
      const groupNameInput = document.querySelector("#grp--popUp--input");
      const groupName = groupNameInput.value.trim();

      if (groupName) {
        createChatRoom(groupName); // Call createChatRoom with the group name
        grp_PopUp.classList.add("hidden"); // Close the popup
        groupNameInput.value = ""; // Clear the input field
      } else {
        console.log("Group name cannot be empty.");
      }
    });
}

async function createChatRoom(groupName) {
  console.log("Clicked the create btn");
  const seedBuffer = crypto.randomBytes(32);
  joinSwarm(seedBuffer);
  isAdmin = true;
  const grpName = document.querySelectorAll(".grpName--text");
  grpName.forEach((grp) => {
    grp.textContent = groupName;
  });
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

  userList.push(joinName);
  updateMemberList();
  const joinMessage = {
    system: true,
    message: `🥳 ${joinName} joined the chat 🥂🥂`,
  };

  const joinMessageBuffer = Buffer.from(JSON.stringify(joinMessage));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(joinMessageBuffer);
}

// weather function
async function getWeather(city) {
  const apiKey = "4e3e22861d59c5931b50082d9eecadb3"; // Replace with your OpenWeatherMap API key
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(apiUrl); // Use await here
    if (!response.ok) throw new Error("City not found");

    const weatherData = await response.json(); // Await the JSON parsing
    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

function sendMessage(e) {
  e.preventDefault();
  const message = document.querySelector("#message").value;
  document.querySelector("#message").value = "";

  if (message.trim() === "") return;

  const name =
    userName || b4a.toString(swarm.keyPair.publicKey, "hex").substr(0, 6); // Use the sender's name or 'You'
  const messageId = `msg-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  // Prepare the message data as an object for regular messages
  const messageData = {
    name: name,
    message: message,
    isImage: false,
    isSticker: false,
    isAdmin: isAdmin,
    messageId: messageId,
  };

  // Convert the message data to a Buffer and send it to all peers
  const messageBuffer = Buffer.from(JSON.stringify(messageData));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(messageBuffer);

  onMessageAdded(
    "You",
    message,
    false,
    isAdmin,
    false,
    false,
    false,
    "",
    messageId
  ); // Display the message in the sender's system
}

const fixedColors = ["#FF5733", "#33FF57", "#D2FF72", "#FF33A6", "#F9E400"];

// Function to get a color from the fixed array based on a user's identifier
function getColorFromUserKey(userKey) {
  const index = Math.abs(userKey.hashCode()) % fixedColors.length;
  return fixedColors[index];
}

// Utility function to create a consistent hash code from a string
String.prototype.hashCode = function () {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    hash = this.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

function onMessageAdded(
  senderName,
  message,
  isImage,
  isAdmin = false,
  isSticker = false,
  isVideo = false,
  isAudio = false,
  fileType,
  messageId
) {
  const messagesContainer = document.querySelector("#messages");

  // Create the message wrapper
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message--div");

  if (messageId) {
    messageDiv.setAttribute("data-id", messageId); // Assign the unique data-id
  } else {
    console.error("Error: messageId is missing when adding the message.");
  }

  // TimeElement
  const currentTime = new Date();
  const timeString = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Create a time element
  const timeElement = document.createElement("span");
  timeElement.classList.add(
    senderName === "You" ? "message-time-right" : "message-time-left"
  ); // Add a class for styling
  timeElement.textContent = timeString;

  const menuBtn = document.createElement("button");
  const menuBtnImg = document.createElement("img");
  menuBtnImg.src = `./assets/menu.png`;
  menuBtnImg.classList.add("message--menu--img");
  menuBtn.appendChild(menuBtnImg);
  menuBtn.classList.add(
    senderName === "You" ? "message--menu--right" : "message--menu--left"
  );
  messageDiv.appendChild(menuBtn);

  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    messagePopUp(e, messageDiv, senderName, isAdmin, messageId);
  });
  // Append the time element to the messageDiv

  if (fileType) {
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      senderName === "You" ? "message-item-right" : "message-item-left"
    );
    const fileLink = document.createElement("a");
    fileLink.style.color = "#eee";
    fileLink.href = message; // The Base64 data URL
    fileLink.download = "shared-file"; // Default file name
    fileLink.textContent = `Download ${fileType}`;
    messageElement.appendChild(fileLink);
    messageDiv.appendChild(messageElement);
  } else {
    if (isAudio) {
      const audioElement = document.createElement("audio");
      audioElement.src = message;
      audioElement.controls = true;
      audioElement.classList.add(
        senderName === "You" ? "audio-right" : "audio-left"
      );
      messageDiv.appendChild(audioElement);
    } else if (isSticker) {
      const stickerElement = document.createElement("img");
      stickerElement.src = message;
      stickerElement.alt = "Sticker";
      stickerElement.classList.add(
        senderName === "You" ? "sticker-img-right" : "sticker-img-left"
      );
      messageDiv.appendChild(stickerElement);
    } else if (isVideo) {
      const videoContainer = document.createElement("div");
      videoContainer.classList.add(
        senderName === "You" ? "video-item-right" : "video-item-left"
      );

      const videoElement = document.createElement("video");
      videoElement.src = "data:video/mp4;base64," + message; // Use Base64 string
      videoElement.controls = true;
      videoElement.style.maxWidth = "100%"; // Ensure it fits within the container
      videoContainer.appendChild(videoElement);

      messageDiv.appendChild(videoContainer);
    } else if (isImage) {
      // Create a separate container for images
      const imageContainer = document.createElement("div");
      imageContainer.classList.add(
        senderName === "You" ? "image-item-right" : "image-item-left"
      );

      const imgElement = document.createElement("img");
      imgElement.src = message;
      imgElement.style.maxWidth = "100%";

      const downloadImg = document.createElement("a");
      downloadImg.href = message;
      downloadImg.download = "shared-image";
      downloadImg.classList.add(
        senderName === "You"
          ? "img--download--btn--right"
          : "img--download--btn--left"
      );
      downloadImg.textContent = "Download";

      imageContainer.appendChild(imgElement);
      imageContainer.appendChild(downloadImg);
      messageDiv.appendChild(imageContainer);
    } else {
      // Create the message content element for text
      const messageElement = document.createElement("div");
      messageElement.classList.add(
        senderName === "You" ? "message-item-right" : "message-item-left"
      );
      if (messageId) {
        messageElement.setAttribute("data-id", messageId); // Add the unique ID as a data attribute
      }

      console.log(messageId);

      if (message.startsWith("clip://")) {
        // Extract the clipboard text by removing the clip:// part
        const clipboardText = message.replace("clip://", "");

        // Create a span to hold the clipboard text
        const clipboardDiv = document.createElement("div");
        clipboardDiv.textContent = clipboardText;

        // Create a button to allow copying the text to the clipboard
        const clipButton = document.createElement("button");
        clipboardDiv.classList.add(
          senderName === "You" ? "clipBoardDiv--right" : "clipBoardDiv--left"
        );
        clipButton.classList.add("clipBtn");
        clipButton.textContent = "Copy";
        clipButton.addEventListener("click", (e) => {
          navigator.clipboard.writeText(clipboardText).then(() => {
            clipButton.textContent = "Copied";
            console.log("Text copied to clipboard:" + clipboardText);

            setTimeout(() => {
              clipButton.textContent = "Copy";
            }, 2000);
          });
        });

        // Append the clipboard text and the button to the message element
        messageDiv.appendChild(clipboardDiv);
        clipboardDiv.appendChild(clipButton);
      } else if (message.startsWith("image://")) {
        const imgUrl = message.replace("image://", "");
        const imageContainer = document.createElement("div");
        imageContainer.classList.add(
          senderName === "You" ? "image-item-right" : "image-item-left"
        );

        const imgElement = document.createElement("img");
        imgElement.src = imgUrl;
        imgElement.style.width = "100%";

        const downloadImg = document.createElement("a");
        downloadImg.href = message;
        downloadImg.download = "shared-image";
        downloadImg.classList.add(
          senderName === "You"
            ? "img--download--btn--right"
            : "img--download--btn--left"
        );
        downloadImg.textContent = "Download";

        imageContainer.appendChild(imgElement);
        imageContainer.appendChild(downloadImg);
        messageDiv.appendChild(imageContainer);
      } else if (message.startsWith("video://")) {
        const videoUrl = message.replace("video://", "").trim();

        // Create container
        const videoContainer = document.createElement("div");
        videoContainer.classList.add(
          senderName === "You" ? "video-item-right" : "video-item-left"
        );

        let videoElement;

        // Check if the link is a YouTube URL
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
          // Convert YouTube URL to embeddable format
          let videoId;
          if (videoUrl.includes("youtu.be")) {
            videoId = videoUrl.split("/").pop(); // Extract ID from youtu.be link
          } else {
            videoId = new URL(videoUrl).searchParams.get("v"); // Extract ID from youtube.com link
          }
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;

          // Create iframe element
          videoElement = document.createElement("iframe");
          videoElement.src = embedUrl;
          videoElement.setAttribute("frameborder", "0");
          videoElement.setAttribute("allowfullscreen", "true");
        } else {
          // Handle non-YouTube links as direct video
          videoElement = document.createElement("video");
          videoElement.controls = true;
          videoElement.width = 320;

          // Create source element for the video
          const sourceElement = document.createElement("source");
          sourceElement.src = videoUrl;
          sourceElement.type = "video/mp4";
          videoElement.appendChild(sourceElement);

          // Add fallback message for unsupported browsers
          videoElement.innerHTML +=
            "Your browser does not support the video tag.";
        }

        // Append video or iframe to the container
        videoContainer.appendChild(videoElement);
        messageDiv.appendChild(videoContainer);
      } else if (message.startsWith("weather://")) {
        const city = message.replace("weather://", "").trim();
        console.log(`Fetching weather for city: ${city}`); // Log the city being searched

        // Create a container for weather data
        const weatherContainer = document.createElement("div");
        weatherContainer.classList.add(
          senderName === "You" ? "weather-item-right" : "weather-item-left"
        );
        getWeather(city)
          .then((weatherData) => {
            if (weatherData) {
              // Format the weather data to display
              const weatherInfo = `
          <div class="weather--card">
          <span class="blob"></span>
          <p style="font-size: 12px; color: #ddd;">${weatherData.name}:</p>
          <span style="display: flex; align-items: top; margin-top: 4px; margin-bottom: 10px;">
          <h1 style="font-weight: 900;">${weatherData.main.temp}</h1><p style="font-size: 12px;">°C</p>
          </span>
          <span>
          <p style="color: #777;">Weather: ${weatherData.weather[0].description}</p>
          <p style="color: #777;">Humidity: ${weatherData.main.humidity}%</p>
          <p style="color: #777;">Humidity: ${weatherData.wind.speed} m/s</p>
          </span>
          </div>
        `;

              // Create and append weather data to the message div
              weatherContainer.innerHTML = weatherInfo;
            } else {
              weatherContainer.innerHTML =
                "Error: Could not fetch weather data.";
              weatherContainer.classList.add("error-message");
            }

            messageDiv.appendChild(weatherContainer);
          })
          .catch((err) => {
            console.error("Error fetching weather data:", err);
            weatherContainer.innerHTML = "Error: Could not fetch weather data.";
            messageDiv.appendChild(weatherContainer);
          });
      } else if (message.startsWith("poll://")) {
        const pollData = message.replace("poll://", "").trim();
        const pollOptions = pollData.split("|");
        const pollQuestion = pollOptions[0];
        const pollChoices = pollOptions.slice(1);
        const pollID = Date.now();

        // Store the poll data in a global polls object
        polls[pollID] = {
          question: pollQuestion,
          choices: pollChoices,
          votes: Array(pollChoices.length).fill(0), // Array to store votes per choice
        };

        // Create poll container and assign a unique data attribute with pollID
        const pollContainer = document.createElement("div");
        pollContainer.classList.add(
          senderName === "You" ? "poll-container-right" : "poll-container-left"
        );
        pollContainer.dataset.pollId = pollID; // Assign pollID for easier querying

        const pollQuestionElement = document.createElement("p");
        pollQuestionElement.textContent = pollQuestion;
        pollContainer.appendChild(pollQuestionElement);

        const pollChoicesContainer = document.createElement("div");
        pollChoicesContainer.classList.add("poll-choices");
        pollContainer.appendChild(pollChoicesContainer);

        // Loop through poll choices and create buttons for each choice
        pollChoices.forEach((choice, index) => {
          const pollChoiceElement = document.createElement("button");
          pollChoiceElement.textContent = choice;
          pollChoiceElement.dataset.index = index;
          pollChoiceElement.dataset.pollId = pollID; // Attach poll ID to the button
          pollChoiceElement.addEventListener("click", handleVote); // Add event listener to handle vote
          pollChoicesContainer.appendChild(pollChoiceElement);
        });

        messageDiv.appendChild(pollContainer); // Append poll container to the message div
      } else if (message.startsWith("anon://")) {
        const senderMsg = message.replace("anon://", "");
        const messageElement = document.createElement("div");
        messageElement.classList.add(
          senderName === "You" ? "message-item-right" : "message-item-left"
        );
        messageElement.innerHTML = senderMsg;
        messageDiv.appendChild(messageElement);
      } else if (message.includes("```")) {
        const codeRegex = /```([^`]+)```/g;

        const formattedMessage = message.replace(codeRegex, (match, code) => {
          // Create a code block with Highlight.js highlighting
          const highlightedCode = hljs.highlightAuto(code).value;
          return `<pre><code>${highlightedCode}</code></pre>`;
        });

        messageElement.innerHTML += formattedMessage;
        messageDiv.appendChild(messageElement);
      } else {
        const messageContentWrapper = document.createElement("div");

        messageContentWrapper.classList.add(
          senderName === "You"
            ? "message-content-wrapper-right"
            : "message-content-wrapper-left"
        );

        messageDiv.appendChild(messageContentWrapper);

        const formattedMessage = message.replace(/\n/g, "<br/>");

        messageElement.innerHTML = formattedMessage;
        messageContentWrapper.appendChild(messageElement);

        const reactionButton = document.createElement("button");
        reactionButton.textContent = "React";
        reactionButton.classList.add("reaction-button");

        // Open emoji picker when "React" button is clicked
        reactionButton.addEventListener("click", (e) => {
          e.preventDefault();
          showEmojiPicker(messageDiv, messageId, reactionButton); // Pass reactionButton for positioning
        });

        messageContentWrapper.appendChild(reactionButton);
      }

      function handleVote(event) {
        const pollID = event.target.dataset.pollId; // Get pollID from dataset
        const choiceIndex = event.target.dataset.index;

        // Increment vote for the selected choice
        polls[pollID].votes[choiceIndex]++;

        // Update the poll results UI
        updatePollResults(pollID);
      }

      function updatePollResults(pollID) {
        const poll = polls[pollID];
        const totalVotes = poll.votes.reduce((sum, votes) => sum + votes, 0);

        // Select the correct poll container using pollID
        const pollContainer = document.querySelector(
          `[data-poll-id="${pollID}"] .poll-choices`
        );

        if (!pollContainer) {
          console.error(`Poll container not found for pollID: ${pollID}`);
          return;
        }

        pollContainer.innerHTML = ""; // Clear current UI

        // Update poll choices with votes and percentages
        poll.choices.forEach((choice, index) => {
          const pollChoiceElement = document.createElement("div");
          pollChoiceElement.classList.add("pollResult");
          const votesForChoice = poll.votes[index];
          const percentage =
            totalVotes > 0
              ? ((votesForChoice / totalVotes) * 100).toFixed(2)
              : 0;

          pollChoiceElement.textContent = `${choice} - ${votesForChoice} votes (${percentage}%)`;
          pollContainer.appendChild(pollChoiceElement);
        });
      }
    }
  }
  // Function to update the poll results

  //

  const userColor = getColorFromUserKey(senderName);

  // Create the sender's name element (for the "by" message)
  const senderElement = document.createElement("div");
  senderElement.classList.add(senderName === "You" ? "by-right" : "by-left");
  senderElement.style.color = userColor;
  senderElement.textContent = senderName;

  if (isAdmin) {
    const adminTag = document.createElement("span");
    adminTag.textContent = "Admin";
    adminTag.classList.add("admin-tag"); // Add a CSS class for the admin tag styling
    senderElement.appendChild(adminTag);
  }

  // Append the sender's name to the wrapper
  messageDiv.appendChild(timeElement);
  if (!message.startsWith("anon://")) messageDiv.appendChild(senderElement);
  messagesContainer.appendChild(messageDiv);
  // Append the message to the chat window

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

// *****************************Sticker*******************************************//

function getBase64Image(imgUrl, callback) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imgUrl;
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const dataURL = canvas.toDataURL("image/png"); // Convert image to Base64
    callback(dataURL);
  };
}

const stickerBtn = document.querySelector(".sticker--btn");
const stickerContainer = document.querySelector("#sticker-picker");
const stickerCloseBtn = document.querySelector(".sticker--close--btn");
stickerBtn.addEventListener("click", (e) => {
  e.preventDefault();
  stickerContainer.classList.toggle("sticker--scrollUp");
  console.log("Clicked the button");
});
stickerCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  stickerContainer.classList.remove("sticker--scrollUp");
});

// Usage when sending a sticker
stickerContainer.addEventListener("click", (e) => {
  const stickerPath = e.target.src;
  getBase64Image(stickerPath, function (base64Data) {
    const messageData = {
      name: userName,
      message: base64Data, // Send the Base64 encoded image
      isSticker: true,
      isAdmin: isAdmin,
    };
    stickerContainer.classList.remove(".sticker--scrollUp");

    // Send the Base64 message to peers
    const messageBuffer = Buffer.from(JSON.stringify(messageData));
    const peers = [...swarm.connections];
    for (const peer of peers) peer.write(messageBuffer);

    onMessageAdded("You", base64Data, true, isAdmin, true); // Display the sticker in the sender's chat
  });
});
//********************************************************************************//

function messagePopUp(event, messageDiv, senderName, isAdmin, messageId) {
  // Remove any existing popup
  const existingMenu = document.querySelector(".message-menu");
  if (existingMenu) {
    existingMenu.remove();
  }

  const messageMenu = document.createElement("div");
  messageMenu.classList.add("message-menu");

  // Create options for the menu
  // const emojiMessage = document.createElement("button");
  const pinMessage = document.createElement("button");
  const editMessage = document.createElement("button");
  const deleteMessage = document.createElement("button");

  // emojiMessage.textContent = "React";
  pinMessage.textContent = "Pin";

  // Emoji message logic
  // emojiMessage.addEventListener("click", () => {
  //   showEmojiPicker(messageDiv, messageId);
  //   messageMenu.remove();
  // });
  // Pin message logic
  pinMessage.addEventListener("click", () => {
    if (!isAdmin) {
      alert("Only admins can pin messages.");
      return; // Prevent non-admins from pinning
    }

    const messageText = messageDiv.querySelector(
      ".message-item-left, .message-item-right"
    );
    if (messageText) {
      const pinMsg = messageText.textContent;
      console.log("Pin message text:", pinMsg);

      document.querySelector(".pinned--message").classList.remove("hidden");
      document.querySelector(".pinned--messageMsg").textContent = pinMsg;

      const pinMessageData = {
        actionType: "pin",
        name: senderName,
        pinMsg: pinMsg,
        isAdmin: true, // Include admin status in the message
      };

      const messageBuffer = Buffer.from(JSON.stringify(pinMessageData));
      const peers = [...swarm.connections];
      for (const peer of peers) peer.write(messageBuffer); // Send to all peers
    }
    messageMenu.remove();
  });

  messageMenu.appendChild(pinMessage); // Only append if the user is an admin
  editMessage.textContent = "Edit";
  deleteMessage.textContent = "Delete";

  // Edit message logic
  editMessage.addEventListener("click", () => {
    const messageText = messageDiv.querySelector(
      ".message-item-left, .message-item-right"
    );
    if (messageText) {
      const originalMessage = messageText.textContent;
      // Show the edit dialog
      const editDialog = document.getElementById("edit-dialog");
      const editInput = document.getElementById("edit-input");
      editInput.value = originalMessage; // Set the current message to the input field
      editDialog.classList.remove("hidden"); // Show the dialog

      // Save button functionality
      document.getElementById("save-edit").onclick = () => {
        const newMessage = editInput.value;
        if (newMessage.trim() !== "") {
          messageText.textContent = newMessage; // Update the message in the UI
          // Optionally, send the updated message to peers
          const updateMessageData = {
            actionType: "editMsg",
            name: senderName,
            message: newMessage,
            originalMessage: originalMessage,
          };
          // sendMessage(newMessage); // Uncomment if needed

          const messageBuffer = Buffer.from(JSON.stringify(updateMessageData));
          const peers = [...swarm.connections];
          for (const peer of peers) {
            peer.write(messageBuffer);
          }
        }
        editDialog.classList.add("hidden"); // Hide the dialog after saving
      };

      // Cancel button functionality
      document.getElementById("cancel-edit").onclick = () => {
        editDialog.classList.add("hidden"); // Hide the dialog on cancel
      };
    }
    messageMenu.remove(); // Close the menu after editing
  });
  // Delete message logic
  deleteMessage.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this message?")) {
      // Select the inner message element directly to get data-id
      const innerMessageElement = messageDiv.querySelector(
        ".message-item-left, .message-item-right"
      );

      if (!innerMessageElement) {
        console.error("Error: Inner message element not found.");
        return;
      }

      const messageId = innerMessageElement.getAttribute("data-id"); // Get the data-id from the inner div

      if (!messageId) {
        console.error("Error: messageId is null or undefined.");
        return;
      }

      console.log("Deleting message with messageId:", messageId);

      const deleteMessageData = {
        actionType: "deleteMsg",
        messageId: messageId, // Send the messageId to all peers for deletion
      };

      const messageBuffer = Buffer.from(JSON.stringify(deleteMessageData));

      const peers = [...swarm.connections];
      for (let peer of peers) {
        peer.write(messageBuffer);
      }

      innerMessageElement.textContent = "message deleted";

      const menuBtn = messageDiv.querySelector(
        ".message--menu--left, .message--menu--right"
      );
      if (menuBtn) {
        menuBtn.remove();
      }
    }
    messageMenu.remove(); // Close the message menu after deleting
  });

  document.addEventListener("click", (e) => {
    if (!messageMenu.contains(e.target) && !messageDiv.contains(e.target)) {
      messageMenu.remove(); // Close the menu if clicked outside
    }
  });

  // Append options to the menu
  // messageMenu.appendChild(emojiMessage);
  messageMenu.appendChild(pinMessage);
  messageMenu.appendChild(editMessage);
  messageMenu.appendChild(deleteMessage);

  messageDiv.appendChild(messageMenu);
}

const unPin = document.querySelector(".unPin");
unPin.addEventListener("click", (e) => {
  e.preventDefault();

  if (!isAdmin) {
    alert("Only admins can unpin messages.");
    return; // Prevent non-admins from unpinning
  }

  const unPinMsgData = {
    actionType: "unPin",
    isAdmin: true, // Include admin status in the message
  };

  const messageBuffer = Buffer.from(JSON.stringify(unPinMsgData));
  const peers = [...swarm.connections];
  for (let peer of peers) peer.write(messageBuffer);

  // Update local UI (remove pin for the admin)
  document.querySelector(".pinned--message").classList.add("hidden");
  document.querySelector(".pinned--messageMsg").textContent = "";
});

function showEmojiPicker(messageDiv, messageId, reactionButton) {
  // Remove any existing emoji picker
  const existingPicker = document.querySelector(".emoji-picker");
  if (existingPicker) existingPicker.remove();

  // Create a new emoji picker
  const emojiPicker = document.createElement("div");
  emojiPicker.classList.add("emoji-picker");

  // Define some emojis to choose from
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "👏"];
  emojis.forEach((emoji) => {
    const emojiButton = document.createElement("button");
    emojiButton.textContent = emoji;
    emojiButton.classList.add("emoji-button");

    // Add emoji reaction on click
    emojiButton.addEventListener("click", () => {
      addReactionToMessage(messageDiv, emoji, messageId); // Add the reaction
      emojiPicker.remove(); // Close picker
    });

    emojiPicker.appendChild(emojiButton);
  });

  document.body.appendChild(emojiPicker);
  if (messageDiv.querySelector(".message-item-right")) {
    emojiPicker.classList.add("emoji-picker-right");
  } else {
    emojiPicker.classList.add("emoji-picker-left");
  }

  messageDiv.appendChild(emojiPicker);
}

// Function to add or update a reaction and broadcast to peers
function addAndBroadcastReaction(messageDiv, emoji, messageId) {
  const userId = userName || "anonymous"; // Local user's identifier
  if (!peerReactions.has(messageId)) {
    peerReactions.set(messageId, new Map()); // Initialize reactions for this message
  }

  const reactionsMap = peerReactions.get(messageId);

  // Remove previous reaction if exists
  if (reactionsMap.has(userId)) {
    const prevEmoji = reactionsMap.get(userId);
    updateReactionCount(messageDiv, prevEmoji, -1); // Decrement count of previous reaction
  }

  // Set new reaction and increment count
  reactionsMap.set(userId, emoji);
  updateReactionCount(messageDiv, emoji, 1);

  // Broadcast reaction to all peers
  const reactionData = { actionType: "addReaction", emoji, messageId, userId };
  try {
    const messageBuffer = Buffer.from(JSON.stringify(reactionData));
    swarm.connections.forEach((peer) => peer.write(messageBuffer));
  } catch (error) {
    console.error("Error broadcasting reaction:", error);
  }
}

function addReactionToMessage(messageDiv, emoji, messageId) {
  const userId = userName || "anonymous";
  if (!userReactions.has(messageId)) {
    userReactions.set(messageId, new Map()); // Initialize if needed
  }

  const reactionsMap = userReactions.get(messageId);

  // Remove previous reaction if it exists
  if (reactionsMap.has(userId)) {
    const prevEmoji = reactionsMap.get(userId);
    updateReactionCount(messageDiv, prevEmoji, -1); // Decrement
  }

  // Add new reaction
  reactionsMap.set(userId, emoji);
  updateReactionCount(messageDiv, emoji, 1); // Increment

  // Broadcast reaction change to peers
  const reactionData = { actionType: "addReaction", emoji, messageId, userId };
  const messageBuffer = Buffer.from(JSON.stringify(reactionData));
  swarm.connections.forEach((peer) => peer.write(messageBuffer));
}

function updateReactionCount(messageDiv, emoji, delta) {
  let reactionContainer = messageDiv.querySelector(".reaction-container");
  if (!reactionContainer) {
    reactionContainer = document.createElement("div");
    reactionContainer.classList.add("reaction-container");

    if (messageDiv.children.length > 1) {
      messageDiv.insertBefore(reactionContainer, messageDiv.children[2]);
    } else {
      messageDiv.appendChild(reactionContainer);
    }
  }

  if (messageDiv.querySelector(".message-item-right")) {
    reactionContainer.classList.add("reaction-container-right");
  } else {
    reactionContainer.classList.add("reaction-container-left");
  }

  let emojiElement = Array.from(reactionContainer.children).find((el) =>
    el.textContent.startsWith(emoji)
  );

  if (emojiElement) {
    let count =
      parseInt(emojiElement.getAttribute("data-count") || "1") + delta;
    count > 0
      ? emojiElement.setAttribute("data-count", count)
      : emojiElement.remove();
    emojiElement.textContent = `${emoji} ${count}`;
  } else if (delta > 0) {
    emojiElement = document.createElement("span");
    emojiElement.classList.add("emoji-reaction");
    emojiElement.textContent = `${emoji} 1`;
    emojiElement.setAttribute("data-count", 1);
    reactionContainer.appendChild(emojiElement);
  }
}
