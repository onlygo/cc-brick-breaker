const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game loop placeholder
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  requestAnimationFrame(draw);
}

draw();
