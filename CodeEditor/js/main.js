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
  };
  if (!App.themes[App.state.currentTheme]) App.state.currentTheme = "dark";

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
    if (
      App.state.currentTabType === "css" ||
      App.state.currentTabType === "scss"
    ) {
      App.switchToTab(lang);
    } else {
      App.state.currentTabType = lang;
    }
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
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      App.undo();
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

  App.elements.editor.addEventListener("scroll", function () {
    App.syncScroll();
    App.updateColorDecorators();
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
        App.saveAll();
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

  // ===== Анимация круга =====
  var animationSection = document.getElementById("animationSection");
  var animateToggleBtn = document.getElementById("animateToggleBtn");
  var animationEnabled =
    localStorage.getItem("codeplayground-animation") === "true";

  function updateAnimationUI() {
    if (App.state.glassMode) {
      animationSection.style.display = "block";
      if (animateToggleBtn)
        animateToggleBtn.classList.toggle("active", animationEnabled);

      if (!App.elements.editorPanel.classList.contains("circle-visible")) {
        // Два кадра для гарантированного применения начального состояния
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            App.elements.editorPanel.classList.add("circle-visible");
            // Пульсацию включаем после завершения анимации появления (2.5s)
            clearTimeout(App._circleAppearTimer);
            App._circleAppearTimer = setTimeout(function () {
              if (animationEnabled)
                document.body.classList.add("animate-circle");
            }, 2500);
          });
        });
      } else {
        document.body.classList.toggle("animate-circle", animationEnabled);
      }
    } else {
      animationSection.style.display = "none";
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
    App.updateColorDecorators();
    App.updatePreview();
    App.syncScroll();
  };

  App.init();
})();
