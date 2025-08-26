/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("map");
/** @type {CanvasRenderingContext2D} */
const context = canvas.getContext("2d");

//======== setup ========//
const gridLimits = 500;
const gridSize = gridLimits * 2;
const cellSize = 100; // before zooming
const minScale = 0.5;
const maxScale = 1;
const defaultFontSize = 20; // pt

// -500,500 is NW
// 500,500 is NE
// 500,-500 is SE
// -500,-500 is SW

let offsetX = 0;
let offsetY = 0;
let scale = 1;
let fontSize = defaultFontSize * scale;
let isDragging = false;
let mouseHasMoved = false;
let startX;
let startY;

let selectedSquare = null;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
context.font = defaultFontSize + "pt monospace";

//======== ===== ========//
function draw() {
    // clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    // which cells are currently visible? (+ small area outside)
    const cell = cellSize;
    const columns = Math.ceil(canvas.width / (cell * scale)) + 2;
    const rows = Math.ceil(canvas.height / (cell * scale)) + 2;
    const startingColumn = Math.floor(-offsetX / (cell * scale));
    const startingRow = Math.floor(-offsetY / (cell * scale));

    // drawing, yay!
    context.strokeStyle = "#000000";
    context.lineWidth = 1 / scale;
    for (let y = startingRow; y <= startingRow + rows; y++) {
        if (y < 0 || y >= gridSize + 1) continue;

        for (let x = startingColumn; x <= startingColumn + columns; x++) {
            if (x < 0 || x >= gridSize + 1) continue;

            const px = x * cell;
            const py = y * cell;
            const worldX = x - gridLimits;
            const worldY = gridLimits - y;

            if (
                selectedSquare &&
                selectedSquare.x === worldX &&
                selectedSquare.y === worldY
            ) {
                context.fillStyle = "orange";
                context.fillRect(px, py, cell, cell);
            }

            context.strokeRect(px, py, cell, cell);

            context.fillStyle = "#000000";
            context.textBaseline = "middle";
            context.textAlign = "center";
            context.fillText(
                worldX,
                px + cellSize / 2,
                py + cellSize / 2 - fontSize * 0.75
            );
            context.fillText(
                worldY,
                px + cellSize / 2,
                py + cellSize / 2 + fontSize * 0.75
            );
        }
    }

    context.restore();
}

function jumpTo(worldX, worldY) {
    const gridX = worldX + gridLimits;
    const gridY = gridLimits - worldY;
    offsetX = canvas.width / 2 - gridX * cellSize * scale;
    offsetY = canvas.height / 2 - gridY * cellSize * scale;
    offsetX -= cellSize * scale * 0.5;
    offsetY -= cellSize * scale * 0.5;

    selectedSquare = { x: worldX, y: worldY };
    draw();
}

//======== events ========//
//======== mouse drag ====//
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    mouseHasMoved = false;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    canvas.style.cursor = "grabbing";
});
canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    mouseHasMoved = true;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    draw();
});
canvas.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
});
//======== zoom & scroll =//
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const mouseX = (e.clientX - offsetX) / scale;
    const mouseY = (e.clientY - offsetY) / scale;

    scale *= zoomFactor;
    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;
    offsetX = e.clientX - mouseX * scale;
    offsetY = e.clientY - mouseY * scale;

    draw();
});
//======== selecting =====//
canvas.addEventListener("click", (e) => {
    // only treat this as a click if the mouse did not move. then highlight
    if (mouseHasMoved) return;

    const gridX = Math.floor((e.clientX - offsetX) / (cellSize * scale));
    const gridY = Math.floor((e.clientY - offsetY) / (cellSize * scale));

    if (
        gridX >= 0 &&
        gridX < gridSize + 1 &&
        gridY >= 0 &&
        gridY < gridSize + 1
    ) {
        const worldX = gridX - gridLimits;
        const worldY = gridLimits - gridY;

        if (selectedSquare?.x == worldX && selectedSquare?.y == worldY) {
            selectedSquare = null;
        } else {
            selectedSquare = { x: worldX, y: worldY };
        }

        draw();
        alert(`${worldX}, ${worldY}`);
    }
});
//======== resizing ======//
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});
//======== ====== ========//

jumpTo(0, 0);
