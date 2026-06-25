window.App = window.App || {};

// ===== СТАНДАРТНЫЕ ФУНКЦИИ РЕДАКТОРА =====
App.switchToTab = function (tabType) {
  if (tabType === App.state.currentTabType) return;
  App.saveCurrentTabCode();
  document.querySelectorAll(".panel-tab, .tab-main").forEach(function (t) {
    t.classList.remove("active");
  });
  var activeButton = document.querySelector(
    `.panel-tab[data-tab="${tabType}"], .tab-main[data-tab="${tabType}"]`,
  );
  if (activeButton) activeButton.classList.add("active");
  App.state.currentTabType = tabType;
  App.elements.currentTabDisplay.textContent = tabType.toUpperCase();
  if (tabType === "css" || tabType === "scss") {
    App.state.activeStyleTab = tabType;
  }
  App.loadCodeForTab(tabType);
  App.state.history[tabType] = [
    {
      value: App.elements.editor.value,
      cursor: App.elements.editor.selectionStart,
    },
  ];
  App.updateEditorStats();
  App.updateHighlight();
  App.updateColorDecorators();
  App.updatePreview();
  App.syncScroll();
  App.elements.editor.focus();
};

App.updateEditorStats = function () {
  var text = App.elements.editor.value;
  var lines = text.split("\n");
  App.elements.lineNumbers.textContent = lines
    .map(function (_, i) {
      return i + 1;
    })
    .join("\n");
  App.elements.linesCount.textContent = lines.length;
  App.elements.charsCount.textContent = text.length;
};

App.updateHighlight = function () {
  var code = App.elements.editor.value;
  var langMap = { html: "markup", css: "css", scss: "scss", js: "javascript" };
  var lang = langMap[App.state.currentTabType] || "markup";
  try {
    var highlighted = Prism.highlight(code, Prism.languages[lang], lang);
    App.elements.highlightLayer.innerHTML = highlighted;
    App.colorizeHighlight();
  } catch (e) {
    App.elements.highlightLayer.textContent = code;
  }
};

App.syncScroll = function () {
  App.elements.lineNumbers.scrollTop = App.elements.editor.scrollTop;
  App.elements.highlightLayer.scrollTop = App.elements.editor.scrollTop;
  App.elements.highlightLayer.scrollLeft = App.elements.editor.scrollLeft;
};

App.getContext = function () {
  var text = App.elements.editor.value;
  var cursor = App.elements.editor.selectionStart;
  var lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  var line = text.substring(lineStart, cursor);
  var afterLess = false,
    afterSlash = false;
  if (App.state.currentTabType === "html") {
    var trimmedLine = line.trimEnd();
    if (trimmedLine.endsWith("<")) afterLess = true;
    else if (trimmedLine.endsWith("</")) afterSlash = true;
  }
  return { afterLess: afterLess, afterSlash: afterSlash };
};

App.getCurrentWord = function () {
  var text = App.elements.editor.value;
  var cursor = App.elements.editor.selectionStart;
  var start = cursor;
  while (start > 0 && /[\w-]/.test(text[start - 1])) start--;
  return text.substring(start, cursor).toLowerCase();
};

App.filterSuggestions = function (prefix) {
  if (!prefix) {
    if (App.state.currentTabType === "html") {
      var ctx = App.getContext();
      if (ctx.afterLess || ctx.afterSlash) return App.autocompleteData.html;
    }
    return [];
  }
  var list = App.autocompleteData[App.state.currentTabType] || [];
  return list.filter(function (item) {
    return item.toLowerCase().startsWith(prefix);
  });
};

App.showAutocomplete = function (suggestions) {
  if (suggestions.length === 0) {
    App.hideAutocomplete();
    return;
  }
  App.state.autocompleteItems = suggestions;
  App.state.autocompleteSelectedIndex = -1;
  var coords = App.getCaretCoordinates();
  var box = App.elements.autocompleteBox;
  box.style.top =
    coords.top +
    parseFloat(getComputedStyle(App.elements.editor).lineHeight) +
    20 +
    "px";
  box.style.left = coords.left + "px";
  box.innerHTML = suggestions
    .map(function (s, i) {
      return (
        '<div class="autocomplete-item" data-index="' + i + '">' + s + "</div>"
      );
    })
    .join("");
  box.style.display = "block";
  var items = box.querySelectorAll(".autocomplete-item");
  items.forEach(function (item) {
    item.addEventListener("click", function () {
      var index = parseInt(item.dataset.index);
      App.insertSuggestion(App.state.autocompleteItems[index]);
    });
  });
};

App.hideAutocomplete = function () {
  App.elements.autocompleteBox.style.display = "none";
  App.state.autocompleteItems = [];
  App.state.autocompleteSelectedIndex = -1;
};

App.navigateAutocomplete = function (e) {
  var box = App.elements.autocompleteBox;
  if (box.style.display === "none") return;
  var items = box.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    App.state.autocompleteSelectedIndex = Math.min(
      App.state.autocompleteSelectedIndex + 1,
      items.length - 1,
    );
    App.updateAutocompleteSelection(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    App.state.autocompleteSelectedIndex = Math.max(
      App.state.autocompleteSelectedIndex - 1,
      0,
    );
    App.updateAutocompleteSelection(items);
  } else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    if (App.state.autocompleteSelectedIndex >= 0) {
      App.insertSuggestion(
        App.state.autocompleteItems[App.state.autocompleteSelectedIndex],
      );
    } else if (App.state.autocompleteItems.length > 0) {
      App.insertSuggestion(App.state.autocompleteItems[0]);
    }
  } else if (e.key === "Escape") {
    App.hideAutocomplete();
  }
};

App.updateAutocompleteSelection = function (items) {
  items.forEach(function (item, index) {
    item.classList.toggle(
      "active",
      index === App.state.autocompleteSelectedIndex,
    );
  });
};

App.insertSuggestion = function (word) {
  var text = App.elements.editor.value;
  var cursor = App.elements.editor.selectionStart;
  var insertion = "";
  var cursorOffset = 0;
  if (App.state.currentTabType === "html") {
    var ctx = App.getContext();
    if (ctx.afterSlash) {
      insertion = word + ">";
      cursorOffset = word.length + 1;
    } else if (ctx.afterLess) {
      if (App.selfClosingTags.has(word)) {
        insertion = word + " />";
        cursorOffset = word.length + 3;
      } else {
        insertion = word + "></" + word + ">";
        cursorOffset = word.length + 1;
      }
    } else {
      if (App.selfClosingTags.has(word)) {
        insertion = "<" + word + " />";
        cursorOffset = insertion.length;
      } else {
        insertion = "<" + word + "></" + word + ">";
        cursorOffset = word.length + 2;
      }
    }
  } else if (
    App.state.currentTabType === "css" ||
    App.state.currentTabType === "scss"
  ) {
    insertion = word + ": ;";
    cursorOffset = word.length + 2;
  } else if (App.state.currentTabType === "js") {
    insertion = word;
    cursorOffset = word.length;
  }
  var start = cursor;
  while (start > 0 && /[\w-]/.test(text[start - 1])) start--;
  var before = text.substring(0, start);
  var after = text.substring(cursor);
  App.pushHistory();
  App.elements.editor.value = before + insertion + after;
  var newPosition = start + cursorOffset;
  App.elements.editor.selectionStart = App.elements.editor.selectionEnd =
    newPosition;
  App.hideAutocomplete();
  App.elements.editor.focus();
  App.updateEditorStats();
  App.updateHighlight();
};

App.getCaretCoordinates = function () {
  var textarea = App.elements.editor;
  var start = textarea.selectionStart;
  var value = textarea.value;
  var lineStart = value.lastIndexOf("\n", start - 1) + 1;
  var line = value.substring(lineStart, start);
  var lines = value.substring(0, start).split("\n");
  var lineIndex = lines.length;
  var col = line.length;
  var lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
  var charWidth = parseFloat(getComputedStyle(textarea).fontSize) * 0.6;
  var top =
    (lineIndex - 1) * lineHeight +
    parseFloat(getComputedStyle(textarea).paddingTop) -
    textarea.scrollTop;
  var left =
    col * charWidth + parseFloat(getComputedStyle(textarea).paddingLeft);
  return { top: top, left: left };
};

// ===== ОКРАШИВАНИЕ ЦВЕТОВ В ПОДСВЕТКЕ =====
App.colorizeHighlight = function () {
  var layer = App.elements.highlightLayer;
  if (!layer) return;
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.textContent;
      var regex = /(#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\))/g;
      var match,
        lastIndex = 0,
        fragment = document.createDocumentFragment();
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex)
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index)),
          );
        var color = match[0];
        var span = document.createElement("span");
        span.className = "color-value";
        span.style.color = color;
        span.textContent = color;
        fragment.appendChild(span);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length)
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex)),
        );
      if (fragment.childNodes.length > 0)
        node.parentNode.replaceChild(fragment, node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !node.classList.contains("color-value")
    ) {
      Array.from(node.childNodes).forEach(function (child) {
        walk(child);
      });
    }
  }
  walk(layer);
};

// ===== ЦВЕТОВЫЕ ДЕКОРАТОРЫ =====
App.updateColorDecorators = function () {
  var container = document.getElementById("colorDecorators");
  if (!container) return;
  container.innerHTML = "";
  var code = App.elements.editor.value;
  var lineHeight = parseFloat(getComputedStyle(App.elements.editor).lineHeight);
  var charWidth =
    parseFloat(getComputedStyle(App.elements.editor).fontSize) * 0.6;
  var paddingTop = parseFloat(getComputedStyle(App.elements.editor).paddingTop);
  var paddingLeft = parseFloat(
    getComputedStyle(App.elements.editor).paddingLeft,
  );
  var scrollTop = App.elements.editor.scrollTop;
  var scrollLeft = App.elements.editor.scrollLeft;
  var hexRegex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
  var rgbaRegex = /rgba?\([^)]+\)/g;
  var match;
  while ((match = hexRegex.exec(code)) !== null)
    addDecorator(match.index, match[0]);
  while ((match = rgbaRegex.exec(code)) !== null)
    addDecorator(match.index, match[0]);

  function addDecorator(pos, color) {
    var beforeMatch = code.substring(0, pos);
    var lineIndex = beforeMatch.split("\n").length - 1;
    var lineStart = beforeMatch.lastIndexOf("\n") + 1;
    var col = pos - lineStart;
    var top = lineIndex * lineHeight + paddingTop - scrollTop;
    var left = col * charWidth + paddingLeft - scrollLeft;
    var decorator = document.createElement("div");
    decorator.className = "color-decorator";
    decorator.style.top = top + "px";
    decorator.style.left = left + "px";
    decorator.dataset.color = color;
    decorator.dataset.pos = pos;
    decorator.dataset.endPos = pos + color.length;
    decorator.addEventListener("mouseenter", function (e) {
      App.showColorPicker(e, decorator);
    });
    decorator.addEventListener("mouseleave", function () {
      App.hideColorPickerDelayed();
    });
    container.appendChild(decorator);
  }
};

// ===== КАСТОМНЫЙ ЦВЕТОВОЙ ПИКЕР =====
App._currentHue = 0;
App._currentSat = 100;
App._currentVal = 100;

App.initColorPickerEvents = function () {
  var canvas = document.getElementById("colorCanvas");
  var hueSlider = document.getElementById("hueSlider");
  var alphaSlider = document.getElementById("alphaSlider");
  var alphaValue = document.getElementById("alphaValue");
  var preview = document.getElementById("colorPreview");

  if (!canvas || !hueSlider || !alphaSlider) return;

  var ctx = canvas.getContext("2d");

  function drawSV(hue) {
    // Заливаем чистым оттенком
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Белый градиент слева направо (белый → прозрачный)
    var whiteGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    whiteGrad.addColorStop(0, "white");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Чёрный градиент сверху вниз (прозрачный → чёрный)
    var blackGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "black");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function updatePreview() {
    var r, g, b;
    if (App._currentSat === 0) {
      r = g = b = Math.round((App._currentVal * 255) / 100);
    } else {
      var i = Math.floor(App._currentHue / 60);
      var f = App._currentHue / 60 - i;
      var p = (App._currentVal * (100 - App._currentSat)) / 100;
      var q = (App._currentVal * (100 - App._currentSat * f)) / 100;
      var t = (App._currentVal * (100 - App._currentSat * (1 - f))) / 100;
      switch (i % 6) {
        case 0:
          r = App._currentVal;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = App._currentVal;
          b = p;
          break;
        case 2:
          r = p;
          g = App._currentVal;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = App._currentVal;
          break;
        case 4:
          r = t;
          g = p;
          b = App._currentVal;
          break;
        case 5:
          r = App._currentVal;
          g = p;
          b = q;
          break;
      }
      r = Math.round((r * 255) / 100);
      g = Math.round((g * 255) / 100);
      b = Math.round((b * 255) / 100);
    }
    var alpha = parseInt(alphaSlider.value) / 100;
    var color =
      alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
    preview.style.backgroundColor = color;
  }

  // Обработчик клика/перетаскивания на холсте
  function setColorFromPicker(x, y) {
    var w = canvas.width,
      h = canvas.height;
    // Насыщенность: чем правее, тем выше
    App._currentSat = Math.round((x / w) * 100);
    // Яркость: чем выше, тем ярче (инвертируем Y, чтобы верх был ярким)
    App._currentVal = Math.round((1 - y / h) * 100);
    App._currentSat = Math.max(0, Math.min(100, App._currentSat));
    App._currentVal = Math.max(0, Math.min(100, App._currentVal));
    updatePreview();
    App.onColorPickerChange();
  }

  canvas.addEventListener("mousedown", function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    setColorFromPicker(x, y);
    function onMouseMove(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      setColorFromPicker(x, y);
    }
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener(
      "mouseup",
      function () {
        canvas.removeEventListener("mousemove", onMouseMove);
      },
      { once: true },
    );
  });

  hueSlider.addEventListener("input", function () {
    App._currentHue = parseInt(hueSlider.value);
    drawSV(App._currentHue);
    updatePreview();
    App.onColorPickerChange();
  });

  alphaSlider.addEventListener("input", function () {
    alphaValue.textContent = alphaSlider.value + "%";
    updatePreview();
    App.onColorPickerChange();
  });

  // Загрузка цвета из внешнего источника (HEX, rgb, rgba)
  App._updatePickerFromColor = function (color) {
    var temp = document.createElement("div");
    temp.style.color = color;
    document.body.appendChild(temp);
    var rgbStr = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    var match = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return;
    var r = parseInt(match[1]) / 255;
    var g = parseInt(match[2]) / 255;
    var b = parseInt(match[3]) / 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var h,
      s,
      v = max * 100;
    if (max === min) {
      h = 0;
      s = 0;
    } else {
      var d = max - min;
      s = (max === 0 ? 0 : d / max) * 100;
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      } else if (max === g) {
        h = ((b - r) / d + 2) * 60;
      } else {
        h = ((r - g) / d + 4) * 60;
      }
    }
    h = Math.round(h);
    if (h < 0) h += 360;
    App._currentHue = h;
    App._currentSat = Math.round(s);
    App._currentVal = Math.round(v);
    hueSlider.value = h;
    var alphaMatch = color.match(/rgba?\(.*,\s*([\d.]+)\)/);
    var alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1;
    alphaSlider.value = Math.round(alpha * 100);
    alphaValue.textContent = Math.round(alpha * 100) + "%";
    drawSV(h);
    updatePreview();
  };

  drawSV(0); // начальный оттенок 0
};

// ===== ПОКАЗ И СКРЫТИЕ ПИКЕРА =====
App.showColorPicker = function (e, decorator) {
  var popup = document.getElementById("colorPickerPopup");
  if (!popup) return;
  if (App._colorPickerTimer) {
    clearTimeout(App._colorPickerTimer);
    App._colorPickerTimer = null;
  }

  var color = decorator.dataset.color;
  var startPos = parseInt(decorator.dataset.pos);
  var endPos = parseInt(decorator.dataset.endPos);
  popup._startPos = startPos;
  popup._endPos = endPos;
  popup._originalText = App.elements.editor.value;

  if (App._updatePickerFromColor) App._updatePickerFromColor(color);

  var rect = decorator.getBoundingClientRect();
  popup.style.top = rect.bottom + 5 + "px";
  popup.style.left = rect.left + "px";
  popup.style.display = "flex";
  requestAnimationFrame(function () {
    popup.style.opacity = "1";
    popup.style.transform = "translateY(0) scale(1)";
  });

  popup.onmouseenter = function () {
    if (App._colorPickerTimer) clearTimeout(App._colorPickerTimer);
  };
  popup.onmouseleave = function () {
    App.hideColorPickerDelayed();
  };
};

App.hideColorPickerDelayed = function () {
  App._colorPickerTimer = setTimeout(function () {
    App.hideColorPicker();
  }, 200);
};

App.hideColorPicker = function () {
  var popup = document.getElementById("colorPickerPopup");
  if (popup) {
    popup.style.opacity = "0";
    popup.style.transform = "translateY(-8px) scale(0.96)";
    clearTimeout(popup._hideTimer);
    popup._hideTimer = setTimeout(function () {
      popup.style.display = "none";
      delete popup._startPos;
      delete popup._endPos;
      delete popup._originalText;
      App.updateColorDecorators();
    }, 200);
  }
};

App.onColorPickerChange = function () {
  var popup = document.getElementById("colorPickerPopup");
  if (!popup || !popup._originalText) return;
  var editor = App.elements.editor;
  editor.value = popup._originalText;

  var hue = App._currentHue;
  var sat = App._currentSat;
  var val = App._currentVal;
  var alpha = parseInt(document.getElementById("alphaSlider").value) / 100;

  // Преобразование HSV → RGB
  var r, g, b;
  if (sat === 0) {
    r = g = b = Math.round((val * 255) / 100);
  } else {
    var i = Math.floor(hue / 60);
    var f = hue / 60 - i;
    var p = (val * (100 - sat)) / 100;
    var q = (val * (100 - sat * f)) / 100;
    var t = (val * (100 - sat * (1 - f))) / 100;
    switch (i % 6) {
      case 0:
        r = val;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = val;
        b = p;
        break;
      case 2:
        r = p;
        g = val;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = val;
        break;
      case 4:
        r = t;
        g = p;
        b = val;
        break;
      case 5:
        r = val;
        g = p;
        b = q;
        break;
    }
    r = Math.round((r * 255) / 100);
    g = Math.round((g * 255) / 100);
    b = Math.round((b * 255) / 100);
  }

  var finalColor;
  if (alpha < 1) {
    finalColor = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  } else {
    var toHex = function (c) {
      var hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    finalColor = "#" + toHex(r) + toHex(g) + toHex(b);
  }

  var start = popup._startPos,
    end = popup._endPos;
  editor.value =
    editor.value.substring(0, start) + finalColor + editor.value.substring(end);
  editor.selectionStart = editor.selectionEnd = start + finalColor.length;
  App.saveCurrentTabCode();
  App.updateEditorStats();
  App.updateHighlight();
};
