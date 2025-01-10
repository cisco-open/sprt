(function ($) {
  var methods = {
    init: function (options) {
      return this.each(function () {
        var $this = $(this);
        if (!$this.is("table")) {
          return;
        }

        var table_options;
        if (Array.isArray(options)) {
          if (options.length) {
            table_options = options.shift();
          } else {
            throw new Error("Amount of options != amount of elements");
          }
        } else {
          table_options = options;
        }

        if (table_options.placeholder) {
          var insert_placeholder = false;
          if (table_options.placeholder instanceof jQuery) {
            table_options.placeholder = table_options.placeholder.eq(0);
            insert_placeholder = !jQuery.contains(
              document.documentElement,
              table_options.placeholder[0]
            );
          } else {
            table_options.placeholder = $(table_options.placeholder);
            insert_placeholder = true;
          }
          table_options.placeholder[0].id =
            guid() + table_options.placeholder[0].id;
          if (insert_placeholder) {
            table_options.placeholder.hide();
            $this.before(table_options.placeholder);
          }
        }

        $this.data("selected", []);
        table_options.update_url =
          table_options.update_url || window.location.pathname;
        table_options.update_method = table_options.update_method || "POST";
        table_options.checkbox_class =
          table_options.checkbox_class || "checkbox-input";
        table_options.check_for_placeholder =
          table_options.check_for_placeholder ||
          `.${table_options.checkbox_class}`;

        $this.data("options", table_options);
        make_table($this);
        check_placeholder.call(this);

        if (table_options.scroll) {
          scroll_spy.call(this);
        }

        if ($this.data("pagination")) {
          add_pagination.call(this);
        }

        if ($this.hasClass("table--sortable")) {
          table_sortable.call(this);
        }

        if (table_options.keep_globals) {
          init_globals.call(this, table_options.selected || []);
        }
      });
    },
    get_selected: function () {
      let opts = $(this).data("options");

      if (opts.keep_globals) {
        return this.data("globals") || this.data("selected");
      } else {
        return this.data("selected");
      }
    },
    get_selected_names: function (td_id = 1) {
      var values = [];
      var selected = $(this).data("selected");
      for (var i = 0; i < selected.length; i++) {
        values.push(
          $(this).find(`tr[data-id="${selected[i]}"] td`).eq(td_id).text()
        );
      }
      return values;
    },
    update: update_table,
    rebuild: rebuild_with_data,
    refresh: refresh_table,
    filter: apply_filter,
    clear: clear_selected,
  };

  $.fn.checkboxes = function (methodOrOptions) {
    if (methods[methodOrOptions]) {
      return methods[methodOrOptions].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    } else {
      // Default to "init"
      return methods.init.apply(this, arguments);
    }
  };

  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      s4() +
      s4()
    );
  }

  function update_table() {
    return this.each(function () {
      var table = $(this);
      var options = table.data("options");
      var checkboxes = table.find("." + options.checkbox_class);
      check_placeholder.call(this);
      if (checkboxes.length) {
        checkboxes
          .prop("checked", false)
          .off("click", checkbox_click)
          .click(checkbox_click);
        table
          .find(".checkbox-all")
          .prop("checked", false)
          .off("click", checkbox_all_click)
          .click(checkbox_all_click);
        table.data("selected", []);
        check_action_btns(table);
      }

      if (options.keep_globals) {
        select_from_globals.call(this);
      }
    });
  }

  function check_placeholder() {
    var table = $(this);
    var options = table.data("options");
    var checkboxes = table.find(options.check_for_placeholder);
    var placeholder = options.placeholder;
    if (placeholder) {
      if (checkboxes.length) {
        table.show();
        placeholder.hide();
      } else {
        table.hide();
        placeholder.show();
      }
    }

    if (options.hide_on_empty) {
      if (checkboxes.length) {
        options.hide_on_empty.show().removeClass("hide");
      } else {
        options.hide_on_empty.hide();
      }
    }
  }

  function rebuild_with_data(data) {
    return this.each(function () {
      var $this = $(this);
      var result_attribute = $this.data("options").result_attribute;
      if (!result_attribute) {
        throw new Error("result_attribute not specified.");
      }
      if (!Array.isArray(data[result_attribute])) {
        throw new Error("Result data is not an array.");
      }
      var options = $this.data("options");
      var id_attribute = options.id_attribute || "id";
      var checkbox_class =
        options.checkbox_class || `${result_attribute}-checkbox`;

      var columns = [];
      $this.find("thead th").each(function () {
        if ($(this).data("column")) {
          columns.push($(this).data("column"));
        }
      });

      var tbody = $this.find("tbody");
      tbody.empty();
      data[result_attribute].forEach(function (el) {
        var tr = $(`<tr data-id="${el[id_attribute]}"></tr>`).hide();
        tr.append(`<td class="checkbox-only">
                    <label class="checkbox">
                        <input type="checkbox" class="checkbox-input ${checkbox_class}">
                        <span class="checkbox__input"></span>
                    </label>
                </td>`);
        columns.forEach(function (clmn) {
          if (options.column_handlers && options.column_handlers[clmn]) {
            options.column_handlers[clmn]($this, tr, el, clmn);
          } else {
            tr.append(`<td>${el[clmn]}</td>`);
          }
        });
        tbody.append(tr);
        tr.fadeIn("fast");
      });
      $this.checkboxes("update");
    });
  }

  function make_table(table) {
    table
      .find("." + table.data("options").checkbox_class)
      .click(checkbox_click);
    table.find(".checkbox-all").click(checkbox_all_click);
  }

  function check_action_btns(table) {
    var actions_panel = table.data("options").actions;
    if (!actions_panel) {
      return;
    }
    var block = table.data("options").block_on_multi;
    var selected = table.data("selected");

    if (selected.length) {
      actions_panel
        .find(".scope-selected:not(.scope-selected-one)")
        .prop("disabled", 0)
        .removeAttr("disabled");
      let only_one = actions_panel.find(".scope-selected.scope-selected-one");
      if (selected.length > 1) {
        if (block) {
          block.prop("disabled", 1).attr("disabled", "disabled");
        }
        only_one.prop("disabled", 1).attr("disabled", "disabled");
      } else {
        if (block) {
          block.prop("disabled", 0).removeAttr("disabled");
        }
        only_one.prop("disabled", 0).removeAttr("disabled");
      }
    } else {
      actions_panel
        .find(".scope-selected")
        .prop("disabled", 1)
        .attr("disabled", "disabled");
    }
  }

  function add_selected(table, id) {
    let selected = table.data("selected");
    let opts = table.data("options");

    if (!selected.includes(id)) {
      selected.push(id);
      check_action_btns(table);
      if (opts.keep_globals) {
        let globals = table.data("globals");
        if (!globals.includes(id)) {
          globals.push(id);
          // table.data('globals', globals);
        }
      }
    }
    // table.data('selected', selected);
  }

  function remove_selected(table, id) {
    let selected = table.data("selected");
    let opts = table.data("options");

    if (selected.includes(id)) {
      selected.splice(selected.indexOf(id), 1);
      check_action_btns(table);
      if (opts.keep_globals) {
        remove_from_globals.call(table[0], id);
      }
    }
    // table.data('selected', selected);
  }

  function checkbox_click(e) {
    var $this = $(this);
    var tr = $this.parents("tr");
    var table = $this.parents("table");
    var id = tr.attr("data-id");
    var select_all = table.find(".checkbox-all");

    if ($this.is(":checked") && !tr.hasClass("active")) {
      add_selected(table, id);
      tr.addClass("active");
      if (
        table.find("." + table.data("options").checkbox_class + ":checked")
          .length ==
        table.find("." + table.data("options").checkbox_class).length
      ) {
        select_all.prop("checked", true);
      }
    } else if (!$this.is(":checked") && tr.hasClass("active")) {
      remove_selected(table, id);
      tr.removeClass("active");
      select_all.prop("checked", false);
    }
  }

  function checkbox_all_click(e) {
    var checked = $(this).is(":checked");
    var table = $(this).parents("table");
    table
      .find("." + table.data("options").checkbox_class)
      .prop("checked", checked);

    if (checked) {
      table
        .find("." + table.data("options").checkbox_class)
        .parents("tr")
        .each(function (e) {
          $(this).addClass("active");
          add_selected(table, $(this).attr("data-id"));
        });
    } else {
      table
        .find("." + table.data("options").checkbox_class)
        .parents("tr")
        .each(function (e) {
          $(this).removeClass("active");
          remove_selected(table, $(this).attr("data-id"));
        });
    }
  }

  function add_pagination() {
    var $this = $(this);

    if ($this.pagination) {
      return;
    }
    var pages = $('<div class="base-margin-top">Page:&nbsp;</div>');
    var pages_ul = $('<ul class="pagination pagination--small" />');
    var per_page_ul = $('<ul class="pagination pagination--small" />');

    if ($this.data("options").pagination_target) {
      $($this.data("options").pagination_target).append(pages.append(pages_ul));
      $($this.data("options").pagination_target).append(
        $(
          '<div class="pull-right base-margin-top">Per page:&nbsp;</div>'
        ).append(per_page_ul)
      );
    } else {
      $this.after(pages.append(pages_ul));
      $this.after(
        $(
          '<div class="pull-right base-margin-top">Per page:&nbsp;</div>'
        ).append(per_page_ul)
      );
    }

    this.pagination = {
      pages_element: pages_ul[0],
      per_page_element: per_page_ul[0],
    };

    rebuild_paging.call(this);
  }

  function hide_paging() {
    let $this = this instanceof jQuery ? this : $(this);
    if (!$this[0].pagination) {
      return;
    }
    if ($this[0].pagination.pages_element) {
      $($this[0].pagination.pages_element).parent().fadeOut("fast");
    }
    if ($this[0].pagination.per_page_element) {
      $($this[0].pagination.per_page_element).parent().fadeOut("fast");
    }
  }

  function show_paging() {
    let $this = this instanceof jQuery ? this : $(this);
    if (!$this[0].pagination) {
      add_pagination.call($this[0]);
      return;
    }
    if ($this[0].pagination.pages_element) {
      $($this[0].pagination.pages_element).parent().fadeIn("fast");
    }
    if ($this[0].pagination.per_page_element) {
      $($this[0].pagination.per_page_element).parent().fadeIn("fast");
    }
  }

  function rebuild_paging() {
    if (!this.pagination) {
      return;
    }

    var $this = $(this);
    var pages_ul = $(this.pagination.pages_element);
    pages_ul.empty();
    var per_page_ul = $(this.pagination.per_page_element);
    per_page_ul.empty();

    pages_ul.append(`<li title="Previous page">
      <a 
        ${$this.data("page") == 1 ? 'class="disabled"' : ""}
        data-targetpage="${Number($this.data("page")) - 1}">
          <span class="icon-chevron-left"></span>
      </a>
    </li>`);

    if ($this.data("page") - 2 > 3) {
      pages_ul.append(`<li><a data-targetpage="1">1</a></li>`);
      pages_ul.append(`<li><a data-targetpage="2">2</a></li>`);
      pages_ul.append(`<li><span class="icon-more"></span></li>`);
      pages_ul.append(
        `<li><a data-targetpage="${Number($this.data("page")) - 1}">${
          Number($this.data("page")) - 1
        }</a></li>`
      );
    } else {
      for (let i = 1; i <= $this.data("page") - 1; i++) {
        pages_ul.append(`<li><a data-targetpage="${i}">${i}</a></li>`);
      }
    }

    pages_ul.append(
      `<li class="active" title="Current page">
        <a href="javascript:;">${$this.data("page")}</a>
      </li>`
    );

    if ($this.data("pages") - $this.data("page") > 3) {
      pages_ul.append(`<li>
        <a
          data-targetpage="${Number($this.data("page")) + 1}">
            ${Number($this.data("page")) + 1}
        </a>
        </li>`);
      pages_ul.append(`<li><span class="icon-more"></span></li>`);
      pages_ul.append(
        `<li><a data-targetpage="${Number($this.data("pages")) - 1}">${
          Number($this.data("pages")) - 1
        }</a></li>`
      );
      pages_ul.append(
        `<li><a data-targetpage="${$this.data("pages")}">${$this.data(
          "pages"
        )}</a></li>`
      );
    } else {
      for (let i = $this.data("page") + 1; i <= $this.data("pages"); i++) {
        pages_ul.append(`<li><a data-targetpage="${i}">${i}</a></li>`);
      }
    }

    pages_ul.append(`<li title="Next page">
        <a data-targetpage="${Number($this.data("page")) + 1}" ${
      $this.data("page") == $this.data("pages") ? 'class="disabled"' : ""
    }>
            <span class="icon-chevron-right"></span>
        </a>
    </li>`);

    [10, 25, 50, 100, 500, 1000].forEach(function (el) {
      var a = $(`<li><a data-perpage="${el}">${el}</a></li>`);
      if (el == $this.data("perpage")) {
        a.addClass("active");
      }
      per_page_ul.append(a);
    });

    pages_ul
      .data("table-target", this)
      .find("a[data-targetpage]")
      .click(change_page);
    per_page_ul
      .data("table-target", this)
      .find("a[data-perpage]:not(.selected)")
      .click(change_page);
  }

  function refresh_table() {
    var table = $(this);
    var sort = {
      page: table.data("page"),
      "per-page": table.data("perpage"),
      sort: table.data("sortcolumn"),
      order: table.data("sortorder"),
      filter: table.data("filter"),
    };

    var url = table.data("options").update_url;
    if (table.data("filter") && table.data("options").filter_string) {
      url += table.data("options").filter_string;
    }
    Object.keys(sort).forEach(function (el) {
      url = url.replace(`{{${el}}}`, sort[el] || "undefined");
    });

    var overlay = $('<div class="load-overlay"></div>').css({
      width: table.outerWidth(),
      height: table.outerHeight(),
      top: table.position().top,
      left: table.position().left,
    }).append(`<div class="loading-spinner flex-center absolute-center">
                <div class="wrapper"><div class="wheel"></div></div>
            </div>`);

    table.closest("div").append(overlay);

    $.ajax({
      url: url,
      method: table.data("options").update_method,
      cache: false,
      data:
        table.data("options").update_method !== "GET"
          ? JSON.stringify(sort)
          : undefined,
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        if (data.paging) {
          table.data({
            page: Math.ceil(data.paging.offset / data.paging.limit) + 1,
            pages: data.paging.pages,
            sortcolumn: data.paging.column,
            sortorder: data.paging.order,
            perpage: data.paging.limit,
          });
          show_paging.call(table);
          rebuild_paging.call(table[0]);
        } else {
          hide_paging.call(table);
        }
        rebuild_with_data.call(table, data);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        if (typeof toast_error === "function") {
          toast_error(jqXHR, textStatus, errorThrown);
        }
      })
      .always(() => {
        overlay.remove();
      });
  }

  function change_page(e) {
    e.preventDefault();
    var $this = $(this);
    var table = $($this.closest(".pagination").data("table-target"));
    if ($this.data("targetpage")) {
      table.data("page", $this.data("targetpage"));
    } else if ($this.data("perpage")) {
      table.data("page", 0);
      table.data("perpage", $this.data("perpage"));
    }

    refresh_table.call(table[0]);
  }

  function scroll_spy() {
    var $this = $(this);
    var scroll_options = $this.data("options").scroll;
    var aboveHeight = scroll_options.above_height;

    if (scroll_options.movable.length) {
      $this.data(
        "options"
      ).scroll.initialTop = scroll_options.movable.offset().top;
    }
    scroll_options.wrapper.scroll(function (e) {
      var $el = scroll_options.movable;
      var width = scroll_options.width_element.outerWidth();
      if (scroll_options.wrapper.scrollTop() > scroll_options.initialTop) {
        if (!$el.prev(".actions__replacer").length) {
          $el.before(
            $(
              `<div class="actions__replacer half-margin-top half-margin-bottom" />`
            ).css({
              position: "relative",
              height: $el.outerHeight(),
              width: width,
            })
          );
        }
        $el.css({
          position: "fixed",
          top: scroll_options.wrapper.scrollTop() + "px",
          "z-index": "999",
          width: width,
        });
        $el[0].style.cssText += "margin-top: 0px !important;";
        if (!$el.hasClass("panel--bordered-bottom")) {
          $el.addClass("panel--bordered-bottom");
        }
      }
      if (scroll_options.wrapper.scrollTop() <= scroll_options.initialTop) {
        $el.removeClass("panel--bordered-bottom");
        $el.prev(".actions__replacer").remove();
        $el[0].style.removeProperty("position");
        $el[0].style.removeProperty("top");
        $el[0].style.removeProperty("width");
        $el[0].style.removeProperty("margin-top");
      }
    });
  }

  function resort_table(e) {
    var th = $(this);
    var table = th.closest("table");

    table.data("sortcolumn", th.data("filter-as") || th.data("column"));
    if (th.hasClass("sorted")) {
      let new_order = th.hasClass("asc") ? "desc" : "asc";
      th.removeClass("asc desc").addClass(new_order);
      add_sort_indicator(th);
      table.data("sortorder", new_order.toUpperCase());
    } else {
      remove_sort_indicator(table);
      th.addClass("sorted desc");
      add_sort_indicator(th);
      table.data("sortorder", "DESC");
    }
    refresh_table.call(table[0]);
  }

  function table_sortable() {
    var $this = $(this);
    var sort_columns = $this.find("th.sortable[data-column]");
    if (!sort_columns.length) {
      return;
    }
    sort_columns
      .click(resort_table)
      .filter(
        `[data-column="${$this.data(
          "sortcolumn"
        )}"], [data-filter-as="${$this.data("sortcolumn")}"]`
      )
      .addClass(`sorted ${($this.data("sortorder") || "DESC").toLowerCase()}`);
    add_sort_indicator(sort_columns.filter(".sorted"));
  }

  function remove_sort_indicator(table) {
    table
      .find(".sorted")
      .removeClass("sorted asc desc")
      .find(".sort-indicator")
      .remove();
  }

  function add_sort_indicator(th) {
    let ico = th.hasClass("desc")
      ? "icon-sort-amount-desc"
      : "icon-sort-amount-asc";
    if (th.children(".sort-indicator").length) {
      th.children(".sort-indicator")
        .removeClass("icon-sort-amount-desc icon-sort-amount-asc")
        .addClass(ico);
    } else {
      th.append(`<span class="sort-indicator ${ico}"></span>`);
    }
  }

  function init_globals(init_values) {
    var table = $(this);
    table.data("globals", init_values);

    if (init_values.length) {
      select_from_globals.call(this);
    }
  }

  function select_from_globals() {
    let table = $(this);
    let values = table.data("globals");

    if (values.length) {
      table.find("tbody tr").each(function () {
        let tr = $(this);
        if (values.includes(tr.data("id"))) {
          tr.find("input:checkbox").click();
        }
      });
    }
  }

  function remove_from_globals(id) {
    let table = $(this);
    let values = table.data("globals");

    if (values.length && values.indexOf(id) >= 0) {
      values.splice(values.indexOf(id), 1);
      // table.data('globals', values);
    }
  }

  function apply_filter(filter) {
    let table = $(this);
    table.data("page", 0);
    table.data("filter", filter);
    refresh_table.call(this);
  }

  function clear_selected() {
    let table = $(this);
    table.find(":checkbox").prop("checked", false);
    table.data("globals", []);
    table.data("selected", []);
  }
})(jQuery);
