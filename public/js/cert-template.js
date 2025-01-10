$(function () {
  var reload_servers = function (data) {
    if (this) {
      $(this).checkboxes("rebuild", data);
    } else {
      window.location.reload();
    }
  };

  var remove_btn_click = function (e) {
    var btn = $(this);
    var actions = btn.closest(".actions");
    var table = $("#templates-table");
    var elements = $(this).data("remove") || table.checkboxes("get_selected");
    var text;
    if (Array.isArray(elements)) {
      text = `${elements.length} elements`;
      if (elements.length === 1) {
        text = `'${table.checkboxes("get_selected_names")[0]}'`;
      }
    } else {
      text = `${elements} elements`;
    }

    var confirmed = function (e) {
      e.preventDefault();
      var rest_path = actions.data("rest-path") || window.location.pathname;
      if (rest_path.charAt(0) != "/") {
        rest_path = window.location.pathname + rest_path;
      }

      btn
        .attr("disabled", "disabled")
        .prepend(
          '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
        );
      $.ajax({
        url: rest_path,
        method: "DELETE",
        cache: false,
        processData: false,
        data: JSON.stringify({ what: elements }),
        contentType: "application/json",
        headers: {
          Accept: "application/json",
        },
        async: true,
      })
        .done(function (data) {
          toast("success", "", "Removed.");
          reload_servers.call(table[0], data);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          toast_error(jqXHR, textStatus, errorThrown);
          btn.removeAttr("disabled");
        })
        .always(function () {
          btn.find(".icon-animation").remove();
        });
    };

    var modal = new_confirmation_modal(
      confirmed,
      `Please confirm deletion of ${text}.`,
      "Delete"
    );
  };

  var save_template = function (e) {
    e.preventDefault();
    var modal = $(this).closest(".modal");
    var data = {
      overwrite: modal.data("overwrite") || undefined,
      "friendly-name": modal.find("#friendly-name").val(),
      template: modal.find(".modal__body").csr_builder("collect"),
    };
    var btn = $(this);
    btn
      .attr("disabled", "disabled")
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );

    $.ajax({
      url: modal.data("rest-path"),
      method: "PUT",
      data: JSON.stringify(data),
      cache: false,
      contentType: false,
      processData: false,
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        toast("success", "", "All good, saved.");
        reload_servers.call(document.getElementById("templates-table"), data);
        modal.modal("toggle");
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
      })
      .always(function () {
        btn.removeAttr("disabled").find(".icon-animation").remove();
      });
  };

  var edit_template = function (
    csr,
    friendly_name = "",
    template_id = "",
    modal = undefined
  ) {
    var btns = [
      {
        name: "close",
        type: "default",
        display: "Close",
      },
      {
        name: "save",
        type: "success",
        display: "Save",
        onclick: save_template,
      },
    ];
    modal = modal || new_modal("xlg", btns);
    var header = modal.get_header();
    var body = modal.get_body();
    var footer = modal.get_footer();
    if (!template_id) {
      modal.get_header_h().html("Add certificate template");
    }

    var actions = $(this).closest(".actions");
    var rest_path = actions.data("rest-path") || window.location.pathname;
    if (rest_path.charAt(0) != "/") {
      rest_path = window.location.pathname + rest_path;
    }
    modal.data("rest-path", rest_path);

    body.append(`<h5>General</h5>
		<div class="panel panel--condensed general-wrap">
			<div class="form-group">
				<div class="form-group__text">
					<input type="text" 
						id="friendly-name" 
						name="friendly-name"
						value="${friendly_name}"
						data-type="string">
					<label for="friendly-name">Friendly Name</label>
				</div>
			</div>
		</div>`);

    body.append(`<div class="divider divider--compressed"></div>`);

    body.csr_builder(csr, {
      load_from: globals.rest.cert.templates,
      parser: function (data) {
        return data.result;
      },
    });

    body.append(`<div class="panel panel--light panel--bordered panel--well">Supported variables in Subject and SAN fields:<br>
		$IP$ - generated IP address<br>
		$MAC$ - MAC address for the session<br>
		$OWNER$ - Your UID<br>
		$USERNAME$ - RADIUS UserName<br>
		</div>`);

    if (template_id) {
      modal.data("overwrite", template_id);
    }
    modal.modal("show");
  };

  var add_template = function (e) {
    e.preventDefault();
    edit_template_click.call(this, e);
  };

  var edit_template_click = function (e) {
    var btns = [
      {
        name: "close",
        type: "default",
        display: "Close",
      },
      {
        name: "save",
        type: "success",
        display: "Save",
        onclick: save_template,
      },
    ];
    e.preventDefault();
    var btn = $(this);
    var actions = btn.closest(".actions");
    var table = $("#templates-table");

    var modal = new_modal("xlg", btns);
    var header = modal.get_header();
    var body = modal.get_body();
    modal.get_header_h().html("Edit certificate template");
    body.empty()
      .html(`<div><h4 class="text-center text-capitalize">Fetching data from server</h4>
			<div class="loading-dots loading-dots--muted"><span></span><span></span><span></span></div><div>`);
    modal.modal("toggle");

    var what;
    if (btn.hasClass("btn-add-template")) {
      what = ["new"];
    } else if (table.checkboxes("get_selected").length) {
      what = table.checkboxes("get_selected");
    } else {
      toast("alert", "", "Internal Error.");
      return;
    }

    $.ajax({
      url: window.location.pathname,
      method: "POST",
      cache: false,
      processData: false,
      data: JSON.stringify({
        what: what,
      }),
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        if (data.result && Array.isArray(data.result) && data.result.length) {
          body.children().fadeOut("fast", function (e) {
            $(this).remove();
            edit_template.call(
              btn[0],
              data.result[0].content,
              data.result[0].friendly_name,
              data.result[0].id,
              modal
            );
          });
        } else {
          body.html(`<div class="alert alert--danger">
		            <div class="alert__icon icon-error"></div>
		            <div class="alert__message">Didn't get anything from server.</div>
		        </div>`);
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        var message = errorThrown;
        if (
          jqXHR.hasOwnProperty("responseJSON") &&
          jqXHR.responseJSON.hasOwnProperty("error")
        ) {
          message = jqXHR.responseJSON.error;
        } else {
          try {
            // Try to parse message, it might be a JSON
            message = JSON.parse(message).messageString;
          } catch (e) {
            // Do nothing :)
          }
        }
        body.html(`<div class="alert alert--danger">
	            <div class="alert__icon icon-error"></div>
	            <div class="alert__message">Error occured while fetching data from server: ${message}</div>
	        </div>`);
      });
  };

  let t_actions = $("#templates-actions");

  $("#templates-table").checkboxes({
    actions: t_actions,
    block_on_multi: t_actions.find(".btn-edit-template"),
    result_attribute: "templates",
    id_attribute: "id",
    checkbox_class: "template-checkbox",
    placeholder: $("#templates-table").prev(".table-placeholder"),
    hide_on_empty: t_actions.find(".hide-empty"),
  });

  $(".btn-remove").click(remove_btn_click);

  $(".btn-add-template").click(add_template);

  $(".btn-edit-template").click(edit_template_click);
});
