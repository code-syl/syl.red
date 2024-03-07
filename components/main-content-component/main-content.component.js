import * as Builder from "/scripts/newComponent.js";

fetch("/components/main-content-component/main-content.component.html")
    .then(response => response.text())
    .then(data => Builder.newComponent('main-content-component', data, '.main-content'));