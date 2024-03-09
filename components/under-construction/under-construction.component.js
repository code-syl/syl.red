import * as Builder from "/scripts/newComponent.js";

const scripts = document.getElementsByTagName('script');
const script = scripts[scripts.length-1];
const componentName = script.getAttribute('name');

fetch('/components/'+componentName+'/'+componentName+'.component.html')
    .then(response => response.text())
    .then(data => Builder.newComponent(
        componentName, 
            data, 
            '.'+componentName
        ));