class DataSaver {
  constructor(options) {
    this.waitBeforeSave;
    this.savingFlag = false;
    this.toBeSaved = {};
    this.postponed = {};
    this.statusEl = options.statusElement;
    this.restAPI = options.rest;
    this.method = options.method || "PUT";
    this.onSave = options.onSave || undefined;
    this.ignore = false;
  }

  _updateStatus(status) {
    let icon, animation, textStatus, text;
    switch (status) {
      case "saved":
        icon = "icon-check-outline";
        animation = "";
        textStatus = "text-success";
        text = "All saved";
        break;
      case "queued":
        icon = "icon-more";
        animation = "animated infinite rubberBand";
        textStatus = "text-warning";
        text = "Changes are queued";
        break;
      case "saving":
        icon = "icon-animation";
        animation = "spin";
        textStatus = "text-warning";
        text = "Saving...";
        break;
      case "error":
        icon = "icon-error-outline";
        animation = "";
        textStatus = "text-danger";
        text = "Failed to save";
        break;
    }
    this.statusEl
      .removeClass("text-success text-warning text-danger")
      .addClass(textStatus)
      .children(".icon")
      .removeClass((i, className) => {
        return (className.match(/(^|\s)icon-\S+/g) || []).join(" ");
      })
      .addClass(icon)
      .removeClass("animated infinite rubberBand spin")
      .addClass(animation)
      .prev("div")
      .html(text);

    if (this.onSave && typeof this.onSave === "function") {
      this.onSave();
    }
  }

  _postponeSave(name, value, section) {
    if (!this.postponed[section]) {
      this.postponed[section] = {};
    }
    this.postponed[section][name] = value;
  }

  _saveData() {
    if (this.savingFlag) {
      this.waitBeforeSave = setTimeout(this._saveData.bind(this), 1000);
    }
    this._updateStatus("saving");
    this.waitBeforeSave = undefined;
    this.savingFlag = true;
    let n = toast("info", "", "Saving...");

    $.ajax({
      url: this.restAPI,
      method: this.method,
      async: true,
      data: JSON.stringify({ data: this.toBeSaved }),
      dataType: "json",
      contentType: "application/json",
      headers: { Accept: "application/json" },
    })
      .done((data) => {
        if (data.messages) {
          for (var m in data.messages) {
            toast(
              data.messages[m].type || "info",
              "Info",
              data.messages[m].message || data.messages[m]
            );
          }
        }
        if (data.error) {
          toast.call(n, "error", "Error", data.error);
          this._updateStatus("error");
        } else {
          if (!$.isEmptyObject(this.postponed)) {
            this.toBeSaved = clone(this.postponed);
            this.postponed = {};
            this.waitBeforeSave = setTimeout(this._saveData.bind(this), 1000);
          } else {
            this.toBeSaved = {};
          }
          this._updateStatus("saved");
          toast.call(n, "success", "", "Saved.");
        }
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        toast_error.call(n, jqXHR, textStatus, errorThrown);
        this._updateStatus("error");
      })
      .always(() => {
        this.savingFlag = false;
      });
  }

  saveValue(name, value, section) {
    if (this.ignore) {
      return;
    }
    if (this.savingFlag) {
      this._postponeSave(name, value, section);
      return;
    }
    if (!this.toBeSaved[section]) {
      this.toBeSaved[section] = {};
    }
    this.toBeSaved[section][name] = value;
    this._updateStatus("queued");
    if (this.waitBeforeSave) {
      clearTimeout(this.waitBeforeSave);
    }
    this.waitBeforeSave = setTimeout(this._saveData.bind(this), 2000);
  }

  isWaiting() {
    return this.waitBeforeSave ? true : false;
  }
}
