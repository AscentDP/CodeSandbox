window.App = window.App || {};

App.saveCurrentTabCode = function () {
  App.fullDocument[App.state.currentTabType] = App.elements.editor.value;
};

App.loadCodeForTab = function (type) {
  App.elements.editor.value = App.fullDocument[type] || "";
};

App.pushHistory = function () {
  var state = {
    value: App.elements.editor.value,
    cursor: App.elements.editor.selectionStart,
  };
  var stack = App.state.history[App.state.currentTabType];
  if (stack.length > 0 && stack[stack.length - 1].value === state.value) return;
  stack.push(state);
  if (stack.length > App.MAX_HISTORY) stack.shift();
};

App.undo = function () {
  var stack = App.state.history[App.state.currentTabType];
  if (stack.length > 1) {
    stack.pop();
    var previous = stack[stack.length - 1];
    App.elements.editor.value = previous.value;
    App.elements.editor.selectionStart = App.elements.editor.selectionEnd =
      previous.cursor;
    App.saveCurrentTabCode();
    App.updateEditorStats();
    App.updateHighlight();
  }
};

App.saveAll = function () {
  App.saveCurrentTabCode();
  localStorage.setItem("codeplayground-html", App.fullDocument.html);
  localStorage.setItem("codeplayground-css", App.fullDocument.css);
  localStorage.setItem("codeplayground-scss", App.fullDocument.scss);
  localStorage.setItem("codeplayground-js", App.fullDocument.js);
  App.updatePreview();
  var st = App.elements.statusText;
  st.textContent = "● сохранено";
  st.style.color = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme-secondary")
    .trim();
  setTimeout(function () {
    st.textContent = "● готово";
  }, 2000);
};

App.loadSavedCode = function () {
  var savedHTML = localStorage.getItem("codeplayground-html");
  var savedCSS = localStorage.getItem("codeplayground-css");
  var savedSCSS = localStorage.getItem("codeplayground-scss");
  var savedJS = localStorage.getItem("codeplayground-js");
  if (savedHTML !== null) App.fullDocument.html = savedHTML;
  if (savedCSS !== null) App.fullDocument.css = savedCSS;
  if (savedSCSS !== null) App.fullDocument.scss = savedSCSS;
  if (savedJS !== null) App.fullDocument.js = savedJS;
};
