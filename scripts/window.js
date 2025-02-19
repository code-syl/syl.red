const _identifier = "main_window";
let _main_window_draggable = document.getElementById(_identifier);
const _container = document.querySelector(".canvas");

_create(_main_window_draggable);
let _main_window_draggable_header = document.getElementById(
    _identifier + "_header"
);
_main_window_draggable_header.addEventListener("mousedown", _drag);

function _create(element) {
    // window
    element.style.position = "absolute";
    element.style.left = "calc(50% - 100px)";
    element.style.top = "calc(50% - 175px)";
    element.style.width = "200px";
    element.style.height = "350px";
    element.style.background = "lightgrey";
    element.style.zIndex = "1000";

    // header
    let header = document.createElement("div");
    header.className = "main_window_header";
    header.id = element.id + "_header";
    header.style.width = "100%";
    header.style.height = "20px";
    header.style.display = "flex";
    header.style.flexDirection = "row";
    header.style.justifyContent = "space-between";
    header.style.background = "darkblue";
    header.style.cursor = "move";

    // header text
    let headerText = document.createElement("div");
    headerText.className = "header_text_container";
    headerText.style.height = "100%";
    headerText.style.fontSize = "12px";
    headerText.style.fontWeight = "bold";
    headerText.style.lineHeight = "24px";
    headerText.innerHTML = "&nbsp;&nbsp;&nbsp;Welcome!";
    headerText.style.fontFamily = "W95FA";
    headerText.style.display = "flex";
    headerText.style.alignContent = "center";

    // header controls
    let headerControlsContainer = document.createElement("div");
    headerControlsContainer.className = "header_controls_container";
    headerControlsContainer.style.height = "100%";
    headerControlsContainer.style.display = "flex";
    headerControlsContainer.style.flexDirection = "row";
    headerControlsContainer.style.alignItems = "center";
    headerControlsContainer.style.gap = "3px";
    headerControlsContainer.style.paddingRight = "3px";
    let cross = document.createElement("div");
    cross.className = "header_control_cross";
    cross.style.width = "14px";
    cross.style.height = "14px";
    cross.style.background = "red";
    cross.style.cursor = "pointer";
    cross.style.textAlign = "center";
    cross.style.lineHeight = "16px";
    cross.style.fontFamily = "W95FA";
    cross.innerHTML = "&times;";
    headerControlsContainer.appendChild(cross);
    headerControlsContainer.appendChild(cross);

    // shadows
    element.style.boxShadow =
        "inset -1px -1px 0px 0px black, inset -2px -2px 0px 0px darkgrey, inset 1px 1px 0px 0px lightgrey, inset 2px 2px 0px 0px white";
    header.style.boxShadow =
        "inset -1px 0px 0px 0px black, inset -2px 0px 0px 0px darkgrey, inset -3px 0px 0px 0px lightgrey, inset 1px 0px 0px 0px lightgrey, inset 1px 1px 0px 0px lightgrey, inset 2px 2px 0px 0px white, inset 3px 3px 0px 0px lightgrey";

    header.appendChild(headerText);
    header.appendChild(headerControlsContainer);
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
