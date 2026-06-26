window.App = window.App || {};

(function () {
  App.elements = {
    editor: document.getElementById("codeEditor"),
    frame: document.getElementById("previewFrame"),
    lineNumbers: document.getElementById("lineNumbers"),
    highlightLayer: document.getElementById("highlightLayer"),
    linesCount: document.getElementById("linesCount"),
    charsCount: document.getElementById("charsCount"),
    currentTabDisplay: document.getElementById("currentTab"),
    statusText: document.getElementById("statusText"),
    currentThemeName: document.getElementById("currentThemeName"),
    tabContainer: document.getElementById("tabContainer"),
    refreshBtn: document.getElementById("refreshPreviewBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsPanel: document.getElementById("settingsPanel"),
    prismThemeLink: document.getElementById("prism-theme"),
    glassToggleBtn: document.getElementById("glassToggleBtn"),
    appContainer: document.getElementById("appContainer"),
    editorPanel: document.getElementById("editorPanel"),
    resizeHandle: document.getElementById("resizeHandle"),
    fontSizeInput: document.getElementById("fontSizeInput"),
    circleSizeSlider: document.getElementById("circleSizeSlider"),
    circleSizeValue: document.getElementById("circleSizeValue"),
    fontFamilySelect: document.getElementById("fontFamilySelect"),
    fontUploadZone: document.getElementById("fontUploadZone"),
    fontFileInput: document.getElementById("fontFileInput"),
    autocompleteBox: document.getElementById("autocompleteBox"),
  };

  App.state = {
    currentTabType: "html",
    activeStyleTab: "css",
    history: { html: [], css: [], scss: [], js: [] },
    autocompleteItems: [],
    autocompleteSelectedIndex: -1,
    glassMode: localStorage.getItem("codeplayground-glass") === "true",
    currentTheme: localStorage.getItem("codeplayground-theme") || "dark",
    userColors: {
      light: localStorage.getItem("codeplayground-color-light") || "#0078D4",
      dark: localStorage.getItem("codeplayground-color-dark") || "#8e44ad",
      darker: localStorage.getItem("codeplayground-color-darker") || "#c0392b",
    },
    customFontName: null,
    customFontBlobUrl: null,
    unsaved: { html: false, css: false, scss: false, js: false },
  };
  if (!App.themes[App.state.currentTheme]) App.state.currentTheme = "dark";

  function markUnsaved(tabType) {
    App.state.unsaved[tabType] = true;
    updateUnsavedIndicators();
  }
  function markSavedAll() {
    for (var t in App.state.unsaved) App.state.unsaved[t] = false;
    updateUnsavedIndicators();
  }
  function updateUnsavedIndicators() {
    var tabs = document.querySelectorAll(".panel-tab, .tab-main");
    tabs.forEach(function (tab) {
      var type = tab.getAttribute("data-tab");
      if (type && App.state.unsaved[type]) {
        tab.classList.add("unsaved");
      } else {
        tab.classList.remove("unsaved");
      }
    });
  }

  // ===== Переключение CSS / SCSS =====
  var cssTabMain = document.querySelector('.tab-main[data-tab="css"]');
  var toggleArrow = document.getElementById("cssToggleArrow");
  var langDropdown = document.getElementById("cssLangDropdown");
  var dropdownItems = langDropdown.querySelectorAll(".dropdown-item");
  document.body.appendChild(langDropdown);

  function positionDropdown() {
    var rect = cssTabMain.getBoundingClientRect();
    langDropdown.style.position = "fixed";
    langDropdown.style.top = rect.bottom + "px";
    langDropdown.style.left = rect.left + "px";
    langDropdown.style.minWidth = rect.width + "px";
    langDropdown.style.zIndex = "99999";
  }

  function setStyleLang(lang) {
    dropdownItems.forEach(function (item) {
      item.classList.toggle("active", item.dataset.lang === lang);
    });
    cssTabMain.setAttribute("data-tab", lang);
    var labelSpan = cssTabMain.querySelector(".tab-label");
    if (labelSpan) labelSpan.textContent = lang === "css" ? "CSS" : "SCSS";
    App.state.activeStyleTab = lang;
    var oldLang =
      App.state.currentTabType === "css"
        ? "css"
        : App.state.currentTabType === "scss"
          ? "scss"
          : null;
    if (oldLang && oldLang !== lang) {
      App.state.unsaved[lang] = App.state.unsaved[oldLang];
    }
    if (
      App.state.currentTabType === "css" ||
      App.state.currentTabType === "scss"
    ) {
      App.switchToTab(lang);
    } else {
      App.state.currentTabType = lang;
    }
    updateUnsavedIndicators();
  }

  toggleArrow.addEventListener("click", function (e) {
    e.stopPropagation();
    if (langDropdown.classList.contains("show")) {
      langDropdown.classList.remove("show");
      toggleArrow.classList.remove("open");
    } else {
      positionDropdown();
      langDropdown.classList.add("show");
      toggleArrow.classList.add("open");
    }
  });

  dropdownItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.stopPropagation();
      var lang = item.dataset.lang;
      setStyleLang(lang);
      langDropdown.classList.remove("show");
      toggleArrow.classList.remove("open");
    });
  });

  document.addEventListener("click", function (e) {
    if (
      e.target === toggleArrow ||
      toggleArrow.contains(e.target) ||
      e.target.closest("#cssLangDropdown")
    )
      return;
    langDropdown.classList.remove("show");
    toggleArrow.classList.remove("open");
  });

  window.addEventListener("resize", function () {
    if (langDropdown.classList.contains("show")) positionDropdown();
  });

  cssTabMain.addEventListener("click", function (e) {
    if (
      e.target === toggleArrow ||
      toggleArrow.contains(e.target) ||
      e.target.closest("#cssLangDropdown")
    )
      return;
    App.switchToTab(cssTabMain.getAttribute("data-tab"));
  });

  App.elements.tabContainer.addEventListener("click", function (e) {
    var tab = e.target.closest(".panel-tab:not(.tab-main)");
    if (!tab || tab.classList.contains("active")) return;
    App.switchToTab(tab.dataset.tab);
  });

  // ===== Редактор =====
  App.elements.editor.addEventListener("blur", App.saveCurrentTabCode);
  App.elements.editor.addEventListener("input", function () {
    App.saveCurrentTabCode();
    App.updateEditorStats();
    App.updateHighlight();
    App.updateColorDecorators();
    if (
      !App.elements.editor._lastHistoryPush ||
      Date.now() - App.elements.editor._lastHistoryPush > 500
    ) {
      App.pushHistory();
      App.elements.editor._lastHistoryPush = Date.now();
    }
    markUnsaved(App.state.currentTabType);
    var word = App.getCurrentWord();
    var ctx = App.getContext();
    if (
      word.length >= 1 ||
      ((ctx.afterLess || ctx.afterSlash) && word === "")
    ) {
      App.showAutocomplete(App.filterSuggestions(word));
    } else {
      App.hideAutocomplete();
    }
  });

  App.elements.editor.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.code === "KeyZ") {
      e.preventDefault();
      App.undo();
      return;
    }
    if (e.ctrlKey && e.code === "Slash") {
      e.preventDefault();
      App.toggleComment();
      return;
    }
    if (App.elements.autocompleteBox.style.display === "block") {
      App.navigateAutocomplete(e);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      var start = this.selectionStart,
        end = this.selectionEnd;
      App.pushHistory();
      this.value =
        this.value.substring(0, start) + "  " + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
      this.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  App.elements.editor.addEventListener("click", App.updateActiveLineHighlight);
  App.elements.editor.addEventListener("keyup", function (e) {
    if (
      e.key.startsWith("Arrow") ||
      e.key === "Home" ||
      e.key === "End" ||
      e.key === "PageUp" ||
      e.key === "PageDown"
    ) {
      App.updateActiveLineHighlight();
    }
  });
  App.elements.editor.addEventListener("scroll", function () {
    App.syncScroll();
    App.updateColorDecorators();
    App.updateActiveLineHighlight();
    App.updateMinimapViewport();
  });

  // ===== Кликабельные номера строк =====
  App.elements.lineNumbers.addEventListener("click", function (e) {
    var rect = this.getBoundingClientRect();
    var y = e.clientY - rect.top + this.scrollTop;
    var lineHeight = parseFloat(getComputedStyle(this).lineHeight);
    var lineIndex = Math.floor(y / lineHeight);
    if (lineIndex < 0) return;
    var editor = App.elements.editor;
    var lines = editor.value.split("\n");
    if (lineIndex >= lines.length) return;
    var pos = 0;
    for (var i = 0; i < lineIndex; i++) {
      pos += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(pos, pos);
    App.updateActiveLineHighlight();
  });

  App.elements.refreshBtn.addEventListener("click", function () {
    App.saveCurrentTabCode();
    App.updatePreview();
  });

  App.elements.settingsBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    App.elements.settingsPanel.style.display =
      App.elements.settingsPanel.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", function (e) {
    if (
      !App.elements.settingsPanel.contains(e.target) &&
      e.target !== App.elements.settingsBtn
    ) {
      App.elements.settingsPanel.style.display = "none";
    }
  });

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
          App.saveAll();
          markSavedAll();
        } catch (err) {
          console.error(err);
          App.elements.statusText.textContent = "⚠ ошибка сохранения";
          App.elements.statusText.style.color = "#f48771";
        }
      }
    },
    true,
  );

  var settingsTabs = document.querySelectorAll(".settings-tab");
  var settingsTabContents = document.querySelectorAll(".settings-tab-content");
  settingsTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var tabName = tab.dataset.tab;
      settingsTabs.forEach(function (t) {
        t.classList.remove("active");
      });
      settingsTabContents.forEach(function (c) {
        c.classList.remove("active");
      });
      tab.classList.add("active");
      var content = document.querySelector(
        '[data-tab-content="' + tabName + '"]',
      );
      if (content) content.classList.add("active");
    });
  });

  App.elements.fontSizeInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.blur();
    }
  });
  App.elements.fontSizeInput.addEventListener("change", function () {
    App.applyFontSize(this.value);
  });
  App.elements.fontSizeInput.addEventListener("focus", function () {
    this.value =
      localStorage.getItem("codeplayground-font-size") || App.DEFAULT_FONT_SIZE;
  });
  App.elements.fontSizeInput.value =
    localStorage.getItem("codeplayground-font-size") || App.DEFAULT_FONT_SIZE;

  App.elements.circleSizeSlider.addEventListener("input", function () {
    App.elements.circleSizeValue.textContent = this.value + "%";
  });
  App.elements.circleSizeSlider.addEventListener("change", function () {
    App.applyCircleScale(this.value);
  });
  App.elements.circleSizeSlider.value =
    localStorage.getItem("codeplayground-circle-scale") ||
    App.DEFAULT_CIRCLE_SCALE;
  App.elements.circleSizeValue.textContent =
    App.elements.circleSizeSlider.value + "%";

  App.elements.fontUploadZone.addEventListener("click", function () {
    App.elements.fontFileInput.click();
  });
  App.elements.fontFileInput.addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (file) App.handleFontUpload(file);
    App.elements.fontFileInput.value = "";
  });
  App.elements.fontUploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    this.classList.add("drag-over");
  });
  App.elements.fontUploadZone.addEventListener("dragleave", function () {
    this.classList.remove("drag-over");
  });
  App.elements.fontUploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    this.classList.remove("drag-over");
    var file = e.dataTransfer.files[0];
    if (file) App.handleFontUpload(file);
  });
  App.elements.fontFamilySelect.addEventListener("change", function () {
    App.applyFontFamily(this.value);
  });

  var themeOptions = document.querySelectorAll(".theme-option");
  themeOptions.forEach(function (btn) {
    btn.addEventListener("click", function () {
      App.applyTheme(btn.dataset.theme);
    });
  });

  var colorSwatches = document.querySelectorAll(".color-swatch");
  colorSwatches.forEach(function (swatch) {
    swatch.addEventListener("click", function (e) {
      e.stopPropagation();
      var color = swatch.dataset.color;
      var themeName = swatch.closest(".color-palette").dataset.theme;
      App.applyCustomColor(themeName, color);
    });
  });

  if (App.elements.glassToggleBtn) {
    App.elements.glassToggleBtn.addEventListener("click", function () {
      App.toggleGlassMode();
    });
  }

  // ===== Варианты оформления и анимация =====
  var animationSection = document.getElementById("animationSection");
  var animationToggleSection = document.getElementById(
    "animationToggleSection",
  );
  var circleSizeSection = document.getElementById("circleSizeSection");
  var animateToggleBtn = document.getElementById("animateToggleBtn");
  var animationEnabled =
    localStorage.getItem("codeplayground-animation") === "true";
  var activeStyle =
    localStorage.getItem("codeplayground-effect-style") || "semicircle";

  var styleButtons = {
    semicircle: document.getElementById("styleSemicircleBtn"),
    gradient: document.getElementById("styleGradientBtn"),
    glow: document.getElementById("styleGlowBtn"),
  };

  function updateStyleUI() {
    // Удаляем все классы стилей
    document.body.classList.remove(
      "style-semicircle",
      "style-gradient",
      "style-glow",
    );
    // Добавляем текущий
    document.body.classList.add("style-" + activeStyle);

    // Показываем/скрываем нужные секции
    if (activeStyle === "semicircle" || activeStyle === "glow") {
      circleSizeSection.style.display = "block";
    } else {
      circleSizeSection.style.display = "none";
    }

    // Обновляем активные кнопки
    for (var key in styleButtons) {
      if (styleButtons[key]) {
        styleButtons[key].classList.toggle("active", key === activeStyle);
      }
    }
  }

  // Привязка кнопок стилей
  for (var key in styleButtons) {
    if (styleButtons[key]) {
      styleButtons[key].addEventListener("click", function (e) {
        var newStyle = e.target.id
          .replace("style", "")
          .replace("Btn", "")
          .toLowerCase();
        if (newStyle === activeStyle) return;
        activeStyle = newStyle;
        localStorage.setItem("codeplayground-effect-style", activeStyle);
        updateStyleUI();
        // Пересоздаём круг/эффект, если стекло включено
        if (App.state.glassMode) {
          App.elements.editorPanel.classList.remove("circle-visible");
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              App.elements.editorPanel.classList.add("circle-visible");
            });
          });
        }
      });
    }
  }

  function updateAnimationUI() {
    if (App.state.glassMode) {
      animationSection.style.display = "block";
      animationToggleSection.style.display = "block";
      updateStyleUI();
      if (animateToggleBtn)
        animateToggleBtn.classList.toggle("active", animationEnabled);
      document.body.classList.toggle("animate-circle", animationEnabled);
      if (!App.elements.editorPanel.classList.contains("circle-visible")) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            App.elements.editorPanel.classList.add("circle-visible");
            clearTimeout(App._circleAppearTimer);
            App._circleAppearTimer = setTimeout(function () {
              if (animationEnabled)
                document.body.classList.add("animate-circle");
            }, 2500);
          });
        });
      }
    } else {
      animationSection.style.display = "none";
      animationToggleSection.style.display = "none";
      circleSizeSection.style.display = "none";
      App.elements.editorPanel.classList.remove("circle-visible");
      document.body.classList.remove("animate-circle");
      if (animateToggleBtn) animateToggleBtn.classList.remove("active");
    }
  }

  if (animateToggleBtn) {
    animateToggleBtn.addEventListener("click", function () {
      animationEnabled = !animationEnabled;
      localStorage.setItem("codeplayground-animation", animationEnabled);
      updateAnimationUI();
    });
  }

  var originalToggleGlass = App.toggleGlassMode;
  App.toggleGlassMode = function (force) {
    originalToggleGlass(force);
    updateAnimationUI();
  };

  // Инициализация при запуске
  updateStyleUI();

  App.elements.resizeHandle.addEventListener("mousedown", App.onMouseDown);
  window.addEventListener("resize", function () {
    var percent = parseFloat(
      localStorage.getItem("codeplayground-editor-percent"),
    );
    if (!isNaN(percent)) App.applyEditorWidthPercent(percent);
    else App.applyEditorWidthPercent(50);
  });

  App.init = function () {
    App.loadSavedCode();
    App.initAllGlassCircles();
    App.applyTheme(App.state.currentTheme);
    if (App.state.glassMode) App.updateGlassClass();
    App.initFontSize();
    App.updateEditorFontSize();
    App.initCircleScale();
    App.initFontFamily();
    App.initResize();
    App.loadCodeForTab("html");
    App.state.history.html = [
      {
        value: App.elements.editor.value,
        cursor: App.elements.editor.selectionStart,
      },
    ];
    var currentStyleTab = cssTabMain.getAttribute("data-tab");
    App.state.activeStyleTab = currentStyleTab === "scss" ? "scss" : "css";
    updateAnimationUI();
    App.initColorPickerEvents();
    App.updateEditorStats();
    App.updateHighlight();
    setTimeout(function () {
      App.updateHighlight();
      App.updateColorDecorators();
      App.updateActiveLineHighlight();
      App.renderMinimap();
    }, 10);
    App.updateActiveLineHighlight();
    App.updatePreview();
    App.syncScroll();
    markSavedAll();
  };

  App.init();
})();
