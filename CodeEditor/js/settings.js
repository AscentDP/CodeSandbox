window.App = window.App || {};

App.applyFontSize = function (size) {
  var px = Math.max(10, Math.min(40, parseInt(size) || App.DEFAULT_FONT_SIZE));
  document.documentElement.style.setProperty("--editor-font-size", px + "px");
  App.elements.fontSizeInput.value = px;
  localStorage.setItem("codeplayground-font-size", px);
  App.updateEditorFontSize();
};

App.updateEditorFontSize = function () {
  var size = getComputedStyle(document.documentElement)
    .getPropertyValue("--editor-font-size")
    .trim();
  App.elements.editor.style.fontSize = size;
  App.elements.lineNumbers.style.fontSize = size;
  App.elements.highlightLayer.style.fontSize = size;
};

App.initFontSize = function () {
  var saved = parseInt(localStorage.getItem("codeplayground-font-size"));
  App.applyFontSize(saved || App.DEFAULT_FONT_SIZE);
};

App.applyCircleScale = function (value) {
  var scale =
    Math.max(50, Math.min(150, parseInt(value) || App.DEFAULT_CIRCLE_SCALE)) /
    100;
  document.documentElement.style.setProperty("--circle-scale", scale);
  App.elements.circleSizeSlider.value = value;
  App.elements.circleSizeValue.textContent = value + "%";
  localStorage.setItem("codeplayground-circle-scale", value);
};

App.initCircleScale = function () {
  var saved = parseInt(localStorage.getItem("codeplayground-circle-scale"));
  App.applyCircleScale(saved || App.DEFAULT_CIRCLE_SCALE);
};

App.applyFontFamily = function (fontFamily) {
  App.elements.editor.style.fontFamily = fontFamily;
  App.elements.lineNumbers.style.fontFamily = fontFamily;
  App.elements.highlightLayer.style.fontFamily = fontFamily;
  localStorage.setItem("codeplayground-font-family", fontFamily);
};

App.loadCustomFont = function (file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var buffer = e.target.result;
      var blob = new Blob([buffer], { type: file.type || "font/ttf" });
      if (App.state.customFontBlobUrl)
        URL.revokeObjectURL(App.state.customFontBlobUrl);
      App.state.customFontBlobUrl = URL.createObjectURL(blob);
      var fontName = "CustomFont_" + Date.now();
      var style = document.createElement("style");
      style.id = "custom-font-style";
      var oldStyle = document.getElementById("custom-font-style");
      if (oldStyle) oldStyle.remove();
      var format =
        file.type === "font/woff2"
          ? "woff2"
          : file.type === "font/woff"
            ? "woff"
            : file.type === "font/otf"
              ? "opentype"
              : "truetype";
      style.textContent =
        "@font-face { font-family: '" +
        fontName +
        "'; src: url('" +
        App.state.customFontBlobUrl +
        "') format('" +
        format +
        "'); font-weight: normal; font-style: normal; }";
      document.head.appendChild(style);
      resolve(fontName);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

App.isValidFontFile = function (file) {
  return /\.(ttf|otf|woff|woff2)$/i.test(file.name);
};

App.handleFontUpload = function (file) {
  if (!App.isValidFontFile(file)) {
    alert("Можно загружать только шрифты .ttf, .otf, .woff, .woff2");
    return;
  }
  App.loadCustomFont(file)
    .then(function (fontName) {
      App.state.customFontName = fontName;
      var select = App.elements.fontFamilySelect;
      var oldOption = select.querySelector('option[data-custom="true"]');
      if (oldOption) oldOption.remove();
      var option = document.createElement("option");
      option.value = fontName;
      option.textContent = file.name + " (загружен)";
      option.dataset.custom = "true";
      select.appendChild(option);
      select.value = fontName;
      App.applyFontFamily("'" + fontName + "', monospace");
    })
    .catch(function (err) {
      alert("Не удалось загрузить шрифт.");
      console.error(err);
    });
};

App.initFontFamily = function () {
  var savedFont =
    localStorage.getItem("codeplayground-font-family") ||
    App.DEFAULT_FONT_FAMILY;
  if (savedFont && savedFont.startsWith("'CustomFont_")) {
    localStorage.removeItem("codeplayground-font-family");
    App.applyFontFamily(App.DEFAULT_FONT_FAMILY);
    App.elements.fontFamilySelect.value = App.DEFAULT_FONT_FAMILY;
    var option = App.elements.fontFamilySelect.querySelector(
      'option[data-custom="true"]',
    );
    if (option) option.remove();
    return;
  }
  var standardOptions = Array.from(App.elements.fontFamilySelect.options).map(
    function (opt) {
      return opt.value;
    },
  );
  if (standardOptions.includes(savedFont)) {
    App.elements.fontFamilySelect.value = savedFont;
    App.applyFontFamily(savedFont);
  } else {
    App.elements.fontFamilySelect.value = App.DEFAULT_FONT_FAMILY;
    App.applyFontFamily(App.DEFAULT_FONT_FAMILY);
  }
};
