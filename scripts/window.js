// derived from https://infinitejs.com/posts/keep-dragged-elements-within-parent/
export function win95_drag(event, element) {
    event.preventDefault();

    let clientX = event.clientX || event.touches[0].clientX;
    let clientY = event.clientY || event.touches[0].clientY;

    let offsetX = clientX - element.getBoundingClientRect().left;
    let offsetY = clientY - element.getBoundingClientRect().top;

    document.addEventListener("mousemove", _onMove);
    document.addEventListener("mouseup", _stop);
    document.body.addEventListener("mouseleave", _stop);

    document.addEventListener("touchmove", _onMove, { passive: false });
    document.addEventListener("touchend", _stop);

    function _onMove(event) {
        event.preventDefault();

        let clientX = event.clientX || event.touches[0].clientX;
        let clientY = event.clientY || event.touches[0].clientY;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        const container = document.querySelector(".canvas");
        const containerRectangle = container.getBoundingClientRect();
        const elementRectangle = element.getBoundingClientRect();

        // restrict movement within the container
        newX = Math.max(
            containerRectangle.left,
            Math.min(newX, containerRectangle.right - elementRectangle.width)
        );
        newY = Math.max(
            containerRectangle.top,
            Math.min(newY, containerRectangle.bottom - elementRectangle.height)
        );

        element.style.left = newX - containerRectangle.left + "px";
        element.style.top = newY - containerRectangle.top + "px";
    }

    function _stop() {
        document.removeEventListener("mousemove", _onMove);
        document.removeEventListener("mouseup", _stop);
        document.body.removeEventListener("mouseleave", _stop);

        document.removeEventListener("touchmove", _onMove);
        document.removeEventListener("touchend", _stop);
    }
}
