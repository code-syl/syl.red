function newComponent(
    componentName,
    componentTemplate,
    containerQuerySelectorString
) {
    customElements.define(
        componentName,
        class extends HTMLElement {
            connectedCallback() {
                const content = this.innerHTML;
                this.innerHTML = "";

                this.attachShadow({ mode: "open" });

                this.shadowRoot.innerHTML = componentTemplate;
                const section = this.shadowRoot.querySelector(
                    containerQuerySelectorString
                );
                if (section) section.innerHTML = content;
            }
        }
    );
}

/**
 * Transforms a list of folder names into a path, starting with, and delimited by, a `/`.
 * @param {string[]} folderNames - The folder names to transform into a path
 * @returns {string} The path created from the folder names
 */
function toPath(folderNames) {
    if (folderNames.length === 0) return "";
    if (folderNames.constructor !== Array) return "";

    for (let i = 0; i < folderNames.length; i++) {
        if (folderNames[i] == "") continue;
        if (!folderNames[i].startsWith("/")) {
            folderNames[i] = "/" + folderNames[i];
        }

        while (folderNames[i].endsWith("/")) {
            folderNames[i] = folderNames[i].slice(0, -1);
        }
    }

    const path = folderNames.join("");

    return path;
}

/**
 * Sets the HTML contents from a file to the specified component, by name.
 * @param {string} componentName - The name of the component
 * @param {string[] | null | undefined} subfolders - Any extra sub folders that append the `/components` folder
 */
export function getHTML(componentName, subfolders) {
    subfolders = subfolders || [];
    subfolders = ["components"].concat(subfolders);
    const path = toPath(
        subfolders.concat([componentName, componentName + ".component.html"])
    );

    fetch(path)
        .then((response) => response.text())
        .then((data) => newComponent(componentName, data, "." + componentName));
}
