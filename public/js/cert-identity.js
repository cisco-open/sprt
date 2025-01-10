$(function () {
  var reload_servers = function (data) {
    if (this) {
      $(this).checkboxes("refresh");
    } else {
      window.location.reload();
    }
  };

  var remove_btn_click = function (e) {
    var table = $("#identity-table");
    $.remove_certificates(
      $(this).data("remove")
        ? $(this).data("remove")
        : table.checkboxes("get_selected"),
      {
        names: table.checkboxes("get_selected_names"),
        rest: globals.rest.cert.identity,
        success: function (data) {
          reload_servers.call(table[0], data);
        },
      }
    );
  };

  function save_certificate(
    e,
    data = undefined,
    content_type = false,
    action = undefined
  ) {
    e.preventDefault();
    var btn = $(this);
    var modal = btn.closest(".modal");
    var form = modal.find("form");
    data = data || new FormData(form[0]);
    if (!btn.attr("disabled")) {
      btn
        .attr("disabled", "disabled")
        .prepend(
          '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
        );
    }
    $.ajax({
      url: action || form.attr("action"),
      method: "POST",
      data: data,
      cache: false,
      contentType: content_type,
      processData: false,
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        toast("success", "", "All good, saved.");
        reload_servers.call(document.getElementById("identity-table"), data);
        modal.modal("hide");
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
      })
      .always(function () {
        btn.removeAttr("disabled").find(".icon-animation").remove();
      });
  }

  var add_certificate = function (e) {
    e.preventDefault();
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
        onclick: save_certificate,
      },
    ];
    var format = $(this).data("format") || "file";
    var modal_size = format === "text" ? "lg" : "md";
    var modal = new_modal(modal_size, btns);
    var id = modal[0].id;
    var header = modal.find(".modal__header");
    var body = modal.find(".modal__body");
    header.find("h2").html("Add identity certificate");

    var actions = $(this).closest(".actions");
    var rest_path = actions.attr("data-rest-path") || window.location.pathname;
    if (rest_path.charAt(0) != "/") {
      rest_path = window.location.pathname + rest_path;
    }
    var fields;
    modal.data("format", format);
    if (format === "text") {
      fields = `<div class="form-group">
				<div class="form-group__text">
					<textarea id="input-identity-certificate-${id}" name="certificate" rows="10" required style="overflow-x: hidden; word-wrap: break-word; height: 200px;" class="text-monospace"></textarea>
					<label for="input-identity-certificate-${id}" style="white-space: nowrap;">Certificate <span class="text-xsmall">(PEM only)</span></label>
				</div>
			</div>
			<div class="form-group">
				<div class="form-group__text">
					<textarea id="input-identity-pvk-${id}" name="pvk" rows="10" required style="overflow-x: hidden; word-wrap: break-word; height: 200px;" class="text-monospace"></textarea>
					<label for="input-identity-pvk-${id}" style="white-space: nowrap;">Private Key <span class="text-xsmall">(PEM only)</span></label>
				</div>
			</div>`;
    } else {
      fields = `
			  <div class="form-group">
				<div class="form-group__text">
					<input id="input-identity-certificate-${id}" name="certificate" type="file" required>
					<label for="input-identity-certificate-${id}">Certificate 
					  <span class="text-xsmall">(PEM or DER)</span>
            <span title="This is a required field">*</span>
					</label>
				</div>
	          </div>
	          <div class="form-group">
				<div class="form-group__text">
					<input id="input-identity-pvk-${id}" name="pvk" type="file" required>
          <label for="input-identity-pvk-${id}">Private Key 
            <span class="text-xsmall">(PEM or DER)</span>
            <span title="This is a required field">*</span>
          </label>
				</div>
	          </div>`;
    }

    var new_body = $(`<div>
		<form id="${id}-identity-form" method="post" enctype="multipart/form-data" action="${rest_path}">
		  <input type="hidden" name="format" value="${format}" />
          <div class="form-group">
            <div class="form-group__text">
              <input 
              	type="text" 
              	id="input-identity-name-${id}" 
              	name="friendly-name" 
              	value="" 
              	data-type="string">
              <label for="input-identity-name-${id}">Friendly name</label>
            </div>
          </div>
          ${fields}
          <div class="form-group">
			<div class="form-group__text">
				<input id="input-identity-pvk-pass-${id}" name="pvk-password" type="password">
				<label for="input-identity-pvk-pass-${id}">Passphrase</label>
			</div>
          </div>
        </form></div>`);
    body.append(new_body);

    modal.modal("toggle");
  };

  var export_cert_btn_click = function (e) {
    $.export_certificates(
      $("#identity-table").checkboxes("get_selected"),
      "identity",
      {
        allow_export_pvk: true,
        allow_export_chain: true,
        allow_change_format: false,
        method: "POST",
        rest: globals.rest.cert.base + "export/",
      }
    );
  };

  var enroll_certificate = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var modal = $(this).closest(".modal");
    var csr = modal.find(".modal__body").csr_builder("collect");
    var btn = $(this);
    btn
      .attr("disabled", "disabled")
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );
    $.ajax({
      url: globals.rest.cert.scep + "enroll/",
      method: "POST",
      cache: false,
      data: JSON.stringify({
        "scep-server": modal.find("select#scep-server option:selected").val(),
        csr: csr,
      }),
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        toast("success", "", "Certificate enrolled, saving");
        var to_save = {
          format: "text",
          "friendly-name": modal.find("input#friendly-name").val(),
          pvk: data.result.keys.private,
          certificate: data.result.pem,
          "pvk-password": "",
        };
        save_certificate.call(
          btn[0],
          e,
          JSON.stringify(to_save),
          "application/json",
          globals.rest.cert.identity
        );
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
        btn.removeAttr("disabled").find(".icon-animation").remove();
      });
  };

  var req_btn_click = function (e) {
    e.preventDefault();
    var btns = [
      {
        name: "close",
        type: "default",
        display: "Close",
      },
      {
        name: "request",
        type: "primary",
        display: "Request",
        onclick: enroll_certificate,
      },
    ];

    modal = new_modal("lg", btns);
    var header = modal.find(".modal__header");
    var body = modal.find(".modal__body");
    var footer = modal.find(".modal__footer");
    header.find("h2").html("Request certificate");

    var actions = $(this).closest(".actions");
    var rest_path =
      actions.attr("data-rest-path") || globals.rest.cert.identity;
    if (rest_path.charAt(0) != "/") {
      rest_path = window.location.pathname + rest_path;
    }
    modal.data("rest-path", rest_path);
    modal.modal("show");

    body.empty()
      .html(`<div><h4 class="text-center text-capitalize">Fetching data from server</h4>
			<div class="loading-dots loading-dots--muted"><span></span><span></span><span></span></div><div>`);

    $.ajax({
      url: globals.rest.cert.scep,
      method: "POST",
      cache: false,
      data: JSON.stringify({ scep_servers: 1 }),
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        body.empty();
        body.append(`<h5>General</h5>
			<div class="panel panel--condensed scep-wrap">
				<div class="form-group">
					<div class="form-group__text select">
						<select id="scep-server">
						</select>
						<label for="scep-server">SCEP Server</label>
					</div>
				</div>
				<div class="form-group">
					<div class="form-group__text">
						<input id="friendly-name" type="text">
						<label for="friendly-name">Friendly Name</label>
					</div>
				</div>
			</div>`);

        var select = body.find(`select`);
        for (var i = 0; i < data.scep.length; i++) {
          select.append(`<option 
	        		value="${data.scep[i].id}">
	        			${data.scep[i].name}</option>`);
        }

        body.append(`<div class="divider divider--compressed"></div>`);

        body.csr_builder(undefined, {
          load_from: globals.rest.cert.templates,
          parser: function (data) {
            return data.result;
          },
        });
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

  let actions_pane = $("#certificates-content").find(".actions");

  $("#identity-table").checkboxes({
    actions: actions_pane,
    block_on_multi: actions_pane.find(
      ".btn-details-identity,.btn-rename-identity"
    ),
    result_attribute: "identity",
    id_attribute: "id",
    checkbox_class: "identity-checkbox",
    placeholder: $("#identity-table").prev(".table-placeholder"),
    hide_on_empty: actions_pane.find(".hide-empty"),
    update_method: "GET",
    update_url:
      globals.rest.cert.identity +
      "page/{{page}}/per-page/{{per-page}}/sort/{{sort}}/order/{{order}}/",
    scroll: {
      above_height: $("header").outerHeight(),
      movable: actions_pane,
      wrapper: $("main"),
      width_element: $("#identity-table"),
    },
    column_handlers: {
      subject: subject_handler,
      issuer: issuer_handler,
      not_before: not_before_handler,
      not_after: not_after_handler,
    },
  });

  function cert_details(e) {
    $.certificate_details($("#identity-table").checkboxes("get_selected")[0], {
      type: "identity",
      get_method: "POST",
    });
  }

  function rename_cert(e) {
    let table = $("#identity-table");
    $.change_certificate_attribute(table.checkboxes("get_selected")[0], {
      attribute: "friendly_name",
      attribute_display: "Friendly Name",
      hint: "If empty, Subject will be used as Friendly Name",
      success: function (data) {
        reload_servers.call(table[0], data);
      },
    });
  }

  $(".btn-remove").click(remove_btn_click);

  $(".btn-add-identity").click(add_certificate);

  $(".btn-export-identity").click(export_cert_btn_click);

  $(".btn-request-identity").click(req_btn_click);

  $(".btn-rename-identity").click(rename_cert);

  $(".btn-details-identity").click(cert_details);
});

function subject_handler(table, tr, el, column) {
  if (el.hasOwnProperty("broken")) {
    let td = $(
      '<td colspan="4" style="word-break: break-word; white-space: normal;"></td>'
    );
    td.append(
      `<span class="icon-warning text-warning qtr-margin-right"></span>Couldn't open file ${el.broken.file}`
    );
    tr.append(td);
    return;
  }

  tr.append(`<td>${el.subject}</td>`);
}
function issuer_handler(table, tr, el, column) {
  if (el.hasOwnProperty("broken")) return;

  tr.append(`<td>${el.issuer}</td>`);
}
function not_before_handler(table, tr, el, column) {
  if (el.hasOwnProperty("broken")) return;

  tr.append(`<td>${el.not_before}</td>`);
}

function not_after_handler(table, tr, el, column) {
  if (el.hasOwnProperty("broken")) return;

  let td = $("<td></td>");
  if (el.is_expired) {
    td.append(
      '<span class="icon-warning text-warning qtr-margin-right" title="Certificate is expired"></span>'
    );
  }
  td.append(el.not_after);
  tr.append(td);
}
