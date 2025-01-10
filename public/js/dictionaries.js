var saver;

$(function () {
  globals.current_base = globals.rest.dictionaries.base;
  $("body").on("click", "a.dictionary-type-link", change_dictionaries_type);
  $("body").on(
    "click",
    "a.add-dictionary, button.add-dictionary",
    add_dictionary_click
  );
  $("body").on("click", "a.edit-dictionary-link", edit_dictionary_click);
  $("body").on("click", "a.delete-dictionary-link", delete_dictionary_click);
  check_url();
});

function check_url(tab = "[^/]+") {
  let slash = "/";
  let re = new RegExp(
    `${slash}dictionaries${slash}type${slash}${tab}${slash}`,
    "i"
  );
  if (re.test(window.location.pathname)) {
    $(`a[href="${decodeURIComponent(window.location.pathname)}"]`).click();
  }
  if (window.location.pathname === globals.rest.dictionaries.new) {
    add_dictionary_click.call(window, undefined);
  }
}

function save_events() {
  let inpts = $('form[name="smsConfig"] :input');
  inpts.not('[type="number"], [type="text"]').change(input_changed);
  inpts.filter('[type="number"], [type="text"]').on("input", input_changed);
}

function input_changed() {
  let $t = $(this);
  let name = this.name;
  let val = $t.val();
  if ($t.is(":checkbox")) {
    val = $t.is(":checked") ? 1 : 0;
  }

  saver.saveValue(name, val, "sms");
}

function change_dictionaries_type(e) {
  e.preventDefault();
  let $t = $(this);
  $t.closest("ul").find(".tab.active").removeClass("active");
  $t.closest("li").addClass("active");
  $t.closest("ul").find(".icon-animation").remove();
  $t.append(
    `<span class="icon-animation spin half-margin-right half-margin-left" aria-hidden="true"></span>`
  );

  $c = $("#dictionary-type-data");
  $c.addClass("disabled");

  $.ajax({
    url: $t.attr("href") + "columns/id,name,type,owner/combine/none/",
    method: "GET",
    async: true,
    cache: false,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done((data) => {
      window.history.pushState("", "", $t.attr("href"));
      show_dictionaries(data.result, $c);
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      toast_error(jqXHR, textStatus, errorThrown);
    })
    .always(() => {
      $c.removeClass("disabled");
      $t.find(".icon-animation").remove();
    });
}

function show_dictionaries(result, where) {
  let t = new_tab_container(
    $("ul#type-select-ul li.tab.active .title").html() + " Dictionaries"
  );
  let b = t.find(".tab-body");

  b.append(`<div class="panel actions no-padding-left no-padding-right" id="dictionaries-actions">
      <div class="flex-center-vertical">
          <div class="btn-group btn-group--large btn-group--square">
            <button class="btn btn--light add-dictionary">
              <span class="icon-add-outline half-margin-right" aria-hidden="true" title="Add template"></span>
              <span>Add dictionary</span>
            </button>
          </div>
      </div>
    </div>`);

  if (result.length) {
    let table = $(`<div class="responsive-table dbl-margin-bottom">
            <table class="table table--lined">
                <tbody>
                </tbody>
            </table>
        </div>`);
    let tbody = table.find("tbody");
    result.forEach((dict) => {
      tbody.append(`<tr>
                <td>
                    <a 
                        class="edit-dictionary-link" 
                        href="${globals.rest.dictionaries.by_id}${dict.id}/">${
        dict.name
      }</a>
                    ${
                      dict.owner === "__GLOBAL__"
                        ? '<span class="label label--tiny label--light half-margin-left">global</span>'
                        : ""
                    }
                    ${
                      dict.owner === "__GLOBAL__" && !CAN_GLOBALS
                        ? '<span class="label label--tiny label--dark label--bordered half-margin-left">readonly</span>'
                        : ""
                    }
                </td>
                <td style="width:35px;">
                    ${
                      dict.owner !== "__GLOBAL__" ||
                      (dict.owner === "__GLOBAL__" && CAN_GLOBALS)
                        ? `<a class="delete-dictionary-link" data-id="${dict.id}">
                                <span class="icon-trash icon-small"></span></a>`
                        : ""
                    }
                </td>
            </tr>`);
    });
    b.append(table);
  } else {
    b.append(`<div class="panel table-placeholder">
            <ul class="list">
                <li>No dictionaries yet. <a class="add-dictionary">Create one.</a></li>
            </ul>
        </div>`);
  }

  where.empty().append(t);
}

function add_dictionary_click(e) {
  if ($(this).is("a") && e) {
    e.preventDefault();
  }

  let type =
    $("ul#type-select-ul li.tab.active").data("type") || "unclassified";
  let t = new_tab_container("New Dictionary", "", ["back", "save"], {
    save: save_dictionary,
    back: go_back,
  });
  t.find(".tab-body").append("<form></form>");

  edit_dictionary(
    {
      id: 0,
      type: type,
      name: "",
      content: "",
      make_global: 0,
    },
    t.find(".tab-body form").on("submit", () => {
      return false;
    })
  );

  $("#dictionary-type-data").empty().append(t);
}

function edit_dictionary_click(e) {
  let $t = $(this);
  if ($t.is("a")) {
    e.preventDefault();
  }

  $c = $("#dictionary-type-data");
  $c.addClass("disabled");

  let href = $t.attr("href");
  $t.append(
    `<span class="icon-animation spin half-margin-right half-margin-left" aria-hidden="true"></span>`
  );

  $.ajax({
    url: href,
    method: "GET",
    async: true,
    cache: false,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done((data) => {
      let t;
      if (data.result.owner === "__GLOBAL__" && !CAN_GLOBALS) {
        t = new_tab_container("View Dictionary", "Readonly", ["back"], {
          back: go_back,
        });
      } else {
        t = new_tab_container(
          "Edit Dictionary",
          "",
          ["back", "remove", "save"],
          {
            save: save_dictionary,
            remove: delete_dictionary_click,
            back: go_back,
          }
        );
      }
      t.find(".tab-body").append("<form></form>");

      edit_dictionary(
        data.result,
        t.find(".tab-body form").on("submit", () => {
          return false;
        })
      );

      $("#dictionary-type-data").empty().append(t);
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      toast_error(jqXHR, textStatus, errorThrown);
    })
    .always(() => {
      $c.removeClass("disabled");
      $t.find(".icon-animation").remove();
    });
}

function edit_dictionary(values, where) {
  if (values.id) {
    where.append(
      `<input type="hidden" value="${values.id}" name="id" id="dictionary-id" />`
    );
  }
  if (values.hasOwnProperty("owner") && values.owner === "__GLOBAL__") {
    values.make_global = 1;
  }
  let readonly = values.make_global && !CAN_GLOBALS ? "readonly" : "";

  where.append(`<div class="form-group">
        <div class="form-group__text">
            <input id="dictionary-name-input" type="text" name="name" value="${
              values.name || ""
            }" ${readonly}>
            <label for="dictionary-name-input">Name</label>
        </div>
    </div>`);

  let sfg = $(`<div class="form-group">
        <div class="form-group__text select">
            <select id="type-select" name="type" ${readonly}>
            </select>
            <label for="type-select">Type</label>
        </div>
    </div>`);
  let s = sfg.find("select");
  $("ul#type-select-ul li.tab").each(function () {
    let $t = $(this);
    s.append(`<option value="${$t.data(
      "type"
    )}" ${values.type === $t.data("type") ? "selected" : ""}>
            ${$t.find(".title").html()}
        </option>`);
  });
  where.append(sfg);

  if (CAN_GLOBALS) {
    where.append(`<div class="form-group">
            <label class="switch">
                <input type="checkbox" name="make_global" ${
                  values.make_global ? "checked" : ""
                }>
                <span class="switch__input"></span>
                <span class="switch__label">Make dictionary global</span>
            </label>
        </div>`);
  }

  where.append(`<div class="form-group">
        <div class="form-group__text">
            <textarea id="dictionary-content" class="textarea resize-vertical" rows="15" name="content" ${readonly}></textarea>
            <label for="dictionary-content">Content</label>
        </div>
    </div>`);
  where.find("textarea#dictionary-content").text(values.content);
}

function save_dictionary(e) {
  let $this = $(this);
  let data = $("#dictionary-type-data form").serializeObject();
  let href;
  if (data.id) {
    href = globals.rest.dictionaries.by_id + data.id + "/";
  } else {
    href = globals.rest.dictionaries.new;
  }

  $this
    .attr("disabled", "disabled")
    .prepend('<span class="icon-animation spin" aria-hidden="true"></span> ');
  $.ajax({
    url: href,
    type: "POST",
    cache: false,
    processData: false,
    data: JSON.stringify(data),
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(() => {
      toast("success", "", "Saved successfully");
      $(`li[data-type="${data.type}"] a`).trigger("click");
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      toast_error(jqXHR, textStatus, errorThrown, "Error");
    })
    .always(() => {
      $this.removeAttr("disabled").find(".icon-animation").remove();
    });
  return false;
}

function delete_dictionary_click(e) {
  e.preventDefault();
  let $t = $(this);
  let id;
  if ($t.is("a")) {
    id = $(this).data("id");
  } else {
    id = $("#dictionary-id").val();
  }
  let confirmed = () => {
    let h = `${globals.rest.dictionaries.by_id}${id}/`;
    $.ajax({
      url: h,
      method: "DELETE",
      async: true,
      cache: false,
      data: "",
      dataType: "json",
      contentType: "application/json",
      headers: { Accept: "application/json" },
    })
      .done((data) => {
        $("#type-select-ul li.active a").trigger("click");
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        toast_error(jqXHR, textStatus, errorThrown);
      })
      .always(() => {});
  };
  new_confirmation_modal(
    confirmed,
    `Are you sure want to delete dictionary?`,
    "Delete"
  );
}

function go_back(e) {
  $("#type-select-ul li.active a").trigger("click");
}
