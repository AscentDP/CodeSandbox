window.App = window.App || {};

App.getMinEditorWidth = function () {
  return Math.max(200, App.elements.appContainer.clientWidth * 0.25);
};

App.getMinPreviewWidth = function () {
  return Math.max(250, App.elements.appContainer.clientWidth * 0.2);
};

App.applyEditorWidthPercent = function (percent) {
  var cw = App.elements.appContainer.clientWidth;
  if (!cw) return;
  var minE = App.getMinEditorWidth();
  var minP = App.getMinPreviewWidth();
  var max = cw - minP - App.elements.resizeHandle.clientWidth;
  var w = (percent / 100) * cw;
  if (w < minE) w = minE;
  if (w > max) w = max;
  App.elements.editorPanel.style.width = w + "px";
  localStorage.setItem(
    "codeplayground-editor-percent",
    ((w / cw) * 100).toFixed(1),
  );
};

App.initResize = function () {
  var percent = parseFloat(
    localStorage.getItem("codeplayground-editor-percent"),
  );
  if (!isNaN(percent)) App.applyEditorWidthPercent(percent);
  else App.applyEditorWidthPercent(50);
};

var isResizing = false,
  startX,
  startWidth;
App.onMouseDown = function (e) {
  e.preventDefault();
  isResizing = true;
  startX = e.clientX;
  startWidth = App.elements.editorPanel.offsetWidth;
  App.elements.resizeHandle.classList.add("active");
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  App.elements.frame.style.pointerEvents = "none";
  document.addEventListener("mousemove", App.onMouseMove);
  document.addEventListener("mouseup", App.onMouseUp);
};

App.onMouseMove = function (e) {
  if (!isResizing) return;
  var cw = App.elements.appContainer.clientWidth;
  var minE = App.getMinEditorWidth();
  var minP = App.getMinPreviewWidth();
  var max = cw - minP - App.elements.resizeHandle.clientWidth;
  var w = startWidth + (e.clientX - startX);
  if (w < minE) w = minE;
  if (w > max) w = max;
  App.elements.editorPanel.style.width = w + "px";
  localStorage.setItem(
    "codeplayground-editor-percent",
    ((w / cw) * 100).toFixed(1),
  );
};

App.onMouseUp = function () {
  if (!isResizing) return;
  isResizing = false;
  App.elements.resizeHandle.classList.remove("active");
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  App.elements.frame.style.pointerEvents = "";
  document.removeEventListener("mousemove", App.onMouseMove);
  document.removeEventListener("mouseup", App.onMouseUp);
};
