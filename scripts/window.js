const _identifier = "main_window";
let _main_window_draggable = document.getElementById(_identifier);
const _container = document.querySelector(".canvas");

_create(_main_window_draggable);
let _main_window_draggable_header = document.getElementById(
    _identifier + "_header"
);
_main_window_draggable_header.addEventListener("mousedown", _drag);

function _create(element) {
    element.style.position = "absolute";
    element.style.left = "calc(50% - 250px)";
    element.style.top = "calc(50% - 350px)";
    element.style.width = "500px";
    element.style.height = "700px";
    element.style.background = "red";
    element.style.zIndex = "1000";

    let header = document.createElement("div");
    header.className = "header";
    header.id = element.id + "_header";
    header.style.width = "100%";
    header.style.height = "20px";
    header.style.background = "blue";
    header.innerHTML = "Header";
    header.style.cursor = "move";

    element.appendChild(header);
}

// derived from https://infinitejs.com/posts/keep-dragged-elements-within-parent/
function _drag(event) {
    event.preventDefault();

    let offsetX =
        event.clientX - _main_window_draggable.getBoundingClientRect().left;
    let offsetY =
        event.clientY - _main_window_draggable.getBoundingClientRect().top;

    document.addEventListener("mousemove", _onMouseMove);
    document.addEventListener("mouseup", _stop);
    document.body.addEventListener("mouseleave", _stop);

    function _onMouseMove(event) {
        let newX = event.clientX - offsetX;
        let newY = event.clientY - offsetY;

        const containerRectangle = _container.getBoundingClientRect();
        const elementRectangle = _main_window_draggable.getBoundingClientRect();

        // restrict movement within the container
        if (newX < containerRectangle.left) {
            newX = containerRectangle.left;
            offsetX = event.clientX - newX;
        }
        if (newX + elementRectangle.width > containerRectangle.right) {
            newX = containerRectangle.right - elementRectangle.width;
            offsetX = event.clientX - newX;
        }
        if (newY < containerRectangle.top) {
            newY = containerRectangle.top;
            offsetY = event.clientY - newY;
        }
        if (newY + elementRectangle.height > containerRectangle.bottom) {
            newY = containerRectangle.bottom - elementRectangle.height;
            offsetY = event.clientY - newY;
        }

        _main_window_draggable.style.left =
            newX - containerRectangle.left + "px";
        _main_window_draggable.style.top = newY - containerRectangle.top + "px";
    }

    function _stop() {
        document.removeEventListener("mousemove", _onMouseMove);
        document.removeEventListener("mouseup", _stop);
        document.body.removeEventListener("mouseleave", _stop);
    }
}
