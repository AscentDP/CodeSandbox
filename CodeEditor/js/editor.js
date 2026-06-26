window.App = window.App || {};

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
  App.state.history[tabType] = App.state.history[tabType] || [
    {
      value: App.elements.editor.value,
      cursor: App.elements.editor.selectionStart,
    },
  ];
  App.updateEditorStats();
  App.updateHighlight();
  App.updateColorDecorators();
  App.renderMinimap(); // ← обновляем мини‑карту
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
  if (typeof Prism === "undefined") return;
  var code = App.elements.editor.value;
  var langMap = { html: "markup", css: "css", scss: "scss", js: "javascript" };
  var lang = langMap[App.state.currentTabType] || "markup";
  try {
    var highlighted = Prism.highlight(code, Prism.languages[lang], lang);
    App.elements.highlightLayer.innerHTML = highlighted;
    App.colorizeHighlight();
    App.renderMinimap(); // ← перерисовываем мини‑карту после подсветки
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

// ===== КОММЕНТИРОВАНИЕ / РАСКОММЕНТИРОВАНИЕ (Ctrl+/) =====
App.toggleComment = function () {
  var editor = App.elements.editor;
  var start = editor.selectionStart;
  var end = editor.selectionEnd;
  var text = editor.value;

  var hasSelection = start !== end;
  var lineStart = text.lastIndexOf("\n", start - 1) + 1;
  var lineEnd = text.indexOf("\n", end - 1);
  if (lineEnd === -1) lineEnd = text.length;

  var selectedText = text.substring(start, end);
  var fullLineText = text.substring(lineStart, lineEnd);

  var lang = App.state.currentTabType;
  var openComment, closeComment, isBlock;

  if (lang === "html") {
    openComment = "<!-- ";
    closeComment = " -->";
    isBlock = true;
  } else if (lang === "css" || lang === "scss") {
    openComment = "/* ";
    closeComment = " */";
    isBlock = true;
  } else if (lang === "js") {
    if (hasSelection && selectedText.indexOf("\n") !== -1) {
      openComment = "/* ";
      closeComment = " */";
      isBlock = true;
    } else {
      openComment = "// ";
      closeComment = "";
      isBlock = false;
    }
  }

  var isCommented = false;
  var targetText = hasSelection ? selectedText : fullLineText;

  if (isBlock) {
    var trimmed = targetText.trim();
    isCommented =
      trimmed.startsWith(openComment.trim()) &&
      trimmed.endsWith(closeComment.trim());
  } else {
    var lines = targetText.split("\n");
    isCommented = lines.every(function (line) {
      return line.trim().startsWith("//");
    });
  }

  App.pushHistory();

  var replacement = "";
  var newStart = start,
    newEnd = end;

  if (isCommented) {
    if (isBlock) {
      replacement = targetText
        .replace(openComment, "")
        .replace(closeComment, "");
      replacement = replacement.replace(/^\s+/, "");
    } else {
      replacement = targetText
        .split("\n")
        .map(function (line) {
          return line.replace(/^\s*\/\/\s?/, "");
        })
        .join("\n");
    }

    if (hasSelection) {
      editor.value =
        text.substring(0, start) + replacement + text.substring(end);
      newStart = start;
      newEnd = start + replacement.length;
    } else {
      editor.value =
        text.substring(0, lineStart) + replacement + text.substring(lineEnd);
      newStart = lineStart;
      newEnd = lineStart + replacement.length;
    }
  } else {
    if (isBlock) {
      replacement = openComment + targetText + closeComment;
    } else {
      replacement = targetText
        .split("\n")
        .map(function (line) {
          return "// " + line;
        })
        .join("\n");
    }

    if (hasSelection) {
      editor.value =
        text.substring(0, start) + replacement + text.substring(end);
      newStart = start;
      newEnd = start + replacement.length;
    } else {
      editor.value =
        text.substring(0, lineStart) + replacement + text.substring(lineEnd);
      newStart = lineStart;
      newEnd = lineStart + replacement.length;
    }
  }

  editor.selectionStart = newStart;
  editor.selectionEnd = newEnd;

  App.pushHistory();

  App.saveCurrentTabCode();
  App.updateEditorStats();
  App.updateHighlight();
  App.updateColorDecorators();
};

// ===== ПОДСВЕТКА АКТИВНОЙ СТРОКИ =====
App.updateActiveLineHighlight = function () {
  var editor = App.elements.editor;
  var text = editor.value;
  var cursorPos = editor.selectionStart;

  var lines = text.substring(0, cursorPos).split("\n");
  var lineIndex = lines.length - 1;

  var lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
  var paddingTop = parseFloat(getComputedStyle(editor).paddingTop);
  var scrollTop = editor.scrollTop;

  var highlightEl = document.getElementById("activeLineHighlight");
  if (!highlightEl) {
    highlightEl = document.createElement("div");
    highlightEl.id = "activeLineHighlight";
    highlightEl.className = "active-line-highlight";
    document.getElementById("editorArea").appendChild(highlightEl);
  }

  var top = lineIndex * lineHeight + paddingTop - scrollTop;
  highlightEl.style.top = top + "px";
  highlightEl.style.display = "block";
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
    var width = color.length * charWidth;
    var decorator = document.createElement("div");
    decorator.className = "color-decorator";
    decorator.style.top = top + "px";
    decorator.style.left = left + "px";
    decorator.style.width = width + "px";
    decorator.style.height = lineHeight + "px";
    decorator.dataset.color = color;
    decorator.dataset.pos = pos;
    decorator.dataset.endPos = pos + color.length;
    var hoverTimer = null;
    decorator.addEventListener("mouseenter", function (e) {
      var self = this;
      hoverTimer = setTimeout(function () {
        App.showColorPicker(e, self);
      }, 150);
    });
    decorator.addEventListener("mouseleave", function () {
      clearTimeout(hoverTimer);
      App.hideColorPickerDelayed();
    });
    container.appendChild(decorator);
  }
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
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (
        node.classList &&
        node.classList.length > 0 &&
        !node.classList.contains("color-value")
      ) {
        return;
      }
      Array.from(node.childNodes).forEach(function (child) {
        walk(child);
      });
    }
  }
  walk(layer);
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
  var rgbR = document.getElementById("rgbR");
  var rgbG = document.getElementById("rgbG");
  var rgbB = document.getElementById("rgbB");
  var hexInput = document.getElementById("colorHexInput");

  if (!canvas || !hueSlider || !alphaSlider) return;

  var ctx = canvas.getContext("2d");

  function drawSV(hue) {
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var whiteGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    whiteGrad.addColorStop(0, "white");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var blackGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "black");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function getCurrentRGB() {
    /* ... без изменений ... */
    var sat = App._currentSat;
    var val = App._currentVal;
    var hue = App._currentHue;
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
    return { r, g, b };
  }

  function updatePreview() {
    /* ... без изменений ... */
  }
  function updateFromRGBInputs() {
    /* ... без изменений ... */
  }
  function updateFromHexInput() {
    /* ... без изменений ... */
  }
  function parseColorString(str) {
    /* ... без изменений ... */
  }

  if (rgbR) rgbR.addEventListener("input", updateFromRGBInputs);
  if (rgbG) rgbG.addEventListener("input", updateFromRGBInputs);
  if (rgbB) rgbB.addEventListener("input", updateFromRGBInputs);

  if (hexInput) {
    hexInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        updateFromHexInput();
      }
    });
    hexInput.addEventListener("blur", function () {
      updateFromHexInput();
    });
  }

  function setColorFromPicker(x, y) {
    /* ... без изменений ... */
  }
  canvas.addEventListener("mousedown", function (e) {
    /* ... без изменений ... */
  });

  hueSlider.addEventListener("input", function () {
    /* ... без изменений ... */
  });
  alphaSlider.addEventListener("input", function () {
    /* ... без изменений ... */
  });

  App._updatePickerFromColor = function (color) {
    /* ... без изменений ... */
  };

  drawSV(0);
};

// ===== ПОКАЗ И СКРЫТИЕ ПИКЕРА =====
App.showColorPicker = function (e, decorator) {
  /* ... без изменений ... */
};
App.hideColorPickerDelayed = function () {
  /* ... без изменений ... */
};
App.hideColorPicker = function () {
  /* ... без изменений ... */
};
App.onColorPickerChange = function () {
  /* ... без изменений ... */
};

// ===== МИНИ-КАРТА =====
App.renderMinimap = function () {
  var container = document.getElementById("minimapContainer");
  var canvas = document.getElementById("minimapCanvas");
  if (!container || !canvas) return;

  var code = App.elements.editor.value;
  var lines = code.split("\n");
  var lineHeight = parseFloat(getComputedStyle(App.elements.editor).lineHeight);
  var scale = container.clientWidth / App.elements.editor.clientWidth;
  var canvasHeight = lines.length * lineHeight * scale;
  canvas.height = canvasHeight;
  canvas.style.height = canvasHeight + "px";
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font =
    parseFloat(getComputedStyle(App.elements.editor).fontSize) * scale +
    "px monospace";
  ctx.fillStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--text-primary")
      .trim() || "#d4d4d4";
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, (i + 1) * lineHeight * scale);
  }

  App.updateMinimapViewport();
};

App.updateMinimapViewport = function () {
  var viewport = document.getElementById("minimapViewport");
  if (!viewport) return;
  var editor = App.elements.editor;
  var lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
  var editorHeight = editor.clientHeight;
  var scrollTop = editor.scrollTop;
  var totalHeight = editor.scrollHeight;
  var scale =
    document.getElementById("minimapContainer").clientWidth /
    editor.clientWidth;

  var viewportTop = scrollTop * scale;
  var viewportHeight = editorHeight * scale;
  viewport.style.top = viewportTop + "px";
  viewport.style.height = viewportHeight + "px";
};

// Клик по мини-карте для прокрутки
(function () {
  var minimap = document.getElementById("minimapContainer");
  if (!minimap) return;
  minimap.addEventListener("click", function (e) {
    var rect = minimap.getBoundingClientRect();
    var y = e.clientY - rect.top;
    var editor = App.elements.editor;
    var lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    var scale = minimap.clientWidth / editor.clientWidth;
    var scrollTop = y / scale;
    editor.scrollTop = scrollTop;
    App.updateMinimapViewport();
  });
})();
