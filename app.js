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
        // Convert ArrayBuffer to Base64 for sending
        const base64Video = b4a.toString(new Uint8Array(videoBinary), "base64");
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
  const recievedChunks = {};
  const hexCode = b4a.toString(peer.remotePublicKey, "hex").substr(0, 6);

  peer.on("data", (message) => {
    const data = JSON.parse(message.toString()); // Parse the message data

    if (data.system) {
      // Display system messages differently
      onSystemMessageAdded(data.message);
    } else {
      const senderName = data.name || hexCode;
      const receivedMessage = data.message;
      const isImage = data.isImage;
      const isAdmin = data.isAdmin;
      const isSticker = data.isSticker;
      const isVideo = data.isVideo;
      const isAudio = data.isAudio;

      onMessageAdded(
        senderName,
        receivedMessage,
        isImage,
        isAdmin,
        isSticker,
        isVideo,
        isAudio
      ); // Display the message with the correct sender name
    } // Display the message with the correct sender name
  });

  peer.on("error", (e) => console.log(`Connection Error: ${e}`));
});

swarm.on("update", () => {
  document.querySelector("#peers-count").textContent =
    swarm.connections.size + 1;
});

const createChatRoomBtn = document.querySelector("#create--chat--room--btn");
const grp_PopUp = document.querySelector("#grpName--popup");

createChatRoomBtn.addEventListener("click", grpPopUp);
document.querySelector("#join--form").addEventListener("submit", joinChatRoom);
document.querySelector("#message-form").addEventListener("submit", sendMessage);
document.querySelector("#message").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (e.shiftKey) {
      // Allow a new line when Shift + Enter is pressed
      return; // Do nothing, just let it add a new line
    }
    e.preventDefault(); // Prevents a new line from being added
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
  // Prepare the message data as an object for regular messages
  const messageData = {
    name: name,
    message: message,
    isImage: false,
    isAdmin: isAdmin,
  };

  // Convert the message data to a Buffer and send it to all peers
  const messageBuffer = Buffer.from(JSON.stringify(messageData));

  const peers = [...swarm.connections];
  for (const peer of peers) peer.write(messageBuffer);

  onMessageAdded("You", message, false, isAdmin); // Display the message in the sender's system
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
  isAudio = false
) {
  const messagesContainer = document.querySelector("#messages");

  // Create the message wrapper
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message--div");

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

  // Append the time element to the messageDiv

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
    videoElement.style.maxWidth = "100%";
    videoElement.classList.add("videoDiv");

    // Log to see if videoElement is created
    console.log("Video element created:", videoElement);

    videoContainer.appendChild(videoElement);
    messageDiv.appendChild(videoContainer);

    // Log to see if videoContainer is appended
    console.log("Video container appended:", videoContainer);
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
            weatherContainer.innerHTML = "Error: Could not fetch weather data.";
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
      const formattedMessage = message.replace(/\n/g, "<br/>");

      messageElement.innerHTML = formattedMessage;
      messageDiv.appendChild(messageElement);
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
          totalVotes > 0 ? ((votesForChoice / totalVotes) * 100).toFixed(2) : 0;

        pollChoiceElement.textContent = `${choice} - ${votesForChoice} votes (${percentage}%)`;
        pollContainer.appendChild(pollChoiceElement);
      });
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
