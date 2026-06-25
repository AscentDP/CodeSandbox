window.App = window.App || {};

App.buildFullHTML = function () {
  var style = getComputedStyle(document.documentElement);
  var primary = style.getPropertyValue("--theme-primary").trim();
  var secondary = style.getPropertyValue("--theme-secondary").trim();
  var styleCode = App.fullDocument[App.state.activeStyleTab] || "";
  return (
    '<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Предпросмотр</title>\n  <style>\n    :root {\n      --theme-primary: ' +
    primary +
    ";\n      --theme-secondary: " +
    secondary +
    ";\n    }\n    * { box-sizing: border-box; }\n    " +
    styleCode +
    '\n  </style>\n</head>\n<body data-theme-primary="' +
    primary +
    '" data-theme-secondary="' +
    secondary +
    '">\n  ' +
    (App.fullDocument.html ||
      '<div style="padding:2rem;color:#888;">Контент не загружен</div>') +
    "\n  <script>" +
    App.fullDocument.js +
    "<\/script>\n</body>\n</html>"
  );
};

App.updatePreview = function () {
  try {
    var htmlContent = App.buildFullHTML();
    var frame = App.elements.frame;
    if (frame._blobUrl) URL.revokeObjectURL(frame._blobUrl);
    var blob = new Blob([htmlContent], { type: "text/html" });
    frame._blobUrl = URL.createObjectURL(blob);
    frame.src = frame._blobUrl;
    var st = App.elements.statusText;
    st.textContent = "● готово";
    st.style.color = getComputedStyle(document.documentElement)
      .getPropertyValue("--theme-secondary")
      .trim();
  } catch (e) {
    App.elements.statusText.textContent = "⚠ ошибка";
    App.elements.statusText.style.color = "#f48771";
    console.error(e);
  }
};
