function loadEditAttribute(
  attribute,
  body,
  inputClass = undefined,
  onDone = undefined
) {
  if (body.children().length) {
    body.children().fadeOut("fast", function (e) {
      $(this).remove();
      body.append(dataLoader(false));
    });
  } else {
    body.append(dataLoader(false));
  }

  let href = globals.rest.generate + "get-attribute-data/" + attribute + "/";

  $.ajax({
    url: href,
    type: "GET",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      var append;
      if (typeof data !== "object") {
        append = alert(
          "error",
          `Error while retrieving data from the server: ${data}`
        );
      } else {
        if (data.variants && data.variants.length) {
          if (!data.parameters || !data.parameters.length) {
            data.parameters = [];
          }
          data.parameters.unshift({
            type: "variants",
            value: data.variants,
          });
        }
        append = $('<div class="just-wrap"></div>');
        addFields(
          append,
          data.parameters,
          undefined,
          data.hasOwnProperty("defaults") ? data.defaults : undefined
        );
        let ch = append.children();
        if (ch.length === 1 && !ch.hasClass("just-wrap")) {
          append = ch.addClass("just-wrap");
        }
      }
      append.children().hide();
      if (inputClass) {
        append.find(":input").addClass(inputClass);
      }

      body.children().fadeOut("fast", function (e) {
        body.empty();
        body.append(append);
        append
          .children()
          .fadeIn("fast")
          .promise()
          .done(() => {
            if (typeof onDone === "function") {
              onDone.call(append[0]);
            }
          });
      });
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
      body
        .children()
        .fadeOut("fast", function () {
          this.parentNode.removeChild(this);
        })
        .promise()
        .done(() => {
          body.append(
            alert(
              "error",
              `Error while retrieving data from the server: ${errorThrown}`
            )
          );
        });
    });
}

function dropdownAddElements(el, onclick, where, target = undefined) {
  for (var vi = 0; vi < el.values.length; vi++) {
    let a;
    switch (el.values[vi].type) {
      case "header":
        a = $(`<a class="dropdown__group-header">${el.values[vi].title}</a>`);
        break;
      case "link":
      case "rest":
        a = $(`<a class="with-data" data-tab="${el.val}"></a>`).html(
          el.values[vi].title
        );
        if (el.values[vi].type === "link") {
          a.click({ link: el.values[vi].link, target: target }, onclick);
        } else {
          a.click({ api: el.values[vi].api, target: target }, onclick);
        }
        break;
      case "value":
        a = $(`<a class="with-data"></a>`)
          .html(el.values[vi].title)
          .data("value", el.values[vi].value);
        if (el.values[vi].hasOwnProperty("insert") && el.values[vi].insert) {
          a.data("insert", el.values[vi].insert);
        }
        if (typeof target === "function") {
          a.click(target);
        } else {
          a.click({ target: target }, onclick);
        }
        break;
    }
    a.data({ show_if_checked: el.show_if_checked });
    where.append(a);
  }
}

function prepareDropDown(
  btn,
  values,
  onclick,
  ul = undefined,
  target = undefined,
  dd_element = "div"
) {
  if (!ul) {
    ul = $('<div class="dropdown__menu" aria-labelledby="dLabel"></div>');
    btn
      .attr("data-toggle", "dropdown")
      .attr("aria-haspopup", "true")
      .attr("aria-expanded", "false");
  }
  Object.keys(values).forEach(function (el) {
    if (typeof values[el] === "object") {
      if (values[el].type) {
        let di = values[el].title;
        switch (values[el].type) {
          case "header":
          case "header-full":
            ul.append(`<a class="dropdown__group-header">${di}</a>`);
            if (values[el].values) {
              dropdownAddElements(values[el], onclick, ul, target);
            }
            break;
          case "group":
            let inul = $(`<div class="dropdown__menu"></div>`);
            if (values[el].values) {
              dropdownAddElements(values[el], onclick, inul, target);
            }
            ul.append(
              $(
                `<div class="submenu"><a href="javascript:;">${di}</a></div>`
              ).append(inul)
            );
            break;
        }
      } else {
        let a = $(`<a
					data-value="${values[el].val}"
					${
            values[el].hasOwnProperty("insert") && values[el].insert
              ? 'data-insert="1"'
              : ""
          }>${values[el].title}</a>`);
        if (values[el].hint) {
          a.attr("title", values[el].hint);
        }
        if (values[el].dependants && values[el].dependants.length) {
          a.addClass("has-dependants").data({
            dependants: values[el].dependants,
            select_dependant: values[el].select_dependant || {},
          });
        }
        a.data({ show_if_checked: values[el].show_if_checked });
        ul.append($(`<li data-tab="${values[el].val}" />`).append(a));
      }
    } else if (typeof values[el] === "string") {
      switch (values[el]) {
        case "divider":
          ul.append('<div class="dropdown__divider"></div>');
          break;
        case "loader":
          ul.append(
            '<a><span class="icon-animation spin" aria-hidden="true"></span>&nbsp;Loading...</a>'
          );
          break;
        case "loader-error":
          ul.append(
            '<a class="text--danger">Got an error on loading data.</a>'
          );
          break;
        case "empty":
          ul.append("<a>Nothing saved.</a>");
          break;
        default:
          ul.append(`<a data-value="${el}">${values[el]}</a>`);
      }
    }
  });
  ul.find("a:not(.with-data)").click(onclick);
  if (btn) {
    var result = $(`<${dd_element} class="dropdown"></${dd_element}>`)
      .append(btn)
      .append(ul);
    btn.click(dropDownClick);
    return result;
  }
}

function addNewButtonsToSet(newButtons, buttons, target) {
  var dropdown_click = function (e) {
    let dd_el = $(this);
    if (dd_el.data("insert")) {
      insertAtCursor(target[0], dd_el.data("value"));
    } else {
      target.val(dd_el.data("value"));
    }
    target.trigger("input");
  };
  for (var bi = newButtons.length - 1; bi >= 0; bi--) {
    var curBtn = newButtons[bi];
    var newBtnEl = $(`<button type="button" class="btn btn--icon btn--link" title="${
      curBtn.title
    }" id="btn-${curBtn.name}">
			<span class="${curBtn.icon || "icon-chevron-down"}"></span>
		</button>`);
    switch (curBtn.type) {
      case "dropdown":
        newBtnEl.addClass("btn--dropdown"); //.children("span").remove();
        if (curBtn.values && Array.isArray(curBtn.values)) {
          newBtnEl.removeAttr("style");
          newBtnEl = prepareDropDown(newBtnEl, curBtn.values, dropdown_click);
          newBtnEl.addClass("dropdown--left");
          newBtnEl.css("margin-left", "0").addClass("link");
        } else if (curBtn.load_values) {
          newBtnEl.removeAttr("style");
          newBtnEl = prepareDropDown(newBtnEl, ["loader"], dropdown_click);
          newBtnEl.addClass("dropdown--left");
          newBtnEl.css("margin-left", "0").addClass("link");
          newBtnEl
            .find("button")
            .data({ "load-from": curBtn.load_values, target: target })
            .click(loadValues);
        }
        break;
      case "link":
        newBtnEl.click(
          { link: curBtn.link, target: target },
          loadValueFromLink
        );
        break;
    }
    if (buttons) {
      buttons = newBtnEl.add(buttons);
    } else {
      buttons = newBtnEl;
    }
  }
  return buttons;
}

function loadValues(e) {
  var $this = $(this);
  var l = $this.data("load-from");
  var ul = $this.closest(".dropdown").find(".dropdown__menu");
  var target = $this.data("target");
  var href = globals.rest.generate;

  ul.empty();
  prepareDropDown(
    undefined,
    ["loader"],
    function () {
      return;
    },
    ul
  );

  var a_p = {
    url: href,
    type: "POST",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  };

  if (l.hasOwnProperty("link")) {
    a_p.type = "GET";
    let nolocation = l.hasOwnProperty("nolocation") && l.nolocation;
    if (nolocation) {
      a_p.url = l.link;
    } else {
      if (a_p.url[a_p.url.length - 1] == "/" && l.link[0] == "/") {
        a_p.url = a_p.url.slice(0, -1);
      }
      a_p.url += l.link;
    }
  } else {
    var postData = {};
    postData[l.call] = l.value;
    a_p.data = JSON.stringify(postData);
  }

  $.ajax(a_p)
    .done(function (data) {
      ul.empty();
      if (data.error) {
        toast("error", "", data.error);
      } else {
        prepareDropDown(undefined, data, loadValueFromLink, ul, target);
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
      ul.empty();
      prepareDropDown(
        undefined,
        ["loader-error"],
        function () {
          return;
        },
        ul
      );
    });
}

function loadValueFromLink(e) {
  var body, btn;
  if (e.data.modal) {
    body = e.data.modal.find(".modal__body");
    body.children().fadeOut("fast", function (e) {
      $(this).remove();
      body.append(dataLoader()).children().fadeIn("fast");
    });
  } else {
    btn = $(this);
    btn
      .attr("disabled", "disabled")
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );
  }

  var a_p = {
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  };

  if (e.data.api) {
    var postData = {};
    postData[e.data.api.call] = e.data.api.parameters;
    var href = window.location.pathname + "?ajax=1";
    a_p.url = href;
    a_p.data = JSON.stringify(postData);
    a_p.method = "POST";
  } else if (e.data.link) {
    a_p.url = e.data.link;
    a_p.method = "GET";
  }

  $.ajax(a_p)
    .done(function (data) {
      if (typeof e.data.target === "function") {
        e.data.target.call(this, data);
        return true;
      }
      if (data.values) {
        e.data.target.val(data.values.join("\n")).change();
        if (body) {
          e.data.modal.modal("hide");
        }
      } else if (data.error) {
        if (body) {
          body.children().fadeOut("fast", function (e) {
            $(this).remove();
            body
              .append(
                alert(
                  "error",
                  `Error while retrieving data from the server: ${data.error}`
                )
              )
              .children()
              .fadeIn("fast");
          });
        } else {
          toast("error", "", data.error);
        }
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      if (body) {
        body.children().fadeOut("fast", function (e) {
          $(this).remove();
          body
            .append(
              alert(
                "error",
                `Error while retrieving data from the server: ${errorThrown}`
              )
            )
            .children()
            .fadeIn("fast");
        });
      } else {
        toast_error(jqXHR, textStatus, errorThrown);
      }
    })
    .always(function () {
      if (btn) {
        btn.removeAttr("disabled").find(".icon-animation").remove();
      }
    });
}

function addColumns(where, columns, d) {
  var row = $('<div class="row" />');
  columns.forEach(function (el) {
    var column = $('<div class="col" />');
    addFields(column, el, undefined, d);
    row.append(column);
  });
  where.append(row);
}

function addFields(where, fields, modal = undefined, defaults = undefined) {
  var parametersP = null;
  if (!defaults) {
    defaults = {};
  }
  checkPP = () => {
    if (!parametersP) {
      parametersP = $('<div class="parameters"></div>');
    }
  };
  for (var fi = 0; fi < fields.length; fi++) {
    var field = fields[fi];
    switch (field.type) {
      case "columns":
        checkPP();
        addColumns(parametersP, field.value, defaults);
        break;
      case "span":
        if (field.name === "head") {
          if (parametersP) {
            where.append(parametersP);
            parametersP = null;
          }
          where.append(
            `<p class="half-margin-top"><span class="text-muted">How it works: </span><span>${field.value}</span></p>`
          );
        } else {
          where.append("<p>" + field.value + "</p>");
        }
        break;
      case "div":
        checkPP();
        parametersP.append(
          `<div class="${field.class || ""}" style="${field.style || ""}">${
            field.value
          }</div>`
        );
        break;
      case "number":
      case "text":
      case "hidden":
        field.value = defaults.hasOwnProperty(field.name)
          ? defaults[field.name]
          : field.value;
        checkPP();
        addFieldInput(parametersP, field, modal);
        break;
      case "checkbox":
        field.value = defaults.hasOwnProperty(field.name)
          ? defaults[field.name]
          : field.value;
        checkPP();
        addFieldCheckbox(parametersP, field);
        break;
      case "textarea":
        field.value = defaults.hasOwnProperty(field.name)
          ? defaults[field.name]
          : field.value;
        checkPP();
        addFieldTextarea(parametersP, field);
        break;
      case "radio":
        checkPP();
        addFieldRadio(parametersP, field);
        break;
      case "break":
        if (parametersP) {
          where.append(parametersP);
          parametersP = null;
        }
        break;
      case "variants":
        checkPP();
        let st = addVariants.call(
          parametersP[0],
          field.value,
          field.name,
          modal,
          defaults.hasOwnProperty(field.name) ? defaults[field.name] : defaults
        );
        if (field.title || field.label) {
          st.prepend(
            `<span class="half-margin-right">${
              field.title || field.label
            }:</span>`
          );
        }
        if (field.hasOwnProperty("inline") && field.inline) {
          st.parent().addClass("inline-variants");
        }
        if (
          !(defaults.hasOwnProperty(field.name) && defaults[field.name]) &&
          field.hasOwnProperty("selected") &&
          field.selected
        ) {
          st.find(
            `.dropdown__menu a[data-value="edit-tab-${field.selected}"]`
          ).trigger("click");
        }
        break;
      case "select":
        field.selected = defaults.hasOwnProperty(field.name)
          ? defaults[field.name]
          : field.selected;
        checkPP();
        addFieldSelect(parametersP, field);
        break;
      case "multiple":
        checkPP();
        addFieldMultiple(parametersP, field);
        break;
      case "checkboxes":
        checkPP();
        addFieldCheckboxes(parametersP, field);
        break;
      case "group":
        checkPP();
        addFieldGroup(parametersP, field);
        break;
      case "divider":
        checkPP();
        addFieldDivider(parametersP, field);
        break;
      case "alert":
        checkPP();
        addFieldAlert(parametersP, field);
        break;
      case "drawer":
        checkPP();
        addFieldDrawer(parametersP, field, defaults);
        break;
      case "dictionary":
        field.value = field.value ? field.value : {};
        field.value = defaults.hasOwnProperty(field.name)
          ? defaults[field.name]
          : field.value;
        checkPP();
        addFieldDictionary(parametersP, field);
        break;
    }
  }
  if (parametersP) {
    where.append(parametersP);
  }
}

function addFieldGroup(p, field) {
  let wrapper = $(
    `<div class="panel group-wrapper" data-wrap-for="${field.name}" data-var-type="group" />`
  );
  let header = $(`<h5>${field.label}</h5>`);

  addFields(wrapper, field.value || []);
  p.append(header, wrapper).find("h5:not(:first)").addClass("base-margin-top");

  if (wrapper.find("label.switch").length) {
    let b = $(`<button 
			class="btn btn--small btn--primary-ghost btn-switch-all half-margin-left"
			data-field-name="${field.name}">Switch all</button>`);
    b.click(switchAll);
    header.append(b);
  }

  header.append(`<a class="link pull-right expand expanded" data-field-name="${field.name}">
		<span class="icon-chevron-right" aria-hidden="true"></span>
	</a>`);
  header.find("a.expand").click(expandClick);
}

function addFieldDivider(p, field) {
  if (field.grouper) {
    p.append(`<div class="flex flex-center-vertical grouper ${
      field.accent ? "grouper--accent" : ""
    }">
			<span class="grouper__title half-margin-right">${field.grouper}</span>
			<hr class="flex-fill">
		</div>`);
  } else {
    p.append(`<hr class="base-margin-top dbl-margin-bottom">`);
  }
}

function addFieldAlert(p, field) {
  let icon;
  switch (field.severity) {
    case "success":
      icon = "icon-check-outline";
      break;
    case "danger":
      icon = "icon-error-outline";
      break;
    case "warning":
      icon = "icon-warning-outline";
      break;
    default:
      icon = "icon-info-outline";
      break;
  }

  p.append(` <div class="alert alert--${field.severity} half-margin-bottom">
		<div class="alert__icon ${icon}"></div>
		<div class="alert__message">${field.value}</div>
	</div>`);
}

function addFieldDictionary(p, field) {
  let types = Array.isArray(field.dictionary_type)
    ? field.dictionary_type.join(",")
    : field.dictionary_type;
  let el = $(`<div class="form-group" data-wrap-for="${
    field.name
  }" data-var-type="dictionary">
		<div class="form-group__text">
			<label>${field.label}</label>
			<input type="hidden" value="" name="${field.name}" />
			<input type="hidden" value="${
        field["how-to-follow"] || "random"
      }" name="how-to-follow" />
			<input type="hidden" value="${
        field["disallow-repeats"] || ""
      }" name="disallow-repeats" />
			<div class="panel panel--bordered like-input">
        <div class="dictionaries-selected flex-fill">
          <div class="qtr-margin-bottom">None selected</div>
        </div>
				<span class="actions">
					<a class="dictionary-edit-link no-decor" data-types="${types}"><span class="icon-edit qtr-margin-right"></span>Edit</a>
				</span>
			</div>
		</div>
	</div>`);
  el.find(".dictionary-edit-link").click(editDictionaryField);
  el.find(".dictionaries-selected").data("real-value", field.value);
  if (field.value) {
    populateDictionariesSpan(el.find(".dictionaries-selected"), field.value);
  }

  p.append(el);
}

function addFieldDrawer(where, field, d) {
  let drwr = $(`<div class="drawer ${
    field.opened ? "drawer--opened" : ""
  } var-drawer">
		<${field.header ? "h5" : "div"} class="half-margin-bottom drawer__header"><a>${
    field.title
  }</a></${field.header ? "h5" : "div"}>
		<div class="drawer__body animated faster fadeIn"></div>
	</div>`);

  addFields(drwr.children(".drawer__body"), field.fields, undefined, d);

  where.append(drwr);
}

function switchAll(e) {
  e.preventDefault();
  let $t = $(this);
  let fn = $t.data("field-name");
  let w = $t.closest("h5").next(`div[data-wrap-for="${fn}"]`);
  let switches_off = w.find("input:checkbox:not(:checked)");
  if (switches_off.length) {
    switches_off.click();
  } else {
    w.find("input:checkbox").click();
  }
}

function expandClick(e) {
  let $t = $(this);
  let fn = $t.data("field-name");
  let w = $t.closest("h5").next(`div[data-wrap-for="${fn}"]`);
  if (!$t.hasClass("expanded")) {
    w.fadeIn("fast");
    $t.addClass("expanded");
  } else {
    w.fadeOut("fast");
    $t.removeClass("expanded");
  }
}

function addFieldInput(p, field, modal) {
  var ra = typeof guid === "function" ? guid() : parseInt(Math.random() * 100);
  let element = $(`<div class="form-group" data-wrap-for="${
    field.name
  }" data-var-type="input">
		<div class="form-group__text">
			<input 
				type="${field.type}" 
				id="input-${field.name}-${ra}" 
				name="${field.name}"
				class="edit-attribute"
				${typeof field.min !== "undefined" ? ` min="${field.min}"` : ""}
				${typeof field.max !== "undefined" ? ` max="${field.max}"` : ""}
				data-type="string"
				${typeof field.group !== "undefined" ? ` data-group="${field.group}"` : ""}
				${
          typeof field.placeholder !== "undefined"
            ? ` placeholder="${field.placeholder}"`
            : ""
        }>
			${
        field.type !== "hidden"
          ? `<label for="input-${field.name}-${ra}">${
              field.label || ""
            }</label>`
          : ""
      }
		</div>
	</div>`);
  element.find("input").val(field.value || "");
  if (field.validate) {
    element
      .find("input")
      .attr("data-validate", field.validate)
      .change(
        {
          regex: field.validate,
          onSuccess: enableBtn,
          onFail: disableBtn,
          controlElement: modal
            ? modal.find("button.save-attr")
            : $('.content .container form button[type="submit"]'),
        },
        validateMe
      );
  }
  if (field.buttons && Array.isArray(field.buttons)) {
    element = $(`<div class="flex form-group--margin" />`).append(
      element.addClass("half-margin-right flex-fill")
    );
    let buttons;
    buttons = addNewButtonsToSet(
      field.buttons,
      buttons,
      element.find(`input[type="${field.type}"]`),
      true
    );
    buttons = $(
      `<div class="btn-group btn-group--large btn-group--square base-margin-top" />`
    ).append(buttons);
    element.children(".form-group").after(buttons);
  }
  p.append(element);
}

function addFieldTextarea(p, field) {
  let cnt_cl;
  if (
    field.label.indexOf("$counter$") >= 0 ||
    field["label-hint"].indexOf("$counter$") >= 0
  ) {
    cnt_cl = guid();
    field.label = field.label.replace(
      /\$counter\$/g,
      `<span class="${cnt_cl}">0</span>`
    );
    field["label-hint"] = field["label-hint"].replace(
      /\$counter\$/g,
      `<span class="${cnt_cl}">0</span>`
    );
    field._add_counter = 1;
  }
  var element = $(`<div class="form-group form-group--inline" data-wrap-for="${
    field.name
  }" data-var-type="textarea">
			<div class="form-group__text flex-fill">
				<textarea 
					id="input-${field.name}" 
					name="${field.name}" 
					rows="${field.rows || 1}" 
					style="overflow-x: hidden; word-wrap: break-word;"
					${field._add_counter ? `data-counter=".${cnt_cl}"` : ""}>${
    field.value || ""
  }</textarea>
				<label for="input-${field.name}" style="white-space: nowrap;">${
    field.label
  }<br><span class="text-xsmall">${field["label-hint"]}</span></label>
			</div>
		</div>`);
  var buttons = $(
    `<button type="button" class="btn btn--icon btn--link" title="Load from file" id="upload-btn-for-${field.name}" data-target="upload-for-${field.name}" style="margin-left: 0;">
			<span class="icon-upload"></span>
		</button>
		<button type="button" class="btn btn--icon btn--link btn-clear" title="Clear" id="clear-btn-${field.name}" data-target="input-${field.name}" style="margin-left: 0;">
			<span class="icon-trash"></span>
		</button>
		<input class="file-input" type="file" id="upload-for-${field.name}" style="display: none;">`
  );

  if (field.buttons && Array.isArray(field.buttons)) {
    buttons = addNewButtonsToSet(
      field.buttons,
      buttons,
      element.find("textarea")
    );
  }
  buttons.first().removeAttr("style");
  element.find("label").after(buttons);
  element.find(`#clear-btn-${field.name}`).click(function (e) {
    e.preventDefault();
    $("#" + $(this).attr("data-target"))
      .val("")
      .change();
  });
  element
    .find("#upload-for-" + field.name)
    .change([element.find("#input-" + field.name), /[^\s]+/], readSingleFile);
  element.find("#upload-btn-for-" + field.name).click(function (e) {
    e.preventDefault();
    $("#" + $(this).attr("data-target")).trigger("click");
  });
  let ta = element.find("textarea");
  ta.css("height", "200px");
  element = $(`<div class="flex flex-center-vertical" />`)
    .append(element.addClass("half-margin-right flex-fill"))
    .append(
      $(
        `<div class="btn-group btn-group--large btn-group--square base-margin-top" />`
      ).append(buttons)
    );
  textareaCounter(ta);
  element.find(`.${cnt_cl}`).html(ta.val().lineCount());
  p.append(element);
}

function addFieldRadio(p, field) {
  let el = $(`<div data-wrap-for="${field.name}" data-var-type="radio" />`);
  for (var ri = 0; ri < field.variants.length; ri++) {
    el.append(`<div class="form-group form-group--inline radio-${
      field.name
    }" data-var-type="radio">
			<label class="radio radio--alt">
				<input type="radio" 
					${
            field.variants[ri].selected || field.value === field.variants[ri]
              ? "checked"
              : ""
          } 
					name="${field.name}" 
					value="${field.variants[ri].value}">
				<span class="radio__input"></span>
				<span class="radio__label">${field.variants[ri].label}</span>
			</label>
		</div>`);
  }
  if (field.label) {
    el.prepend(
      `<div class="qtr-margin-bottom label-${field.name}">${field.label}</div>`
    );
  }
  p.append(el);

  if (field.update_on_change) {
    el.addClass("update-on-change")
      .find("input")
      .change(updateOnChange)
      .data({ update: field.update_on_change });
  }
}

function addFieldCheckboxes(p, field) {
  let el = $(
    `<div data-wrap-for="${field.name}" data-var-type="checkboxes" />`
  );
  // if (field.value && !Array.isArray(field.value)) { field.value = field.value.split(','); }
  for (var ri = 0; ri < field.variants.length; ri++) {
    el.append(`<div class="form-group form-group--inline">
			<label class="checkbox">
				<input type="checkbox" ${field.variants[ri].value ? "checked" : ""} name="${
      field.variants[ri].name
    }" value="${field.variants[ri].value}">
				<span class="checkbox__input"></span>
				<span class="checkbox__label">${field.variants[ri].label}</span>
			</label>
		</div>`);
  }
  if (field.label) {
    el.prepend(`<div class="qtr-margin-bottom">${field.label}</div>`);
  }
  p.append(el);

  if (field.update_on_change) {
    el.addClass("update-on-change")
      .find("input")
      .change(updateOnChange)
      .data({ update: field.update_on_change });
  }
}

function updateOnChange(e) {
  let $t = $(this);
  let s = $t.closest(".section");
  let fn = $t.data("update");
  let el = s.find(`[data-wrap-for="${fn}"]`);
  if (!el.length) {
    el = s.find(`:input[name="${fn}"]`);
  }
  if (!el.length) {
    return;
  }

  let field = el.data("field");
  if (!field || !field.load_values) {
    return;
  }
  if (field.type !== "multiple" || field.load_values.result.type !== "groups") {
    return;
  }

  let link =
    field.load_values.link.indexOf("{{") >= 0
      ? replaceVariables(field.load_values.link, s)
      : field.load_values.link;

  $.ajax({
    url: link,
    type: field.load_values.method || "GET",
    cache: false,
    processData: false,
    data: field.load_values.request
      ? JSON.stringify(field.load_values.request)
      : undefined,
    contentType: "application/json",
    headers: {
      Accept: "application/json",
    },
    async: true,
  }).done(function (data) {
    parseUpdated(field, data, el);
  });
}

function parseUpdated(field, data, el) {
  let r = [];
  let input = el.is(":input") ? el : el.find(`:input[name="${field.name}"]`);
  if (!input.length) {
    return;
  }
  if (
    !data[field.load_values.result.attribute] ||
    !data[field.load_values.result.attribute].length
  ) {
    input.val("");
    el.find(".counter").text("0");
    return;
  }

  getGroupSelected(data[field.load_values.result.attribute], r);

  let selected = input.val() ? input.val().split(",") : [];
  if (!selected.length) {
    input.val(r.join(","));
    el.find(".counter").text(r.length);
  } else {
    let inter = intersection(selected, r);
    input.val(inter.join(","));
    el.find(".counter").text(inter.length);
  }
}

function getGroupSelected(arr, result) {
  arr.forEach((e) => {
    if (e.type === "group") {
      getGroupSelected(e.value, result);
    } else if (e.type === "checkbox" && e.value) {
      result.push(e.name);
    }
  });
}

function addFieldCheckbox(p, field) {
  let el = $(`<div class="form-group"><label class="switch switch--small" data-wrap-for="${
    field.name
  }" data-var-type="checkbox">
					<input type="checkbox" ${field.value ? "checked" : ""} name="${
    field.name
  }" id="input-${field.name}">
					<span class="switch__input"></span>
					<span class="switch__label">${field.label}</span>
				</label></div>`);
  p.append(el);
  if (field.dependants && field.dependants.length) {
    el.find("input")
      .addClass("has-dependants")
      .data({
        dependants: field.dependants,
        show_if_checked: field.show_if_checked,
      })
      .click(changeDependands);
  }
}

function changeDependands(e) {
  let $this = $(this);
  let dependants = $this.data("dependants");
  let show_if_checked = $this.data("show_if_checked");
  let parent = $this.closest(".collectable");
  if (!dependants || !dependants.length) {
    return;
  }
  let search_for = [];
  let variants_rebuild = [];
  dependants.forEach((x) => {
    if (typeof x === "object") {
      let k = Object.keys(x)[0];
      if (!variants_rebuild.includes(k)) {
        variants_rebuild.push(k);
      }
      search_for.push(
        `.dropdown[data-tabs-for="${k}"] div.dropdown__menu *[data-tab="edit-tab-${x[k]}"]`
      );
    } else if (typeof x === "string") {
      search_for.push(`[data-wrap-for="${x}"]`);
    }
  });

  let elements = parent.find(search_for.join(", "));
  let checked = $this.is(":checkbox")
    ? $this.is(":checked")
    : $this.hasClass("selected");
  if ((checked && show_if_checked) || (!checked && !show_if_checked)) {
    // showing
    elements
      .removeClass("deactivated")
      .fadeIn("fast")
      .find(".has-dependants")
      .each(function () {
        variants_rebuild.push(changeDependands.call(this, e));
      });
  } else {
    // hiding
    elements.each(function () {
      hideDependands.call(this);
    });
  }

  return variants_rebuild;
}

function hideDependands() {
  let $this = $(this);
  let dependants = $this.find(".has-dependants").data("dependants");
  let parent = $this.closest(".collectable");

  if (dependants && dependants.length) {
    let elements = parent.find(
      dependants.map((x) => `[data-wrap-for="${x}"]`).join(", ")
    );
    elements.each(function () {
      hideDependands.call(this);
    });
  }
  $this.fadeOut("fast").addClass("deactivated").css({ display: "none" });
}

function selectClick(e) {}

function addFieldSelect(p, field) {
  let select = $(`<select name="${field.name}" />`);
  let gr;
  if (field.load_values) {
    select.append("<option>Loading...</option>");
    loadSelectValues(select, field.load_values);
    gr = $(`<div class="form-group__text select" />`).append(
      select,
      `<label for="select2">${field.label}</label>`
    );
  } else {
    if (field.dropdown) {
      var a_el = $(`<a href="javascript:;" class="btn--dropdown">
				<span class="dropdown-title">${field.label}</span>
			</a>`);
      gr = prepareDropDown(a_el, field.value, selectClick);
    } else {
      field.value.forEach((e) => {
        select.append(
          `<option value="${e.value}" ${
            e.selected || field.selected == e.value ? 'selected=""' : ""
          }>${e.label}</option>`
        );
      });
      gr = $(`<div class="form-group__text select" />`).append(
        select,
        `<label for="select2">${field.label}</label>`
      );
    }
  }
  p.append(
    $(
      `<div class="form-group ${
        field.inline ? "label--inline" : ""
      }" data-wrap-for="${field.name}" data-var-type="select" />`
    ).append(gr)
  );
}

function addFieldMultiple(p, field) {
  let total_selected = $(`<div class="form-group" data-wrap-for="${field.name}" data-var-type="multiple">
		<div class="form-group__text">
			<input name="${field.name}" value="" type="hidden">
			<label>${field.label}</label>
			<div class="panel panel--bordered like-input">
				<span class="flex-fill">
					<span class="counter">0</span>
					<span>${field.label}</span>
				</span>
				<div class="actions flex flex-center-vertical">
					<span>
						<a class="add-edit-link no-decor half-margin-left"><span class="icon-edit qtr-margin-right"></span> Edit</a>
						<a class="clear-selected-link no-decor half-margin-left"><span class="icon-trash qtr-margin-right"></span> Clear</a>
					</span>
				</div>
			</div>
		</div>
	</div>`).data("field", field);

  total_selected.find("a.add-edit-link").click(selectMultiple);
  total_selected.find("a.clear-selected-link").click(clearSelected);
  total_selected.find("input").data("selected", []);
  p.append(total_selected);
}

function selectMultiple(e) {
  let $this = $(this);
  let modal = new_modal("lg", ["close", "save"]);
  let header = modal.find(".modal__title");
  let field = $this.closest('[data-var-type="multiple"]').data("field");
  if (field.load_values) {
    loadMultipleValues.call(this, modal, field.load_values);
  }
  header.html(`Select ${field.label}`);
  modal.modal("show");
}

function clearSelected(e) {
  e.preventDefault();

  let card = $(this).closest('[data-var-type="multiple"]');
  let field = card.data("wrap-for");

  card.find(`input[name="${field}"]`).val("");
  card.find(`.counter`).text("0");
}

function replaceVariables(line, where) {
  let re = /{{([^{}]+)}}/g;
  let val = line,
    m;

  do {
    m = re.exec(line);
    if (m) {
      let el = where.find(`:input[name="${m[1]}"]`).first();
      let d;
      if (!el.length) {
        d = "";
      } else {
        if (el.is(":checkbox")) {
          d = el.is(":checked") ? el.val() : 0;
        } else if (el.is(":radio")) {
          d = el
            .closest(`[data-wrap-for="${m[1]}"]`)
            .find(":radio:checked")
            .val();
        } else {
          d = el.val();
        }
      }
      val = val.replace(`{{${m[1]}}}`, d);
    }
  } while (m);
  return val;
}

function buildChoicesGroups(parameters, data, where) {
  where.empty();
  addFields(where, data[parameters.result.attribute]);
  where.find(":checkbox").each(function () {
    $(this).prop("checked", parameters.selected.includes(this.name));
  });
}

function buildChoicesTable(parameters, data, where) {
  let table = $(`<table
		class="table table--compressed table--bordered table--highlight table--nostripes table--sortable table--fixed" 
	/>`);
  if (data.paging) {
    let page = Math.ceil(data.paging.offset / data.paging.limit) + 1;
    table.data({
      pagination: true,
      page: page,
      pages: data.paging.pages,
      sortcolumn: data.paging.column,
      sortorder: data.paging.order,
      perpage: data.paging.limit,
    });
  }

  if (!parameters.result.columns || !Array.isArray(parameters.result.columns)) {
    parameters.result.columns = [
      { title: "Name", field: parameters.result.fields.name },
    ];
  }

  let thead = $(`<thead />`),
    tbody = $(`<tbody />`);
  var tr = $("<tr />");
  tr.append(`<th class="checkbox-only">
		<label class="checkbox">
			<input type="checkbox" class="checkbox-all">
			<span class="checkbox__input"></span>
		</label>
	</th>`);
  parameters.result.columns.forEach(function (el) {
    tr.append(
      `<th class="sortable" data-column="${el.field}">${el.title}</th>`
    );
  });
  thead.append(tr);

  data[parameters.result.attribute].forEach(function (el) {
    tr = $(`<tr data-id="${el[parameters.result.fields.id]}"/>`);
    tr.append(`<td class="checkbox-only">
			<label class="checkbox">
				<input type="checkbox" class="checkbox-input ${parameters.result.attribute}-checkbox">
				<span class="checkbox__input"></span>
			</label>
		</td>`);
    parameters.result.columns.forEach(function (clmn) {
      tr.append($(`<td>${el[clmn.field]}</td>`).attr("title", el[clmn.field]));
    });
    tbody.append(tr);
  });

  var parser = document.createElement("a");
  parser.href = parameters.link;

  table.append(thead, tbody);
  where.empty().append(table);
  table.checkboxes({
    actions: undefined,
    block_on_multi: undefined,
    result_attribute: parameters.result.attribute,
    id_attribute: parameters.result.fields.id,
    checkbox_class: parameters.result.attribute + "-checkbox",
    placeholder: undefined,
    hide_on_empty: undefined,
    update_method: "GET",
    update_url:
      parser.pathname +
      "page/{{page}}/per-page/{{per-page}}/sort/{{sort}}/order/{{order}}/" +
      parser.search,
    scroll: undefined,
    keep_globals: true,
    selected: parameters.selected,
  });
}

function saveMultipleGroups(e) {
  let body = $(this).closest(".modal").find(".modal__body");

  let inpt = $(this).data("target-input");
  let res = [];
  body.find(":checkbox:checked").each((x, el) => res.push(el.name));

  inpt.val(res.join(","));
  inpt.closest('[data-var-type="multiple"]').find(".counter").html(res.length);
  inpt.trigger("change");
}

function saveMultipleTable(e) {
  let table = $(this).closest(".modal").find("table");
  let selected = table.checkboxes("get_selected");
  let inpt = $(this).data("target-input");
  inpt.val(selected.join(","));
  inpt
    .closest('[data-var-type="multiple"]')
    .find(".counter")
    .html(selected.length);
  inpt.trigger("change");
}

async function loadMultipleValues(modal, parameters) {
  let btn = $(this);
  let body = modal.find(".modal__body");
  body.empty().append(dataLoader()).children().fadeIn("fast");

  let section = btn.closest(".collectable");
  let link =
    parameters.link.indexOf("{{") >= 0
      ? replaceVariables(parameters.link, section)
      : parameters.link;

  $.ajax({
    url: link,
    type: parameters.method || "GET",
    cache: false,
    processData: false,
    async: true,
    data: parameters.request ? JSON.stringify(parameters.request) : undefined,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      body.addClass("text-left");
      if (
        !data[parameters.result.attribute] ||
        !Array.isArray(data[parameters.result.attribute]) ||
        !data[parameters.result.attribute].length
      ) {
        body.empty().append(`<div><p>No data retrieved.</p></div>`);
      } else {
        let scoreboard = btn.closest('[data-var-type="multiple"]');
        let inpt = scoreboard.find(
          `input[name="${scoreboard.data("wrap-for")}"]`
        );
        parameters.selected = inpt.val() ? inpt.val().split(",") : [];

        if (parameters.result.type === "groups") {
          modal
            .find('button[id$="-save"]')
            .data("target-input", inpt)
            .click(saveMultipleGroups);
          buildChoicesGroups.call(btn[0], parameters, data, body);
        } else {
          modal
            .find('button[id$="-save"]')
            .data("target-input", inpt)
            .click(saveMultipleTable);
          buildChoicesTable.call(btn[0], parameters, data, body);
        }
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

async function loadSelectValues(select, parameters) {
  $.ajax({
    url: parameters.link,
    type: parameters.method || "GET",
    cache: false,
    processData: false,
    data: parameters.request ? JSON.stringify(parameters.request) : undefined,
    contentType: "application/json",
    headers: {
      Accept: "application/json",
    },
    async: true,
  })
    .done(function (data) {
      select.empty();
      data[parameters.result.attribute].forEach(function (e) {
        select.append(`<option value="${e[parameters.result.fields.id]}">
				${e[parameters.result.fields.name]}
			</option>`);
      });
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function addVariants(variants, var_name, modal = undefined, d = undefined) {
  if (!var_name) {
    console.error("var name not specified");
  }
  var append = $(this);
  var dropdown_elements = [];
  var tabs = $('<div class="tabs-wrap panel"></div>');
  for (var i = 0; i < variants.length; i++) {
    var tabName = "edit-tab-" + variants[i].name;
    dropdown_elements.push({
      val: tabName,
      title: variants[i].short,
      hint: variants[i].desc,
      data: {
        target: tabName,
      },
      dependants: variants[i].dependants,
      select_dependant: variants[i].select_dependant || {},
      show_if_checked: variants[i].dependants
        ? variants[i].show_if_checked
        : undefined,
    });

    var tab = $(`<div class="tab animated fadeIn fast" id="${tabName}"></div>`);
    tab.attr({
      "data-desc": variants[i].desc,
      "data-variant": variants[i].name,
    });
    tab.append(
      `<input type="hidden" value="${variants[i].name}" name="${var_name}">`
    );
    addFields(tab, variants[i].fields, modal, d);
    // if ( i > 0 ){ tab.hide(); }
    tab.hide();
    tabs.append(tab);
  }
  var a_el = $(`<a href="javascript:;" class="btn--dropdown">
		<span class="dropdown-title">Test</span>
	</a>`);
  var dd_element = prepareDropDown(a_el, dropdown_elements, changeTab);
  dd_element.addClass("link").attr("data-tabs-for", var_name);

  var st = $(`<div class="secondary-tabs"></div>`).append(dd_element);
  append.append(
    $(`<div 
			class="form-group--margin" 
			data-wrap-for="${var_name}" 
			data-var-type="variants" />`).append(st, tabs)
  );

  dd_element.find("li a").data({ tabs: tabs });
  dd_element
    .find(
      `li a[data-value="${
        d && d.variant ? "edit-tab-" + d.variant : dropdown_elements[0].val
      }"]`
    )
    .click();
  return st;
}

function validateMe(e) {
  regex = e.data.regex;
  if (typeof regex === "string" && regex !== "1") {
    regex = new RegExp(regex, "i");
  } else {
    regex = /[^\s]+/;
  }

  if (regex.test($(this).val())) {
    $(this).removeClass("input--dirty input--invalid");
  } else {
    $(this).addClass("input--dirty input--invalid");
  }
}

function disableBtn(btn) {
  btn.prop("disabled", true);
}

function enableBtn(btn) {
  btn.prop("disabled", false);
}

function readSingleFile(e) {
  var target, regex;
  if (Array.isArray(e.data)) {
    target = e.data[0];
    regex = e.data[1];
  } else {
    target = e.data;
    regex = /^[^:]+:.+/;
  }
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var contents = e.target.result;
    var lines = contents.split("\n");
    lines.forEach(function (entry) {
      entry = entry.trim();
      if (regex.test(entry)) {
        if (target.val().length) {
          target.val(target.val() + "\n");
        }
        target.val(target.val() + entry);
      }
    });
    autosize.update(target);
    target.trigger("input");
  };
  reader.readAsText(file);
}

const flatten = (arr) => {
  let i = 0;
  while (i < arr.length) {
    if (Array.isArray(arr[i])) {
      arr.splice(i, 1, ...arr[i]);
    } else {
      i++;
    }
  }
  return arr;
};

function changeTab(e) {
  e.preventDefault();
  var $a = $(this);
  var dd_element = $a.closest(".dropdown");
  var tabs = $a.data("tabs");
  if ($a.hasClass("selected")) {
    return;
  }
  dd_element.find("a.selected").removeClass("selected");
  dd_element.find(".dropdown-title").text($a.text());
  var trgt = $a.data("value");
  tabs
    .children(".tab.active-tab")
    .removeClass("active-tab")
    .hide()
    .promise()
    .done(function (e) {
      tabs
        .find("#" + trgt)
        .addClass("active-tab")
        .show();
      $a.addClass("selected");

      var variants_rebuild = [];
      dd_element.find(".has-dependants").each(function () {
        variants_rebuild.push(changeDependands.call(this, e));
      });

      let sd = $a.data("select_dependant") || {};
      if (sd) {
        Object.keys(sd).forEach((key) => {
          $(
            `div[data-wrap-for="${key}"] .dropdown[data-tabs-for="${key}"] .dropdown__menu *[data-tab="edit-tab-${sd[key]}"] a`
          ).click();
        });
      } else {
        flatten(variants_rebuild)
          .filter((v, i, a) => a.indexOf(v) === i)
          .forEach(function (e) {
            $(
              `[data-wrap-for="${e}"] .dropdown[data-tabs-for="${e}"] .dropdown__menu a:not(.deactivated)`
            ).click();
          });
      }
      var event = new Event("on.tab.change");
      event.newTab = $a.data("value").replace("edit-tab-", "");
      $a.closest("[data-tabs-for]")[0].dispatchEvent(event);
    });
}

function collectVariants() {
  var parent = $(this);

  let wraps = parent
    .find(
      ".parameters > [data-wrap-for], .parameters > .flex > [data-wrap-for], .parameters > .form-group:not([data-wrap-for]) > [data-wrap-for]"
    )
    .filter((x, el) => {
      return $(el).parentsUntil(parent, "[data-wrap-for]").length === 0;
    });

  let res = {};

  wraps.each((x, el) => {
    let $el = $(el);
    let t = $el.data("var-type");
    let n = $el.data("wrap-for");
    switch (t) {
      case "group":
        break;
      case "input":
      case "textarea":
      case "radio":
      case "checkbox":
      case "select":
        let inp = $el.find(":input");
        if (inp.data("group")) {
          res[inp.data("group")] = Object.assign(
            res[inp.data("group")] || {},
            inp.serializeObject()
          );
        } else {
          res = Object.assign(res, inp.serializeObject());
        }
        break;
      case "checkboxes":
        res[n] = [];
        $el.find(":checkbox:checked").each((chi, ch) => res[n].push(ch.name));
        break;
      case "multiple":
      case "dictionary":
        res[n] = $el.find(`input[name="${n}"]`).val();
        res["how-to-follow"] = $el.find(`input[name="how-to-follow"]`).val();
        res["disallow-repeats"] = $el
          .find(`input[name="disallow-repeats"]`)
          .val();
        break;
      case "variants":
        res[n] = Object.assign(
          {
            variant: $el
              .find(`> .tabs-wrap > .tab.active-tab input[name="${n}"]`)
              .val(),
          },
          collectVariants.call($el.find(`> .tabs-wrap > .tab.active-tab`)[0])
        );
        break;
    }
  });

  return res;
}

function editDictionaryField(e) {
  e.preventDefault();
  let $t = $(this);
  let types = $t.data("types");
  let wrap = $t.closest('[data-var-type="dictionary"]');
  let wf = wrap.data("wrap-for");
  let rval = wrap.find(`input[name="${wf}"]`).val().split(",");

  let how = wrap.find(`input[name="how-to-follow"]`).val();
  let disallow = wrap.find(`input[name="disallow-repeats"]`).val();

  let modal = new_modal("lg", ["close", "save"], true, {
    save: saveDictionariesSelection.bind(this),
  }).attr("id", "dictionaries-modal");
  let header = modal.get_header_h();
  header.html(`Select ` + $t.closest(".form-group").find("label:first").text());
  loadDictionaries.call(this, modal, types, rval, how, disallow);
  modal.modal("show");
}

function loadDictionaries(
  modal,
  types,
  value,
  how_follow = "one-by-one",
  disallow = "0"
) {
  let body = modal.get_body();
  body.empty().append($(dataLoader()).addClass("animated fadeIn").show());

  $.ajax({
    url:
      globals.rest.dictionaries.by_type +
      types +
      "/columns/id,name,type/combine/type/",
    type: "GET",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      body.addClass("text-left");
      body.empty();
      if (!data.result || !Object.keys(data.result)) {
        body.append(`<div class="panel">
				<ul class="list">
					<li>No dictionaries yet. 
						<a href="${globals.rest.dictionaries.new}" target="_blank">Create one. <span class="icon-jump-out"></span></a>
					</li>
				</ul>
			</div>`);
        return;
      } else {
        Object.keys(data.result).forEach((key) => {
          if (key === "labels") {
            return;
          }
          let drwr = $(`<div class="drawer" data-group="dictionaries-select">
					<h5 class="half-margin-bottom drawer__header"><a>${data.result.labels[key]}</a></h5>
					<div class="drawer__body animated faster fadeIn"></div>
				</div>`);
          populateDictionariesSelect(
            drwr.find(".drawer__body"),
            data.result[key],
            value || []
          );
          body.append(drwr);
        });
        body.append(`<div class="flex flex-center-vertical dbl-margin-top">
				<div class="base-margin-right label-how-to-follow">How to select values</div>
				<div class="form-group form-group--inline radio-how-to-follow">
					<label class="radio radio--alt">
						<input type="radio" ${
              how_follow === "random" ? "checked" : ""
            } name="how-to-follow" value="random">
						<span class="radio__input"></span>
						<span class="radio__label">Select randomly</span>
					</label>
				</div><div class="form-group form-group--inline radio-how-to-follow">
					<label class="radio radio--alt">
						<input type="radio" ${
              how_follow === "one-by-one" ? "checked" : ""
            } name="how-to-follow" value="one-by-one">
						<span class="radio__input"></span>
						<span class="radio__label">Select in order</span>
					</label>
				</div>
			</div>`);

        body.append(`<label class="switch switch--small half-margin-top">
				<input type="checkbox" name="disallow-repeats" ${disallow ? "checked" : ""}>
				<span class="switch__input"></span>
				<span class="switch__label">Disallow reuse of values</span>
			</label>`);

        let dr = body.find("input.dictionary:checked:first").closest(".drawer");
        if (!dr.length) {
          dr = body.find(".drawer:first");
        }
        dr.addClass("drawer--opened");
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function populateDictionariesSelect(b, dictionaries, selected) {
  let table = $(`<div class="responsive-table dbl-margin-bottom">
		<table class="table">
			<tbody>
			</tbody>
		</table>
	</div>`);
  let tbody = table.find("tbody");
  dictionaries.forEach((dict) => {
    tbody.append(`<tr>
			<td>
				<label class="checkbox">
					<input class="dictionary" type="checkbox" name="${dict.id}" ${
      selected.includes(dict.id) ? "checked" : ""
    }>
					<span class="checkbox__input"></span>
					<span class="checkbox__label hidden-xs">${dict.name}</span>
				</label>
			</td>
		</tr>`);
  });
  b.append(table);
}

function populateDictionariesSpan(el, val) {
  if (Array.isArray(val)) {
    el.empty();
    el.closest('[data-var-type="dictionary"]')
      .find("input:first")
      .val(val.map((x) => x.id).join(","));
    if (val.length > 0) {
      el.html(`${val.length} selected:`);
      el.append('<span class="names"></span>');
      let n = el.find(".names");
      val.forEach((x) =>
        n.append(
          `<span class="label label--tiny label--light qtr-margin-left qtr-margin-bottom">${x.name}</span>`
        )
      );
    } else {
      el.html('<div class="qtr-margin-bottom">None selected</div>');
    }
    return;
  }

  if (typeof val === "string") {
    if (val.indexOf(":") > 0) {
      let how = val.split(":", 1)[0];
      val = val.replace(how + ":", "");
      let href;
      switch (how) {
        case "by-name":
          href =
            globals.rest.dictionaries.by_name +
            val +
            "/columns/id,name/combine/none/";
          break;
        case "all-by-type":
          href =
            globals.rest.dictionaries.by_type +
            val +
            "/columns/id,name/combine/none/";
          break;
      }

      el.html(
        `<span class="icon-animation spin" aria-hidden="true"></span>&nbsp;Loading...`
      );

      $.ajax({
        url: href,
        method: "GET",
        async: true,
        cache: false,
        headers: { Accept: "application/json" },
      })
        .done((data) => {
          populateDictionariesSpan(el, data.result);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          toast_error(jqXHR, textStatus, errorThrown);
          el.empty().html(
            '<span class="text-warning">Couldn\'t get data from server</span>'
          );
        });
    } else {
      $.ajax({
        url:
          globals.rest.dictionaries.multiple + "columns/id,name/combine/none/",
        method: "GET",
        async: true,
        cache: false,
        data: { ids: val },
        headers: { Accept: "application/json" },
      })
        .done((data) => {
          populateDictionariesSpan(el, data.result);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          toast_error(jqXHR, textStatus, errorThrown);
          el.empty().html(
            '<span class="text-warning">Couldn\'t get data from server</span>'
          );
        });
    }
  }
}

function saveDictionariesSelection() {
  let elements = document.querySelectorAll(
    '#dictionaries-modal input.dictionary[type="checkbox"]:checked'
  );
  let vals = [];
  elements.forEach((e) => {
    vals.push({
      id: e.getAttribute("name"),
      name: e.parentElement.querySelector(".checkbox__label").innerText,
    });
  });
  let p = $(this).closest('[data-var-type="dictionary"]');
  let wf = p.data("wrap-for");
  p.find(`input[name="${wf}"]`)
    .attr("value", vals.map((x) => x.id).join(","))
    .trigger("change");
  p.find('input[name="how-to-follow"]').val(
    $('#dictionaries-modal input[name="how-to-follow"]:checked').val()
  );
  p.find('input[name="disallow-repeats"]').attr(
    "value",
    $('#dictionaries-modal input[name="disallow-repeats"]').is(":checked")
      ? "on"
      : ""
  );

  populateDictionariesSpan(p.find(".dictionaries-selected"), vals);
}
