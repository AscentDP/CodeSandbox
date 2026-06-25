window.App = window.App || {};

App.lightenColor = function (hex, percent) {
  var num = parseInt(hex.replace("#", ""), 16);
  var r = Math.min(255, (num >> 16) + percent);
  var g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
  var b = Math.min(255, (num & 0x0000ff) + percent);
  return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

App.hexToRgba = function (hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
};

App.applyCustomColor = function (themeName, hexColor) {
  var secondary = App.lightenColor(hexColor, 60);
  document.body.style.setProperty("--theme-primary", hexColor);
  document.body.style.setProperty("--theme-secondary", secondary);
  localStorage.setItem("codeplayground-color-" + themeName, hexColor);
  App.state.userColors[themeName] = hexColor;
  var swatches = document.querySelectorAll(".color-swatch");
  swatches.forEach(function (s) {
    s.classList.remove("active");
    if (
      s.dataset.color === hexColor &&
      s.closest(".color-palette").dataset.theme === themeName
    ) {
      s.classList.add("active");
    }
  });
  App.updateGlassCircle(themeName, hexColor);
  App.updateResizeHandleHover(themeName, hexColor);
};

/** Создаёт/обновляет <style> с градиентом для полукруга */
App.updateGlassCircle = function (themeName, hexColor) {
  var styleId = "glass-circle-" + themeName;
  var styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  var rgba = App.hexToRgba(hexColor, 0.45);
  var rgba2 = App.hexToRgba(hexColor, 0.2);
  styleEl.textContent =
    'body.glass-mode[data-theme="' +
    themeName +
    '"] .editor-panel::before {' +
    "background: radial-gradient(circle, " +
    rgba +
    " 0%, " +
    rgba2 +
    " 60%, transparent 85%);" +
    "}";
};

App.updateResizeHandleHover = function (themeName, hexColor) {
  var styleId = "resize-" + themeName + "-style";
  var styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  var rgba = App.hexToRgba(hexColor, 0.6);
  styleEl.textContent =
    'body.glass-mode[data-theme="' +
    themeName +
    '"] { --resize-handle-hover: ' +
    rgba +
    "; }";
};

App.initAllGlassCircles = function () {
  for (var theme in App.state.userColors) {
    if (App.state.userColors.hasOwnProperty(theme)) {
      App.updateGlassCircle(theme, App.state.userColors[theme]);
      App.updateResizeHandleHover(theme, App.state.userColors[theme]);
    }
  }
};

App.applyTheme = function (themeName) {
  var theme = App.themes[themeName];
  if (!theme) return;
  var color = App.state.userColors[themeName];
  App.applyCustomColor(themeName, color);
  document.body.setAttribute("data-theme", themeName);
  if (theme.prismTheme) {
    App.elements.prismThemeLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/" +
      theme.prismTheme;
  }
  var themeOptions = document.querySelectorAll(".theme-option");
  themeOptions.forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.theme === themeName);
  });
  if (App.elements.currentThemeName)
    App.elements.currentThemeName.textContent = theme.name;
  localStorage.setItem("codeplayground-theme", themeName);
  App.updateGlassClass();
  App.updatePreview();
};

App.updateGlassClass = function () {
  if (App.state.glassMode) document.body.classList.add("glass-mode");
  else document.body.classList.remove("glass-mode");
  var btn = App.elements.glassToggleBtn;
  if (btn) btn.classList.toggle("active", App.state.glassMode);
};

App.toggleGlassMode = function (force) {
  var newState = typeof force === "boolean" ? force : !App.state.glassMode;
  App.state.glassMode = newState;
  localStorage.setItem("codeplayground-glass", App.state.glassMode);
  App.updateGlassClass();
  App.updatePreview();
};
