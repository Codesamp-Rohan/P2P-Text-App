const canvas = document.getElementById("whiteboard");
const context = canvas.getContext("2d");

// Setup default brush settings
context.strokeStyle = "black"; // Ensure this color contrasts with the background
context.lineWidth = 10;

let drawing = false;

// Helper function to get mouse position relative to canvas
function getMousePos(event) {
  const rect = canvas.getBoundingClientRect(); // Get canvas position relative to viewport
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

// Start drawing when mouse is pressed
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const pos = getMousePos(e);
  console.log(`Mouse Down at: (${pos.x}, ${pos.y})`); // Debug
  context.beginPath();
  context.moveTo(pos.x, pos.y);
});

// Draw line as mouse moves
canvas.addEventListener("mousemove", (e) => {
  if (drawing) {
    const pos = getMousePos(e);
    console.log(`Drawing to: (${pos.x}, ${pos.y})`); // Debug
    context.lineTo(pos.x, pos.y);
    context.stroke();
    context.moveTo(pos.x, pos.y); // Move the starting point to the current position
  }
});

// Stop drawing when mouse is released
canvas.addEventListener("mouseup", () => {
  drawing = false;
  console.log("Mouse Up"); // Debug
  context.closePath(); // Close the path when finished drawing
});

// Stop drawing if mouse leaves canvas
canvas.addEventListener("mouseleave", () => {
  drawing = false;
  console.log("Mouse Leave"); // Debug
  context.closePath(); // Close the path when leaving
});
