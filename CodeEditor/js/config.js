window.App = window.App || {};

App.defaultHTML = `<div class="container">
  <h1>✨ Привет, мир!</h1>
  <p>Редактируй код и смотри результат</p>
  <button id="clickBtn">Нажми меня</button>
  <div id="counter">Кликов: 0</div>
</div>`;

App.defaultCSS = `body {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: #fafbfc; color: #333;
}
.container {
  text-align: center; padding: 2rem; background: #fff;
  border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  max-width: 500px;
}
h1 { font-size: 2.5rem; margin-bottom: 0.5em; font-weight: 300; }
p { font-size: 0.9rem; opacity: 0.8; margin-bottom: 1.5em; }
#counter { margin-top: 1em; font-size: 0.9rem; opacity: 0.8; }`;

App.defaultSCSS = App.defaultCSS;

App.defaultJS = `let count = 0;
function updateCounter() {
  const counterElement = document.getElementById('counter');
  if (counterElement) counterElement.textContent = 'Кликов: ' + count;
}
document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('clickBtn');
  if (button) button.addEventListener('click', () => {
    count++;
    updateCounter();
    console.log('Клик!', count);
  });
});`;

App.fullDocument = {
  html: App.defaultHTML,
  css: App.defaultCSS,
  scss: App.defaultSCSS,
  js: App.defaultJS,
};

App.autocompleteData = {
  html: [
    "div",
    "span",
    "p",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "img",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "tfoot",
    "form",
    "input",
    "button",
    "select",
    "option",
    "textarea",
    "label",
    "header",
    "footer",
    "main",
    "section",
    "article",
    "nav",
    "aside",
    "br",
    "hr",
    "link",
    "meta",
    "title",
    "style",
    "script",
    "class",
    "id",
    "src",
    "href",
    "alt",
    "type",
    "placeholder",
    "value",
    "name",
    "disabled",
    "checked",
    "selected",
    "onclick",
    "onchange",
    "onsubmit",
    "style",
    "width",
    "height",
  ],
  css: [
    "color",
    "background",
    "background-color",
    "font-size",
    "font-family",
    "font-weight",
    "margin",
    "padding",
    "border",
    "border-radius",
    "display",
    "position",
    "top",
    "left",
    "right",
    "bottom",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "overflow",
    "z-index",
    "opacity",
    "transform",
    "transition",
    "animation",
    "box-shadow",
    "text-align",
    "text-decoration",
    "text-transform",
    "line-height",
    "letter-spacing",
    "white-space",
    "cursor",
    "flex",
    "grid",
    "align-items",
    "justify-content",
    "flex-direction",
    "gap",
  ],
  scss: [
    "color",
    "background",
    "background-color",
    "font-size",
    "font-family",
    "font-weight",
    "margin",
    "padding",
    "border",
    "border-radius",
    "display",
    "position",
    "top",
    "left",
    "right",
    "bottom",
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",
    "overflow",
    "z-index",
    "opacity",
    "transform",
    "transition",
    "animation",
    "box-shadow",
    "text-align",
    "text-decoration",
    "text-transform",
    "line-height",
    "letter-spacing",
    "white-space",
    "cursor",
    "flex",
    "grid",
    "align-items",
    "justify-content",
    "flex-direction",
    "gap",
    "$",
    "@mixin",
    "@include",
    "@extend",
    "@if",
    "@else",
    "@for",
    "@each",
    "@while",
    "@function",
    "@return",
    "lighten",
    "darken",
    "rgba",
  ],
  js: [
    "function",
    "var",
    "let",
    "const",
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "break",
    "continue",
    "return",
    "document",
    "window",
    "console",
    "log",
    "getElementById",
    "querySelector",
    "addEventListener",
    "classList",
    "style",
    "innerHTML",
    "textContent",
    "value",
    "parseInt",
    "parseFloat",
    "toString",
    "JSON",
    "Math",
    "Array",
    "Object",
    "String",
    "Number",
    "Boolean",
    "undefined",
    "null",
    "true",
    "false",
    "new",
    "this",
    "typeof",
    "instanceof",
    "try",
    "catch",
    "finally",
    "throw",
    "async",
    "await",
    "fetch",
    "then",
  ],
};

App.selfClosingTags = new Set([
  "img",
  "br",
  "hr",
  "input",
  "meta",
  "link",
  "area",
  "base",
  "col",
  "embed",
  "source",
  "track",
  "wbr",
]);
App.MAX_HISTORY = 100;
App.themes = {
  light: { name: "светлая", prismTheme: "prism.css" },
  dark: { name: "тёмная", prismTheme: "prism-okaidia.css" },
  darker: { name: "очень тёмная", prismTheme: "prism-okaidia.css" },
};
App.DEFAULT_FONT_SIZE = 14;
App.DEFAULT_CIRCLE_SCALE = 100;
App.DEFAULT_FONT_FAMILY = "'Consolas', 'Courier New', monospace";
