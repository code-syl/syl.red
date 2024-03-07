export function newComponent(componentName, componentTemplate, containerQuerySelectorString) {
    customElements.define(
        componentName, 
        class extends HTMLElement {
            connectedCallback() {
                const content = this.innerHTML;
                this.innerHTML = '';
                
                this.attachShadow({ mode: 'open' });                
                
                this.shadowRoot.innerHTML = componentTemplate;
                const section = this.shadowRoot.querySelector(containerQuerySelectorString);
                if (section) 
                    section.innerHTML = content;
            }
        }
    );
};