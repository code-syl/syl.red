import * as Builder from "/scripts/newComponent.js";

fetch("/components/main-content/main-content.component.html")
    .then(response => response.text())
    .then(data => Builder.newComponent(
            'main-content', 
            data, 
            '.main-content'
        ));