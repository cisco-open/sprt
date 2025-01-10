(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('prop-types'), require('formik'), require('react-dom'), require('react-modal')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react', 'prop-types', 'formik', 'react-dom', 'react-modal'], factory) :
  (global = global || self, factory(global.ReactCUI = {}, global.React, global.PropTypes, global.formik, global.ReactDOM, global.ReactModal));
}(this, (function (exports, React, PropTypes, formik, ReactDOM, ReactModal) { 'use strict';

  var React__default = 'default' in React ? React['default'] : React;
  PropTypes = PropTypes && PropTypes.hasOwnProperty('default') ? PropTypes['default'] : PropTypes;
  var ReactDOM__default = 'default' in ReactDOM ? ReactDOM['default'] : ReactDOM;
  ReactModal = ReactModal && ReactModal.hasOwnProperty('default') ? ReactModal['default'] : ReactModal;

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};

    var target = _objectWithoutPropertiesLoose(source, excluded);

    var key, i;

    if (Object.getOwnPropertySymbols) {
      var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

      for (i = 0; i < sourceSymbolKeys.length; i++) {
        key = sourceSymbolKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
        target[key] = source[key];
      }
    }

    return target;
  }

  const classes = (type, icon) => {
    switch (type) {
      case "warning":
        return ["alert--warning", icon || "icon-warning-outline"];

      case "warning-alt":
        return ["alert--warning-alt", icon || "icon-warning-outline"];

      case "danger":
      case "error":
        return ["alert--warning-alt", icon || "icon-error-outline"];

      case "success":
        return ["alert--success", icon || "icon-check-outline"];

      case "dark":
        return ["alert--dark", icon || "icon-help-outline"];

      case "light":
        return ["alert--light", icon || "icon-help-outline"];

      default:
        return ["alert--info", icon || "icon-info-outline"];
    }
  };

  const Alert = ({
    type,
    children,
    title,
    dismissable,
    className,
    onDismiss,
    withIcon,
    icon
  }) => {
    const [dismissed, setDismissed] = React__default.useState(false);

    const handleDismiss = e => {
      setDismissed(true);
      if (onDismiss) onDismiss(e);
    };

    if (dismissed) return null;
    const [alertClass, iconClass] = classes(type, icon);
    return React__default.createElement("div", {
      className: `alert ${alertClass} ${className || ""}`
    }, withIcon ? React__default.createElement("div", {
      className: `alert__icon ${iconClass}`
    }) : null, React__default.createElement("div", {
      className: "alert__message"
    }, title && React__default.createElement("h4", null, title), children), dismissable && React__default.createElement("a", {
      className: "alert__close icon-close",
      onClick: handleDismiss
    }));
  };
  Alert.propTypes = {
    type: PropTypes.oneOf(["warning", "warning-alt", "danger", "error", "success", "dark", "light", "info"]),
    dismissable: PropTypes.bool,
    title: PropTypes.string,
    onDismiss: PropTypes.func,
    withIcon: PropTypes.bool,
    icon: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string
  };
  Alert.defaultProps = {
    className: null,
    dismissable: false,
    icon: null,
    onDismiss: null,
    title: "",
    type: "info",
    withIcon: true
  };

  Alert.Warning = (_ref) => {
    let props = _objectWithoutProperties(_ref, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "warning"
    }, props));
  };

  Alert.Danger = (_ref2) => {
    let props = _objectWithoutProperties(_ref2, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "danger"
    }, props));
  };

  Alert.Error = (_ref3) => {
    let props = _objectWithoutProperties(_ref3, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "error"
    }, props));
  };

  Alert.Success = (_ref4) => {
    let props = _objectWithoutProperties(_ref4, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "success"
    }, props));
  };

  Alert.Info = (_ref5) => {
    let props = _objectWithoutProperties(_ref5, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "info"
    }, props));
  };

  Alert.Dark = (_ref6) => {
    let props = _objectWithoutProperties(_ref6, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "dark"
    }, props));
  };

  Alert.Light = (_ref7) => {
    let props = _objectWithoutProperties(_ref7, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "light"
    }, props));
  };

  Alert.WarningAlt = (_ref8) => {
    let props = _objectWithoutProperties(_ref8, ["type"]);

    return React__default.createElement(Alert, _extends({
      type: "warning-alt"
    }, props));
  };

  const ConditionalWrapper = ({
    condition,
    wrapper,
    children
  }) => condition ? React__default.cloneElement(wrapper, null, children) : children;
  ConditionalWrapper.propTypes = {
    condition: PropTypes.bool.isRequired,
    wrapper: PropTypes.element.isRequired,
    children: PropTypes.node.isRequired
  };
  const DisplayIf = ({
    condition,
    children
  }) => condition ? children : null;
  DisplayIf.propTypes = {
    condition: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired
  };

  const eventManager = {
    list: new Map(),
    emitQueue: new Map(),

    on(event, callback) {
      if (!this.list.has(event)) this.list.set(event, []);
      this.list.get(event).push(callback);
      return this;
    },

    off(event) {
      this.list.delete(event);
      return this;
    },

    cancelEmit(event) {
      const timers = this.emitQueue.get(event);

      if (timers) {
        timers.forEach(timer => clearTimeout(timer));
        this.emitQueue.delete(event);
      }

      return this;
    },

    /**
     * Enqueue the event at the end of the call stack
     * Doing so let the user call toast as follow:
     * toast('1')
     * toast('2')
     * toast('3')
     * Without setTimemout the code above will not work
     */
    emit(event, ...args) {
      if (this.list.has(event)) {
        this.list.get(event).forEach(callback => {
          const timer = setTimeout(() => {
            callback(...args);
          }, 0);
          if (!this.emitQueue.has(event)) this.emitQueue.set(event, []);
          this.emitQueue.get(event).push(timer);
        });
      }
    }

  };
  const EVENTS = {
    SHOW_MODAL: "showModal"
  };

  const appendClass = (c, what) => {
    if (c) {
      if (typeof what === "function") return ` ${what()}`;
      return ` ${what || c}`;
    }

    return "";
  };

  const DropdownHeader = ({
    type,
    handleClick,
    className,
    header
  }) => {
    switch (type) {
      case "icon":
        return React__default.createElement("span", {
          onClick: handleClick,
          className: className
        });

      case "link":
        return React__default.createElement("a", {
          onClick: handleClick,
          className: className
        }, header);

      case "div":
        return React__default.createElement("div", {
          onClick: handleClick,
          className: className
        }, header);

      case "button":
        return React__default.createElement("button", {
          type: "button",
          onClick: handleClick,
          className: `btn ${className}`
        }, header);

      default:
        return React__default.cloneElement(header, {
          onClick: handleClick
        });
    }
  };

  class Dropdown extends React__default.Component {
    constructor(props) {
      super(props);

      _defineProperty(this, "handleClick", e => {
        const {
          stopPropagation,
          onOpen,
          onClose
        } = this.props;

        if (stopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }

        const {
          isOpen
        } = this.state;

        if (!isOpen) {
          // attach/remove event handler
          document.addEventListener("click", this.handleOutsideClick, false);
        } else {
          document.removeEventListener("click", this.handleOutsideClick, false);
        }

        this.setState(prevState => {
          const newIsOpen = !prevState.isOpen;
          if (newIsOpen && onOpen) onOpen(e);
          if (!newIsOpen && onClose) onClose(e);
          return {
            isOpen: newIsOpen
          };
        });
      });

      _defineProperty(this, "handleOutsideClick", e => {
        // ignore clicks on the component itself
        const {
          alwaysClose
        } = this.props;
        if (!alwaysClose && this.node.contains(e.target)) return;
        this.handleClick(e);
      });

      this.state = {
        isOpen: false
      };
    }

    render() {
      const {
        openTo,
        children,
        type,
        className,
        header,
        divClassName,
        up
      } = this.props;
      const {
        isOpen
      } = this.state;
      return React__default.createElement("div", {
        className: `dropdown${appendClass(["left", "center"].includes(openTo), `dropdown--${openTo}`)}${appendClass(up, "dropdown--up")}${appendClass(isOpen, "active")}${appendClass(divClassName)}`,
        ref: node => {
          this.node = node;
        }
      }, React__default.createElement(DropdownHeader, {
        type: type,
        handleClick: this.handleClick,
        className: className,
        header: header
      }), React__default.createElement("div", {
        className: "dropdown__menu"
      }, children));
    }

  }
  Dropdown.propTypes = {
    type: PropTypes.oneOf(["icon", "link", "div", "button", "custom"]),
    className: PropTypes.string,
    header: PropTypes.node,
    openTo: PropTypes.oneOf([false, "left", "right", "center"]),
    alwaysClose: PropTypes.bool,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    stopPropagation: PropTypes.bool,
    divClassName: PropTypes.string,
    children: PropTypes.node.isRequired,
    up: PropTypes.bool
  };
  Dropdown.defaultProps = {
    type: "button",
    openTo: false,
    className: null,
    header: null,
    alwaysClose: false,
    onOpen: null,
    onClose: null,
    stopPropagation: false,
    divClassName: null,
    up: false
  };

  Dropdown.Element = (_ref) => {
    let {
      selected,
      icon,
      children,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["selected", "icon", "children", "className"]);

    return React__default.createElement("a", _extends({
      className: `${selected ? "selected" : ""}${className ? ` ${className}` : ""}`
    }, props), icon ? React__default.createElement("span", {
      className: `icon-${icon}`
    }) : null, React__default.createElement(ConditionalWrapper, {
      condition: Boolean(icon),
      wrapper: React__default.createElement("span", {
        className: "qtr-margin-left"
      })
    }, children));
  };

  Dropdown.Element.propTypes = {
    selected: PropTypes.bool,
    children: PropTypes.node.isRequired,
    icon: PropTypes.string,
    className: PropTypes.string
  };
  Dropdown.Element.defaultProps = {
    selected: false,
    icon: null,
    className: null
  };

  Dropdown.Divider = () => React__default.createElement("div", {
    className: "divider"
  });

  Dropdown.Group = ({
    children
  }) => React__default.createElement("div", {
    className: "dropdown__group"
  }, children);

  Dropdown.Group.propTypes = {
    children: PropTypes.node.isRequired
  };

  Dropdown.GroupHeader = ({
    header
  }) => React__default.createElement("div", {
    className: "dropdown__group-header"
  }, header);

  Dropdown.GroupHeader.propTypes = {
    header: PropTypes.node.isRequired
  };

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  function __awaiter(thisArg, _arguments, P, generator) {
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
  }

  function __generator(thisArg, body) {
      var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
      function verb(n) { return function (v) { return step([n, v]); }; }
      function step(op) {
          if (f) throw new TypeError("Generator is already executing.");
          while (_) try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
              if (y = 0, t) op = [op[0] & 2, t.value];
              switch (op[0]) {
                  case 0: case 1: t = op; break;
                  case 4: _.label++; return { value: op[1], done: false };
                  case 5: _.label++; y = op[1]; op = [0]; continue;
                  case 7: op = _.ops.pop(); _.trys.pop(); continue;
                  default:
                      if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                      if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                      if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                      if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                      if (t[2]) _.ops.pop();
                      _.trys.pop(); continue;
              }
              op = body.call(thisArg, _);
          } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
          if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
      }
  }

  function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      }
      catch (error) { e = { error: error }; }
      finally {
          try {
              if (r && !r.done && (m = i["return"])) m.call(i);
          }
          finally { if (e) throw e.error; }
      }
      return ar;
  }

  function __spread() {
      for (var ar = [], i = 0; i < arguments.length; i++)
          ar = ar.concat(__read(arguments[i]));
      return ar;
  }

  var COMMON_MIME_TYPES = new Map([
      ['avi', 'video/avi'],
      ['gif', 'image/gif'],
      ['ico', 'image/x-icon'],
      ['jpeg', 'image/jpeg'],
      ['jpg', 'image/jpeg'],
      ['mkv', 'video/x-matroska'],
      ['mov', 'video/quicktime'],
      ['mp4', 'video/mp4'],
      ['pdf', 'application/pdf'],
      ['png', 'image/png'],
      ['zip', 'application/zip'],
      ['doc', 'application/msword'],
      ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ]);
  function toFileWithPath(file, path) {
      var f = withMimeType(file);
      if (typeof f.path !== 'string') { // on electron, path is already set to the absolute path
          var webkitRelativePath = file.webkitRelativePath;
          Object.defineProperty(f, 'path', {
              value: typeof path === 'string'
                  ? path
                  // If <input webkitdirectory> is set,
                  // the File will have a {webkitRelativePath} property
                  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory
                  : typeof webkitRelativePath === 'string' && webkitRelativePath.length > 0
                      ? webkitRelativePath
                      : file.name,
              writable: false,
              configurable: false,
              enumerable: true
          });
      }
      return f;
  }
  function withMimeType(file) {
      var name = file.name;
      var hasExtension = name && name.lastIndexOf('.') !== -1;
      if (hasExtension && !file.type) {
          var ext = name.split('.')
              .pop().toLowerCase();
          var type = COMMON_MIME_TYPES.get(ext);
          if (type) {
              Object.defineProperty(file, 'type', {
                  value: type,
                  writable: false,
                  configurable: false,
                  enumerable: true
              });
          }
      }
      return file;
  }

  var FILES_TO_IGNORE = [
      // Thumbnail cache files for macOS and Windows
      '.DS_Store',
      'Thumbs.db' // Windows
  ];
  /**
   * Convert a DragEvent's DataTrasfer object to a list of File objects
   * NOTE: If some of the items are folders,
   * everything will be flattened and placed in the same list but the paths will be kept as a {path} property.
   * @param evt
   */
  function fromEvent(evt) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              return [2 /*return*/, isDragEvt(evt) && evt.dataTransfer
                      ? getDataTransferFiles(evt.dataTransfer, evt.type)
                      : getInputFiles(evt)];
          });
      });
  }
  function isDragEvt(value) {
      return !!value.dataTransfer;
  }
  function getInputFiles(evt) {
      var files = isInput(evt.target)
          ? evt.target.files
              ? fromList(evt.target.files)
              : []
          : [];
      return files.map(function (file) { return toFileWithPath(file); });
  }
  function isInput(value) {
      return value !== null;
  }
  function getDataTransferFiles(dt, type) {
      return __awaiter(this, void 0, void 0, function () {
          var items, files;
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0:
                      if (!dt.items) return [3 /*break*/, 2];
                      items = fromList(dt.items)
                          .filter(function (item) { return item.kind === 'file'; });
                      // According to https://html.spec.whatwg.org/multipage/dnd.html#dndevents,
                      // only 'dragstart' and 'drop' has access to the data (source node)
                      if (type !== 'drop') {
                          return [2 /*return*/, items];
                      }
                      return [4 /*yield*/, Promise.all(items.map(toFilePromises))];
                  case 1:
                      files = _a.sent();
                      return [2 /*return*/, noIgnoredFiles(flatten(files))];
                  case 2: return [2 /*return*/, noIgnoredFiles(fromList(dt.files)
                          .map(function (file) { return toFileWithPath(file); }))];
              }
          });
      });
  }
  function noIgnoredFiles(files) {
      return files.filter(function (file) { return FILES_TO_IGNORE.indexOf(file.name) === -1; });
  }
  // IE11 does not support Array.from()
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Browser_compatibility
  // https://developer.mozilla.org/en-US/docs/Web/API/FileList
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItemList
  function fromList(items) {
      var files = [];
      // tslint:disable: prefer-for-of
      for (var i = 0; i < items.length; i++) {
          var file = items[i];
          files.push(file);
      }
      return files;
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem
  function toFilePromises(item) {
      if (typeof item.webkitGetAsEntry !== 'function') {
          return fromDataTransferItem(item);
      }
      var entry = item.webkitGetAsEntry();
      // Safari supports dropping an image node from a different window and can be retrieved using
      // the DataTransferItem.getAsFile() API
      // NOTE: FileSystemEntry.file() throws if trying to get the file
      if (entry && entry.isDirectory) {
          return fromDirEntry(entry);
      }
      return fromDataTransferItem(item);
  }
  function flatten(items) {
      return items.reduce(function (acc, files) { return __spread(acc, (Array.isArray(files) ? flatten(files) : [files])); }, []);
  }
  function fromDataTransferItem(item) {
      var file = item.getAsFile();
      if (!file) {
          return Promise.reject(item + " is not a File");
      }
      var fwp = toFileWithPath(file);
      return Promise.resolve(fwp);
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemEntry
  function fromEntry(entry) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              return [2 /*return*/, entry.isDirectory ? fromDirEntry(entry) : fromFileEntry(entry)];
          });
      });
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry
  function fromDirEntry(entry) {
      var reader = entry.createReader();
      return new Promise(function (resolve, reject) {
          var entries = [];
          function readEntries() {
              var _this = this;
              // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry/createReader
              // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryReader/readEntries
              reader.readEntries(function (batch) { return __awaiter(_this, void 0, void 0, function () {
                  var files, err_1, items;
                  return __generator(this, function (_a) {
                      switch (_a.label) {
                          case 0:
                              if (!!batch.length) return [3 /*break*/, 5];
                              _a.label = 1;
                          case 1:
                              _a.trys.push([1, 3, , 4]);
                              return [4 /*yield*/, Promise.all(entries)];
                          case 2:
                              files = _a.sent();
                              resolve(files);
                              return [3 /*break*/, 4];
                          case 3:
                              err_1 = _a.sent();
                              reject(err_1);
                              return [3 /*break*/, 4];
                          case 4: return [3 /*break*/, 6];
                          case 5:
                              items = Promise.all(batch.map(fromEntry));
                              entries.push(items);
                              // Continue reading
                              readEntries();
                              _a.label = 6;
                          case 6: return [2 /*return*/];
                      }
                  });
              }); }, function (err) {
                  reject(err);
              });
          }
          readEntries();
      });
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileEntry
  function fromFileEntry(entry) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              return [2 /*return*/, new Promise(function (resolve, reject) {
                      entry.file(function (file) {
                          var fwp = toFileWithPath(file, entry.fullPath);
                          resolve(fwp);
                      }, function (err) {
                          reject(err);
                      });
                  })];
          });
      });
  }

  function unwrapExports (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var dist = createCommonjsModule(function (module) {
  module.exports=function(e){function r(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}var t={};return r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:n});},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},r.p="",r(r.s=0)}([function(e,r,t){r.__esModule=!0,r.default=function(e,r){if(e&&r){var t=Array.isArray(r)?r:r.split(","),n=e.name||"",o=e.type||"",u=o.replace(/\/.*$/,"");return t.some(function(e){var r=e.trim();return "."===r.charAt(0)?n.toLowerCase().endsWith(r.toLowerCase()):r.endsWith("/*")?u===r.replace(/\/.*$/,""):o===r})}return !0};}]);
  });

  var accepts = unwrapExports(dist);

  // that MIME type will always be accepted

  function fileAccepted(file, accept) {
    return file.type === 'application/x-moz-file' || accepts(file, accept);
  }
  function fileMatchSize(file, minSize, maxSize) {
    if (isDefined(file.size)) {
      if (isDefined(minSize) && isDefined(maxSize)) return file.size >= minSize && file.size <= maxSize;else if (isDefined(minSize)) return file.size >= minSize;else if (isDefined(maxSize)) return file.size <= maxSize;
    }

    return true;
  }

  function isDefined(value) {
    return value !== undefined && value !== null;
  }

  function allFilesAccepted(files, accept, minSize, maxSize) {
    return files.every(function (file) {
      return fileAccepted(file, accept) && fileMatchSize(file, minSize, maxSize);
    });
  } // React's synthetic events has event.isPropagationStopped,
  // but to remain compatibility with other libs (Preact) fall back
  // to check event.cancelBubble

  function isPropagationStopped(event) {
    if (typeof event.isPropagationStopped === 'function') {
      return event.isPropagationStopped();
    } else if (typeof event.cancelBubble !== 'undefined') {
      return event.cancelBubble;
    }

    return false;
  }
  function isEvtWithFiles(event) {
    if (!event.dataTransfer) {
      return !!event.target && !!event.target.files;
    } // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
    // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types#file


    return Array.prototype.some.call(event.dataTransfer.types, function (type) {
      return type === 'Files' || type === 'application/x-moz-file';
    });
  }

  function onDocumentDragOver(event) {
    event.preventDefault();
  }

  function isIe(userAgent) {
    return userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident/') !== -1;
  }

  function isEdge(userAgent) {
    return userAgent.indexOf('Edge/') !== -1;
  }

  function isIeOrEdge() {
    var userAgent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.navigator.userAgent;
    return isIe(userAgent) || isEdge(userAgent);
  }
  /**
   * This is intended to be used to compose event handlers
   * They are executed in order until one of them calls `event.isPropagationStopped()`.
   * Note that the check is done on the first invoke too,
   * meaning that if propagation was stopped before invoking the fns,
   * no handlers will be executed.
   *
   * @param {Function} fns the event hanlder functions
   * @return {Function} the event handler to add to an element
   */

  function composeEventHandlers() {
    for (var _len = arguments.length, fns = new Array(_len), _key = 0; _key < _len; _key++) {
      fns[_key] = arguments[_key];
    }

    return function (event) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      return fns.some(function (fn) {
        if (!isPropagationStopped(event) && fn) {
          fn.apply(void 0, [event].concat(args));
        }

        return isPropagationStopped(event);
      });
    };
  }

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

  function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

  function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

  function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys$1(source, true).forEach(function (key) { _defineProperty$1(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys$1(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

  function _defineProperty$1(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _objectWithoutProperties$1(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose$1(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

  function _objectWithoutPropertiesLoose$1(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
  /**
   * Convenience wrapper component for the `useDropzone` hook
   *
   * ```jsx
   * <Dropzone>
   *   {({getRootProps, getInputProps}) => (
   *     <div {...getRootProps()}>
   *       <input {...getInputProps()} />
   *       <p>Drag 'n' drop some files here, or click to select files</p>
   *     </div>
   *   )}
   * </Dropzone>
   * ```
   */

  var Dropzone = React.forwardRef(function (_ref, ref) {
    var children = _ref.children,
        params = _objectWithoutProperties$1(_ref, ["children"]);

    var _useDropzone = useDropzone(params),
        open = _useDropzone.open,
        props = _objectWithoutProperties$1(_useDropzone, ["open"]);

    React.useImperativeHandle(ref, function () {
      return {
        open: open
      };
    }, [open]); // TODO: Figure out why react-styleguidist cannot create docs if we don't return a jsx element

    return React__default.createElement(React.Fragment, null, children(_objectSpread({}, props, {
      open: open
    })));
  });
  Dropzone.displayName = 'Dropzone';
  Dropzone.propTypes = {
    /**
     * Render function that exposes the dropzone state and prop getter fns
     *
     * @param {object} params
     * @param {Function} params.getRootProps Returns the props you should apply to the root drop container you render
     * @param {Function} params.getInputProps Returns the props you should apply to hidden file input you render
     * @param {Function} params.open Open the native file selection dialog
     * @param {boolean} params.isFocused Dropzone area is in focus
     * @param {boolean} params.isFileDialogActive File dialog is opened
     * @param {boolean} params.isDragActive Active drag is in progress
     * @param {boolean} params.isDragAccept Dragged files are accepted
     * @param {boolean} params.isDragReject Some dragged files are rejected
     * @param {File[]} params.draggedFiles Files in active drag
     * @param {File[]} params.acceptedFiles Accepted files
     * @param {File[]} params.rejectedFiles Rejected files
     */
    children: PropTypes.func,

    /**
     * Set accepted file types.
     * See https://github.com/okonet/attr-accept for more information.
     * Keep in mind that mime type determination is not reliable across platforms. CSV files,
     * for example, are reported as text/plain under macOS but as application/vnd.ms-excel under
     * Windows. In some cases there might not be a mime type set at all.
     * See: https://github.com/react-dropzone/react-dropzone/issues/276
     */
    accept: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),

    /**
     * Allow drag 'n' drop (or selection from the file dialog) of multiple files
     */
    multiple: PropTypes.bool,

    /**
     * If false, allow dropped items to take over the current browser window
     */
    preventDropOnDocument: PropTypes.bool,

    /**
     * If true, disables click to open the native file selection dialog
     */
    noClick: PropTypes.bool,

    /**
     * If true, disables SPACE/ENTER to open the native file selection dialog.
     * Note that it also stops tracking the focus state.
     */
    noKeyboard: PropTypes.bool,

    /**
     * If true, disables drag 'n' drop
     */
    noDrag: PropTypes.bool,

    /**
     * If true, stops drag event propagation to parents
     */
    noDragEventsBubbling: PropTypes.bool,

    /**
     * Minimum file size (in bytes)
     */
    minSize: PropTypes.number,

    /**
     * Maximum file size (in bytes)
     */
    maxSize: PropTypes.number,

    /**
     * Enable/disable the dropzone
     */
    disabled: PropTypes.bool,

    /**
     * Use this to provide a custom file aggregator
     *
     * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
     */
    getFilesFromEvent: PropTypes.func,

    /**
     * Cb for when closing the file dialog with no selection
     */
    onFileDialogCancel: PropTypes.func,

    /**
     * Cb for when the `dragenter` event occurs.
     *
     * @param {DragEvent} event
     */
    onDragEnter: PropTypes.func,

    /**
     * Cb for when the `dragleave` event occurs
     *
     * @param {DragEvent} event
     */
    onDragLeave: PropTypes.func,

    /**
     * Cb for when the `dragover` event occurs
     *
     * @param {DragEvent} event
     */
    onDragOver: PropTypes.func,

    /**
     * Cb for when the `drop` event occurs.
     * Note that this callback is invoked after the `getFilesFromEvent` callback is done.
     *
     * Files are accepted or rejected based on the `accept`, `multiple`, `minSize` and `maxSize` props.
     * `accept` must be a valid [MIME type](http://www.iana.org/assignments/media-types/media-types.xhtml) according to [input element specification](https://www.w3.org/wiki/HTML/Elements/input/file) or a valid file extension.
     * If `multiple` is set to false and additional files are droppped,
     * all files besides the first will be rejected.
     * Any file which does not have a size in the [`minSize`, `maxSize`] range, will be rejected as well.
     *
     * Note that the `onDrop` callback will always be invoked regardless if the dropped files were accepted or rejected.
     * If you'd like to react to a specific scenario, use the `onDropAccepted`/`onDropRejected` props.
     *
     * `onDrop` will provide you with an array of [File](https://developer.mozilla.org/en-US/docs/Web/API/File) objects which you can then process and send to a server.
     * For example, with [SuperAgent](https://github.com/visionmedia/superagent) as a http/ajax library:
     *
     * ```js
     * function onDrop(acceptedFiles) {
     *   const req = request.post('/upload')
     *   acceptedFiles.forEach(file => {
     *     req.attach(file.name, file)
     *   })
     *   req.end(callback)
     * }
     * ```
     *
     * @param {File[]} acceptedFiles
     * @param {File[]} rejectedFiles
     * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
     */
    onDrop: PropTypes.func,

    /**
     * Cb for when the `drop` event occurs.
     * Note that if no files are accepted, this callback is not invoked.
     *
     * @param {File[]} files
     * @param {(DragEvent|Event)} event
     */
    onDropAccepted: PropTypes.func,

    /**
     * Cb for when the `drop` event occurs.
     * Note that if no files are rejected, this callback is not invoked.
     *
     * @param {object[]} files
     * @param {(DragEvent|Event)} event
     */
    onDropRejected: PropTypes.func
  };
  /**
   * A function that is invoked for the `dragenter`,
   * `dragover` and `dragleave` events.
   * It is not invoked if the items are not files (such as link, text, etc.).
   *
   * @callback dragCb
   * @param {DragEvent} event
   */

  /**
   * A function that is invoked for the `drop` or input change event.
   * It is not invoked if the items are not files (such as link, text, etc.).
   *
   * @callback dropCb
   * @param {File[]} acceptedFiles List of accepted files
   * @param {File[]} rejectedFiles List of rejected files
   * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
   */

  /**
   * A function that is invoked for the `drop` or input change event.
   * It is not invoked if the items are files (such as link, text, etc.).
   *
   * @callback dropAcceptedCb
   * @param {File[]} files List of accepted files that meet the given criteria
   * (`accept`, `multiple`, `minSize`, `maxSize`)
   * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
   */

  /**
   * A function that is invoked for the `drop` or input change event.
   *
   * @callback dropRejectedCb
   * @param {File[]} files List of rejected files that do not meet the given criteria
   * (`accept`, `multiple`, `minSize`, `maxSize`)
   * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
   */

  /**
   * A function that is used aggregate files,
   * in a asynchronous fashion, from drag or input change events.
   *
   * @callback getFilesFromEvent
   * @param {(DragEvent|Event)} event A drag event or input change event (if files were selected via the file dialog)
   * @returns {(File[]|Promise<File[]>)}
   */

  /**
   * An object with the current dropzone state and some helper functions.
   *
   * @typedef {object} DropzoneState
   * @property {Function} getRootProps Returns the props you should apply to the root drop container you render
   * @property {Function} getInputProps Returns the props you should apply to hidden file input you render
   * @property {Function} open Open the native file selection dialog
   * @property {boolean} isFocused Dropzone area is in focus
   * @property {boolean} isFileDialogActive File dialog is opened
   * @property {boolean} isDragActive Active drag is in progress
   * @property {boolean} isDragAccept Dragged files are accepted
   * @property {boolean} isDragReject Some dragged files are rejected
   * @property {File[]} draggedFiles Files in active drag
   * @property {File[]} acceptedFiles Accepted files
   * @property {File[]} rejectedFiles Rejected files
   */

  var initialState = {
    isFocused: false,
    isFileDialogActive: false,
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
    draggedFiles: [],
    acceptedFiles: [],
    rejectedFiles: []
  };
  /**
   * A React hook that creates a drag 'n' drop area.
   *
   * ```jsx
   * function MyDropzone(props) {
   *   const {getRootProps, getInputProps} = useDropzone({
   *     onDrop: acceptedFiles => {
   *       // do something with the File objects, e.g. upload to some server
   *     }
   *   });
   *   return (
   *     <div {...getRootProps()}>
   *       <input {...getInputProps()} />
   *       <p>Drag and drop some files here, or click to select files</p>
   *     </div>
   *   )
   * }
   * ```
   *
   * @function useDropzone
   *
   * @param {object} props
   * @param {string|string[]} [props.accept] Set accepted file types.
   * See https://github.com/okonet/attr-accept for more information.
   * Keep in mind that mime type determination is not reliable across platforms. CSV files,
   * for example, are reported as text/plain under macOS but as application/vnd.ms-excel under
   * Windows. In some cases there might not be a mime type set at all.
   * See: https://github.com/react-dropzone/react-dropzone/issues/276
   * @param {boolean} [props.multiple=true] Allow drag 'n' drop (or selection from the file dialog) of multiple files
   * @param {boolean} [props.preventDropOnDocument=true] If false, allow dropped items to take over the current browser window
   * @param {boolean} [props.noClick=false] If true, disables click to open the native file selection dialog
   * @param {boolean} [props.noKeyboard=false] If true, disables SPACE/ENTER to open the native file selection dialog.
   * Note that it also stops tracking the focus state.
   * @param {boolean} [props.noDrag=false] If true, disables drag 'n' drop
   * @param {boolean} [props.noDragEventsBubbling=false] If true, stops drag event propagation to parents
   * @param {number} [props.minSize=0] Minimum file size (in bytes)
   * @param {number} [props.maxSize=Infinity] Maximum file size (in bytes)
   * @param {boolean} [props.disabled=false] Enable/disable the dropzone
   * @param {getFilesFromEvent} [props.getFilesFromEvent] Use this to provide a custom file aggregator
   * @param {Function} [props.onFileDialogCancel] Cb for when closing the file dialog with no selection
   * @param {dragCb} [props.onDragEnter] Cb for when the `dragenter` event occurs.
   * @param {dragCb} [props.onDragLeave] Cb for when the `dragleave` event occurs
   * @param {dragCb} [props.onDragOver] Cb for when the `dragover` event occurs
   * @param {dropCb} [props.onDrop] Cb for when the `drop` event occurs.
   * Note that this callback is invoked after the `getFilesFromEvent` callback is done.
   *
   * Files are accepted or rejected based on the `accept`, `multiple`, `minSize` and `maxSize` props.
   * `accept` must be a valid [MIME type](http://www.iana.org/assignments/media-types/media-types.xhtml) according to [input element specification](https://www.w3.org/wiki/HTML/Elements/input/file) or a valid file extension.
   * If `multiple` is set to false and additional files are droppped,
   * all files besides the first will be rejected.
   * Any file which does not have a size in the [`minSize`, `maxSize`] range, will be rejected as well.
   *
   * Note that the `onDrop` callback will always be invoked regardless if the dropped files were accepted or rejected.
   * If you'd like to react to a specific scenario, use the `onDropAccepted`/`onDropRejected` props.
   *
   * `onDrop` will provide you with an array of [File](https://developer.mozilla.org/en-US/docs/Web/API/File) objects which you can then process and send to a server.
   * For example, with [SuperAgent](https://github.com/visionmedia/superagent) as a http/ajax library:
   *
   * ```js
   * function onDrop(acceptedFiles) {
   *   const req = request.post('/upload')
   *   acceptedFiles.forEach(file => {
   *     req.attach(file.name, file)
   *   })
   *   req.end(callback)
   * }
   * ```
   * @param {dropAcceptedCb} [props.onDropAccepted]
   * @param {dropRejectedCb} [props.onDropRejected]
   *
   * @returns {DropzoneState}
   */

  function useDropzone() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        accept = _ref2.accept,
        _ref2$disabled = _ref2.disabled,
        disabled = _ref2$disabled === void 0 ? false : _ref2$disabled,
        _ref2$getFilesFromEve = _ref2.getFilesFromEvent,
        getFilesFromEvent = _ref2$getFilesFromEve === void 0 ? fromEvent : _ref2$getFilesFromEve,
        _ref2$maxSize = _ref2.maxSize,
        maxSize = _ref2$maxSize === void 0 ? Infinity : _ref2$maxSize,
        _ref2$minSize = _ref2.minSize,
        minSize = _ref2$minSize === void 0 ? 0 : _ref2$minSize,
        _ref2$multiple = _ref2.multiple,
        multiple = _ref2$multiple === void 0 ? true : _ref2$multiple,
        onDragEnter = _ref2.onDragEnter,
        onDragLeave = _ref2.onDragLeave,
        onDragOver = _ref2.onDragOver,
        onDrop = _ref2.onDrop,
        onDropAccepted = _ref2.onDropAccepted,
        onDropRejected = _ref2.onDropRejected,
        onFileDialogCancel = _ref2.onFileDialogCancel,
        _ref2$preventDropOnDo = _ref2.preventDropOnDocument,
        preventDropOnDocument = _ref2$preventDropOnDo === void 0 ? true : _ref2$preventDropOnDo,
        _ref2$noClick = _ref2.noClick,
        noClick = _ref2$noClick === void 0 ? false : _ref2$noClick,
        _ref2$noKeyboard = _ref2.noKeyboard,
        noKeyboard = _ref2$noKeyboard === void 0 ? false : _ref2$noKeyboard,
        _ref2$noDrag = _ref2.noDrag,
        noDrag = _ref2$noDrag === void 0 ? false : _ref2$noDrag,
        _ref2$noDragEventsBub = _ref2.noDragEventsBubbling,
        noDragEventsBubbling = _ref2$noDragEventsBub === void 0 ? false : _ref2$noDragEventsBub;

    var rootRef = React.useRef(null);
    var inputRef = React.useRef(null);

    var _useReducer = React.useReducer(reducer, initialState),
        _useReducer2 = _slicedToArray(_useReducer, 2),
        state = _useReducer2[0],
        dispatch = _useReducer2[1];

    var isFocused = state.isFocused,
        isFileDialogActive = state.isFileDialogActive,
        draggedFiles = state.draggedFiles; // Fn for opening the file dialog programmatically

    var openFileDialog = React.useCallback(function () {
      if (inputRef.current) {
        dispatch({
          type: 'openDialog'
        });
        inputRef.current.value = null;
        inputRef.current.click();
      }
    }, [dispatch]); // Update file dialog active state when the window is focused on

    var onWindowFocus = function onWindowFocus() {
      // Execute the timeout only if the file dialog is opened in the browser
      if (isFileDialogActive) {
        setTimeout(function () {
          if (inputRef.current) {
            var files = inputRef.current.files;

            if (!files.length) {
              dispatch({
                type: 'closeDialog'
              });

              if (typeof onFileDialogCancel === 'function') {
                onFileDialogCancel();
              }
            }
          }
        }, 300);
      }
    };

    React.useEffect(function () {
      window.addEventListener('focus', onWindowFocus, false);
      return function () {
        window.removeEventListener('focus', onWindowFocus, false);
      };
    }, [inputRef, isFileDialogActive, onFileDialogCancel]); // Cb to open the file dialog when SPACE/ENTER occurs on the dropzone

    var onKeyDownCb = React.useCallback(function (event) {
      // Ignore keyboard events bubbling up the DOM tree
      if (!rootRef.current || !rootRef.current.isEqualNode(event.target)) {
        return;
      }

      if (event.keyCode === 32 || event.keyCode === 13) {
        event.preventDefault();
        openFileDialog();
      }
    }, [rootRef, inputRef]); // Update focus state for the dropzone

    var onFocusCb = React.useCallback(function () {
      dispatch({
        type: 'focus'
      });
    }, []);
    var onBlurCb = React.useCallback(function () {
      dispatch({
        type: 'blur'
      });
    }, []); // Cb to open the file dialog when click occurs on the dropzone

    var onClickCb = React.useCallback(function () {
      if (noClick) {
        return;
      } // In IE11/Edge the file-browser dialog is blocking, therefore, use setTimeout()
      // to ensure React can handle state changes
      // See: https://github.com/react-dropzone/react-dropzone/issues/450


      if (isIeOrEdge()) {
        setTimeout(openFileDialog, 0);
      } else {
        openFileDialog();
      }
    }, [inputRef, noClick]);
    var dragTargetsRef = React.useRef([]);

    var onDocumentDrop = function onDocumentDrop(event) {
      if (rootRef.current && rootRef.current.contains(event.target)) {
        // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
        return;
      }

      event.preventDefault();
      dragTargetsRef.current = [];
    };

    React.useEffect(function () {
      if (preventDropOnDocument) {
        document.addEventListener('dragover', onDocumentDragOver, false);
        document.addEventListener('drop', onDocumentDrop, false);
      }

      return function () {
        if (preventDropOnDocument) {
          document.removeEventListener('dragover', onDocumentDragOver);
          document.removeEventListener('drop', onDocumentDrop);
        }
      };
    }, [rootRef, preventDropOnDocument]);
    var onDragEnterCb = React.useCallback(function (event) {
      event.preventDefault(); // Persist here because we need the event later after getFilesFromEvent() is done

      event.persist();
      stopPropagation(event); // Count the dropzone and any children that are entered.

      if (dragTargetsRef.current.indexOf(event.target) === -1) {
        dragTargetsRef.current = [].concat(_toConsumableArray(dragTargetsRef.current), [event.target]);
      }

      if (isEvtWithFiles(event)) {
        Promise.resolve(getFilesFromEvent(event)).then(function (draggedFiles) {
          if (isPropagationStopped(event) && !noDragEventsBubbling) {
            return;
          }

          dispatch({
            draggedFiles: draggedFiles,
            isDragActive: true,
            type: 'setDraggedFiles'
          });

          if (onDragEnter) {
            onDragEnter(event);
          }
        });
      }
    }, [getFilesFromEvent, onDragEnter, noDragEventsBubbling]);
    var onDragOverCb = React.useCallback(function (event) {
      event.preventDefault();
      event.persist();
      stopPropagation(event);

      if (event.dataTransfer) {
        try {
          event.dataTransfer.dropEffect = 'copy';
        } catch (_unused) {}
        /* eslint-disable-line no-empty */

      }

      if (isEvtWithFiles(event) && onDragOver) {
        onDragOver(event);
      }

      return false;
    }, [onDragOver, noDragEventsBubbling]);
    var onDragLeaveCb = React.useCallback(function (event) {
      event.preventDefault();
      event.persist();
      stopPropagation(event); // Only deactivate once the dropzone and all children have been left

      var targets = dragTargetsRef.current.filter(function (target) {
        return target !== event.target && rootRef.current && rootRef.current.contains(target);
      });
      dragTargetsRef.current = targets;

      if (targets.length > 0) {
        return;
      }

      dispatch({
        isDragActive: false,
        type: 'setDraggedFiles',
        draggedFiles: []
      });

      if (isEvtWithFiles(event) && onDragLeave) {
        onDragLeave(event);
      }
    }, [rootRef, onDragLeave, noDragEventsBubbling]);
    var onDropCb = React.useCallback(function (event) {
      event.preventDefault(); // Persist here because we need the event later after getFilesFromEvent() is done

      event.persist();
      stopPropagation(event);
      dragTargetsRef.current = [];
      dispatch({
        type: 'reset'
      });

      if (isEvtWithFiles(event)) {
        Promise.resolve(getFilesFromEvent(event)).then(function (files) {
          if (isPropagationStopped(event) && !noDragEventsBubbling) {
            return;
          }

          var acceptedFiles = [];
          var rejectedFiles = [];
          files.forEach(function (file) {
            if (fileAccepted(file, accept) && fileMatchSize(file, minSize, maxSize)) {
              acceptedFiles.push(file);
            } else {
              rejectedFiles.push(file);
            }
          });

          if (!multiple && acceptedFiles.length > 1) {
            rejectedFiles.push.apply(rejectedFiles, _toConsumableArray(acceptedFiles.splice(0))); // Reject everything and empty accepted files
          }

          dispatch({
            acceptedFiles: acceptedFiles,
            rejectedFiles: rejectedFiles,
            type: 'setFiles'
          });

          if (onDrop) {
            onDrop(acceptedFiles, rejectedFiles, event);
          }

          if (rejectedFiles.length > 0 && onDropRejected) {
            onDropRejected(rejectedFiles, event);
          }

          if (acceptedFiles.length > 0 && onDropAccepted) {
            onDropAccepted(acceptedFiles, event);
          }
        });
      }
    }, [multiple, accept, minSize, maxSize, getFilesFromEvent, onDrop, onDropAccepted, onDropRejected, noDragEventsBubbling]);

    var composeHandler = function composeHandler(fn) {
      return disabled ? null : fn;
    };

    var composeKeyboardHandler = function composeKeyboardHandler(fn) {
      return noKeyboard ? null : composeHandler(fn);
    };

    var composeDragHandler = function composeDragHandler(fn) {
      return noDrag ? null : composeHandler(fn);
    };

    var stopPropagation = function stopPropagation(event) {
      if (noDragEventsBubbling) {
        event.stopPropagation();
      }
    };

    var getRootProps = React.useMemo(function () {
      return function () {
        var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref3$refKey = _ref3.refKey,
            refKey = _ref3$refKey === void 0 ? 'ref' : _ref3$refKey,
            onKeyDown = _ref3.onKeyDown,
            onFocus = _ref3.onFocus,
            onBlur = _ref3.onBlur,
            onClick = _ref3.onClick,
            onDragEnter = _ref3.onDragEnter,
            onDragOver = _ref3.onDragOver,
            onDragLeave = _ref3.onDragLeave,
            onDrop = _ref3.onDrop,
            rest = _objectWithoutProperties$1(_ref3, ["refKey", "onKeyDown", "onFocus", "onBlur", "onClick", "onDragEnter", "onDragOver", "onDragLeave", "onDrop"]);

        return _objectSpread(_defineProperty$1({
          onKeyDown: composeKeyboardHandler(composeEventHandlers(onKeyDown, onKeyDownCb)),
          onFocus: composeKeyboardHandler(composeEventHandlers(onFocus, onFocusCb)),
          onBlur: composeKeyboardHandler(composeEventHandlers(onBlur, onBlurCb)),
          onClick: composeHandler(composeEventHandlers(onClick, onClickCb)),
          onDragEnter: composeDragHandler(composeEventHandlers(onDragEnter, onDragEnterCb)),
          onDragOver: composeDragHandler(composeEventHandlers(onDragOver, onDragOverCb)),
          onDragLeave: composeDragHandler(composeEventHandlers(onDragLeave, onDragLeaveCb)),
          onDrop: composeDragHandler(composeEventHandlers(onDrop, onDropCb))
        }, refKey, rootRef), !disabled && !noKeyboard ? {
          tabIndex: 0
        } : {}, {}, rest);
      };
    }, [rootRef, onKeyDownCb, onFocusCb, onBlurCb, onClickCb, onDragEnterCb, onDragOverCb, onDragLeaveCb, onDropCb, noKeyboard, noDrag, disabled]);
    var onInputElementClick = React.useCallback(function (event) {
      event.stopPropagation();
    }, []);
    var getInputProps = React.useMemo(function () {
      return function () {
        var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref4$refKey = _ref4.refKey,
            refKey = _ref4$refKey === void 0 ? 'ref' : _ref4$refKey,
            onChange = _ref4.onChange,
            onClick = _ref4.onClick,
            rest = _objectWithoutProperties$1(_ref4, ["refKey", "onChange", "onClick"]);

        var inputProps = _defineProperty$1({
          accept: accept,
          multiple: multiple,
          type: 'file',
          style: {
            display: 'none'
          },
          onChange: composeHandler(composeEventHandlers(onChange, onDropCb)),
          onClick: composeHandler(composeEventHandlers(onClick, onInputElementClick)),
          autoComplete: 'off',
          tabIndex: -1
        }, refKey, inputRef);

        return _objectSpread({}, inputProps, {}, rest);
      };
    }, [inputRef, accept, multiple, onDropCb, disabled]);
    var fileCount = draggedFiles.length;
    var isMultipleAllowed = multiple || fileCount <= 1;
    var isDragAccept = fileCount > 0 && allFilesAccepted(draggedFiles, accept, minSize, maxSize);
    var isDragReject = fileCount > 0 && (!isDragAccept || !isMultipleAllowed);
    return _objectSpread({}, state, {
      isDragAccept: isDragAccept,
      isDragReject: isDragReject,
      isFocused: isFocused && !disabled,
      getRootProps: getRootProps,
      getInputProps: getInputProps,
      rootRef: rootRef,
      inputRef: inputRef,
      open: composeHandler(openFileDialog)
    });
  }

  function reducer(state, action) {
    /* istanbul ignore next */
    switch (action.type) {
      case 'focus':
        return _objectSpread({}, state, {
          isFocused: true
        });

      case 'blur':
        return _objectSpread({}, state, {
          isFocused: false
        });

      case 'openDialog':
        return _objectSpread({}, state, {
          isFileDialogActive: true
        });

      case 'closeDialog':
        return _objectSpread({}, state, {
          isFileDialogActive: false
        });

      case 'setDraggedFiles':
        /* eslint no-case-declarations: 0 */
        var isDragActive = action.isDragActive,
            draggedFiles = action.draggedFiles;
        return _objectSpread({}, state, {
          draggedFiles: draggedFiles,
          isDragActive: isDragActive
        });

      case 'setFiles':
        return _objectSpread({}, state, {
          acceptedFiles: action.acceptedFiles,
          rejectedFiles: action.rejectedFiles
        });

      case 'reset':
        return _objectSpread({}, state, {
          isFileDialogActive: false,
          isDragActive: false,
          draggedFiles: []
        });

      default:
        return state;
    }
  }

  /*!
   * bytes
   * Copyright(c) 2012-2014 TJ Holowaychuk
   * Copyright(c) 2015 Jed Watson
   * MIT Licensed
   */

  /**
   * Module exports.
   * @public
   */

  var bytes_1 = bytes;
  var format_1 = format;
  var parse_1 = parse;

  /**
   * Module variables.
   * @private
   */

  var formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;

  var formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;

  var map = {
    b:  1,
    kb: 1 << 10,
    mb: 1 << 20,
    gb: 1 << 30,
    tb: Math.pow(1024, 4),
    pb: Math.pow(1024, 5),
  };

  var parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;

  /**
   * Convert the given value in bytes into a string or parse to string to an integer in bytes.
   *
   * @param {string|number} value
   * @param {{
   *  case: [string],
   *  decimalPlaces: [number]
   *  fixedDecimals: [boolean]
   *  thousandsSeparator: [string]
   *  unitSeparator: [string]
   *  }} [options] bytes options.
   *
   * @returns {string|number|null}
   */

  function bytes(value, options) {
    if (typeof value === 'string') {
      return parse(value);
    }

    if (typeof value === 'number') {
      return format(value, options);
    }

    return null;
  }

  /**
   * Format the given value in bytes into a string.
   *
   * If the value is negative, it is kept as such. If it is a float,
   * it is rounded.
   *
   * @param {number} value
   * @param {object} [options]
   * @param {number} [options.decimalPlaces=2]
   * @param {number} [options.fixedDecimals=false]
   * @param {string} [options.thousandsSeparator=]
   * @param {string} [options.unit=]
   * @param {string} [options.unitSeparator=]
   *
   * @returns {string|null}
   * @public
   */

  function format(value, options) {
    if (!Number.isFinite(value)) {
      return null;
    }

    var mag = Math.abs(value);
    var thousandsSeparator = (options && options.thousandsSeparator) || '';
    var unitSeparator = (options && options.unitSeparator) || '';
    var decimalPlaces = (options && options.decimalPlaces !== undefined) ? options.decimalPlaces : 2;
    var fixedDecimals = Boolean(options && options.fixedDecimals);
    var unit = (options && options.unit) || '';

    if (!unit || !map[unit.toLowerCase()]) {
      if (mag >= map.pb) {
        unit = 'PB';
      } else if (mag >= map.tb) {
        unit = 'TB';
      } else if (mag >= map.gb) {
        unit = 'GB';
      } else if (mag >= map.mb) {
        unit = 'MB';
      } else if (mag >= map.kb) {
        unit = 'KB';
      } else {
        unit = 'B';
      }
    }

    var val = value / map[unit.toLowerCase()];
    var str = val.toFixed(decimalPlaces);

    if (!fixedDecimals) {
      str = str.replace(formatDecimalsRegExp, '$1');
    }

    if (thousandsSeparator) {
      str = str.replace(formatThousandsRegExp, thousandsSeparator);
    }

    return str + unitSeparator + unit;
  }

  /**
   * Parse the string value into an integer in bytes.
   *
   * If no unit is given, it is assumed the value is in bytes.
   *
   * @param {number|string} val
   *
   * @returns {number|null}
   * @public
   */

  function parse(val) {
    if (typeof val === 'number' && !isNaN(val)) {
      return val;
    }

    if (typeof val !== 'string') {
      return null;
    }

    // Test if the string passed is valid
    var results = parseRegExp.exec(val);
    var floatValue;
    var unit = 'b';

    if (!results) {
      // Nothing could be extracted from the given string
      floatValue = parseInt(val, 10);
      unit = 'b';
    } else {
      // Retrieve the value and the unit
      floatValue = parseFloat(results[1]);
      unit = results[4].toLowerCase();
    }

    return Math.floor(map[unit] * floatValue);
  }
  bytes_1.format = format_1;
  bytes_1.parse = parse_1;

  const FileCard = ({
    file,
    i,
    removeFile,
    inline
  }) => React__default.createElement("div", {
    className: "file-drop__card col-lg-4 col-md-6 col-sm-6",
    key: `${i}-${file.name}`
  }, React__default.createElement("div", {
    className: "panel panel--bordered hover-emboss--small",
    onClick: e => e.stopPropagation()
  }, inline ? React__default.createElement("div", {
    className: "panel__body flex flex-row"
  }, React__default.createElement("div", {
    className: "text-left flex-fill",
    style: {
      maxWidth: "calc(100% - 20px)"
    }
  }, React__default.createElement("div", {
    className: "text-ellipsis"
  }, file.name), React__default.createElement("small", {
    style: {
      whiteSpace: "nowrap"
    }
  }, bytes_1.format(file.size, {
    unitSeparator: " "
  }))), React__default.createElement("a", {
    className: "link pull-right",
    onClick: () => removeFile(i)
  }, React__default.createElement("span", {
    className: "icon-close",
    title: "Remove the file."
  }))) : React__default.createElement("div", {
    className: "panel__body"
  }, React__default.createElement("a", {
    className: "link pull-right",
    style: {
      marginRight: "5px"
    },
    onClick: () => removeFile(i)
  }, React__default.createElement("span", {
    className: "icon-close",
    title: "Remove the file."
  })), React__default.createElement("div", {
    className: "text-ellipsis half-margin-bottom"
  }, file.name), React__default.createElement("span", {
    className: "file-icon text-muted icon-file-o qtr-margin-right"
  }), React__default.createElement("small", null, bytes_1.format(file.size, {
    unitSeparator: " "
  })))));

  class Dropzone$1 extends React__default.Component {
    constructor(props) {
      super(props);

      if (props.maxFileSize) {
        this.maxFileSize = bytes_1.parse(props.maxFileSize);
      } else {
        this.maxFileSize = null;
      }
    }

    removeFile(toRemove) {
      this.props.formik.setFieldValue(this.props.name, this.props.input.value.filter((_, idx) => toRemove !== idx));
    } // renderFileCard = (file, i) => {
    //   return (
    //   );
    // };


    handleDrop(filesToUpload) {
      if (this.maxFileSize) {
        filesToUpload = filesToUpload.filter(file => file.size <= this.maxFileSize);
      }

      if (this.props.maxFiles && filesToUpload.length > this.props.maxFiles) {
        filesToUpload = filesToUpload.slice(0, this.props.maxFiles);
      }

      this.props.formik.setFieldValue(this.props.name, filesToUpload);
    }

    renderFiles() {
      const files = this.props.input.value;

      if (!files || !files.length || !Array.isArray(files)) {
        return null;
      }

      return React__default.createElement("div", {
        className: "dropzone-previews"
      }, React__default.createElement("div", {
        className: "file-drop__container container--fluid"
      }, React__default.createElement("div", {
        className: "row"
      }, files.map((file, i) => React__default.createElement(FileCard, {
        key: i,
        file: file,
        i: i,
        inline: this.props.inline,
        removeFile: this.removeFile
      })))), this.props.showTotalSelected && React__default.createElement("div", {
        className: "file-drop__filecnt"
      }, files.length, " selected"));
    }

    renderMessage() {
      const files = this.props.input.value;

      if (files && files.length) {
        return null;
      }

      if (this.props.inline) {
        return React__default.createElement("div", {
          className: "dropzone-message flex flex-row flex-center-vertical"
        }, React__default.createElement("h5", {
          className: "text-muted text-left flex-fill no-margin"
        }, "Click Here or Drop Files to Upload"), this.props.accept && React__default.createElement("span", {
          className: "text-muted text-small half-margin-right"
        }, "Allowed files: ", this.props.accept.split(",").join(", ")), React__default.createElement("span", {
          className: "file-drop__icon icon-upload"
        }));
      }

      return React__default.createElement("div", {
        className: "dropzone-message"
      }, React__default.createElement("span", {
        className: "file-drop__icon icon-upload"
      }), React__default.createElement("h4", {
        className: "text-muted"
      }, "Click Here or Drop Files to Upload"), this.props.accept && React__default.createElement("div", {
        className: "text-muted"
      }, "Allowed files: ", this.props.accept.split(",").join(", ")), this.maxFileSize && React__default.createElement("div", {
        className: "text-muted"
      }, "Max file size:", " ", bytes_1.format(this.maxFileSize, {
        unitSeparator: " "
      })));
    }

    render() {
      const {
        meta,
        loose,
        compressed
      } = this.props;
      let padding = "";

      if (loose) {
        padding = "dropzone--loose";
      }

      if (compressed) {
        padding = "dropzone--compressed";
      }

      if (this.props.inline && this.props.input.value && this.props.input.value.length) {
        switch (padding) {
          case "dropzone--loose":
            padding = padding + " half-padding-bottom";
            break;

          case "dropzone--compressed":
            padding = padding + " no-padding-bottom";
            break;

          default:
            padding = padding + " qtr-padding-bottom";
            break;
        }
      }

      return React__default.createElement("div", {
        className: "form-group" + (meta.touched && meta.error ? " form-group--error" : "")
      }, React__default.createElement("div", {
        className: "form-group__text"
      }, this.props.label ? React__default.createElement("label", {
        htmlFor: this.props.name
      }, this.props.label) : null, React__default.createElement(Dropzone, {
        name: this.props.name,
        onDrop: this.handleDrop,
        maxSize: this.maxFileSize,
        multiple: this.props.multiple
      }, ({
        getRootProps,
        getInputProps
      }) => React__default.createElement("div", _extends({
        className: `dropzone ${padding}`
      }, getRootProps()), React__default.createElement("input", getInputProps()), this.renderFiles(), this.renderMessage()))), meta.touched && meta.error && React__default.createElement("div", {
        className: `help-block text-danger`,
        role: "alert"
      }, React__default.createElement("span", null, meta.error)));
    }

  }

  Dropzone$1.propTypes = {
    label: PropTypes.string,
    accept: PropTypes.string,
    showTotalSelected: PropTypes.bool,
    maxFileSize: PropTypes.string,
    maxFiles: PropTypes.number,
    inline: PropTypes.bool,
    loose: PropTypes.bool,
    compressed: PropTypes.bool
  };
  const connected = formik.connect(Dropzone$1);

  const Spinner = ({
    size,
    text
  }) => React__default.createElement("div", {
    className: "flex-center flex-middle",
    style: {
      flex: 1
    }
  }, React__default.createElement("div", null, React__default.createElement("div", {
    className: `loader${size !== "default" ? ` loader--${size}` : ""} flex-center`
  }, React__default.createElement("div", {
    className: "wrapper flex flex-center"
  }, React__default.createElement("div", {
    className: "wheel"
  }))), !text ? null : React__default.createElement("div", {
    className: "base-margin-top text-center"
  }, text || "Loading...")));
  Spinner.propTypes = {
    size: PropTypes.oneOf(["small", "default", "large"]),
    text: PropTypes.node
  };
  Spinner.defaultProps = {
    size: "default",
    text: null
  };
  const Dots = ({
    color
  }) => React__default.createElement("div", {
    className: `loading-dots${color !== "primary" ? ` loading-dots--${color}` : ""}`
  }, React__default.createElement("span", null), React__default.createElement("span", null), React__default.createElement("span", null));
  Dots.propTypes = {
    color: PropTypes.oneOf(["primary", "secondary", "tertiary", "success", "info", "warning", "warning-alt", "danger", "dark", "light"])
  };
  Dots.defaultProps = {
    color: "primary"
  };

  const Progressbar = (_ref) => {
    let {
      percentage,
      withLabel,
      label,
      size,
      color,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["percentage", "withLabel", "label", "size", "color", "className"]);

    return React__default.createElement("div", _extends({
      className: `progressbar${appendClass(size !== "default", `progressbar--${size}`)}${appendClass(color, `progressbar--${color}`)}${appendClass(className)}`,
      "data-percentage": percentage
    }, props), React__default.createElement("div", {
      className: "progressbar__fill"
    }), React__default.createElement(DisplayIf, {
      condition: withLabel
    }, label ? React__default.createElement("div", {
      className: "progressbar__label"
    }, label) : React__default.createElement("div", {
      className: "progressbar__label"
    }, `${percentage}%`)));
  };
  Progressbar.propTypes = {
    percentage: PropTypes.number.isRequired,
    withLabel: PropTypes.bool,
    label: PropTypes.node,
    size: PropTypes.oneOf(["small", "default", "large"]),
    color: PropTypes.oneOf(["primary", "secondary", "tertiary", "success", "info", "warning-alt", "warning", "danger", "dark"]),
    className: PropTypes.string
  };
  Progressbar.defaultProps = {
    size: "default",
    withLabel: false,
    label: null,
    color: null,
    className: null
  };

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css = "body.cui .btn.btn--light{border:1px solid transparent;background:var(--cui-background-alt);color:var(--cui-inactive-color);transition:all .15s ease-in}body.cui .btn.btn--light.hover,body.cui .btn.btn--light:hover{color:var(--cui-active-color);text-decoration:none;box-shadow:inset 0 0 0 1px var(--cui-accent-color);transition:all .15s ease-in}body.cui .btn.btn--light.focus,body.cui .btn.btn--light:focus{box-shadow:0 0 0 var(--cui-focus-thickness) rgba(var(--cui-focus-color),var(--cui-focus-opacity)),inset 0 0 0 1px var(--cui-accent-color);opacity:1;outline:var(--cui-focus-thickness) transparent;outline-offset:1px;outline-width:thin;outline-style:none}body.cui .btn.btn--light.disabled,body.cui .btn.btn--light[disabled]{background-color:transparent;border:1px dotted var(--cui-inactive-color);color:var(--cui-inactive-color);opacity:1}body.cui .btn.btn--light.active,body.cui .btn.btn--light.selected,body.cui .btn.btn--light:active{background-color:var(--cui-accent-color);box-shadow:inset 0 0 0 1px var(--cui-accent-color);color:var(--cui-color-dark);-webkit-transition:all .25s ease;transition:all .25s ease}.cui .btn-group>.btn.btn--light:active,.cui .btn-group>.btn.btn--light:focus,.cui .btn-group>.btn.btn--light:hover,.cui .btn-group>.dropdown>.btn.btn--light:active,.cui .btn-group>.dropdown>.btn.btn--light:focus,.cui .btn-group>.dropdown>.btn.btn--light:hover{outline:0;box-shadow:inset 0 0 0 1px var(--cui-accent-color)}";
  styleInject(css);

  const Button = (_ref) => {
    let {
      size,
      color,
      wide,
      justified,
      circle,
      className,
      asLink,
      style,
      selected,
      type,
      icon
    } = _ref,
        props = _objectWithoutProperties(_ref, ["size", "color", "wide", "justified", "circle", "className", "asLink", "style", "selected", "type", "icon"]);

    return React__default.createElement(asLink ? "a" : "button", _objectSpread2({
      className: `btn${appendClass(size !== "default", `btn--${size}`)} btn--${color}${appendClass(wide, "btn--wide")}${appendClass(justified, "btn--justified")}${appendClass(icon, "btn--icon")}${appendClass(circle, "btn--circle")}${appendClass(selected, "selected")}${appendClass(className)}${appendClass(asLink, "flex-middle flex-center")}`,
      style: _objectSpread2({}, style || {}, {}, asLink ? {
        display: "flex"
      } : {})
    }, asLink ? {} : {
      type: type || "button"
    }, {}, props));
  };

  Button.Primary = props => React__default.createElement(Button, _extends({}, props, {
    color: "primary"
  }));

  Button.Secondary = props => React__default.createElement(Button, _extends({}, props, {
    color: "secondary"
  }));

  Button.Success = props => React__default.createElement(Button, _extends({}, props, {
    color: "success"
  }));

  Button.Dark = props => React__default.createElement(Button, _extends({}, props, {
    color: "dark"
  }));

  Button.Ghost = props => React__default.createElement(Button, _extends({}, props, {
    color: "ghost"
  }));

  Button.Link = props => React__default.createElement(Button, _extends({}, props, {
    color: "link"
  }));

  Button.Light = props => React__default.createElement(Button, _extends({}, props, {
    color: "light"
  }));

  Button.Danger = props => React__default.createElement(Button, _extends({}, props, {
    color: "danger"
  }));

  Button.propTypes = {
    size: PropTypes.oneOf(["small", "default", "large"]),
    color: PropTypes.oneOf(["primary", "secondary", "success", "dark", "ghost", "link", "light", "danger"]),
    wide: PropTypes.bool,
    justified: PropTypes.bool,
    circle: PropTypes.bool,
    asLink: PropTypes.bool,
    selected: PropTypes.bool,
    style: PropTypes.shape({}),
    className: PropTypes.string,
    icon: PropTypes.bool,
    type: PropTypes.string
  };
  Button.defaultProps = {
    size: "default",
    color: "primary",
    wide: false,
    justified: false,
    circle: false,
    asLink: false,
    selected: false,
    style: null,
    className: null,
    icon: false,
    type: null
  };
  const ButtonGroup = (_ref2) => {
    let {
      square,
      withDivider,
      className
    } = _ref2,
        props = _objectWithoutProperties(_ref2, ["square", "withDivider", "className"]);

    return React__default.createElement("div", _extends({
      className: `btn-group${appendClass(square, "btn-group--square")}${appendClass(withDivider, " btn-group--divider")}${appendClass(className)}`
    }, props));
  };
  ButtonGroup.propTypes = {
    square: PropTypes.bool,
    withDivider: PropTypes.bool,
    className: PropTypes.string
  };
  ButtonGroup.defaultProps = {
    square: false,
    withDivider: false,
    className: null
  };

  const Label = (_ref) => {
    let {
      size,
      color,
      bordered,
      removable,
      onRemove,
      raised,
      className,
      children
    } = _ref,
        props = _objectWithoutProperties(_ref, ["size", "color", "bordered", "removable", "onRemove", "raised", "className", "children"]);

    return React__default.createElement("span", _extends({
      className: `${"label" + ` label--${color}`}${size !== "default" ? ` label--${size}` : ""}${bordered ? " label--bordered" : ""}${raised ? " label--raised" : ""}${className ? ` ${className}` : ""}`
    }, props), children, removable ? React__default.createElement("span", {
      className: "icon-close",
      onClick: onRemove
    }) : null);
  };
  Label.propTypes = {
    size: PropTypes.oneOf(["tiny", "small", "default", "large"]),
    color: PropTypes.oneOf(["primary", "secondary", "tertiary", "success", "info", "warning-alt", "warning", "danger", "dark", "light"]),
    bordered: PropTypes.bool,
    removable: PropTypes.bool,
    onRemove: PropTypes.func,
    raised: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  Label.defaultProps = {
    size: "default",
    color: "primary",
    bordered: false,
    removable: false,
    raised: false,
    onRemove: null,
    className: null
  };

  Label.Primary = (_ref2) => {
    let props = _objectWithoutProperties(_ref2, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "primary"
    }, props));
  };

  Label.Secondary = (_ref3) => {
    let props = _objectWithoutProperties(_ref3, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "secondary"
    }, props));
  };

  Label.Tertiary = (_ref4) => {
    let props = _objectWithoutProperties(_ref4, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "tertiary"
    }, props));
  };

  Label.Success = (_ref5) => {
    let props = _objectWithoutProperties(_ref5, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "success"
    }, props));
  };

  Label.Info = (_ref6) => {
    let props = _objectWithoutProperties(_ref6, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "info"
    }, props));
  };

  Label.WarningAlt = (_ref7) => {
    let props = _objectWithoutProperties(_ref7, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "warning-alt"
    }, props));
  };

  Label.Warning = (_ref8) => {
    let props = _objectWithoutProperties(_ref8, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "warning"
    }, props));
  };

  Label.Danger = (_ref9) => {
    let props = _objectWithoutProperties(_ref9, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "danger"
    }, props));
  };

  Label.Dark = (_ref10) => {
    let props = _objectWithoutProperties(_ref10, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "dark"
    }, props));
  };

  Label.Light = (_ref11) => {
    let props = _objectWithoutProperties(_ref11, ["color"]);

    return React__default.createElement(Label, _extends({
      color: "light"
    }, props));
  };

  const randomBytes = (typeof self !== "undefined" && (self.crypto || self.msCrypto) ? function () {
    // Browsers
    var crypto = self.crypto || self.msCrypto,
        QUOTA = 65536;
    return function (n) {
      var a = new Uint8Array(n);

      for (var i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(a.subarray(i, i + Math.min(n - i, QUOTA)));
      }

      return a;
    };
  } : function () {
    // Node
    return require("crypto").randomBytes;
  })();
  const crypto = {
    randomBytes
  };

  function rng() {
    return crypto.randomBytes(16);
  }

  /**
   * Convert array of 16 byte values to UUID string format of the form:
   * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   */
  var byteToHex = [];

  for (var i = 0; i < 256; ++i) {
    byteToHex[i] = (i + 0x100).toString(16).substr(1);
  }

  function bytesToUuid(buf, offset) {
    var i = offset || 0;
    var bth = byteToHex; // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4

    return [bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], '-', bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]], bth[buf[i++]]].join('');
  }

  function v4(options, buf, offset) {
    var i = buf && offset || 0;

    if (typeof options == 'string') {
      buf = options === 'binary' ? new Array(16) : null;
      options = null;
    }

    options = options || {};
    var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

    rnds[6] = rnds[6] & 0x0f | 0x40;
    rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

    if (buf) {
      for (var ii = 0; ii < 16; ++ii) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || bytesToUuid(rnds);
  }

  var css$1 = ".cui .form-group.dropdown .select+.dropdown__menu{max-width:unset!important;width:100%!important}";
  styleInject(css$1);

  const InputHelpBlock = ({
    text
  }) => React__default.createElement("div", {
    className: "form-group__help",
    role: "alert"
  }, React__default.createElement("span", null, text));

  class Select extends React__default.Component {
    constructor(props) {
      super(props);

      _defineProperty(this, "handleClick", () => {
        if (!this.state.isOpen) {
          // attach/remove event handler
          document.addEventListener("click", this.handleOutsideClick, false);
        } else {
          document.removeEventListener("click", this.handleOutsideClick, false);
        }

        this.setState(prevState => ({
          isOpen: !prevState.isOpen
        }));
      });

      _defineProperty(this, "handleOutsideClick", e => {
        // ignore clicks on the component itself
        const n = this.props.innerRef ? this.props.innerRef : this.node;

        if (n && n.contains(e.target)) {
          return;
        }

        this.handleClick();
      });

      _defineProperty(this, "handleOptionClick", (e, newValue, title) => {
        const {
          field,
          multiple,
          form
        } = this.props;

        if (!multiple) {
          form.setFieldValue(field.name, newValue);
          form.setFieldTouched(field.name, true);
          this.setState({
            title
          });
          this.handleClick();
        } else if (e.target.checked) {
          form.setFieldValue(field.name, [...field.value, newValue]);
          form.setFieldTouched(field.name, true);
          this.setState({
            title: [...this.state.title, title]
          });
        } else {
          form.setFieldValue(field.name, field.value.filter(v => v !== newValue));
          form.setFieldTouched(field.name, true);
          this.setState({
            title: this.state.title.filter(t => t !== title)
          });
        }
      });

      _defineProperty(this, "isSelected", checkValue => {
        const {
          value
        } = this.props.field;

        if (this.props.multiple) {
          return Array.isArray(value) && value.findIndex(v => v === checkValue) >= 0;
        }

        return value === checkValue;
      });

      _defineProperty(this, "renderOption", child => {
        const {
          value,
          children,
          disabled
        } = child.props;

        if (this.props.multiple) {
          return React__default.createElement("a", {
            disabled: disabled
          }, React__default.createElement("label", {
            className: "checkbox"
          }, React__default.createElement("input", {
            type: "checkbox",
            onClick: e => this.handleOptionClick(e, value, Array.isArray(children) ? children.join("") : children),
            checked: this.isSelected(value) ? true : false
          }), React__default.createElement("span", {
            className: "checkbox__input"
          })), React__default.createElement("span", null, children));
        }

        return React__default.createElement("a", {
          disabled: disabled,
          onClick: e => this.handleOptionClick(e, value, Array.isArray(children) ? children.join("") : children),
          className: this.isSelected(value) ? "selected" : ""
        }, children);
      });

      _defineProperty(this, "renderOptgroup", child => {
        const {
          label,
          children
        } = child.props;
        return React__default.createElement("div", {
          className: "dropdown__group"
        }, React__default.createElement("div", {
          className: "dropdown__group-header"
        }, label), this.renderChildren(children));
      });

      _defineProperty(this, "renderChildren", children => {
        return React__default.Children.map(children, child => {
          switch (child.type) {
            case "option":
              return this.renderOption(child);

            case "optgroup":
              return this.renderOptgroup(child);

            default:
              return child;
          }
        });
      });

      _defineProperty(this, "findTitle", where => {
        let r = [];
        React__default.Children.forEach(where || this.props.children, ch => {
          if (ch.type === "optgroup") {
            const temp = this.findTitle(ch.props.children);
            if (temp) r.push(temp);
          }

          if (this.isSelected(ch.props.value)) {
            r.push(Array.isArray(ch.props.children) ? ch.props.children.join("") : ch.props.children);
          }
        });
        return r.join(", ");
      });

      _defineProperty(this, "getShowValue", () => {
        const {
          multiple,
          prompt,
          field
        } = this.props;

        if (typeof field.value === "undefined" || field.value === null || !field.value.toString().length) {
          return prompt;
        }

        if (multiple) {
          return this.state.title.length ? this.state.title.join(", ") : this.findTitle();
        }

        return this.state.title ? this.state.title : this.findTitle();
      });

      this.state = {
        isOpen: false,
        title: props.multiple ? [] : ""
      };
    }

    render() {
      const {
        compressed,
        field,
        id,
        form,
        title,
        children,
        inline,
        up,
        innerRef,
        className,
        disabled,
        width
      } = this.props;
      const {
        touched,
        errors
      } = form;
      return React__default.createElement("div", _extends({
        className: `form-group dropdown${appendClass(compressed, "input--compressed")}${appendClass(this.state.isOpen, "active")}${appendClass(inline, "label--inline")}${appendClass(up, "dropdown--up")}${appendClass(disabled, "disabled")}${appendClass(className)}${appendClass(formik.getIn(touched, field.name) && formik.getIn(errors, field.name), "form-group--error")}` // (asyncValidating ? " form-group--loading" : "")
        ,
        ref: innerRef || (node => {
          this.node = node;
        })
      }, inline === "both" ? {
        style: {
          display: "inline-block"
        }
      } : {}), React__default.createElement("div", {
        className: "form-group__text select",
        onClick: this.handleClick
      }, React__default.createElement("input", _extends({
        id: id
      }, field, {
        value: this.getShowValue(),
        disabled: disabled
      }, width ? {
        style: {
          width: `${width}px`,
          minWidth: `${width}px`
        }
      } : {})), title ? React__default.createElement("label", {
        htmlFor: id
      }, title) : null), React__default.createElement("div", _extends({
        className: "dropdown__menu"
      }, width ? {
        style: {
          width: `${width}px`,
          minWidth: `${width}px`
        }
      } : {}), this.renderChildren(children)), formik.getIn(touched, field.name) && formik.getIn(errors, field.name) ? React__default.createElement(InputHelpBlock, {
        text: formik.getIn(errors, field.name)
      }) : null);
    }

  }
  Select.propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    title: PropTypes.string,
    prompt: PropTypes.string,
    multiple: PropTypes.bool,
    inline: PropTypes.oneOf([false, true, "both"]),
    up: PropTypes.bool,
    disabled: PropTypes.bool,
    width: PropTypes.number,
    compressed: PropTypes.bool
  };
  Select.defaultProps = {
    prompt: "Select an option",
    multiple: false,
    inline: false,
    id: v4(),
    label: null,
    title: null,
    width: null,
    up: false,
    disabled: false,
    compressed: false
  };

  const Panel = React__default.forwardRef((_ref, ref) => {
    let {
      color,
      padding,
      bordered,
      raised,
      well,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["color", "padding", "bordered", "raised", "well", "className"]);

    return React__default.createElement("div", _extends({
      className: `panel${appendClass(color !== "plain", `panel--${color}`)}${appendClass(padding !== "default", `panel--${padding}`)}${appendClass(bordered, () => {
      if (typeof bordered === "string") return `panel--bordered-${bordered}`;
      if (Array.isArray(bordered)) return bordered.map(b => `panel--bordered-${b}`).join(" ");
      return "panel--bordered";
    })}${appendClass(raised, "panel--raised")}${appendClass(well, "panel--well")}${appendClass(className)}`,
      ref: ref
    }, props));
  });
  Panel.propTypes = {
    color: PropTypes.oneOf(["plain", "primary", "secondary", "tertiary", "success", "info", "warning-alt", "warning", "danger", "dark", "light"]),
    padding: PropTypes.oneOf(["none", "compressed", "default", "loose"]),
    bordered: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(["top", "right", "left", "bottom"]), PropTypes.arrayOf(PropTypes.oneOf(["top", "right", "left", "bottom"]))]),
    raised: PropTypes.bool,
    well: PropTypes.bool,
    className: PropTypes.string
  };
  Panel.defaultProps = {
    color: "plain",
    padding: "default",
    bordered: false,
    raised: false,
    well: false,
    className: null
  };

  function _objectWithoutPropertiesLoose$2(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  var config = {
    disabled: false
  };

  var TransitionGroupContext = React__default.createContext(null);

  var UNMOUNTED = 'unmounted';
  var EXITED = 'exited';
  var ENTERING = 'entering';
  var ENTERED = 'entered';
  var EXITING = 'exiting';
  /**
   * The Transition component lets you describe a transition from one component
   * state to another _over time_ with a simple declarative API. Most commonly
   * it's used to animate the mounting and unmounting of a component, but can also
   * be used to describe in-place transition states as well.
   *
   * ---
   *
   * **Note**: `Transition` is a platform-agnostic base component. If you're using
   * transitions in CSS, you'll probably want to use
   * [`CSSTransition`](https://reactcommunity.org/react-transition-group/css-transition)
   * instead. It inherits all the features of `Transition`, but contains
   * additional features necessary to play nice with CSS transitions (hence the
   * name of the component).
   *
   * ---
   *
   * By default the `Transition` component does not alter the behavior of the
   * component it renders, it only tracks "enter" and "exit" states for the
   * components. It's up to you to give meaning and effect to those states. For
   * example we can add styles to a component when it enters or exits:
   *
   * ```jsx
   * import { Transition } from 'react-transition-group';
   *
   * const duration = 300;
   *
   * const defaultStyle = {
   *   transition: `opacity ${duration}ms ease-in-out`,
   *   opacity: 0,
   * }
   *
   * const transitionStyles = {
   *   entering: { opacity: 1 },
   *   entered:  { opacity: 1 },
   *   exiting:  { opacity: 0 },
   *   exited:  { opacity: 0 },
   * };
   *
   * const Fade = ({ in: inProp }) => (
   *   <Transition in={inProp} timeout={duration}>
   *     {state => (
   *       <div style={{
   *         ...defaultStyle,
   *         ...transitionStyles[state]
   *       }}>
   *         I'm a fade Transition!
   *       </div>
   *     )}
   *   </Transition>
   * );
   * ```
   *
   * There are 4 main states a Transition can be in:
   *  - `'entering'`
   *  - `'entered'`
   *  - `'exiting'`
   *  - `'exited'`
   *
   * Transition state is toggled via the `in` prop. When `true` the component
   * begins the "Enter" stage. During this stage, the component will shift from
   * its current transition state, to `'entering'` for the duration of the
   * transition and then to the `'entered'` stage once it's complete. Let's take
   * the following example (we'll use the
   * [useState](https://reactjs.org/docs/hooks-reference.html#usestate) hook):
   *
   * ```jsx
   * function App() {
   *   const [inProp, setInProp] = useState(false);
   *   return (
   *     <div>
   *       <Transition in={inProp} timeout={500}>
   *         {state => (
   *           // ...
   *         )}
   *       </Transition>
   *       <button onClick={() => setInProp(true)}>
   *         Click to Enter
   *       </button>
   *     </div>
   *   );
   * }
   * ```
   *
   * When the button is clicked the component will shift to the `'entering'` state
   * and stay there for 500ms (the value of `timeout`) before it finally switches
   * to `'entered'`.
   *
   * When `in` is `false` the same thing happens except the state moves from
   * `'exiting'` to `'exited'`.
   */

  var Transition = /*#__PURE__*/function (_React$Component) {
    _inheritsLoose(Transition, _React$Component);

    function Transition(props, context) {
      var _this;

      _this = _React$Component.call(this, props, context) || this;
      var parentGroup = context; // In the context of a TransitionGroup all enters are really appears

      var appear = parentGroup && !parentGroup.isMounting ? props.enter : props.appear;
      var initialStatus;
      _this.appearStatus = null;

      if (props.in) {
        if (appear) {
          initialStatus = EXITED;
          _this.appearStatus = ENTERING;
        } else {
          initialStatus = ENTERED;
        }
      } else {
        if (props.unmountOnExit || props.mountOnEnter) {
          initialStatus = UNMOUNTED;
        } else {
          initialStatus = EXITED;
        }
      }

      _this.state = {
        status: initialStatus
      };
      _this.nextCallback = null;
      return _this;
    }

    Transition.getDerivedStateFromProps = function getDerivedStateFromProps(_ref, prevState) {
      var nextIn = _ref.in;

      if (nextIn && prevState.status === UNMOUNTED) {
        return {
          status: EXITED
        };
      }

      return null;
    } // getSnapshotBeforeUpdate(prevProps) {
    //   let nextStatus = null
    //   if (prevProps !== this.props) {
    //     const { status } = this.state
    //     if (this.props.in) {
    //       if (status !== ENTERING && status !== ENTERED) {
    //         nextStatus = ENTERING
    //       }
    //     } else {
    //       if (status === ENTERING || status === ENTERED) {
    //         nextStatus = EXITING
    //       }
    //     }
    //   }
    //   return { nextStatus }
    // }
    ;

    var _proto = Transition.prototype;

    _proto.componentDidMount = function componentDidMount() {
      this.updateStatus(true, this.appearStatus);
    };

    _proto.componentDidUpdate = function componentDidUpdate(prevProps) {
      var nextStatus = null;

      if (prevProps !== this.props) {
        var status = this.state.status;

        if (this.props.in) {
          if (status !== ENTERING && status !== ENTERED) {
            nextStatus = ENTERING;
          }
        } else {
          if (status === ENTERING || status === ENTERED) {
            nextStatus = EXITING;
          }
        }
      }

      this.updateStatus(false, nextStatus);
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      this.cancelNextCallback();
    };

    _proto.getTimeouts = function getTimeouts() {
      var timeout = this.props.timeout;
      var exit, enter, appear;
      exit = enter = appear = timeout;

      if (timeout != null && typeof timeout !== 'number') {
        exit = timeout.exit;
        enter = timeout.enter; // TODO: remove fallback for next major

        appear = timeout.appear !== undefined ? timeout.appear : enter;
      }

      return {
        exit: exit,
        enter: enter,
        appear: appear
      };
    };

    _proto.updateStatus = function updateStatus(mounting, nextStatus) {
      if (mounting === void 0) {
        mounting = false;
      }

      if (nextStatus !== null) {
        // nextStatus will always be ENTERING or EXITING.
        this.cancelNextCallback();

        if (nextStatus === ENTERING) {
          this.performEnter(mounting);
        } else {
          this.performExit();
        }
      } else if (this.props.unmountOnExit && this.state.status === EXITED) {
        this.setState({
          status: UNMOUNTED
        });
      }
    };

    _proto.performEnter = function performEnter(mounting) {
      var _this2 = this;

      var enter = this.props.enter;
      var appearing = this.context ? this.context.isMounting : mounting;

      var _ref2 = this.props.nodeRef ? [appearing] : [ReactDOM__default.findDOMNode(this), appearing],
          maybeNode = _ref2[0],
          maybeAppearing = _ref2[1];

      var timeouts = this.getTimeouts();
      var enterTimeout = appearing ? timeouts.appear : timeouts.enter; // no enter animation skip right to ENTERED
      // if we are mounting and running this it means appear _must_ be set

      if (!mounting && !enter || config.disabled) {
        this.safeSetState({
          status: ENTERED
        }, function () {
          _this2.props.onEntered(maybeNode);
        });
        return;
      }

      this.props.onEnter(maybeNode, maybeAppearing);
      this.safeSetState({
        status: ENTERING
      }, function () {
        _this2.props.onEntering(maybeNode, maybeAppearing);

        _this2.onTransitionEnd(enterTimeout, function () {
          _this2.safeSetState({
            status: ENTERED
          }, function () {
            _this2.props.onEntered(maybeNode, maybeAppearing);
          });
        });
      });
    };

    _proto.performExit = function performExit() {
      var _this3 = this;

      var exit = this.props.exit;
      var timeouts = this.getTimeouts();
      var maybeNode = this.props.nodeRef ? undefined : ReactDOM__default.findDOMNode(this); // no exit animation skip right to EXITED

      if (!exit || config.disabled) {
        this.safeSetState({
          status: EXITED
        }, function () {
          _this3.props.onExited(maybeNode);
        });
        return;
      }

      this.props.onExit(maybeNode);
      this.safeSetState({
        status: EXITING
      }, function () {
        _this3.props.onExiting(maybeNode);

        _this3.onTransitionEnd(timeouts.exit, function () {
          _this3.safeSetState({
            status: EXITED
          }, function () {
            _this3.props.onExited(maybeNode);
          });
        });
      });
    };

    _proto.cancelNextCallback = function cancelNextCallback() {
      if (this.nextCallback !== null) {
        this.nextCallback.cancel();
        this.nextCallback = null;
      }
    };

    _proto.safeSetState = function safeSetState(nextState, callback) {
      // This shouldn't be necessary, but there are weird race conditions with
      // setState callbacks and unmounting in testing, so always make sure that
      // we can cancel any pending setState callbacks after we unmount.
      callback = this.setNextCallback(callback);
      this.setState(nextState, callback);
    };

    _proto.setNextCallback = function setNextCallback(callback) {
      var _this4 = this;

      var active = true;

      this.nextCallback = function (event) {
        if (active) {
          active = false;
          _this4.nextCallback = null;
          callback(event);
        }
      };

      this.nextCallback.cancel = function () {
        active = false;
      };

      return this.nextCallback;
    };

    _proto.onTransitionEnd = function onTransitionEnd(timeout, handler) {
      this.setNextCallback(handler);
      var node = this.props.nodeRef ? this.props.nodeRef.current : ReactDOM__default.findDOMNode(this);
      var doesNotHaveTimeoutOrListener = timeout == null && !this.props.addEndListener;

      if (!node || doesNotHaveTimeoutOrListener) {
        setTimeout(this.nextCallback, 0);
        return;
      }

      if (this.props.addEndListener) {
        var _ref3 = this.props.nodeRef ? [this.nextCallback] : [node, this.nextCallback],
            maybeNode = _ref3[0],
            maybeNextCallback = _ref3[1];

        this.props.addEndListener(maybeNode, maybeNextCallback);
      }

      if (timeout != null) {
        setTimeout(this.nextCallback, timeout);
      }
    };

    _proto.render = function render() {
      var status = this.state.status;

      if (status === UNMOUNTED) {
        return null;
      }

      var _this$props = this.props,
          children = _this$props.children,
          _in = _this$props.in,
          _mountOnEnter = _this$props.mountOnEnter,
          _unmountOnExit = _this$props.unmountOnExit,
          _appear = _this$props.appear,
          _enter = _this$props.enter,
          _exit = _this$props.exit,
          _timeout = _this$props.timeout,
          _addEndListener = _this$props.addEndListener,
          _onEnter = _this$props.onEnter,
          _onEntering = _this$props.onEntering,
          _onEntered = _this$props.onEntered,
          _onExit = _this$props.onExit,
          _onExiting = _this$props.onExiting,
          _onExited = _this$props.onExited,
          _nodeRef = _this$props.nodeRef,
          childProps = _objectWithoutPropertiesLoose$2(_this$props, ["children", "in", "mountOnEnter", "unmountOnExit", "appear", "enter", "exit", "timeout", "addEndListener", "onEnter", "onEntering", "onEntered", "onExit", "onExiting", "onExited", "nodeRef"]);

      return (
        /*#__PURE__*/
        // allows for nested Transitions
        React__default.createElement(TransitionGroupContext.Provider, {
          value: null
        }, typeof children === 'function' ? children(status, childProps) : React__default.cloneElement(React__default.Children.only(children), childProps))
      );
    };

    return Transition;
  }(React__default.Component);

  Transition.contextType = TransitionGroupContext;
  Transition.propTypes =  {}; // Name the function so it is clearer in the documentation

  function noop() {}

  Transition.defaultProps = {
    in: false,
    mountOnEnter: false,
    unmountOnExit: false,
    appear: false,
    enter: true,
    exit: true,
    onEnter: noop,
    onEntering: noop,
    onEntered: noop,
    onExit: noop,
    onExiting: noop,
    onExited: noop
  };
  Transition.UNMOUNTED = UNMOUNTED;
  Transition.EXITED = EXITED;
  Transition.ENTERING = ENTERING;
  Transition.ENTERED = ENTERED;
  Transition.EXITING = EXITING;

  var classnames = createCommonjsModule(function (module) {
  /*!
    Copyright (c) 2017 Jed Watson.
    Licensed under the MIT License (MIT), see
    http://jedwatson.github.io/classnames
  */
  /* global define */

  (function () {

  	var hasOwn = {}.hasOwnProperty;

  	function classNames () {
  		var classes = [];

  		for (var i = 0; i < arguments.length; i++) {
  			var arg = arguments[i];
  			if (!arg) continue;

  			var argType = typeof arg;

  			if (argType === 'string' || argType === 'number') {
  				classes.push(arg);
  			} else if (Array.isArray(arg) && arg.length) {
  				var inner = classNames.apply(null, arg);
  				if (inner) {
  					classes.push(inner);
  				}
  			} else if (argType === 'object') {
  				for (var key in arg) {
  					if (hasOwn.call(arg, key) && arg[key]) {
  						classes.push(key);
  					}
  				}
  			}
  		}

  		return classes.join(' ');
  	}

  	if ( module.exports) {
  		classNames.default = classNames;
  		module.exports = classNames;
  	} else {
  		window.classNames = classNames;
  	}
  }());
  });

  function _extends$1() {
    _extends$1 = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends$1.apply(this, arguments);
  }

  function _objectWithoutPropertiesLoose$3(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  var eventManager$1 = {
    list: /*#__PURE__*/new Map(),
    emitQueue: /*#__PURE__*/new Map(),
    on: function on(event, callback) {
      this.list.has(event) || this.list.set(event, []);
      this.list.get(event).push(callback);
      return this;
    },
    off: function off(event, callback) {
      if (callback) {
        var cb = this.list.get(event).filter(function (cb) {
          return cb !== callback;
        });
        this.list.set(event, cb);
        return this;
      }

      this.list["delete"](event);
      return this;
    },
    cancelEmit: function cancelEmit(event) {
      var timers = this.emitQueue.get(event);

      if (timers) {
        timers.forEach(function (timer) {
          return clearTimeout(timer);
        });
        this.emitQueue["delete"](event);
      }

      return this;
    },

    /**
     * Enqueue the event at the end of the call stack
     * Doing so let the user call toast as follow:
     * toast('1')
     * toast('2')
     * toast('3')
     * Without setTimemout the code above will not work
     */
    emit: function emit(event) {
      var _this = this;

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      this.list.has(event) && this.list.get(event).forEach(function (callback) {
        var timer = setTimeout(function () {
          // @ts-ignore
          callback.apply(void 0, args);
        }, 0);
        _this.emitQueue.has(event) || _this.emitQueue.set(event, []);

        _this.emitQueue.get(event).push(timer);
      });
    }
  };

  function isNum(v) {
    return typeof v === 'number' && !isNaN(v);
  }
  function isBool(v) {
    return typeof v === 'boolean';
  }
  function isStr(v) {
    return typeof v === 'string';
  }
  function isFn(v) {
    return typeof v === 'function';
  }
  function parseClassName(v) {
    return typeof v === 'string' ? v : null;
  }
  function hasToastId(toastId) {
    return toastId === 0 || toastId;
  }
  function getAutoCloseDelay(toastAutoClose, containerAutoClose) {
    return toastAutoClose === false || isNum(toastAutoClose) && toastAutoClose > 0 ? toastAutoClose : containerAutoClose;
  }
  var canUseDom = !!(typeof window !== 'undefined' && window.document && window.document.createElement);
  function canBeRendered(content) {
    return React.isValidElement(content) || isStr(content) || isFn(content) || isNum(content);
  }

  var POSITION = {
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    TOP_CENTER: 'top-center',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    BOTTOM_CENTER: 'bottom-center'
  };
  var TYPE = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    DEFAULT: 'default',
    DARK: 'dark'
  };

  /**
   * Used to collapse toast after exit animation
   */
  function collapseToast(node, done, duration
  /* COLLAPSE_DURATION */
  ) {
    if (duration === void 0) {
      duration = 300;
    }

    var height = node.scrollHeight;
    var style = node.style;
    requestAnimationFrame(function () {
      style.minHeight = 'initial';
      style.height = height + 'px';
      style.transition = "all " + duration + "ms";
      requestAnimationFrame(function () {
        style.height = '0';
        style.padding = '0';
        style.margin = '0';
        setTimeout(function () {
          return done();
        }, duration);
      });
    });
  }

  function cssTransition(_ref) {
    var enter = _ref.enter,
        exit = _ref.exit,
        _ref$duration = _ref.duration,
        duration = _ref$duration === void 0 ? 750 : _ref$duration,
        _ref$appendPosition = _ref.appendPosition,
        appendPosition = _ref$appendPosition === void 0 ? false : _ref$appendPosition,
        _ref$collapse = _ref.collapse,
        collapse = _ref$collapse === void 0 ? true : _ref$collapse,
        _ref$collapseDuration = _ref.collapseDuration,
        collapseDuration = _ref$collapseDuration === void 0 ? 300 : _ref$collapseDuration;
    var enterDuration, exitDuration;

    if (Array.isArray(duration) && duration.length === 2) {
      enterDuration = duration[0];
      exitDuration = duration[1];
    } else {
      enterDuration = exitDuration = duration;
    }

    return function ToastTransition(_ref2) {
      var children = _ref2.children,
          position = _ref2.position,
          preventExitTransition = _ref2.preventExitTransition,
          done = _ref2.done,
          props = _objectWithoutPropertiesLoose$3(_ref2, ["children", "position", "preventExitTransition", "done"]);

      var enterClassName = appendPosition ? enter + "--" + position : enter;
      var exitClassName = appendPosition ? exit + "--" + position : exit;

      var onEnter = function onEnter() {
        var node = props.nodeRef.current;

        if (node) {
          node.classList.add(enterClassName);
          node.style.animationFillMode = 'forwards';
          node.style.animationDuration = enterDuration + "ms";
        }
      };

      var onEntered = function onEntered() {
        var node = props.nodeRef.current;

        if (node) {
          node.classList.remove(enterClassName);
          node.style.cssText = '';
        }
      };

      var onExited = function onExited() {
        var node = props.nodeRef.current;

        if (node) {
          node.removeEventListener('animationend', onExited);
          collapse ? collapseToast(node, done, collapseDuration) : done();
        }
      };

      var onExit = function onExit() {
        var node = props.nodeRef.current;

        if (node) {
          node.classList.add(exitClassName);
          node.style.animationFillMode = 'forwards';
          node.style.animationDuration = exitDuration + "ms";
          node.addEventListener('animationend', onExited);
        }
      };

      return React.createElement(Transition, Object.assign({}, props, {
        timeout: preventExitTransition ? 0 : {
          enter: enterDuration,
          exit: collapse ? exitDuration + collapseDuration : exitDuration + 50
          /* DEBOUNCE_DURATION */

        },
        onEnter: onEnter,
        onEntered: onEntered,
        onExit: preventExitTransition ? done : onExit,
        unmountOnExit: true
      }), children);
    };
  }

  function CloseButton(_ref) {
    var closeToast = _ref.closeToast,
        type = _ref.type,
        _ref$ariaLabel = _ref.ariaLabel,
        ariaLabel = _ref$ariaLabel === void 0 ? 'close' : _ref$ariaLabel;
    return React.createElement("button", {
      className: "Toastify"
      /* CSS_NAMESPACE */
      + "__close-button " + "Toastify"
      /* CSS_NAMESPACE */
      + "__close-button--" + type,
      type: "button",
      onClick: function onClick(e) {
        e.stopPropagation();
        closeToast(e);
      },
      "aria-label": ariaLabel
    }, React.createElement("svg", {
      "aria-hidden": "true",
      viewBox: "0 0 14 16"
    }, React.createElement("path", {
      fillRule: "evenodd",
      d: "M7.71 8.23l3.75 3.75-1.48 1.48-3.75-3.75-3.75 3.75L1 11.98l3.75-3.75L1 4.48 2.48 3l3.75 3.75L9.98 3l1.48 1.48-3.75 3.75z"
    })));
  }

  function ProgressBar(_ref) {
    var _cx, _animationEvent;

    var delay = _ref.delay,
        isRunning = _ref.isRunning,
        closeToast = _ref.closeToast,
        type = _ref.type,
        hide = _ref.hide,
        className = _ref.className,
        userStyle = _ref.style,
        controlledProgress = _ref.controlledProgress,
        progress = _ref.progress,
        rtl = _ref.rtl,
        isIn = _ref.isIn;

    var style = _extends$1(_extends$1({}, userStyle), {}, {
      animationDuration: delay + "ms",
      animationPlayState: isRunning ? 'running' : 'paused',
      opacity: hide ? 0 : 1
    });

    if (controlledProgress) style.transform = "scaleX(" + progress + ")";
    var classNames = classnames("Toastify"
    /* CSS_NAMESPACE */
    + "__progress-bar", controlledProgress ? "Toastify"
    /* CSS_NAMESPACE */
    + "__progress-bar--controlled" : "Toastify"
    /* CSS_NAMESPACE */
    + "__progress-bar--animated", "Toastify"
    /* CSS_NAMESPACE */
    + "__progress-bar--" + type, (_cx = {}, _cx["Toastify"
    /* CSS_NAMESPACE */
    + "__progress-bar--rtl"] = rtl, _cx), className); // 🧐 controlledProgress is derived from progress
    // so if controlledProgress is set
    // it means that this is also the case for progress

    var animationEvent = (_animationEvent = {}, _animationEvent[controlledProgress && progress >= 1 ? 'onTransitionEnd' : 'onAnimationEnd'] = controlledProgress && progress < 1 ? null : function () {
      isIn && closeToast();
    }, _animationEvent);
    return React.createElement("div", Object.assign({
      className: classNames,
      style: style
    }, animationEvent));
  }
  ProgressBar.defaultProps = {
    type: TYPE.DEFAULT,
    hide: false
  };

  var Toast = function Toast(props) {
    var _cx;

    var _useToast = useToast(props),
        isRunning = _useToast.isRunning,
        preventExitTransition = _useToast.preventExitTransition,
        toastRef = _useToast.toastRef,
        eventHandlers = _useToast.eventHandlers;

    var closeButton = props.closeButton,
        children = props.children,
        autoClose = props.autoClose,
        onClick = props.onClick,
        type = props.type,
        hideProgressBar = props.hideProgressBar,
        closeToast = props.closeToast,
        Transition = props.transition,
        position = props.position,
        className = props.className,
        style = props.style,
        bodyClassName = props.bodyClassName,
        bodyStyle = props.bodyStyle,
        progressClassName = props.progressClassName,
        progressStyle = props.progressStyle,
        updateId = props.updateId,
        role = props.role,
        progress = props.progress,
        rtl = props.rtl,
        toastId = props.toastId,
        deleteToast = props.deleteToast;
    var cssClasses = classnames("Toastify"
    /* CSS_NAMESPACE */
    + "__toast", "Toastify"
    /* CSS_NAMESPACE */
    + "__toast--" + type, (_cx = {}, _cx["Toastify"
    /* CSS_NAMESPACE */
    + "__toast--rtl"] = rtl, _cx), className);
    var controlledProgress = !!progress;

    function renderCloseButton(closeButton) {
      if (!closeButton) return null;
      var props = {
        closeToast: closeToast,
        type: type
      };
      if (isFn(closeButton)) return closeButton(props);
      if (React.isValidElement(closeButton)) return React.cloneElement(closeButton, props);
    }

    return React.createElement(Transition, {
      "in": props["in"],
      appear: true,
      done: deleteToast,
      position: position,
      preventExitTransition: preventExitTransition,
      nodeRef: toastRef
    }, React.createElement("div", Object.assign({
      id: toastId,
      onClick: onClick,
      className: cssClasses
    }, eventHandlers, {
      style: style,
      ref: toastRef
    }), React.createElement("div", Object.assign({}, props["in"] && {
      role: role
    }, {
      className: classnames("Toastify"
      /* CSS_NAMESPACE */
      + "__toast-body", bodyClassName),
      style: bodyStyle
    }), children), renderCloseButton(closeButton), (autoClose || controlledProgress) && React.createElement(ProgressBar, Object.assign({}, updateId && !controlledProgress ? {
      key: "pb-" + updateId
    } : {}, {
      rtl: rtl,
      delay: autoClose,
      isRunning: isRunning,
      isIn: props["in"],
      closeToast: closeToast,
      hide: hideProgressBar,
      type: type,
      style: progressStyle,
      className: progressClassName,
      controlledProgress: controlledProgress,
      progress: progress
    }))));
  };

  var Bounce = /*#__PURE__*/cssTransition({
    enter: "Toastify"
    /* CSS_NAMESPACE */
    + "__bounce-enter",
    exit: "Toastify"
    /* CSS_NAMESPACE */
    + "__bounce-exit",
    appendPosition: true
  });

  var ToastPositioner = function ToastPositioner(_ref) {
    var children = _ref.children,
        className = _ref.className,
        style = _ref.style,
        rest = _objectWithoutPropertiesLoose$3(_ref, ["children", "className", "style"]);

    // Monkey patch react-transition-group
    // As exit transition is broken with strict mode
    delete rest["in"];
    return React.createElement("div", {
      className: className,
      style: style
    }, React.Children.map(children, function (child) {
      return React.cloneElement(child, rest);
    }));
  };

  var ToastContainer = function ToastContainer(props) {
    var _useToastContainer = useToastContainer(props),
        getToastToRender = _useToastContainer.getToastToRender,
        containerRef = _useToastContainer.containerRef,
        isToastActive = _useToastContainer.isToastActive;

    var className = props.className,
        style = props.style,
        rtl = props.rtl,
        containerId = props.containerId;
    return React.createElement("div", {
      ref: containerRef,
      className: "Toastify"
      /* CSS_NAMESPACE */
      ,
      id: containerId
    }, getToastToRender(function (position, toastList) {
      var _cx;

      var swag = {
        className: classnames("Toastify"
        /* CSS_NAMESPACE */
        + "__toast-container", "Toastify"
        /* CSS_NAMESPACE */
        + "__toast-container--" + position, (_cx = {}, _cx["Toastify"
        /* CSS_NAMESPACE */
        + "__toast-container--rtl"] = rtl, _cx), parseClassName(className)),
        style: toastList.length === 0 ? _extends$1(_extends$1({}, style), {}, {
          pointerEvents: 'none'
        }) : _extends$1({}, style)
      };
      return React.createElement(ToastPositioner, Object.assign({}, swag, {
        key: "container-" + position
      }), toastList.map(function (_ref) {
        var content = _ref.content,
            toastProps = _ref.props;
        return React.createElement(Toast, Object.assign({}, toastProps, {
          "in": isToastActive(toastProps.toastId),
          key: "toast-" + toastProps.key,
          closeButton: toastProps.closeButton === true ? CloseButton : toastProps.closeButton
        }), content);
      }));
    }));
  };

  ToastContainer.defaultProps = {
    position: POSITION.TOP_RIGHT,
    transition: Bounce,
    rtl: false,
    autoClose: 5000,
    hideProgressBar: false,
    closeButton: CloseButton,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    closeOnClick: true,
    newestOnTop: false,
    draggable: true,
    draggablePercent: 80,
    role: 'alert'
  };

  var containers = /*#__PURE__*/new Map();
  var latestInstance;
  var containerDomNode;
  var containerConfig;
  var queue = [];
  var lazy = false;
  /**
   * Check whether any container is currently mounted in the DOM
   */

  function isAnyContainerMounted() {
    return containers.size > 0;
  }
  /**
   * Get the container by id. Returns the last container declared when no id is given.
   */


  function getContainer(containerId) {
    if (!isAnyContainerMounted()) return null;
    return containers.get(!containerId ? latestInstance : containerId);
  }
  /**
   * Get the toast by id, given it's in the DOM, otherwise returns null
   */


  function getToast(toastId, _ref) {
    var containerId = _ref.containerId;
    var container = getContainer(containerId);
    if (!container) return null;
    return container.getToast(toastId);
  }
  /**
   * Generate a random toastId
   */


  function generateToastId() {
    return (Math.random().toString(36) + Date.now().toString(36)).substr(2, 10);
  }
  /**
   * Generate a toastId or use the one provided
   */


  function getToastId(options) {
    if (options && (isStr(options.toastId) || isNum(options.toastId))) {
      return options.toastId;
    }

    return generateToastId();
  }
  /**
   * If the container is not mounted, the toast is enqueued and
   * the container lazy mounted
   */


  function dispatchToast(content, options) {
    if (isAnyContainerMounted()) {
      eventManager$1.emit(0
      /* Show */
      , content, options);
    } else {
      queue.push({
        content: content,
        options: options
      });

      if (lazy && canUseDom) {
        lazy = false;
        containerDomNode = document.createElement('div');
        document.body.appendChild(containerDomNode);
        ReactDOM.render(React.createElement(ToastContainer, Object.assign({}, containerConfig)), containerDomNode);
      }
    }

    return options.toastId;
  }
  /**
   * Merge provided options with the defaults settings and generate the toastId
   */


  function mergeOptions(type, options) {
    return _extends$1(_extends$1({}, options), {}, {
      type: options && options.type || type,
      toastId: getToastId(options)
    });
  }

  var toast = function toast(content, options) {
    return dispatchToast(content, mergeOptions(TYPE.DEFAULT, options));
  };

  toast.success = function (content, options) {
    return dispatchToast(content, mergeOptions(TYPE.SUCCESS, options));
  };

  toast.info = function (content, options) {
    return dispatchToast(content, mergeOptions(TYPE.INFO, options));
  };

  toast.error = function (content, options) {
    return dispatchToast(content, mergeOptions(TYPE.ERROR, options));
  };

  toast.warning = function (content, options) {
    return dispatchToast(content, mergeOptions(TYPE.WARNING, options));
  };

  toast.dark = function (content, options) {
    return dispatchToast(content, mergeOptions(TYPE.DARK, options));
  };
  /**
   * Maybe I should remove warning in favor of warn, I don't know
   */


  toast.warn = toast.warning;
  /**
   * Remove toast programmaticaly
   */

  toast.dismiss = function (id) {
    return isAnyContainerMounted() && eventManager$1.emit(1
    /* Clear */
    , id);
  };
  /**
   * Clear waiting queue when limit is used
   */


  toast.clearWaitingQueue = function (params) {
    if (params === void 0) {
      params = {};
    }

    return isAnyContainerMounted() && eventManager$1.emit(5
    /* ClearWaitingQueue */
    , params);
  };
  /**
   * return true if one container is displaying the toast
   */


  toast.isActive = function (id) {
    var isToastActive = false;
    containers.forEach(function (container) {
      if (container.isToastActive && container.isToastActive(id)) {
        isToastActive = true;
      }
    });
    return isToastActive;
  };

  toast.update = function (toastId, options) {
    if (options === void 0) {
      options = {};
    }

    // if you call toast and toast.update directly nothing will be displayed
    // this is why I defered the update
    setTimeout(function () {
      var toast = getToast(toastId, options);

      if (toast) {
        var oldOptions = toast.props,
            oldContent = toast.content;

        var nextOptions = _extends$1(_extends$1(_extends$1({}, oldOptions), options), {}, {
          toastId: options.toastId || toastId,
          updateId: generateToastId()
        });

        if (nextOptions.toastId !== toastId) nextOptions.staleId = toastId;
        var content = typeof nextOptions.render !== 'undefined' ? nextOptions.render : oldContent;
        delete nextOptions.render;
        dispatchToast(content, nextOptions);
      }
    }, 0);
  };
  /**
   * Used for controlled progress bar.
   */


  toast.done = function (id) {
    toast.update(id, {
      progress: 1
    });
  };
  /**
   * Track changes. The callback get the number of toast displayed
   *
   */


  toast.onChange = function (callback) {
    if (isFn(callback)) {
      eventManager$1.on(4
      /* Change */
      , callback);
    }

    return function () {
      isFn(callback) && eventManager$1.off(4
      /* Change */
      , callback);
    };
  };
  /**
   * Configure the ToastContainer when lazy mounted
   */


  toast.configure = function (config) {
    if (config === void 0) {
      config = {};
    }

    lazy = true;
    containerConfig = config;
  };

  toast.POSITION = POSITION;
  toast.TYPE = TYPE;
  /**
   * Wait until the ToastContainer is mounted to dispatch the toast
   * and attach isActive method
   */

  eventManager$1.on(2
  /* DidMount */
  , function (containerInstance) {
    latestInstance = containerInstance.containerId || containerInstance;
    containers.set(latestInstance, containerInstance);
    queue.forEach(function (item) {
      eventManager$1.emit(0
      /* Show */
      , item.content, item.options);
    });
    queue = [];
  }).on(3
  /* WillUnmount */
  , function (containerInstance) {
    containers["delete"](containerInstance.containerId || containerInstance);

    if (containers.size === 0) {
      eventManager$1.off(0
      /* Show */
      ).off(1
      /* Clear */
      ).off(5
      /* ClearWaitingQueue */
      );
    }

    if (canUseDom && containerDomNode) {
      document.body.removeChild(containerDomNode);
    }
  });

  /**
   * `useKeeper` is a helper around `useRef`.
   *
   * You don't need to access the `.current`property to get the value
   * If refresh is set to true. The ref will be updated every render
   */

  function useKeeper(arg, refresh) {
    if (refresh === void 0) {
      refresh = false;
    }

    var ref = React.useRef(arg);
    React.useEffect(function () {
      if (refresh) ref.current = arg;
    });
    return ref.current;
  }

  function reducer$1(state, action) {
    switch (action.type) {
      case 'ADD':
        return [].concat(state, [action.toastId]).filter(function (id) {
          return id !== action.staleId;
        });

      case 'REMOVE':
        return hasToastId(action.toastId) ? state.filter(function (id) {
          return id !== action.toastId;
        }) : [];
    }
  }

  function useToastContainer(props) {
    var _useReducer = React.useReducer(function (x) {
      return x + 1;
    }, 0),
        forceUpdate = _useReducer[1];

    var _useReducer2 = React.useReducer(reducer$1, []),
        toast = _useReducer2[0],
        dispatch = _useReducer2[1];

    var containerRef = React.useRef(null);
    var toastCount = useKeeper(0);
    var queue = useKeeper([]);
    var collection = useKeeper({});
    var instance = useKeeper({
      toastKey: 1,
      displayedToast: 0,
      props: props,
      containerId: null,
      isToastActive: isToastActive,
      getToast: function getToast(id) {
        return collection[id] || null;
      }
    });
    React.useEffect(function () {
      instance.containerId = props.containerId;
      eventManager$1.cancelEmit(3
      /* WillUnmount */
      ).on(0
      /* Show */
      , buildToast).on(1
      /* Clear */
      , function (toastId) {
        return containerRef.current && removeToast(toastId);
      }).on(5
      /* ClearWaitingQueue */
      , clearWaitingQueue).emit(2
      /* DidMount */
      , instance);
      return function () {
        return eventManager$1.emit(3
        /* WillUnmount */
        , instance);
      };
    }, []);
    React.useEffect(function () {
      instance.isToastActive = isToastActive;
      instance.displayedToast = toast.length;
      eventManager$1.emit(4
      /* Change */
      , toast.length, props.containerId);
    }, [toast]);
    React.useEffect(function () {
      instance.props = props;
    });

    function isToastActive(id) {
      return toast.indexOf(id) !== -1;
    }

    function clearWaitingQueue(_ref) {
      var containerId = _ref.containerId;
      var _instance$props = instance.props,
          limit = _instance$props.limit,
          enableMultiContainer = _instance$props.enableMultiContainer;

      if (limit && (!containerId || instance.containerId === containerId && enableMultiContainer)) {
        toastCount -= queue.length;
        queue = [];
      }
    }

    function removeToast(toastId) {
      var queueLen = queue.length;
      toastCount = hasToastId(toastId) ? toastCount - 1 : toastCount - instance.displayedToast;
      if (toastCount < 0) toastCount = 0;

      if (queueLen > 0) {
        var freeSlot = hasToastId(toastId) ? 1 : instance.props.limit;

        if (queueLen === 1 || freeSlot === 1) {
          instance.displayedToast++;
          dequeueToast();
        } else {
          var toDequeue = freeSlot > queueLen ? queueLen : freeSlot;
          instance.displayedToast = toDequeue;

          for (var i = 0; i < toDequeue; i++) {
            dequeueToast();
          }
        }
      }

      dispatch({
        type: 'REMOVE',
        toastId: toastId
      });
    }

    function dequeueToast() {
      var _queue$shift = queue.shift(),
          toastContent = _queue$shift.toastContent,
          toastProps = _queue$shift.toastProps,
          staleId = _queue$shift.staleId; // ensure that exit transition has been completed, hence the timeout


      setTimeout(function () {
        appendToast(toastContent, toastProps, staleId);
      }, 500);
    }
    /**
     * check if a container is attached to the dom
     * check for multi-container, build only if associated
     * check for duplicate toastId if no update
     */


    function isNotValid(_ref2) {
      var containerId = _ref2.containerId,
          toastId = _ref2.toastId,
          updateId = _ref2.updateId;
      return !containerRef.current || instance.props.enableMultiContainer && containerId !== instance.props.containerId || instance.isToastActive(toastId) && updateId == null ? true : false;
    } // this function and all the function called inside needs to rely on ref(`useKeeper`)


    function buildToast(content, _ref3) {
      var delay = _ref3.delay,
          staleId = _ref3.staleId,
          options = _objectWithoutPropertiesLoose$3(_ref3, ["delay", "staleId"]);

      if (!canBeRendered(content) || isNotValid(options)) return;
      var toastId = options.toastId,
          updateId = options.updateId;
      var props = instance.props,
          isToastActive = instance.isToastActive;

      var closeToast = function closeToast() {
        return removeToast(toastId);
      };

      var isNotAnUpdate = !isToastActive(toastId);
      if (isNotAnUpdate) toastCount++;
      var toastProps = {
        toastId: toastId,
        updateId: updateId,
        key: options.key || instance.toastKey++,
        type: options.type,
        closeToast: closeToast,
        closeButton: options.closeButton,
        rtl: props.rtl,
        position: options.position || props.position,
        transition: options.transition || props.transition,
        className: parseClassName(options.className || props.toastClassName),
        bodyClassName: parseClassName(options.bodyClassName || props.bodyClassName),
        style: options.style || props.toastStyle,
        bodyStyle: options.bodyStyle || props.bodyStyle,
        onClick: options.onClick || props.onClick,
        pauseOnHover: isBool(options.pauseOnHover) ? options.pauseOnHover : props.pauseOnHover,
        pauseOnFocusLoss: isBool(options.pauseOnFocusLoss) ? options.pauseOnFocusLoss : props.pauseOnFocusLoss,
        draggable: isBool(options.draggable) ? options.draggable : props.draggable,
        draggablePercent: isNum(options.draggablePercent) ? options.draggablePercent : props.draggablePercent,
        closeOnClick: isBool(options.closeOnClick) ? options.closeOnClick : props.closeOnClick,
        progressClassName: parseClassName(options.progressClassName || props.progressClassName),
        progressStyle: options.progressStyle || props.progressStyle,
        autoClose: getAutoCloseDelay(options.autoClose, props.autoClose),
        hideProgressBar: isBool(options.hideProgressBar) ? options.hideProgressBar : props.hideProgressBar,
        progress: options.progress,
        role: isStr(options.role) ? options.role : props.role,
        deleteToast: function deleteToast() {
          removeFromCollection(toastId);
        }
      };
      if (isFn(options.onOpen)) toastProps.onOpen = options.onOpen;
      if (isFn(options.onClose)) toastProps.onClose = options.onClose;
      var closeButton = props.closeButton;

      if (options.closeButton === false || canBeRendered(options.closeButton)) {
        closeButton = options.closeButton;
      } else if (options.closeButton === true) {
        closeButton = canBeRendered(props.closeButton) ? props.closeButton : true;
      }

      toastProps.closeButton = closeButton;
      var toastContent = content;

      if (React.isValidElement(content) && !isStr(content.type)) {
        toastContent = React.cloneElement(content, {
          closeToast: closeToast
        });
      } else if (isFn(content)) {
        toastContent = content({
          closeToast: closeToast
        });
      } // not handling limit + delay by design. Waiting for user feedback first


      if (props.limit && props.limit > 0 && toastCount > props.limit && isNotAnUpdate) {
        queue.push({
          toastContent: toastContent,
          toastProps: toastProps,
          staleId: staleId
        });
      } else if (isNum(delay) && delay > 0) {
        setTimeout(function () {
          appendToast(toastContent, toastProps, staleId);
        }, delay);
      } else {
        appendToast(toastContent, toastProps, staleId);
      }
    }

    function appendToast(content, toastProps, staleId) {
      var toastId = toastProps.toastId;
      collection[toastId] = {
        content: content,
        props: toastProps
      };
      dispatch({
        type: 'ADD',
        toastId: toastId,
        staleId: staleId
      });
    }

    function removeFromCollection(toastId) {
      delete collection[toastId];
      forceUpdate();
    }

    function getToastToRender(cb) {
      var toastToRender = {};
      var toastList = props.newestOnTop ? Object.keys(collection).reverse() : Object.keys(collection);

      for (var i = 0; i < toastList.length; i++) {
        var _toast = collection[toastList[i]];
        var position = _toast.props.position;
        toastToRender[position] || (toastToRender[position] = []);
        toastToRender[position].push(_toast);
      }

      return Object.keys(toastToRender).map(function (p) {
        return cb(p, toastToRender[p]);
      });
    }

    return {
      getToastToRender: getToastToRender,
      collection: collection,
      containerRef: containerRef,
      isToastActive: isToastActive
    };
  }

  function getX(e) {
    return e.targetTouches && e.targetTouches.length >= 1 ? e.targetTouches[0].clientX : e.clientX;
  }

  function getY(e) {
    return e.targetTouches && e.targetTouches.length >= 1 ? e.targetTouches[0].clientY : e.clientY;
  }

  function useToast(props) {
    var _useState = React.useState(true),
        isRunning = _useState[0],
        setIsRunning = _useState[1];

    var _useState2 = React.useState(false),
        preventExitTransition = _useState2[0],
        setPreventExitTransition = _useState2[1];

    var toastRef = React.useRef(null);
    var drag = useKeeper({
      start: 0,
      x: 0,
      y: 0,
      deltaX: 0,
      removalDistance: 0,
      canCloseOnClick: true,
      canDrag: false,
      boundingRect: null
    });
    var syncProps = useKeeper(props, true);
    var autoClose = props.autoClose,
        pauseOnHover = props.pauseOnHover,
        closeToast = props.closeToast,
        onClick = props.onClick,
        closeOnClick = props.closeOnClick;
    React.useEffect(function () {
      if (isFn(props.onOpen)) props.onOpen(React.isValidElement(props.children) && props.children.props);
      return function () {
        if (isFn(syncProps.onClose)) syncProps.onClose(React.isValidElement(syncProps.children) && syncProps.children.props);
      };
    }, []);
    React.useEffect(function () {
      props.draggable && bindDragEvents();
      return function () {
        props.draggable && unbindDragEvents();
      };
    }, [props.draggable]);
    React.useEffect(function () {
      props.pauseOnFocusLoss && bindFocusEvents();
      return function () {
        props.pauseOnFocusLoss && unbindFocusEvents();
      };
    }, [props.pauseOnFocusLoss]);

    function onDragStart(e) {
      var toast = toastRef.current;
      drag.canCloseOnClick = true;
      drag.canDrag = true;
      drag.boundingRect = toast.getBoundingClientRect();
      toast.style.transition = '';
      drag.start = drag.x = getX(e.nativeEvent);
      drag.removalDistance = toast.offsetWidth * (props.draggablePercent / 100);
    }

    function onDragTransitionEnd() {
      if (drag.boundingRect) {
        var _drag$boundingRect = drag.boundingRect,
            top = _drag$boundingRect.top,
            bottom = _drag$boundingRect.bottom,
            left = _drag$boundingRect.left,
            right = _drag$boundingRect.right;

        if (props.pauseOnHover && drag.x >= left && drag.x <= right && drag.y >= top && drag.y <= bottom) {
          pauseToast();
        } else {
          playToast();
        }
      }
    }

    function playToast() {
      setIsRunning(true);
    }

    function pauseToast() {
      setIsRunning(false);
    }

    function bindFocusEvents() {
      window.addEventListener('focus', playToast);
      window.addEventListener('blur', pauseToast);
    }

    function unbindFocusEvents() {
      window.removeEventListener('focus', playToast);
      window.removeEventListener('blur', pauseToast);
    }

    function bindDragEvents() {
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchmove', onDragMove);
      document.addEventListener('touchend', onDragEnd);
    }

    function unbindDragEvents() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
    }

    function onDragMove(e) {
      var toast = toastRef.current;

      if (drag.canDrag) {
        if (isRunning) pauseToast();
        drag.x = getX(e);
        drag.deltaX = drag.x - drag.start;
        drag.y = getY(e); // prevent false positif during a toast click

        if (drag.start !== drag.x) drag.canCloseOnClick = false;
        toast.style.transform = "translateX(" + drag.deltaX + "px)";
        toast.style.opacity = "" + (1 - Math.abs(drag.deltaX / drag.removalDistance));
      }
    }

    function onDragEnd() {
      var toast = toastRef.current;

      if (drag.canDrag) {
        drag.canDrag = false;

        if (Math.abs(drag.deltaX) > drag.removalDistance) {
          setPreventExitTransition(true);
          props.closeToast();
          return;
        }

        toast.style.transition = 'transform 0.2s, opacity 0.2s';
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      }
    }

    var eventHandlers = {
      onMouseDown: onDragStart,
      onTouchStart: onDragStart,
      onMouseUp: onDragTransitionEnd,
      onTouchEnd: onDragTransitionEnd
    };

    if (autoClose && pauseOnHover) {
      eventHandlers.onMouseEnter = pauseToast;
      eventHandlers.onMouseLeave = playToast;
    } // prevent toast from closing when user drags the toast


    if (closeOnClick) {
      eventHandlers.onClick = function (e) {
        onClick && onClick(e);
        drag.canCloseOnClick && closeToast();
      };
    }

    return {
      playToast: playToast,
      pauseToast: pauseToast,
      isRunning: isRunning,
      preventExitTransition: preventExitTransition,
      toastRef: toastRef,
      eventHandlers: eventHandlers
    };
  }

  var css$2 = ".Toastify__toast-container{z-index:9999;-webkit-transform:translateZ(9999px);position:fixed;padding:4px;width:320px;box-sizing:border-box;color:#fff}.Toastify__toast-container--top-left{top:1em;left:1em}.Toastify__toast-container--top-center{top:1em;left:50%;transform:translateX(-50%)}.Toastify__toast-container--top-right{top:1em;right:1em}.Toastify__toast-container--bottom-left{bottom:1em;left:1em}.Toastify__toast-container--bottom-center{bottom:1em;left:50%;transform:translateX(-50%)}.Toastify__toast-container--bottom-right{bottom:1em;right:1em}@media only screen and (max-width:480px){.Toastify__toast-container{width:100vw;padding:0;left:0;margin:0}.Toastify__toast-container--top-center,.Toastify__toast-container--top-left,.Toastify__toast-container--top-right{top:0;transform:translateX(0)}.Toastify__toast-container--bottom-center,.Toastify__toast-container--bottom-left,.Toastify__toast-container--bottom-right{bottom:0;transform:translateX(0)}.Toastify__toast-container--rtl{right:0;left:auto}}.Toastify__toast{position:relative;min-height:64px;box-sizing:border-box;margin-bottom:1rem;padding:8px;border-radius:1px;box-shadow:0 1px 10px 0 rgba(0,0,0,.1),0 2px 15px 0 rgba(0,0,0,.05);display:-ms-flexbox;display:flex;-ms-flex-pack:justify;justify-content:space-between;max-height:800px;overflow:hidden;font-family:sans-serif;cursor:pointer;direction:ltr}.Toastify__toast--rtl{direction:rtl}.Toastify__toast--dark{background:#121212;color:#fff}.Toastify__toast--default{background:#fff;color:#aaa}.Toastify__toast--info{background:#3498db}.Toastify__toast--success{background:#07bc0c}.Toastify__toast--warning{background:#f1c40f}.Toastify__toast--error{background:#e74c3c}.Toastify__toast-body{margin:auto 0;-ms-flex:1 1 auto;flex:1 1 auto}@media only screen and (max-width:480px){.Toastify__toast{margin-bottom:0}}.Toastify__close-button{color:#fff;background:transparent;outline:none;border:none;padding:0;cursor:pointer;opacity:.7;transition:.3s ease;-ms-flex-item-align:start;align-self:flex-start}.Toastify__close-button--default{color:#000;opacity:.3}.Toastify__close-button>svg{fill:currentColor;height:16px;width:14px}.Toastify__close-button:focus,.Toastify__close-button:hover{opacity:1}@keyframes Toastify__trackProgress{0%{transform:scaleX(1)}to{transform:scaleX(0)}}.Toastify__progress-bar{position:absolute;bottom:0;left:0;width:100%;height:5px;z-index:9999;opacity:.7;background-color:hsla(0,0%,100%,.7);transform-origin:left}.Toastify__progress-bar--animated{animation:Toastify__trackProgress linear 1 forwards}.Toastify__progress-bar--controlled{transition:transform .2s}.Toastify__progress-bar--rtl{right:0;left:auto;transform-origin:right}.Toastify__progress-bar--default{background:linear-gradient(90deg,#4cd964,#5ac8fa,#007aff,#34aadc,#5856d6,#ff2d55)}.Toastify__progress-bar--dark{background:#bb86fc}@keyframes Toastify__bounceInRight{0%,60%,75%,90%,to{animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;transform:translate3d(3000px,0,0)}60%{opacity:1;transform:translate3d(-25px,0,0)}75%{transform:translate3d(10px,0,0)}90%{transform:translate3d(-5px,0,0)}to{transform:none}}@keyframes Toastify__bounceOutRight{20%{opacity:1;transform:translate3d(-20px,0,0)}to{opacity:0;transform:translate3d(2000px,0,0)}}@keyframes Toastify__bounceInLeft{0%,60%,75%,90%,to{animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;transform:translate3d(-3000px,0,0)}60%{opacity:1;transform:translate3d(25px,0,0)}75%{transform:translate3d(-10px,0,0)}90%{transform:translate3d(5px,0,0)}to{transform:none}}@keyframes Toastify__bounceOutLeft{20%{opacity:1;transform:translate3d(20px,0,0)}to{opacity:0;transform:translate3d(-2000px,0,0)}}@keyframes Toastify__bounceInUp{0%,60%,75%,90%,to{animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;transform:translate3d(0,3000px,0)}60%{opacity:1;transform:translate3d(0,-20px,0)}75%{transform:translate3d(0,10px,0)}90%{transform:translate3d(0,-5px,0)}to{transform:translateZ(0)}}@keyframes Toastify__bounceOutUp{20%{transform:translate3d(0,-10px,0)}40%,45%{opacity:1;transform:translate3d(0,20px,0)}to{opacity:0;transform:translate3d(0,-2000px,0)}}@keyframes Toastify__bounceInDown{0%,60%,75%,90%,to{animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;transform:translate3d(0,-3000px,0)}60%{opacity:1;transform:translate3d(0,25px,0)}75%{transform:translate3d(0,-10px,0)}90%{transform:translate3d(0,5px,0)}to{transform:none}}@keyframes Toastify__bounceOutDown{20%{transform:translate3d(0,10px,0)}40%,45%{opacity:1;transform:translate3d(0,-20px,0)}to{opacity:0;transform:translate3d(0,2000px,0)}}.Toastify__bounce-enter--bottom-left,.Toastify__bounce-enter--top-left{animation-name:Toastify__bounceInLeft}.Toastify__bounce-enter--bottom-right,.Toastify__bounce-enter--top-right{animation-name:Toastify__bounceInRight}.Toastify__bounce-enter--top-center{animation-name:Toastify__bounceInDown}.Toastify__bounce-enter--bottom-center{animation-name:Toastify__bounceInUp}.Toastify__bounce-exit--bottom-left,.Toastify__bounce-exit--top-left{animation-name:Toastify__bounceOutLeft}.Toastify__bounce-exit--bottom-right,.Toastify__bounce-exit--top-right{animation-name:Toastify__bounceOutRight}.Toastify__bounce-exit--top-center{animation-name:Toastify__bounceOutUp}.Toastify__bounce-exit--bottom-center{animation-name:Toastify__bounceOutDown}@keyframes Toastify__zoomIn{0%{opacity:0;transform:scale3d(.3,.3,.3)}50%{opacity:1}}@keyframes Toastify__zoomOut{0%{opacity:1}50%{opacity:0;transform:scale3d(.3,.3,.3)}to{opacity:0}}.Toastify__zoom-enter{animation-name:Toastify__zoomIn}.Toastify__zoom-exit{animation-name:Toastify__zoomOut}@keyframes Toastify__flipIn{0%{transform:perspective(400px) rotateX(90deg);animation-timing-function:ease-in;opacity:0}40%{transform:perspective(400px) rotateX(-20deg);animation-timing-function:ease-in}60%{transform:perspective(400px) rotateX(10deg);opacity:1}80%{transform:perspective(400px) rotateX(-5deg)}to{transform:perspective(400px)}}@keyframes Toastify__flipOut{0%{transform:perspective(400px)}30%{transform:perspective(400px) rotateX(-20deg);opacity:1}to{transform:perspective(400px) rotateX(90deg);opacity:0}}.Toastify__flip-enter{animation-name:Toastify__flipIn}.Toastify__flip-exit{animation-name:Toastify__flipOut}@keyframes Toastify__slideInRight{0%{transform:translate3d(110%,0,0);visibility:visible}to{transform:translateZ(0)}}@keyframes Toastify__slideInLeft{0%{transform:translate3d(-110%,0,0);visibility:visible}to{transform:translateZ(0)}}@keyframes Toastify__slideInUp{0%{transform:translate3d(0,110%,0);visibility:visible}to{transform:translateZ(0)}}@keyframes Toastify__slideInDown{0%{transform:translate3d(0,-110%,0);visibility:visible}to{transform:translateZ(0)}}@keyframes Toastify__slideOutRight{0%{transform:translateZ(0)}to{visibility:hidden;transform:translate3d(110%,0,0)}}@keyframes Toastify__slideOutLeft{0%{transform:translateZ(0)}to{visibility:hidden;transform:translate3d(-110%,0,0)}}@keyframes Toastify__slideOutDown{0%{transform:translateZ(0)}to{visibility:hidden;transform:translate3d(0,500px,0)}}@keyframes Toastify__slideOutUp{0%{transform:translateZ(0)}to{visibility:hidden;transform:translate3d(0,-500px,0)}}.Toastify__slide-enter--bottom-left,.Toastify__slide-enter--top-left{animation-name:Toastify__slideInLeft}.Toastify__slide-enter--bottom-right,.Toastify__slide-enter--top-right{animation-name:Toastify__slideInRight}.Toastify__slide-enter--top-center{animation-name:Toastify__slideInDown}.Toastify__slide-enter--bottom-center{animation-name:Toastify__slideInUp}.Toastify__slide-exit--bottom-left,.Toastify__slide-exit--top-left{animation-name:Toastify__slideOutLeft}.Toastify__slide-exit--bottom-right,.Toastify__slide-exit--top-right{animation-name:Toastify__slideOutRight}.Toastify__slide-exit--top-center{animation-name:Toastify__slideOutUp}.Toastify__slide-exit--bottom-center{animation-name:Toastify__slideOutDown}.cui .Toastify__toast{min-height:unset!important;padding:unset;overflow:unset;font-family:unset;box-shadow:unset}.cui .Toastify__toast--default,.cui .Toastify__toast-container{color:unset}";
  styleInject(css$2);

  const copyStringToClipboard = str => {
    // Create new element
    const el = document.createElement("textarea"); // Set value (string to be copied)

    el.value = str; // Set non-editable to avoid focus and move outside of view

    el.setAttribute("readonly", "");
    el.style = {
      position: "absolute",
      left: "-9999px"
    };
    document.body.appendChild(el); // Select text inside element

    el.select(); // Copy text to clipboard

    document.execCommand("copy"); // Remove temporary element

    document.body.removeChild(el);
  };

  const iconType = type => {
    switch (type) {
      case "success":
        return "text-success icon-check-outline";

      case "error":
        return "text-danger icon-error-outline";

      case "warning":
        return "text-warning icon-warning-outline";

      case "info":
        return "text-info icon-info-outline";

      case "none":
        return null;

      default:
        return "text-muted icon-alert";
    }
  };

  const ToastIcon = ({
    type
  }) => {
    return React__default.createElement("div", {
      className: `toast__icon ${iconType(type) || ""}`
    });
  };

  const Toast$1 = ({
    title,
    message,
    type,
    copyError
  }) => React__default.createElement("div", {
    className: "toast"
  }, React__default.createElement(ToastIcon, {
    type: type
  }), React__default.createElement("div", {
    className: "toast__body"
  }, title ? React__default.createElement("div", {
    className: "toast__title"
  }, title) : null, message ? React__default.createElement("div", {
    className: "toast__message"
  }, message, type === "error" && copyError ? React__default.createElement(React__default.Fragment, null, React__default.createElement("br", null), React__default.createElement("br", null), React__default.createElement("a", {
    onClick: () => copyStringToClipboard(message)
  }, "Copy to clipboard")) : null) : null));

  const Fade = cssTransition({
    enter: "fadeIn",
    exit: "fadeOut",
    duration: 300
  });
  const toast$1 = (type, title, message, copyError = true, containerId = "_GLOBAL_") => toast(React__default.createElement(Toast$1, {
    type,
    title,
    message,
    copyError
  }), {
    containerId
  });

  toast$1.success = (...args) => toast$1("success", ...args);

  toast$1.error = (...args) => toast$1("error", ...args);

  toast$1.warning = (...args) => toast$1("warning", ...args);

  toast$1.info = (...args) => toast$1("info", ...args);

  toast$1.none = (...args) => toast$1("none", ...args);

  toast$1.update = (...args) => toast.update(...args);

  toast$1.dismiss = (...args) => toast.dismiss(...args);

  const ToastContainer$1 = props => React__default.createElement(ToastContainer, _extends({
    transition: Fade
  }, props, {
    closeButton: false,
    style: {
      width: "unset"
    }
  }));
  ToastContainer$1.propTypes = {
    position: PropTypes.string,
    autoClose: PropTypes.number,
    draggable: PropTypes.bool,
    hideProgressBar: PropTypes.bool,
    containerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  };
  ToastContainer$1.defaultProps = {
    position: "bottom-right",
    autoClose: 5000,
    draggable: false,
    hideProgressBar: true,
    containerId: "_GLOBAL_"
  };

  const Header = (_ref) => {
    let {
      children,
      fluid
    } = _ref,
        props = _objectWithoutProperties(_ref, ["children", "fluid"]);

    return React__default.createElement("header", _extends({
      className: "header"
    }, props), React__default.createElement("div", {
      className: `container${fluid ? "-fluid" : ""}`
    }, React__default.createElement("div", {
      className: "header-panels"
    }, children)));
  };
  Header.propTypes = {
    children: PropTypes.node.isRequired,
    fluid: PropTypes.bool
  };
  Header.defaultProps = {
    fluid: false
  };
  const HeaderPanel = (_ref2) => {
    let {
      children,
      center,
      right
    } = _ref2,
        props = _objectWithoutProperties(_ref2, ["children", "center", "right"]);

    return React__default.createElement("div", _extends({
      className: `header-panel${center ? " header-panel--center" : ""}${right ? " header-panel--right" : ""}`
    }, props), children);
  };
  HeaderPanel.propTypes = {
    children: PropTypes.node.isRequired,
    center: PropTypes.bool,
    right: PropTypes.bool
  };
  HeaderPanel.defaultProps = {
    center: false,
    right: false
  };
  const HeaderTitle = (_ref3) => {
    let {
      icon,
      link,
      title
    } = _ref3,
        props = _objectWithoutProperties(_ref3, ["icon", "link", "title"]);

    return React__default.createElement(HeaderPanel, props, icon ? React__default.createElement("a", {
      className: "header__logo",
      href: link || "http://www.cisco.com",
      target: "_blank",
      rel: "noopener noreferrer"
    }, React__default.createElement("span", {
      className: typeof icon === "string" ? `icon-${icon}` : "icon-cisco"
    })) : null, React__default.createElement("div", {
      className: "header__title"
    }, title));
  };
  HeaderTitle.propTypes = {
    icon: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    link: PropTypes.string,
    title: PropTypes.string.isRequired
  };
  HeaderTitle.defaultProps = {
    icon: true,
    link: null
  };

  const Footer = () => React__default.createElement("footer", {
    className: "footer"
  }, React__default.createElement("div", {
    className: "footer__links"
  }, React__default.createElement("ul", {
    className: "list list--inline"
  }, React__default.createElement("li", null, React__default.createElement("a", {
    href: "http://www.cisco.com/cisco/web/siteassets/contacts/index.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Contacts")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://secure.opinionlab.com/ccc01/o.asp?id=jBjOhqOJ",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Feedback")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://www.cisco.com/c/en/us/about/help.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Help")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "http://www.cisco.com/c/en/us/about/sitemap.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Site Map")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://www.cisco.com/c/en/us/about/legal/terms-conditions.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Terms & Conditions")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://www.cisco.com/c/en/us/about/legal/privacy-full.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Privacy Statement")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://www.cisco.com/c/en/us/about/legal/privacy-full.html#cookies",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Cookie Policy")), React__default.createElement("li", null, React__default.createElement("a", {
    href: "https://www.cisco.com/c/en/us/about/legal/trademarks.html",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Trademarks")))));

  const Wrapper = React__default.createElement("div", {
    className: "responsive-table"
  });
  const GenericTable = (_ref) => {
    let {
      outerWrap,
      lined,
      bordered,
      striped,
      selectable,
      fixed,
      wrapped,
      compressed,
      loose,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["outerWrap", "lined", "bordered", "striped", "selectable", "fixed", "wrapped", "compressed", "loose", "className"]);

    return React__default.createElement(ConditionalWrapper, {
      condition: outerWrap,
      wrapper: Wrapper
    }, React__default.createElement("table", _extends({
      className: `table${appendClass(lined, "table--lined")}${appendClass(bordered, "table--bordered")}${appendClass(striped, "table--striped")}${appendClass(selectable, "table--selectable")}${appendClass(fixed, "table--fixed")}${appendClass(wrapped, "table--wrapped")}${appendClass(compressed, "table--compressed")}${appendClass(loose, "table--loose")}${appendClass(className)}`
    }, props)));
  };
  GenericTable.propTypes = {
    outerWrap: PropTypes.bool,
    lined: PropTypes.bool,
    bordered: PropTypes.bool,
    striped: PropTypes.bool,
    selectable: PropTypes.bool,
    fixed: PropTypes.bool,
    wrapped: PropTypes.bool,
    compressed: PropTypes.bool,
    loose: PropTypes.bool,
    className: PropTypes.string
  };
  GenericTable.defaultProps = {
    outerWrap: true,
    lined: false,
    bordered: false,
    striped: false,
    selectable: false,
    fixed: false,
    wrapped: false,
    compressed: false,
    loose: false,
    className: null
  };

  const PaginationContext = React__default.createContext({});

  const Button$1 = ({
    active,
    content,
    disabled,
    position
  }) => React__default.createElement(PaginationContext.Consumer, null, ({
    changePage
  }) => React__default.createElement("li", {
    className: active ? "active" : ""
  }, React__default.createElement("a", {
    className: disabled ? "disabled" : "",
    onClick: e => changePage(e, position)
  }, content)));

  Button$1.propTypes = {
    active: PropTypes.bool,
    content: PropTypes.node.isRequired,
    disabled: PropTypes.bool,
    position: PropTypes.number.isRequired
  };
  Button$1.defaultProps = {
    active: false,
    disabled: false
  };

  const FirstPrev = () => {
    const {
      perPage,
      firstAndLast,
      position,
      icons,
      prev,
      beginAt
    } = React__default.useContext(PaginationContext);
    const disabled = position < perPage + beginAt;
    const r = [];
    if (icons && firstAndLast) r.push(React__default.createElement(Button$1, {
      content: React__default.createElement("span", {
        className: "icon-chevron-left-double"
      }),
      disabled: disabled,
      key: "first-page",
      position: beginAt
    }));
    r.push(React__default.createElement(Button$1, {
      content: icons ? React__default.createElement("span", {
        className: "icon-chevron-left"
      }) : prev,
      disabled: disabled,
      key: "previous-page",
      position: position - perPage
    }));
    return r;
  };

  const NextLast = () => {
    const {
      beginAt,
      perPage,
      total,
      firstAndLast,
      position,
      icons,
      next
    } = React__default.useContext(PaginationContext);
    const pages = Math.floor(total / perPage) + 1;
    const disabled = position > total - perPage + beginAt;
    const r = [];
    r.push(React__default.createElement(Button$1, {
      content: icons ? React__default.createElement("span", {
        className: "icon-chevron-right"
      }) : next,
      disabled: disabled,
      key: "next-page",
      position: position + perPage
    }));
    if (icons && firstAndLast) r.push(React__default.createElement(Button$1, {
      content: React__default.createElement("span", {
        className: "icon-chevron-right-double"
      }),
      disabled: disabled,
      key: "last-page",
      position: (pages - 1) * perPage + beginAt
    }));
    return r;
  };

  const Pages = ({
    start,
    finish
  }) => React__default.createElement(PaginationContext.Consumer, null, ({
    perPage,
    active,
    beginAt
  }) => [...Array(finish - start + 1)].map((v, i) => {
    const current = start + i;
    return React__default.createElement(Button$1, {
      active: active === current,
      content: `${current}`,
      key: `${current}-page`,
      position: (current - 1) * perPage + beginAt
    });
  }));

  Pages.propTypes = {
    start: PropTypes.number.isRequired,
    finish: PropTypes.number.isRequired
  };

  const Pagination = (_ref) => {
    let {
      size,
      rounded,
      icons,
      next,
      prev,
      position,
      perPage,
      total,
      onPageChange,
      className,
      firstAndLast,
      beginAt
    } = _ref,
        rest = _objectWithoutProperties(_ref, ["size", "rounded", "icons", "next", "prev", "position", "perPage", "total", "onPageChange", "className", "firstAndLast", "beginAt"]);

    const pages = Math.ceil(total / perPage);
    const active = Math.floor(position / perPage) + 1;

    const changePage = (e, newPosition) => {
      if (typeof onPageChange === "function") onPageChange(e, newPosition);
    };

    return React__default.createElement(PaginationContext.Provider, {
      value: {
        active,
        beginAt,
        changePage,
        firstAndLast,
        icons,
        next,
        perPage,
        position,
        prev,
        total
      }
    }, React__default.createElement("ul", _extends({
      className: `pagination${size !== "default" ? ` pagination--${size}` : ""}${rounded ? " pagination--rounded" : ""}${className ? ` ${className}` : ""}`
    }, rest), React__default.createElement(FirstPrev, null), active < 4 || pages === 4 ? React__default.createElement(React__default.Fragment, null, React__default.createElement(Pages, {
      start: 1,
      finish: Math.min(pages, 4)
    }), pages > 4 ? React__default.createElement(React__default.Fragment, null, React__default.createElement("li", null, React__default.createElement("span", {
      className: "icon-more"
    })), React__default.createElement(Button$1, {
      content: pages,
      key: `${pages}-page`,
      position: (pages - 1) * perPage + beginAt
    })) : null) : React__default.createElement(React__default.Fragment, null, React__default.createElement(Button$1, {
      active: active === beginAt,
      content: "1",
      key: "1-page",
      position: beginAt
    }), React__default.createElement("li", null, React__default.createElement("span", {
      className: "icon-more"
    })), active < pages - 2 ? React__default.createElement(React__default.Fragment, null, React__default.createElement(Pages, {
      start: active - 1,
      finish: active + 1
    }), React__default.createElement("li", null, React__default.createElement("span", {
      className: "icon-more"
    })), React__default.createElement(Button$1, {
      active: active === pages,
      content: pages,
      key: `${pages}-page`,
      position: (pages - 1) * perPage + beginAt
    })) : React__default.createElement(Pages, {
      start: pages - 3,
      finish: pages
    })), React__default.createElement(NextLast, null)));
  };

  Pagination.propTypes = {
    size: PropTypes.oneOf(["small", "default", "large"]),
    rounded: PropTypes.bool,
    icons: PropTypes.bool,
    next: PropTypes.node,
    prev: PropTypes.node,
    position: PropTypes.number.isRequired,
    perPage: PropTypes.number,
    total: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    firstAndLast: PropTypes.bool,
    beginAt: PropTypes.number,
    className: PropTypes.string
  };
  Pagination.defaultProps = {
    beginAt: 1,
    rounded: false,
    firstAndLast: true,
    icons: false,
    next: "Next",
    perPage: 1,
    prev: "Previous",
    size: "default",
    className: null
  };

  const DefaultTablePagination = ({
    total,
    position,
    onPageChange,
    onPerPageChange,
    perPageUp,
    paginationProps
  }) => {
    const [perPage, setPerPage] = React__default.useState(50);
    React__default.useEffect(() => {
      if (typeof onPerPageChange === "function") onPerPageChange(perPage);
    }, [perPage, onPerPageChange]);
    return React__default.createElement("div", {
      className: "flex-middle"
    }, React__default.createElement("span", {
      className: "qtr-margin-right"
    }, "Page:"), React__default.createElement(Pagination, _extends({
      firstAndLast: true,
      icons: true,
      perPage: perPage,
      total: total,
      position: position,
      onPageChange: onPageChange,
      beginAt: 0,
      className: "no-margin-top"
    }, paginationProps)), React__default.createElement("span", {
      className: "text-muted qtr-margin-left qtr-margin-right"
    }, "|"), React__default.createElement("span", {
      className: "qtr-margin-right"
    }, "Per page:"), React__default.createElement(Dropdown, {
      type: "link",
      header: perPage,
      openTo: "left",
      alwaysClose: true,
      up: perPageUp
    }, [10, 25, 50, 100, 250, 500].map(v => React__default.createElement(Dropdown.Element, {
      onClick: () => setPerPage(v),
      key: v,
      selected: v === perPage
    }, v))));
  };
  DefaultTablePagination.propTypes = {
    total: PropTypes.number.isRequired,
    position: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    onPerPageChange: PropTypes.func.isRequired,
    perPageUp: PropTypes.bool,
    paginationProps: PropTypes.exact({
      size: PropTypes.oneOf(["small", "default", "large"]),
      rounded: PropTypes.bool,
      icons: PropTypes.bool,
      next: PropTypes.node,
      prev: PropTypes.node,
      firstAndLast: PropTypes.bool
    })
  };
  DefaultTablePagination.defaultProps = {
    perPageUp: false,
    paginationProps: {}
  };

  const asArray = v => Array.isArray(v) ? v : [v];

  const PAGINATION_LOCATION = ["top-left", "bottom-left", "bottom-right", "top-right"];

  const Table = (_ref) => {
    let {
      pagination,
      paginationLocation,
      paginationProps,
      data,
      children,
      start
    } = _ref,
        props = _objectWithoutProperties(_ref, ["pagination", "paginationLocation", "paginationProps", "data", "children", "start"]);

    const [position, setPosition] = React__default.useState(typeof start === "number" ? start : 0);
    const [perPage, setPerPage] = React__default.useState(50);
    const tbody = React__default.useMemo(() => children ? asArray(children).find(child => child.type === "tbody") : null, [children]);
    const thead = React__default.useMemo(() => children ? asArray(children).find(child => child.type === "thead") : null, [children]);
    const total = React__default.useMemo(() => (data ? data.length : asArray(tbody.props.children).length) || 0, [data, tbody]);
    React__default.useEffect(() => setPosition(0), [data, tbody]);
    return React__default.createElement(React__default.Fragment, null, React__default.createElement(DisplayIf, {
      condition: paginationLocation.includes("top-")
    }, React__default.createElement("div", {
      className: `flex base-margin-bottom${appendClass(paginationLocation === "top-right", "flex-right")}`
    }, React__default.createElement(pagination, {
      total,
      position,
      onPageChange: (_, p) => setPosition(p),
      onPerPageChange: p => setPerPage(p),
      paginationProps
    }))), React__default.createElement(GenericTable, props, thead, React__default.createElement("tbody", null, data ? data.slice(position, position + perPage).map((row, rid) => React__default.createElement("tr", {
      key: rid
    }, row.map((col, cid) => React__default.createElement("td", {
      key: cid
    }, col)))) : asArray(tbody.props.children).slice(position, position + perPage))), React__default.createElement(DisplayIf, {
      condition: paginationLocation.includes("bottom-")
    }, React__default.createElement("div", {
      className: `flex base-margin-top${appendClass(paginationLocation === "bottom-right", "flex-right")}`
    }, React__default.createElement(pagination, {
      total,
      position,
      onPageChange: (_, p) => setPosition(p),
      onPerPageChange: p => setPerPage(p),
      perPageUp: true,
      paginationProps
    }))));
  };

  const ALLOWED_TABLE_CHILD = ["thead", "tbody"];

  const allowedChild = type => ALLOWED_TABLE_CHILD.includes(type);

  Table.propTypes = {
    pagination: PropTypes.elementType,
    paginationLocation: PropTypes.oneOf(PAGINATION_LOCATION),
    paginationProps: PropTypes.exact({
      size: PropTypes.oneOf(["small", "default", "large"]),
      rounded: PropTypes.bool,
      icons: PropTypes.bool,
      next: PropTypes.node,
      prev: PropTypes.node,
      firstAndLast: PropTypes.bool
    }),
    data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.any)),
    children: (props, propName, componentName) => {
      const {
        [propName]: t
      } = props;
      const err = new Error(`Invalid prop \`${propName}\` supplied to` + ` \`${componentName}\`. Validation failed, should be one of:` + ` ${ALLOWED_TABLE_CHILD.join(", ")}.`);

      if (Array.isArray(t)) {
        if (!t.every(ch => allowedChild(ch.type))) return err;
      } else if (t && !allowedChild(t.type)) return err;

      return null;
    },
    start: PropTypes.number
  };
  Table.defaultProps = {
    pagination: DefaultTablePagination,
    paginationLocation: "bottom-right",
    paginationProps: {
      icons: true,
      firstAndLast: true
    },
    data: null,
    children: null,
    start: 1
  };

  const Checkbox = ({
    field,
    form,
    inline,
    asFormGroup,
    children
  }) => React__default.createElement(ConditionalWrapper, {
    condition: asFormGroup,
    wrapper: React__default.createElement("div", {
      className: `form-group ${inline ? "form-group--inline" : ""}`
    })
  }, React__default.createElement("label", {
    className: "checkbox"
  }, React__default.createElement("input", _extends({
    type: "checkbox"
  }, field, {
    checked: formik.getIn(form.values, field.name, false)
  })), React__default.createElement("span", {
    className: "checkbox__input"
  }), children ? React__default.createElement("span", {
    className: "checkbox__label"
  }, children) : null));

  Checkbox.propTypes = {
    inline: PropTypes.bool,
    asFormGroup: PropTypes.bool,
    form: PropTypes.shape({
      values: PropTypes.object
    }).isRequired,
    field: PropTypes.shape({
      name: PropTypes.string,
      onChange: PropTypes.func
    }).isRequired,
    children: PropTypes.node
  };
  Checkbox.defaultProps = {
    inline: false,
    asFormGroup: true,
    children: null
  };

  const Switch = ({
    field,
    left,
    right,
    disabled,
    inline,
    className,
    asFormGroup,
    form,
    spacing,
    id,
    style
  }) => React__default.createElement(ConditionalWrapper, {
    condition: asFormGroup,
    wrapper: React__default.createElement("div", {
      className: `form-group${appendClass(inline, "form-group--inline")}${appendClass(className)}${appendClass(spacing, ` form-group--${spacing}`)}`,
      style: style
    })
  }, React__default.createElement("label", {
    className: `switch${disabled ? " disabled" : ""}`,
    htmlFor: id || field.name
  }, React__default.createElement("input", _extends({
    type: "checkbox"
  }, field, {
    id: id || field.name,
    checked: formik.getIn(form.values, field.name, false)
  })), left ? React__default.createElement("span", {
    className: "switch__label"
  }, left) : null, React__default.createElement("span", {
    className: "switch__input"
  }), right ? React__default.createElement("span", {
    className: "switch__label"
  }, right) : null));

  Switch.propTypes = {
    left: PropTypes.node,
    right: PropTypes.node,
    disabled: PropTypes.bool,
    inline: PropTypes.bool,
    spacing: PropTypes.oneOf([false, "compressed", "loose"]),
    asFormGroup: PropTypes.bool,
    form: PropTypes.shape({
      values: PropTypes.object
    }).isRequired,
    field: PropTypes.shape({
      name: PropTypes.string,
      onChange: PropTypes.func
    }).isRequired,
    className: PropTypes.string,
    id: PropTypes.string,
    style: PropTypes.shape({})
  };
  Switch.defaultProps = {
    left: null,
    right: null,
    disabled: false,
    inline: false,
    spacing: false,
    asFormGroup: true,
    className: null,
    id: null,
    style: null
  };

  const Input = (_ref) => {
    let {
      className,
      id,
      field,
      label,
      type,
      form: {
        touched,
        errors
      },
      inputRef,
      inline,
      icon,
      iconClick,
      helpBlock,
      plain
    } = _ref,
        rest = _objectWithoutProperties(_ref, ["className", "id", "field", "label", "type", "form", "inputRef", "inline", "icon", "iconClick", "helpBlock", "plain"]);

    return React__default.createElement("div", {
      className: `form-group${appendClass(className)}${appendClass(formik.getIn(touched, field.name) && formik.getIn(errors, field.name), "form-group--error")}${appendClass(inline === "form" || inline === "both", "form-group--inline")}${appendClass(inline === "label" || inline === "both", "label--inline")}${appendClass(icon, "input--icon")}`
    }, React__default.createElement("div", {
      className: "form-group__text"
    }, React__default.createElement("input", _extends({}, field, {
      id: id || field.name,
      type: type,
      ref: inputRef
    }, rest, {
      className: appendClass(plain, "form-group--plaintext")
    })), label ? React__default.createElement("label", {
      htmlFor: id || field.name
    }, label) : null, icon ? React__default.createElement("button", {
      type: "button",
      className: "link",
      tabIndex: "-1",
      onClick: iconClick
    }, React__default.createElement("span", {
      className: `icon-${icon}`
    })) : null), React__default.createElement(DisplayIf, {
      condition: !inline && helpBlock && !!formik.getIn(touched, field.name) && !!formik.getIn(errors, field.name)
    }, React__default.createElement(InputHelpBlock, {
      text: formik.getIn(errors, field.name)
    })));
  };

  Input.propTypes = {
    label: PropTypes.node,
    type: PropTypes.string,
    inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({
      current: PropTypes.instanceOf(Element)
    })]),
    inline: PropTypes.oneOf([false, "group", "label", "both"]),
    helpBlock: PropTypes.bool,
    form: PropTypes.shape({
      values: PropTypes.object,
      touched: PropTypes.shape({}),
      errors: PropTypes.shape({})
    }).isRequired,
    field: PropTypes.shape({
      name: PropTypes.string,
      onChange: PropTypes.func
    }).isRequired,
    iconClick: PropTypes.func,
    icon: PropTypes.string,
    id: PropTypes.string,
    className: PropTypes.string,
    plain: PropTypes.bool
  };
  Input.defaultProps = {
    type: "text",
    inline: false,
    helpBlock: true,
    label: null,
    icon: null,
    iconClick: null,
    id: null,
    className: null,
    plain: false,
    inputRef: null
  };

  var config$1 = {
    disabled: false
  };

  var TransitionGroupContext$1 = React__default.createContext(null);

  var UNMOUNTED$1 = 'unmounted';
  var EXITED$1 = 'exited';
  var ENTERING$1 = 'entering';
  var ENTERED$1 = 'entered';
  var EXITING$1 = 'exiting';
  /**
   * The Transition component lets you describe a transition from one component
   * state to another _over time_ with a simple declarative API. Most commonly
   * it's used to animate the mounting and unmounting of a component, but can also
   * be used to describe in-place transition states as well.
   *
   * ---
   *
   * **Note**: `Transition` is a platform-agnostic base component. If you're using
   * transitions in CSS, you'll probably want to use
   * [`CSSTransition`](https://reactcommunity.org/react-transition-group/css-transition)
   * instead. It inherits all the features of `Transition`, but contains
   * additional features necessary to play nice with CSS transitions (hence the
   * name of the component).
   *
   * ---
   *
   * By default the `Transition` component does not alter the behavior of the
   * component it renders, it only tracks "enter" and "exit" states for the
   * components. It's up to you to give meaning and effect to those states. For
   * example we can add styles to a component when it enters or exits:
   *
   * ```jsx
   * import { Transition } from 'react-transition-group';
   *
   * const duration = 300;
   *
   * const defaultStyle = {
   *   transition: `opacity ${duration}ms ease-in-out`,
   *   opacity: 0,
   * }
   *
   * const transitionStyles = {
   *   entering: { opacity: 1 },
   *   entered:  { opacity: 1 },
   *   exiting:  { opacity: 0 },
   *   exited:  { opacity: 0 },
   * };
   *
   * const Fade = ({ in: inProp }) => (
   *   <Transition in={inProp} timeout={duration}>
   *     {state => (
   *       <div style={{
   *         ...defaultStyle,
   *         ...transitionStyles[state]
   *       }}>
   *         I'm a fade Transition!
   *       </div>
   *     )}
   *   </Transition>
   * );
   * ```
   *
   * There are 4 main states a Transition can be in:
   *  - `'entering'`
   *  - `'entered'`
   *  - `'exiting'`
   *  - `'exited'`
   *
   * Transition state is toggled via the `in` prop. When `true` the component
   * begins the "Enter" stage. During this stage, the component will shift from
   * its current transition state, to `'entering'` for the duration of the
   * transition and then to the `'entered'` stage once it's complete. Let's take
   * the following example (we'll use the
   * [useState](https://reactjs.org/docs/hooks-reference.html#usestate) hook):
   *
   * ```jsx
   * function App() {
   *   const [inProp, setInProp] = useState(false);
   *   return (
   *     <div>
   *       <Transition in={inProp} timeout={500}>
   *         {state => (
   *           // ...
   *         )}
   *       </Transition>
   *       <button onClick={() => setInProp(true)}>
   *         Click to Enter
   *       </button>
   *     </div>
   *   );
   * }
   * ```
   *
   * When the button is clicked the component will shift to the `'entering'` state
   * and stay there for 500ms (the value of `timeout`) before it finally switches
   * to `'entered'`.
   *
   * When `in` is `false` the same thing happens except the state moves from
   * `'exiting'` to `'exited'`.
   */

  var Transition$1 =
  /*#__PURE__*/
  function (_React$Component) {
    _inheritsLoose(Transition, _React$Component);

    function Transition(props, context) {
      var _this;

      _this = _React$Component.call(this, props, context) || this;
      var parentGroup = context; // In the context of a TransitionGroup all enters are really appears

      var appear = parentGroup && !parentGroup.isMounting ? props.enter : props.appear;
      var initialStatus;
      _this.appearStatus = null;

      if (props.in) {
        if (appear) {
          initialStatus = EXITED$1;
          _this.appearStatus = ENTERING$1;
        } else {
          initialStatus = ENTERED$1;
        }
      } else {
        if (props.unmountOnExit || props.mountOnEnter) {
          initialStatus = UNMOUNTED$1;
        } else {
          initialStatus = EXITED$1;
        }
      }

      _this.state = {
        status: initialStatus
      };
      _this.nextCallback = null;
      return _this;
    }

    Transition.getDerivedStateFromProps = function getDerivedStateFromProps(_ref, prevState) {
      var nextIn = _ref.in;

      if (nextIn && prevState.status === UNMOUNTED$1) {
        return {
          status: EXITED$1
        };
      }

      return null;
    }; // getSnapshotBeforeUpdate(prevProps) {
    //   let nextStatus = null
    //   if (prevProps !== this.props) {
    //     const { status } = this.state
    //     if (this.props.in) {
    //       if (status !== ENTERING && status !== ENTERED) {
    //         nextStatus = ENTERING
    //       }
    //     } else {
    //       if (status === ENTERING || status === ENTERED) {
    //         nextStatus = EXITING
    //       }
    //     }
    //   }
    //   return { nextStatus }
    // }


    var _proto = Transition.prototype;

    _proto.componentDidMount = function componentDidMount() {
      this.updateStatus(true, this.appearStatus);
    };

    _proto.componentDidUpdate = function componentDidUpdate(prevProps) {
      var nextStatus = null;

      if (prevProps !== this.props) {
        var status = this.state.status;

        if (this.props.in) {
          if (status !== ENTERING$1 && status !== ENTERED$1) {
            nextStatus = ENTERING$1;
          }
        } else {
          if (status === ENTERING$1 || status === ENTERED$1) {
            nextStatus = EXITING$1;
          }
        }
      }

      this.updateStatus(false, nextStatus);
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      this.cancelNextCallback();
    };

    _proto.getTimeouts = function getTimeouts() {
      var timeout = this.props.timeout;
      var exit, enter, appear;
      exit = enter = appear = timeout;

      if (timeout != null && typeof timeout !== 'number') {
        exit = timeout.exit;
        enter = timeout.enter; // TODO: remove fallback for next major

        appear = timeout.appear !== undefined ? timeout.appear : enter;
      }

      return {
        exit: exit,
        enter: enter,
        appear: appear
      };
    };

    _proto.updateStatus = function updateStatus(mounting, nextStatus) {
      if (mounting === void 0) {
        mounting = false;
      }

      if (nextStatus !== null) {
        // nextStatus will always be ENTERING or EXITING.
        this.cancelNextCallback();
        var node = ReactDOM__default.findDOMNode(this);

        if (nextStatus === ENTERING$1) {
          this.performEnter(node, mounting);
        } else {
          this.performExit(node);
        }
      } else if (this.props.unmountOnExit && this.state.status === EXITED$1) {
        this.setState({
          status: UNMOUNTED$1
        });
      }
    };

    _proto.performEnter = function performEnter(node, mounting) {
      var _this2 = this;

      var enter = this.props.enter;
      var appearing = this.context ? this.context.isMounting : mounting;
      var timeouts = this.getTimeouts();
      var enterTimeout = appearing ? timeouts.appear : timeouts.enter; // no enter animation skip right to ENTERED
      // if we are mounting and running this it means appear _must_ be set

      if (!mounting && !enter || config$1.disabled) {
        this.safeSetState({
          status: ENTERED$1
        }, function () {
          _this2.props.onEntered(node);
        });
        return;
      }

      this.props.onEnter(node, appearing);
      this.safeSetState({
        status: ENTERING$1
      }, function () {
        _this2.props.onEntering(node, appearing);

        _this2.onTransitionEnd(node, enterTimeout, function () {
          _this2.safeSetState({
            status: ENTERED$1
          }, function () {
            _this2.props.onEntered(node, appearing);
          });
        });
      });
    };

    _proto.performExit = function performExit(node) {
      var _this3 = this;

      var exit = this.props.exit;
      var timeouts = this.getTimeouts(); // no exit animation skip right to EXITED

      if (!exit || config$1.disabled) {
        this.safeSetState({
          status: EXITED$1
        }, function () {
          _this3.props.onExited(node);
        });
        return;
      }

      this.props.onExit(node);
      this.safeSetState({
        status: EXITING$1
      }, function () {
        _this3.props.onExiting(node);

        _this3.onTransitionEnd(node, timeouts.exit, function () {
          _this3.safeSetState({
            status: EXITED$1
          }, function () {
            _this3.props.onExited(node);
          });
        });
      });
    };

    _proto.cancelNextCallback = function cancelNextCallback() {
      if (this.nextCallback !== null) {
        this.nextCallback.cancel();
        this.nextCallback = null;
      }
    };

    _proto.safeSetState = function safeSetState(nextState, callback) {
      // This shouldn't be necessary, but there are weird race conditions with
      // setState callbacks and unmounting in testing, so always make sure that
      // we can cancel any pending setState callbacks after we unmount.
      callback = this.setNextCallback(callback);
      this.setState(nextState, callback);
    };

    _proto.setNextCallback = function setNextCallback(callback) {
      var _this4 = this;

      var active = true;

      this.nextCallback = function (event) {
        if (active) {
          active = false;
          _this4.nextCallback = null;
          callback(event);
        }
      };

      this.nextCallback.cancel = function () {
        active = false;
      };

      return this.nextCallback;
    };

    _proto.onTransitionEnd = function onTransitionEnd(node, timeout, handler) {
      this.setNextCallback(handler);
      var doesNotHaveTimeoutOrListener = timeout == null && !this.props.addEndListener;

      if (!node || doesNotHaveTimeoutOrListener) {
        setTimeout(this.nextCallback, 0);
        return;
      }

      if (this.props.addEndListener) {
        this.props.addEndListener(node, this.nextCallback);
      }

      if (timeout != null) {
        setTimeout(this.nextCallback, timeout);
      }
    };

    _proto.render = function render() {
      var status = this.state.status;

      if (status === UNMOUNTED$1) {
        return null;
      }

      var _this$props = this.props,
          children = _this$props.children,
          childProps = _objectWithoutPropertiesLoose$2(_this$props, ["children"]); // filter props for Transtition


      delete childProps.in;
      delete childProps.mountOnEnter;
      delete childProps.unmountOnExit;
      delete childProps.appear;
      delete childProps.enter;
      delete childProps.exit;
      delete childProps.timeout;
      delete childProps.addEndListener;
      delete childProps.onEnter;
      delete childProps.onEntering;
      delete childProps.onEntered;
      delete childProps.onExit;
      delete childProps.onExiting;
      delete childProps.onExited;

      if (typeof children === 'function') {
        // allows for nested Transitions
        return React__default.createElement(TransitionGroupContext$1.Provider, {
          value: null
        }, children(status, childProps));
      }

      var child = React__default.Children.only(children);
      return (// allows for nested Transitions
        React__default.createElement(TransitionGroupContext$1.Provider, {
          value: null
        }, React__default.cloneElement(child, childProps))
      );
    };

    return Transition;
  }(React__default.Component);

  Transition$1.contextType = TransitionGroupContext$1;
  Transition$1.propTypes =  {};

  function noop$1() {}

  Transition$1.defaultProps = {
    in: false,
    mountOnEnter: false,
    unmountOnExit: false,
    appear: false,
    enter: true,
    exit: true,
    onEnter: noop$1,
    onEntering: noop$1,
    onEntered: noop$1,
    onExit: noop$1,
    onExiting: noop$1,
    onExited: noop$1
  };
  Transition$1.UNMOUNTED = 0;
  Transition$1.EXITED = 1;
  Transition$1.ENTERING = 2;
  Transition$1.ENTERED = 3;
  Transition$1.EXITING = 4;

  var css$3 = "@-webkit-keyframes fade-out{0%{opacity:1}to{opacity:0}}@keyframes fade-out{0%{opacity:1}to{opacity:0}}.cui .modal-backdrop{background:rgba(196,199,204,.65);pointer-events:all;opacity:1;transition:opacity .15s linear;outline:none}.cui .ReactModal__Overlay--before-close .modal__dialog{-webkit-animation:blowdown .3s cubic-bezier(.165,.84,.44,1) forwards,fade-out .25s linear 1!important;animation:blowdown .3s cubic-bezier(.165,.84,.44,1) forwards,fade-out .25s linear 1!important}.cui .ReactModal__Overlay--before-close{opacity:0!important}body.cui .modal .modal__content div.modal__close>a{color:var(--cui-inactive-color)}body.cui .modal .modal__content div.modal__close>a:hover{color:var(--cui-active-color);text-decoration:none}";
  styleInject(css$3);

  const ModalHeader = (_ref) => {
    let {
      className,
      children
    } = _ref,
        props = _objectWithoutProperties(_ref, ["className", "children"]);

    return React__default.createElement("div", _extends({
      className: `modal__header${className ? ` ${className}` : ""}`
    }, props), children);
  };
  ModalHeader.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  ModalHeader.defaultProps = {
    className: null
  };
  const ModalBody = (_ref2) => {
    let {
      className,
      children
    } = _ref2,
        props = _objectWithoutProperties(_ref2, ["className", "children"]);

    return React__default.createElement("div", _extends({
      className: `modal__body${className ? ` ${className}` : ""}`
    }, props), children);
  };
  ModalBody.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  ModalBody.defaultProps = {
    className: null
  };
  const ModalFooter = (_ref3) => {
    let {
      className,
      children
    } = _ref3,
        props = _objectWithoutProperties(_ref3, ["className", "children"]);

    return React__default.createElement("div", _extends({
      className: `modal__footer${className ? ` ${className}` : ""}`
    }, props), children);
  };
  ModalFooter.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  ModalFooter.defaultProps = {
    className: null
  };
  const Modal = (_ref4) => {
    let {
      size,
      closeIcon,
      closeHandle,
      title,
      left,
      children,
      autoClose,
      isOpen,
      animationDuration,
      transitionEvents,
      dialogProps,
      contentProps,
      maximize
    } = _ref4,
        props = _objectWithoutProperties(_ref4, ["size", "closeIcon", "closeHandle", "title", "left", "children", "autoClose", "isOpen", "animationDuration", "transitionEvents", "dialogProps", "contentProps", "maximize"]);

    const [maximized, setMaximized] = React__default.useState(false);
    React__default.useEffect(() => setMaximized(false), [isOpen]);
    const realSize = React__default.useMemo(() => maximized ? "full" : size, [maximized, size]);
    const maximizeCb = React__default.useCallback(() => {
      setMaximized(curr => !curr);
    }, []);
    return React__default.createElement(Transition$1, _extends({
      in: isOpen,
      mountOnEnter: true,
      unmountOnExit: true,
      timeout: animationDuration
    }, transitionEvents), state => React__default.createElement(ReactModal, _extends({}, props, {
      autoClose: autoClose,
      onRequestClose: autoClose && closeHandle ? closeHandle : undefined,
      overlayClassName: "modal-backdrop",
      isOpen: ["entering", "entered"].includes(state),
      className: `modal${appendClass(realSize, `modal--${realSize}`)}${appendClass(left, "modal--left")}`,
      closeTimeoutMS: typeof animationDuration === "object" ? animationDuration.exiting : animationDuration
    }), React__default.createElement("div", _extends({
      className: "modal__dialog"
    }, dialogProps, {
      onClick: e => e.stopPropagation()
    }), React__default.createElement("div", _extends({
      className: "modal__content"
    }, contentProps), React__default.createElement(DisplayIf, {
      condition: !!(closeIcon && closeHandle) || maximize
    }, React__default.createElement(ConditionalWrapper, {
      condition: !!(closeIcon && closeHandle) && maximize,
      wrapper: React__default.createElement("div", {
        className: "modal__close"
      })
    }, React__default.createElement(DisplayIf, {
      condition: maximize
    }, React__default.createElement("a", {
      className: `${appendClass(!(closeIcon && closeHandle), "modal__close")}${appendClass(closeIcon && closeHandle, "qtr-margin-right")}`,
      onClick: maximizeCb
    }, React__default.createElement("span", {
      className: maximized ? "icon-minimize" : "icon-maximize"
    }))), React__default.createElement(DisplayIf, {
      condition: !!(closeIcon && closeHandle)
    }, React__default.createElement("a", {
      className: !maximize ? "modal__close" : "",
      onClick: closeHandle
    }, React__default.createElement("span", {
      className: "icon-close"
    }))))), React__default.createElement(DisplayIf, {
      condition: !!title
    }, React__default.createElement(ModalHeader, null, React__default.createElement("h1", {
      className: "modal__title"
    }, title))), children))));
  };
  Modal.propTypes = {
    size: PropTypes.oneOf([false, "small", "default", "large", "full", "fluid"]),
    closeIcon: PropTypes.bool,
    closeHandle: PropTypes.func,
    title: PropTypes.string,
    isOpen: PropTypes.bool.isRequired,
    autoClose: PropTypes.bool,
    left: PropTypes.bool,
    animationDuration: PropTypes.oneOfType([PropTypes.number, PropTypes.shape({
      entering: PropTypes.number,
      exiting: PropTypes.number
    })]),
    children: PropTypes.node.isRequired,
    transitionEvents: PropTypes.objectOf(PropTypes.func),
    dialogProps: PropTypes.shape({}),
    contentProps: PropTypes.shape({}),
    maximize: PropTypes.bool
  };
  Modal.defaultProps = {
    size: false,
    autoClose: true,
    animationDuration: 250,
    closeIcon: false,
    title: null,
    closeHandle: null,
    left: false,
    transitionEvents: null,
    dialogProps: null,
    contentProps: null,
    maximize: false
  };

  Modal.Small = props => React__default.createElement(Modal, _extends({}, props, {
    size: "small"
  }));

  Modal.Large = props => React__default.createElement(Modal, _extends({}, props, {
    size: "large"
  }));

  Modal.Full = props => React__default.createElement(Modal, _extends({}, props, {
    size: "full"
  }));

  Modal.Fluid = props => React__default.createElement(Modal, _extends({}, props, {
    size: "fluid"
  }));

  Modal.Header = ModalHeader;
  Modal.Body = ModalBody;
  Modal.Footer = ModalFooter;
  const ConfirmationModal = ({
    isOpen,
    confirmHandle,
    closeHandle,
    prompt,
    confirmType,
    confirmText,
    autoClose
  }) => {
    const [doing, setDoing] = React__default.useState(false);
    return React__default.createElement(Modal, {
      isOpen: isOpen,
      closeIcon: true,
      closeHandle: closeHandle,
      autoClose: autoClose,
      title: "Confirmation"
    }, React__default.createElement(ModalBody, null, React__default.createElement("p", null, prompt)), React__default.createElement(ModalFooter, null, React__default.createElement(Button.Light, {
      onClick: closeHandle
    }, "Close"), React__default.createElement(Button, {
      color: confirmType,
      disabled: doing,
      onClick: async () => {
        setDoing(true);
        if (await confirmHandle()) setDoing(false);
      }
    }, confirmText, doing ? React__default.createElement("span", {
      className: "icon-animation spin qtr-margin-left"
    }) : null)));
  };
  ConfirmationModal.propTypes = {
    isOpen: PropTypes.bool,
    confirmHandle: PropTypes.func.isRequired,
    closeHandle: PropTypes.func.isRequired,
    prompt: PropTypes.node.isRequired,
    confirmType: PropTypes.string,
    confirmText: PropTypes.string,
    autoClose: PropTypes.bool
  };
  ConfirmationModal.defaultProps = {
    isOpen: false,
    confirmType: "primary",
    autoClose: true,
    confirmText: "Confirm"
  };
  const PromptModal = ({
    title,
    question,
    onSave: cb,
    onClose,
    initial,
    type,
    isOpen,
    hint
  }) => {
    const [val, setVal] = React__default.useState(initial);
    const onSave = React__default.useCallback(() => {
      onClose();
      cb(val);
    }, [onClose, cb, val]);
    React__default.useLayoutEffect(() => setVal(initial), [initial]);
    return React__default.createElement(Modal, {
      isOpen: isOpen,
      closeIcon: true,
      closeHandle: onClose,
      title: title
    }, React__default.createElement(ModalBody, null, React__default.createElement(Input, {
      type: type,
      form: {
        errors: {},
        touched: {}
      },
      field: {
        onChange: e => setVal(e.target.value),
        name: "promptInput",
        value: val
      },
      label: React__default.createElement(React__default.Fragment, null, question, React__default.createElement(DisplayIf, {
        condition: !!hint && typeof hint === "string"
      }, React__default.createElement("span", {
        "data-balloon": hint,
        "data-balloon-length": "large",
        "data-balloon-pos": "up"
      }, React__default.createElement("span", {
        className: "icon-question-circle qtr-margin-left",
        style: {
          cursor: "help"
        }
      }))))
    })), React__default.createElement(ModalFooter, null, React__default.createElement(Button, {
      color: "light",
      onClick: onClose
    }, "Close"), React__default.createElement(Button, {
      color: "primary",
      onClick: onSave
    }, "OK")));
  };
  PromptModal.propTypes = {
    title: PropTypes.node.isRequired,
    question: PropTypes.node.isRequired,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func,
    initial: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    isOpen: PropTypes.bool.isRequired,
    hint: PropTypes.node
  };
  PromptModal.defaultProps = {
    onClose: null,
    initial: null,
    type: "text",
    hint: null
  };
  const ConfirmationListener = () => {
    const [modal, setModal] = React__default.useState(null);
    const [modalShown, setModalShown] = React__default.useState(false);
    React__default.useEffect(() => {
      eventManager.on(EVENTS.SHOW_MODAL, m => setModal(m));
    }, []);
    React__default.useEffect(() => {
      if (modal) setModalShown(true);
    }, [modal]);

    const onClose = () => setModalShown(false);

    if (!modal) return null;
    if (modal.modalType === "notification") return React__default.createElement(Modal, {
      isOpen: modalShown,
      closeIcon: true,
      closeHandle: onClose,
      title: modal.title
    }, React__default.createElement(ModalBody, null, modal.body), React__default.createElement(ModalFooter, null, React__default.createElement(Button, {
      color: modal.buttonColor || "light",
      onClick: onClose
    }, modal.button)));
    if (modal.modalType === "prompt") return React__default.createElement(PromptModal, {
      isOpen: modalShown,
      onClose: onClose,
      onSave: modal.cb,
      title: modal.title,
      question: modal.question,
      initial: modal.initial,
      type: modal.type,
      hint: modal.hint
    });
    if (modal.modalType === "confirmation") return React__default.createElement(ConfirmationModal, {
      isOpen: modalShown,
      prompt: modal.prompt,
      confirmHandle: async () => {
        const r = await modal.onConfirm();
        if (r) onClose();
        return true;
      },
      closeHandle: onClose,
      confirmText: modal.confirmText,
      confirmType: modal.confirmType
    });
    return null;
  };
  const confirmation = (prompt, onConfirm, confirmType = "primary", confirmText = "Confirm") => {
    if (!prompt) throw new Error("Prompt must be specified");
    if (!onConfirm || typeof onConfirm !== "function") throw new Error("onConfirm must be specified and must be a function");
    eventManager.emit(EVENTS.SHOW_MODAL, {
      modalType: "confirmation",
      prompt,
      onConfirm,
      confirmText,
      confirmType
    });
  };
  const notificationModal = (title, body, buttonColor = "light", button = "OK") => {
    if (!title || !body) throw new Error("Title and body must be specified");
    eventManager.emit(EVENTS.SHOW_MODAL, {
      modalType: "notification",
      title,
      body,
      buttonColor,
      button
    });
  };
  const prompt = (title, question, cb, initial = "", type = "text", hint = undefined) => {
    if (!title || !question) throw new Error("Title and question must be specified");
    eventManager.emit(EVENTS.SHOW_MODAL, {
      modalType: "prompt",
      title,
      initial,
      type,
      question,
      cb,
      hint
    });
  };

  const Icon = (_ref) => {
    let {
      icon,
      size,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["icon", "size", "className"]);

    return React__default.createElement("span", _extends({
      className: `icon-${icon}${className ? ` ${className}` : ""}${size ? ` icon-size-${size}` : ""}`
    }, props));
  };

  Icon.propTypes = {
    icon: PropTypes.string.isRequired,
    size: PropTypes.oneOf([false, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]),
    className: PropTypes.string
  };
  Icon.defaultProps = {
    size: false,
    className: null
  };

  /**
   * Creates DOM element to be used as React root.
   * @returns {HTMLElement}
   */

  function createRootElement(id) {
    const rootContainer = document.createElement("div");
    rootContainer.setAttribute("id", id);
    return rootContainer;
  }
  /**
   * Appends element as last child of body.
   * @param {HTMLElement} rootElem
   */


  function addRootElement(rootElem) {
    document.body.insertBefore(rootElem, document.body.lastElementChild.nextElementSibling);
  }
  /**
   * Hook to create a React Portal.
   * Automatically handles creating and tearing-down the root elements (no SRR
   * makes this trivial), so there is no need to ensure the parent target already
   * exists.
   * @example
   * const target = usePortal(id, [id]);
   * return createPortal(children, target);
   * @param {String} id The id of the target container, e.g 'modal' or 'spotlight'
   * @returns {HTMLElement} The DOM node to use as the Portal target.
   */


  function usePortal(id) {
    const rootElemRef = React.useRef(null);
    React.useEffect(function setupElement() {
      // Look for existing target dom element to append to
      const existingParent = document.querySelector(`#${id}`); // Parent is either a new root or the existing dom element

      const parentElem = existingParent || createRootElement(id); // If there is no existing DOM element, add a new one.

      if (!existingParent) {
        addRootElement(parentElem);
      } // Add the detached element to the parent


      parentElem.appendChild(rootElemRef.current);
      return function removeElement() {
        rootElemRef.current.remove();

        if (parentElem.childNodes.length === -1) {
          parentElem.remove();
        }
      };
    }, []);
    /**
     * It's important we evaluate this lazily:
     * - We need first render to contain the DOM element, so it shouldn't happen
     *   in useEffect. We would normally put this in the constructor().
     * - We can't do 'const rootElemRef = useRef(document.createElement('div))',
     *   since this will run every single render (that's a lot).
     * - We want the ref to consistently point to the same DOM element and only
     *   ever run once.
     * @link https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
     */

    function getRootElem() {
      if (!rootElemRef.current) {
        rootElemRef.current = document.createElement("div");
      }

      return rootElemRef.current;
    }

    return getRootElem();
  }

  /**
   * @example
   * <Portal>
   *   <p>Thinking with portals</p>
   * </Portal>
   */

  const Portal = ({
    id,
    children
  }) => {
    const target = usePortal(id);
    return ReactDOM.createPortal(children, target);
  };

  /* eslint-disable jsx-a11y/anchor-is-valid */
  const AccordionElement = ({
    children,
    defaultOpen,
    toggles,
    title
  }) => {
    const [isOpen, setIsOpen] = React__default.useState(defaultOpen);
    return React__default.createElement("li", {
      className: isOpen ? "active" : ""
    }, React__default.createElement("a", {
      className: "accordion__title",
      onClick: () => setIsOpen(prev => !prev)
    }, React__default.createElement("span", null, title), toggles ? React__default.createElement("span", {
      className: "accordion__toggle icon-chevron-down"
    }) : null), React__default.createElement("div", {
      className: "accordion__content"
    }, children));
  };
  AccordionElement.propTypes = {
    children: PropTypes.node.isRequired,
    defaultOpen: PropTypes.bool,
    toggles: PropTypes.bool,
    title: PropTypes.node.isRequired
  };
  AccordionElement.defaultProps = {
    defaultOpen: false,
    toggles: false
  };
  const Accordion = ({
    children,
    toggles,
    bordered
  }) => {
    return React__default.createElement("ul", {
      className: `accordion${bordered ? " accordion--bordered" : ""}`
    }, React__default.Children.map(children, (child, idx) => React__default.cloneElement(child, {
      toggles,
      key: child.props.key || idx
    })));
  };
  Accordion.Element = AccordionElement;
  Accordion.propTypes = {
    children: PropTypes.node.isRequired,
    toggles: PropTypes.bool,
    bordered: PropTypes.bool
  };
  Accordion.defaultProps = {
    toggles: false,
    bordered: false
  };

  const Badge = (_ref) => {
    let {
      color,
      size,
      children,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["color", "size", "children", "className"]);

    return React__default.createElement("span", _extends({
      className: `${`badge badge--${color}`}${appendClass(size !== "default", `badge--${size}`)}${appendClass(className)}`
    }, props), children);
  };

  const badgeProps = {
    color: PropTypes.oneOf(["primary", "secondary", "tertiary", "success", "info", "warning", "warning-alt", "danger", "dark", "light"]),
    size: PropTypes.oneOf(["dot", "tiny", "small", "default", "large"]),
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  Badge.propTypes = badgeProps;
  Badge.defaultProps = {
    color: "primary",
    size: "default",
    className: ""
  };

  Badge.Dot = props => React__default.createElement(Badge, _extends({}, props, {
    size: "dot"
  }));

  Badge.Tiny = props => React__default.createElement(Badge, _extends({}, props, {
    size: "tiny"
  }));

  Badge.Small = props => React__default.createElement(Badge, _extends({}, props, {
    size: "small"
  }));

  Badge.Default = props => React__default.createElement(Badge, _extends({}, props, {
    size: "default"
  }));

  Badge.Large = props => React__default.createElement(Badge, _extends({}, props, {
    size: "large"
  }));

  Badge.Wrapper = ({
    children,
    className
  }) => React__default.createElement("span", {
    className: `badge-wrapper${appendClass(className)}`
  }, children);

  Badge.Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
  };
  Badge.Wrapper.defaultProps = {
    className: null
  };
  const WithBadge = (_ref2) => {
    let {
      children,
      badge,
      wrapperClass
    } = _ref2,
        props = _objectWithoutProperties(_ref2, ["children", "badge", "wrapperClass"]);

    return React__default.createElement(Badge.Wrapper, {
      className: wrapperClass
    }, children, React__default.createElement(Badge, props, badge));
  };
  WithBadge.propTypes = _objectSpread2({
    children: PropTypes.node.isRequired,
    badge: PropTypes.node.isRequired,
    wrapperClass: PropTypes.string
  }, badgeProps);
  WithBadge.defaultProps = {
    wrapperClass: null
  };

  /* eslint-disable jsx-a11y/click-events-have-key-events */
  const tabIdProp = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);

  const firstDefined = (...args) => args.find(el => typeof el !== "undefined" && el !== null);

  const Tab = ({
    children,
    active
  }) => React__default.createElement("div", {
    className: `tab-pane${active ? " active" : ""}`
  }, children);
  Tab.propTypes = {
    // eslint-disable-next-line react/no-unused-prop-types
    id: tabIdProp.isRequired,
    active: PropTypes.bool,
    // eslint-disable-next-line react/no-unused-prop-types
    title: PropTypes.node.isRequired,
    children: PropTypes.node.isRequired
  };
  Tab.defaultProps = {
    active: false
  };
  const tabsChildrenProp = PropTypes.oneOfType([PropTypes.arrayOf(Tab), Tab]);

  const isActive = (openTab, id, idx) => openTab === null ? idx === 0 : openTab === firstDefined(id, idx);

  const TabsHeader = ({
    tabsClassName,
    center,
    right,
    justified,
    embossed,
    bordered,
    vertical,
    sticky,
    inline,
    openTab,
    onTabChange,
    children
  }) => React__default.createElement("ul", {
    className: `tabs${appendClass(tabsClassName)}${appendClass(center, "tabs--centered")}${appendClass(right, "tabs--right")}${appendClass(justified, "tabs--justified")}${appendClass(embossed, "tabs--embossed")}${appendClass(bordered, "tabs--bordered")}${appendClass(vertical, "tabs--vertical")}${appendClass(inline, "tabs--inline")}`,
    style: sticky ? {
      position: "sticky",
      top: "0"
    } : {}
  }, React__default.Children.map(children, ({
    props: {
      id,
      title
    }
  }, idx) => React__default.createElement("li", {
    className: `tab${appendClass(isActive(openTab, id, idx), "active")}`,
    key: firstDefined(id, idx)
  }, React__default.createElement("a", {
    onClick: () => onTabChange(firstDefined(id, idx))
  }, title))));
  TabsHeader.propTypes = {
    tabsClassName: PropTypes.string,
    center: PropTypes.bool,
    right: PropTypes.bool,
    justified: PropTypes.bool,
    embossed: PropTypes.bool,
    bordered: PropTypes.bool,
    vertical: PropTypes.bool,
    sticky: PropTypes.bool,
    inline: PropTypes.bool,
    openTab: tabIdProp,
    onTabChange: PropTypes.func.isRequired,
    children: tabsChildrenProp.isRequired
  };
  TabsHeader.defaultProps = {
    tabsClassName: PropTypes.string,
    center: false,
    right: false,
    justified: false,
    embossed: false,
    bordered: false,
    vertical: false,
    inline: false,
    openTab: null,
    sticky: false
  };
  const Tabs = ({
    children,
    defaultTab,
    tabsClassName,
    contentClassName,
    center,
    right,
    justified,
    embossed,
    bordered,
    vertical,
    sticky,
    inline,
    renderHeader,
    renderBody,
    onTabChange
  }) => {
    const [openTab, setOpenTab] = React__default.useState(defaultTab || null);
    const changeTab = React__default.useCallback(id => {
      if (typeof onTabChange === "function") onTabChange(id);
      setOpenTab(id);
    }, [onTabChange]);
    const header = React__default.createElement(ConditionalWrapper, {
      condition: vertical,
      wrapper: React__default.createElement("div", {
        className: "col-md-3"
      })
    }, renderHeader(React__default.createElement(TabsHeader, {
      tabsClassName: tabsClassName,
      center: center,
      right: right,
      justified: justified,
      embossed: embossed,
      bordered: bordered,
      vertical: vertical,
      sticky: sticky,
      inline: inline,
      openTab: openTab,
      onTabChange: changeTab
    }, children)));
    const body = React__default.createElement(ConditionalWrapper, {
      condition: vertical,
      wrapper: React__default.createElement("div", {
        className: "col-md-9"
      })
    }, renderBody(React__default.createElement("div", {
      className: `tab-content${contentClassName ? ` ${contentClassName}` : ""}`
    }, React__default.Children.map(children, (child, idx) => React__default.cloneElement(child, {
      active: isActive(openTab, child.props.id, idx)
    })))));
    return React__default.createElement(ConditionalWrapper, {
      condition: vertical,
      wrapper: React__default.createElement("div", {
        className: "row",
        style: sticky ? {
          position: "relative"
        } : {}
      })
    }, React__default.createElement(DisplayIf, {
      condition: vertical && !right
    }, header), body, React__default.createElement(DisplayIf, {
      condition: vertical && right
    }, header));
  };
  Tabs.propTypes = {
    children: tabsChildrenProp.isRequired,
    defaultTab: tabIdProp,
    tabsClassName: PropTypes.string,
    contentClassName: PropTypes.string,
    center: PropTypes.bool,
    right: PropTypes.bool,
    justified: PropTypes.bool,
    embossed: PropTypes.bool,
    bordered: PropTypes.bool,
    vertical: PropTypes.bool,
    sticky: PropTypes.bool,
    inline: PropTypes.bool,
    renderHeader: PropTypes.func,
    renderBody: PropTypes.func,
    onTabChange: PropTypes.func
  };
  Tabs.defaultProps = {
    defaultTab: null,
    tabsClassName: null,
    contentClassName: null,
    center: false,
    right: false,
    justified: false,
    embossed: false,
    bordered: false,
    vertical: false,
    sticky: false,
    inline: false,
    renderHeader: header => header,
    renderBody: body => body,
    onTabChange: null
  };

  const Section = ({
    children,
    className
  }) => React__default.createElement("div", {
    className: `section${appendClass(className)}`
  }, children);

  Section.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
  };
  Section.defaultProps = {
    className: null
  };

  const Display = (_ref) => {
    let {
      size,
      as,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["size", "as", "className"]);

    return React__default.createElement(as, _objectSpread2({}, props, {
      className: `display-${size}${appendClass(className)}`
    }));
  };
  Display.propTypes = {
    size: PropTypes.oneOf([0, 1, 2, 3, 4]).isRequired,
    as: PropTypes.node,
    className: PropTypes.string
  };
  Display.defaultProps = {
    as: "h1",
    className: null
  };
  const Display0 = props => React__default.createElement(Display, _extends({}, props, {
    size: 0
  }));
  const Display1 = props => React__default.createElement(Display, _extends({}, props, {
    size: 1
  }));
  const Display2 = props => React__default.createElement(Display, _extends({}, props, {
    size: 2
  }));
  const Display3 = props => React__default.createElement(Display, _extends({}, props, {
    size: 3
  }));
  const Display4 = props => React__default.createElement(Display, _extends({}, props, {
    size: 4
  }));

  const TimelineItem = ({
    icon,
    time,
    children,
    className,
    contentClassName
  }) => React__default.createElement("div", {
    className: `timeline__item${appendClass(className)}`
  }, React__default.createElement("div", {
    className: "timeline__icon"
  }, icon), time ? React__default.createElement("div", {
    className: "timeline__time"
  }, time) : null, React__default.createElement("div", {
    className: `timeline__content${appendClass(contentClassName)}`
  }, children));
  TimelineItem.propTypes = {
    icon: PropTypes.node,
    time: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    contentClassName: PropTypes.string
  };
  TimelineItem.defaultProps = {
    icon: React__default.createElement(Icon, {
      icon: "circle"
    }),
    time: null,
    className: null,
    contentClassName: null
  };
  const Timeline = ({
    center,
    right,
    className,
    children
  }) => React__default.createElement("div", {
    className: `timeline${appendClass(center, "timeline--centered")}${appendClass(right, "timeline--right")}${appendClass(className)}`
  }, children);
  Timeline.propTypes = {
    center: PropTypes.bool,
    right: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.arrayOf(TimelineItem), TimelineItem]).isRequired
  };
  Timeline.defaultProps = {
    center: false,
    right: false,
    className: null
  };

  const Step = ({
    icon,
    children,
    visited,
    active,
    className
  }) => React__default.createElement("div", {
    className: `step${appendClass(visited, "visited")}${appendClass(active, "active")}${appendClass(className)}`
  }, React__default.createElement("div", {
    className: "step__icon"
  }, icon), React__default.createElement("div", {
    className: "step__label"
  }, children));

  Step.propTypes = {
    icon: PropTypes.node.isRequired,
    children: PropTypes.node.isRequired,
    visited: PropTypes.bool,
    active: PropTypes.bool,
    className: PropTypes.string
  };
  Step.defaultProps = {
    visited: false,
    active: false,
    className: null
  };

  const Steps = ({
    size,
    color,
    vertical,
    children,
    className
  }) => React__default.createElement("div", {
    className: `steps${appendClass(size !== "default", `steps--${size}`)} steps--${color}${appendClass(vertical, "steps--vertical")}${appendClass(className)}`
  }, children);

  Steps.propTypes = {
    size: PropTypes.oneOf(["dot", "small", "default", "large"]),
    color: PropTypes.oneOf(["primary", "secondary", "success", "dark"]),
    vertical: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node.isRequired
  };
  Steps.defaultProps = {
    size: "default",
    color: "primary",
    vertical: false,
    className: null
  };

  Steps.Dot = props => React__default.createElement(Steps, _extends({}, props, {
    size: "dot"
  }));

  Steps.Small = props => React__default.createElement(Steps, _extends({}, props, {
    size: "small"
  }));

  Steps.Large = props => React__default.createElement(Steps, _extends({}, props, {
    size: "large"
  }));

  const VerticalCenter = ({
    children
  }) => React__default.createElement("div", {
    className: "content-fluid",
    style: {
      display: "flex",
      minHeight: "100vh",
      flexDirection: "column"
    }
  }, React__default.createElement("main", {
    style: {
      display: "flex",
      flexDirection: "column",
      flex: 1
    }
  }, children));

  VerticalCenter.propTypes = {
    children: PropTypes.node.isRequired
  };

  const Textarea = (_ref) => {
    let {
      className,
      id,
      field,
      label,
      inline,
      form: {
        touched,
        errors
      },
      inputRef,
      textareaClass,
      innerDivClass,
      resize
    } = _ref,
        rest = _objectWithoutProperties(_ref, ["className", "id", "field", "label", "inline", "form", "inputRef", "textareaClass", "innerDivClass", "resize"]);

    return React__default.createElement("div", {
      className: `form-group${appendClass(inline, "form-group--inline")}${appendClass(className)}${formik.getIn(touched, field.name) && formik.getIn(errors, field.name) ? " form-group--error" : ""}`
    }, React__default.createElement("div", {
      className: `form-group__text${appendClass(innerDivClass)}`
    }, React__default.createElement("textarea", _extends({}, field, {
      className: textareaClass,
      id: id,
      ref: inputRef
    }, rest), field.value), label ? React__default.createElement("label", {
      htmlFor: id
    }, label) : null), formik.getIn(touched, field.name) && formik.getIn(errors, field.name) ? React__default.createElement(InputHelpBlock, {
      text: formik.getIn(errors, field.name)
    }) : null);
  };

  Textarea.propTypes = {
    label: PropTypes.node,
    textareaClass: PropTypes.string,
    innerDivClass: PropTypes.string,
    inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({
      current: PropTypes.instanceOf(Element)
    })]),
    className: PropTypes.string,
    id: PropTypes.string,
    field: PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.string
    }).isRequired,
    form: PropTypes.shape({
      touched: PropTypes.shape({}),
      errors: PropTypes.shape({})
    }).isRequired,
    resize: PropTypes.bool,
    inline: PropTypes.bool
  };
  Textarea.defaultProps = {
    label: null,
    textareaClass: null,
    innerDivClass: null,
    className: null,
    id: null,
    inputRef: null,
    resize: false,
    inline: false
  };

  /* eslint-disable jsx-a11y/click-events-have-key-events */

  const DropdownHeader$1 = ({
    variants,
    selectedIdx,
    setIdx
  }) => React__default.createElement(Dropdown, {
    type: "link",
    tail: true,
    header: variants[selectedIdx].display,
    alwaysClose: true,
    className: "flex-center-vertical",
    stopPropagation: true
  }, variants.map((v, idx) => React__default.createElement("a", {
    key: v.variant,
    onClick: () => setIdx(idx),
    className: variants[selectedIdx].variant === v.variant ? "selected" : ""
  }, v.display)));

  DropdownHeader$1.propTypes = {
    variants: PropTypes.arrayOf(PropTypes.any).isRequired,
    selectedIdx: PropTypes.number.isRequired,
    setIdx: PropTypes.func.isRequired
  };

  const ListHeader = ({
    variants,
    selectedIdx,
    setIdx
  }) => React__default.createElement("ul", {
    className: "list list--inline divider--vertical"
  }, variants.map((v, idx) => React__default.createElement("li", {
    key: v.variant
  }, React__default.createElement(ConditionalWrapper, {
    condition: variants[selectedIdx].variant !== v.variant,
    wrapper: React__default.createElement("a", {
      key: v.variant,
      onClick: () => setIdx(idx)
    })
  }, v.display))));

  ListHeader.propTypes = {
    variants: PropTypes.arrayOf(PropTypes.any).isRequired,
    selectedIdx: PropTypes.number.isRequired,
    setIdx: PropTypes.func.isRequired
  };

  const VariantSelector = ({
    variants,
    varPrefix,
    title,
    inline,
    onChange,
    disableable,
    enableTitleAppend,
    className,
    list
  }) => {
    const {
      values,
      setFieldValue,
      unregisterField
    } = formik.useFormikContext();
    const variant = React__default.useMemo(() => formik.getIn(values, `${varPrefix}.variant`, undefined), [values, varPrefix]);
    const [variantIdx, setIdx] = React__default.useState(() => {
      const idx = variants.findIndex(v => v.selected || v.variant === variant);
      return !disableable && idx < 0 ? 0 : idx;
    });
    React__default.useEffect(() => {
      const idx = variants.findIndex(v => v.variant === variant);
      setIdx(curr => idx < 0 || idx === curr ? curr : idx);
    }, [variant, variants]);
    React__default.useEffect(() => {
      if (variantIdx >= 0) {
        setFieldValue(`${varPrefix}.variant`, variants[variantIdx].variant);
        if (onChange) onChange(variants[variantIdx]);
      } else {
        setFieldValue(varPrefix, undefined);
        unregisterField(varPrefix);
      }
    }, [variantIdx]);

    const dd = (el, t) => React__default.createElement(el, {
      className: "secondary-tabs"
    }, t ? React__default.createElement("span", {
      className: "half-margin-right"
    }, t) : null, list ? React__default.createElement(ListHeader, {
      variants: variants,
      selectedIdx: variantIdx,
      setIdx: setIdx
    }) : React__default.createElement(DropdownHeader$1, {
      variants: variants,
      selectedIdx: variantIdx,
      setIdx: setIdx
    }));

    return React__default.createElement("div", {
      className: `form-group${appendClass(inline, " inline-variants")}${appendClass(className)}`
    }, disableable ? React__default.createElement("span", {
      className: "flex-center-vertical"
    }, React__default.createElement("label", {
      className: "switch",
      htmlFor: `${varPrefix}.disableable`
    }, React__default.createElement("input", {
      type: "checkbox",
      onChange: () => setIdx(p => p >= 0 ? -1 : 0),
      checked: variantIdx >= 0,
      id: `${varPrefix}.disableable`
    }), React__default.createElement("span", {
      className: "switch__input"
    }), React__default.createElement("span", {
      className: "switch__label"
    }, title)), variantIdx >= 0 ? dd("span", enableTitleAppend) : null) : dd("div", title), disableable && variantIdx < 0 ? null : React__default.createElement("div", {
      className: "tabs-wrap panel base-padding-top"
    }, variants[variantIdx].component));
  };

  VariantSelector.propTypes = {
    variants: PropTypes.arrayOf(PropTypes.shape({
      variant: PropTypes.string,
      display: PropTypes.string,
      component: PropTypes.node
    })).isRequired,
    varPrefix: PropTypes.string.isRequired,
    title: PropTypes.node,
    inline: PropTypes.bool,
    onChange: PropTypes.func,
    disableable: PropTypes.bool,
    enableTitleAppend: PropTypes.string,
    className: PropTypes.string,
    list: PropTypes.bool
  };
  VariantSelector.defaultProps = {
    disableable: false,
    title: null,
    inline: false,
    onChange: null,
    enableTitleAppend: null,
    className: null,
    list: false
  };

  const Radio = (_ref) => {
    let {
      field: {
        name,
        value,
        onChange,
        onBlur
      },
      id,
      inline,
      spacing,
      label,
      className
    } = _ref,
        props = _objectWithoutProperties(_ref, ["field", "id", "inline", "spacing", "label", "className"]);

    return React__default.createElement("div", _extends({
      className: `form-group${appendClass(inline, "form-group--inline")}${appendClass(spacing, `form-group--${spacing}`)}${appendClass(className)}`
    }, props), React__default.createElement("label", {
      className: "radio",
      htmlFor: `${name}.${id}`
    }, React__default.createElement("input", {
      type: "radio",
      name: name,
      value: id,
      checked: id === value,
      onChange: onChange,
      onBlur: onBlur,
      id: `${name}.${id}`
    }), React__default.createElement("span", {
      className: "radio__input"
    }), label ? React__default.createElement("span", {
      className: "radio__label"
    }, label) : null));
  };
  Radio.propTypes = {
    spacing: PropTypes.oneOf([false, "compressed", "regular", "loose", "nospacing"]),
    inline: PropTypes.bool,
    label: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string.isRequired,
    field: PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.string,
      onChange: PropTypes.func,
      onBlur: PropTypes.func
    }).isRequired
  };
  Radio.defaultProps = {
    spacing: null,
    inline: false,
    label: null,
    className: null
  };
  const Radios = (_ref2) => {
    let {
      values
    } = _ref2,
        props = _objectWithoutProperties(_ref2, ["values"]);

    return values.map(v => React__default.createElement(formik.Field, _extends({
      component: Radio
    }, props, {
      id: v.value,
      label: v.label,
      key: v.value
    })));
  };
  Radios.propTypes = {
    values: PropTypes.arrayOf(PropTypes.exact({
      value: PropTypes.string,
      label: PropTypes.node
    }))
  };

  const InputHelpBaloon = ({
    baloon
  }) => React__default.createElement("span", {
    "data-balloon": baloon,
    "data-balloon-length": "large",
    "data-balloon-pos": "up",
    className: "qtr-margin-left"
  }, React__default.createElement("span", {
    className: "icon-question-circle",
    style: {
      cursor: "help"
    }
  }));
  InputHelpBaloon.propTypes = {
    baloon: PropTypes.string.isRequired
  };

  var css$4 = ".cui .form-group .chips .input{-moz-appearance:none;-webkit-appearance:none;background:var(--cui-form-background);border-radius:var(--cui-border-radius);border:var(--cui-border);box-shadow:none;color:var(--cui-form-value-color);flex-shrink:0;flex:1;font-family:var(--cui-font-stack);font-size:var(--cui-font-size);font-weight:var(--cui-form-value-font-weight);height:var(--cui-form-size);line-height:2.4rem;max-height:var(--cui-form-size);min-height:var(--cui-form-size);order:3;padding:var(--cui-form-padding);padding-left:0;transition:all var(--cui-animate-speed) var(--cui-animate-timing-function);align-items:center;box-sizing:border-box;display:flex;position:relative}.cui .form-group .chips .input.focus,.cui .form-group .chips .input.hover,.cui .form-group .chips .input:focus,.cui .form-group .chips .input:hover{border-color:var(--cui-accent-color)}.cui .form-group .chips .input.focus,.cui .form-group .chips .input:focus{box-shadow:0 0 0 var(--cui-focus-thickness) rgba(var(--cui-focus-color),var(--cui-focus-opacity));opacity:1;outline:transparent var(--cui-focus-thickness);outline-offset:1px;outline-width:thin;outline-style:none}.cui .form-group .chips .input.disabled~label,.cui .form-group .chips .input[disabled]~label{opacity:.5;cursor:not-allowed!important;pointer-events:none!important;z-index:0!important}.cui .form-group .chips .chips-outer{overflow:hidden;white-space:nowrap;padding-left:var(--cui-form-padding)}.cui .form-group .chips .chips-outer>.chips-inner{white-space:normal}.cui .form-group .chips .input input{border:none;height:calc(var(--cui-form-size) - 2px);max-height:calc(var(--cui-form-size) - 2px);min-height:calc(var(--cui-form-size) - 2px);padding-top:calc(var(--cui-form-padding) - 1px);padding-bottom:calc(var(--cui-form-padding) - 1px);background:transparent}.cui .form-group .chips .input input:focus{box-shadow:unset}.cui .form-group.form-group--error .chips .input{border-color:var(--cui-theme-danger)}";
  styleInject(css$4);

  /* eslint-disable no-param-reassign */
  const InputChips = React__default.forwardRef(({
    className,
    field,
    label,
    form: {
      touched,
      errors,
      setFieldValue,
      setFieldTouched
    },
    chipsColor,
    addOnBlur,
    allowRegex,
    allowRepeat,
    delimiters,
    valueValidator,
    maxChips,
    baloon,
    id
  }, ref) => {
    const [focused, setFocus] = React__default.useState(false);
    const addValue = React__default.useCallback(v => {
      if (typeof valueValidator === "function") {
        v = valueValidator(v);
        if (v === false) return;
      }

      if (allowRepeat) {
        setFieldValue(field.name, [...field.value, v]);
      } else if (!field.value.includes(v)) setFieldValue(field.name, [...field.value, v]);
    }, [allowRepeat, valueValidator, field.name, field.value]);
    const handleKeyDown = React__default.useCallback(event => {
      let d = delimiters;

      if (typeof d === "string") {
        const {
          map
        } = Array.prototype;
        d = map.call(d, ch => ch.charCodeAt(0));
      }

      if (d.includes(event.keyCode)) {
        addValue(event.target.value);
        event.target.value = "";
        event.stopPropagation();
        event.preventDefault();
      }
    }, [delimiters, addValue]);
    const handleBlur = React__default.useCallback(event => {
      if (addOnBlur && event.target && event.target.value) {
        const {
          value
        } = event.target;

        if (allowRegex && RegExp(allowRegex).test(value)) {
          addValue(value);
        } else if (!allowRegex) {
          addValue(value);
        }
      }

      event.target.value = "";
      setFocus(false);
      field.onBlur(event);
    }, [addOnBlur, allowRegex, addValue, field]);
    const handleDelete = React__default.useCallback(idx => {
      const na = [...field.value];
      na.splice(idx, 1);
      setFieldTouched(field.name, true);
      setFieldValue(field.name, na);
    }, [field.name, field.value]);
    React__default.useEffect(() => {
      if (!Number.isNaN(maxChips) && Array.isArray(field.value) && field.value.length >= maxChips) setFocus(false);
    }, [field.value, maxChips]);
    return React__default.createElement("div", {
      className: `form-group${appendClass(className)}${appendClass(formik.getIn(touched, field.name) && formik.getIn(errors, field.name), "form-group--error")}`,
      ref: ref
    }, React__default.createElement("div", {
      className: "form-group__text chips"
    }, label ? React__default.createElement("label", {
      htmlFor: id || field.name
    }, label, baloon ? React__default.createElement(InputHelpBaloon, {
      baloon: baloon
    }) : null) : null, React__default.createElement("div", {
      className: `input${appendClass(focused, "focus")}`
    }, Array.isArray(field.value) && field.value.length ? React__default.createElement("span", {
      className: "chips-outer"
    }, React__default.createElement("span", {
      className: "chips-inner"
    }, field.value.map((v, i) => React__default.createElement(Label, {
      removable: true,
      onRemove: () => handleDelete(i),
      color: chipsColor,
      size: "tiny",
      key: `${v}-${i}`,
      className: "qtr-margin-bottom"
    }, v)))) : null, !maxChips || maxChips && Array.isArray(field.value) && field.value.length < maxChips ? React__default.createElement("input", {
      type: "text",
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      onFocus: () => setFocus(true),
      id: id || field.name
    }) : null)), formik.getIn(touched, field.name) && formik.getIn(errors, field.name) ? React__default.createElement(InputHelpBlock, {
      text: formik.getIn(errors, field.name)
    }) : null);
  });
  InputChips.propTypes = {
    label: PropTypes.node,
    chipsColor: PropTypes.oneOf(["info", "success", "warning", "warning-alt", "danger", "blue", "dkgray", "vibblue", "indigo", "default", "ltgray", "white", "ghost"]),
    addOnBlur: PropTypes.bool,
    allowRepeat: PropTypes.bool,
    allowRegex: PropTypes.string,
    delimiters: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.number)]),
    valueValidator: PropTypes.func,
    maxChips: PropTypes.number,
    baloon: PropTypes.string,
    className: PropTypes.string,
    field: PropTypes.shape({
      name: PropTypes.any,
      value: PropTypes.any,
      onBlur: PropTypes.func
    }).isRequired,
    form: PropTypes.shape({
      touched: PropTypes.shape({}),
      errors: PropTypes.shape({}),
      setFieldValue: PropTypes.func,
      setFieldTouched: PropTypes.func
    }).isRequired,
    id: PropTypes.string
  };
  InputChips.defaultProps = {
    chipsColor: "default",
    addOnBlur: true,
    delimiters: [13],
    label: null,
    allowRepeat: false,
    allowRegex: null,
    valueValidator: null,
    maxChips: null,
    baloon: null,
    className: null,
    id: null
  };

  const SelectChildren = ({
    children,
    handleOptionClick,
    isSelected
  }) => React__default.Children.map(children, (child, idx) => {
    switch (child.type) {
      case "option":
        return React__default.createElement("a", {
          key: idx,
          disabled: child.props.disabled,
          onClick: e => handleOptionClick(e, child.props.value),
          className: isSelected(child.props.value) ? "selected" : ""
        }, child.props.children);

      case "optgroup":
        return React__default.createElement("div", {
          key: idx,
          className: "dropdown__group"
        }, React__default.createElement("div", {
          className: "dropdown__group-header"
        }, child.props.label), React__default.createElement(SelectChildren, {
          handleOptionClick: handleOptionClick,
          isSelected: isSelected
        }, child.props.children));

      default:
        return child;
    }
  });

  const EditableSelect = React__default.forwardRef((_ref, innerRef) => {
    let {
      children,
      compressed,
      field,
      form,
      id,
      inline,
      prompt,
      title,
      type
    } = _ref,
        rest = _objectWithoutProperties(_ref, ["children", "compressed", "field", "form", "id", "inline", "prompt", "title", "type"]);

    const [isOpen, setOpen] = React__default.useState(false);
    const [node, setNode] = React__default.useState(undefined);
    let handleOutsideClick;

    const handleClick = (newState = true) => {
      if (newState && !isOpen) document.addEventListener("click", handleOutsideClick, false);else document.removeEventListener("click", handleOutsideClick, false);
      setOpen(newState);
    };

    handleOutsideClick = e => {
      const n = innerRef || node;
      if (n && n.contains(e.target)) return;
      handleClick(false);
    };

    const handleOptionClick = (_e, newValue) => {
      form.setFieldValue(field.name, newValue);
      form.setFieldTouched(field.name, true);
      handleClick(false);
    };

    const isSelected = checkValue => field.value === checkValue;

    return React__default.createElement("div", {
      className: `form-group dropdown${appendClass(compressed, "input--compressed")}${appendClass(isOpen, "active")}${appendClass(inline, "label--inline")}${appendClass(formik.getIn(form.touched, field.name) && formik.getIn(form.errors, field.name), " form-group--error")}`,
      ref: innerRef || (n => setNode(n))
    }, React__default.createElement("div", {
      className: "form-group__text select editable",
      onClick: () => handleClick(true)
    }, React__default.createElement("input", _extends({
      id: id || field.name
    }, field, {
      type: type,
      placeholder: prompt,
      autoComplete: "off"
    }, rest)), React__default.createElement("label", {
      htmlFor: id || field.name
    }, title)), React__default.createElement("div", {
      className: "dropdown__menu"
    }, React__default.createElement(SelectChildren, {
      handleOptionClick: handleOptionClick,
      isSelected: isSelected
    }, children)), formik.getIn(form.touched, field.name) && formik.getIn(form.errors, field.name) ? React__default.createElement(InputHelpBlock, {
      text: formik.getIn(form.errors, field.name)
    }) : null);
  });
  EditableSelect.propTypes = {
    compressed: PropTypes.bool,
    id: PropTypes.string,
    title: PropTypes.node.isRequired,
    prompt: PropTypes.string,
    inline: PropTypes.bool,
    type: PropTypes.oneOf(["number", "text"]),
    field: PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.any
    }).isRequired,
    form: PropTypes.shape({
      touched: PropTypes.any,
      errors: PropTypes.any,
      setFieldValue: PropTypes.func,
      setFieldTouched: PropTypes.func
    }).isRequired,
    children: PropTypes.node.isRequired
  };
  EditableSelect.defaultProps = {
    compressed: false,
    prompt: "Select an option",
    inline: false,
    type: "text",
    id: null
  };

  const Checkboxes = ({
    field,
    form,
    variants,
    inline
  }) => React__default.createElement(formik.FieldArray, {
    name: field.name,
    render: arrayHelpers => variants.map(variant => React__default.createElement("div", {
      className: `form-group${appendClass(inline, "form-group--inline")}`,
      key: variant.id
    }, React__default.createElement("label", {
      className: "checkbox",
      htmlFor: field.name
    }, React__default.createElement("input", {
      name: field.name,
      id: field.name,
      type: "checkbox",
      value: variant.id,
      checked: formik.getIn(form.values, field.name, []).includes(variant.id),
      onChange: e => {
        if (e.target.checked) arrayHelpers.push(variant.id);else {
          const idx = formik.getIn(form.values, field.name, []).indexOf(variant.id);
          arrayHelpers.remove(idx);
        }
      }
    }), React__default.createElement("span", {
      className: "checkbox__input"
    }), React__default.createElement("span", {
      className: "checkbox__label"
    }, variant.name))))
  });
  Checkboxes.propTypes = {
    inline: PropTypes.bool,
    variants: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string
    })).isRequired,
    field: PropTypes.shape({
      name: PropTypes.string
    }).isRequired,
    form: PropTypes.shape({
      values: PropTypes.any
    }).isRequired
  };
  Checkboxes.defaultProps = {
    inline: false
  };

  exports.Accordion = Accordion;
  exports.AccordionElement = AccordionElement;
  exports.Alert = Alert;
  exports.Badge = Badge;
  exports.Button = Button;
  exports.ButtonGroup = ButtonGroup;
  exports.Checkbox = Checkbox;
  exports.Checkboxes = Checkboxes;
  exports.ConditionalWrapper = ConditionalWrapper;
  exports.ConfirmationListener = ConfirmationListener;
  exports.ConfirmationModal = ConfirmationModal;
  exports.DefaultTablePagination = DefaultTablePagination;
  exports.Display = Display;
  exports.Display0 = Display0;
  exports.Display1 = Display1;
  exports.Display2 = Display2;
  exports.Display3 = Display3;
  exports.Display4 = Display4;
  exports.DisplayIf = DisplayIf;
  exports.Dots = Dots;
  exports.Dropdown = Dropdown;
  exports.Dropzone = connected;
  exports.DynamicModal = ConfirmationListener;
  exports.EditableSelect = EditableSelect;
  exports.Footer = Footer;
  exports.GenericTable = GenericTable;
  exports.Header = Header;
  exports.HeaderPanel = HeaderPanel;
  exports.HeaderTitle = HeaderTitle;
  exports.Icon = Icon;
  exports.Input = Input;
  exports.InputChips = InputChips;
  exports.InputHelpBaloon = InputHelpBaloon;
  exports.InputHelpBlock = InputHelpBlock;
  exports.Label = Label;
  exports.Modal = Modal;
  exports.ModalBody = ModalBody;
  exports.ModalFooter = ModalFooter;
  exports.ModalHeader = ModalHeader;
  exports.Pagination = Pagination;
  exports.Panel = Panel;
  exports.Portal = Portal;
  exports.Progressbar = Progressbar;
  exports.PromptModal = PromptModal;
  exports.Radio = Radio;
  exports.Radios = Radios;
  exports.Section = Section;
  exports.Select = Select;
  exports.Spinner = Spinner;
  exports.Step = Step;
  exports.Steps = Steps;
  exports.Switch = Switch;
  exports.Tab = Tab;
  exports.Table = Table;
  exports.Tabs = Tabs;
  exports.TabsHeader = TabsHeader;
  exports.Textarea = Textarea;
  exports.Timeline = Timeline;
  exports.TimelineItem = TimelineItem;
  exports.ToastContainer = ToastContainer$1;
  exports.VariantSelector = VariantSelector;
  exports.VerticalCenter = VerticalCenter;
  exports.WithBadge = WithBadge;
  exports.confirmation = confirmation;
  exports.notification = notificationModal;
  exports.notificationModal = notificationModal;
  exports.prompt = prompt;
  exports.toast = toast$1;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
