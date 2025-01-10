Dropzone.autoDiscover = false;

$(function () {
  var reload_servers = function (data) {
    if (this) {
      $(this).checkboxes("refresh");
    } else {
      window.location.reload();
    }
  };

  function request_update() {
    var table = this;
    $.ajax({
      url: globals.rest.cert.trusted || window.location.pathname,
      method: "GET",
      cache: false,
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    }).done(function (data) {
      reload_servers.call(table, data);
    });
  }

  var remove_btn_click = function (e) {
    var table = $("#trusted-table");
    $.remove_certificates(
      $(this).data("remove")
        ? $(this).data("remove")
        : table.checkboxes("get_selected"),
      {
        "what-display": $(this).data("remove-display") || undefined,
        names: table.checkboxes("get_selected_names"),
        rest: globals.rest.cert.trusted,
        success: function (data) {
          reload_servers.call(table[0], data);
        },
      }
    );
  };

  function save_certificate(e) {
    e.preventDefault();
    e.stopPropagation();
    var btn = $(this);
    var modal = btn.closest(".modal");
    var form = modal.find("form");
    if (!btn.attr("disabled")) {
      btn
        .attr("disabled", "disabled")
        .prepend(
          '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
        );
    }

    if (modal.data("format") === "text") {
      var data = {
        trusted: modal.find('textarea[id^="input-trusted-certificate"]').val(),
        update_list: 0,
        format: "text",
      };

      $.ajax({
        url: globals.rest.cert.trusted,
        method: "POST",
        data: JSON.stringify(data),
        cache: false,
        contentType: "application/json",
        processData: false,
        headers: {
          Accept: "application/json",
        },
        async: true,
      })
        .done(function (data) {
          if (data.found && parseInt(data.found) > 0) {
            toast("success", "", `Found and saved ${data.found} certificates.`);
          } else {
            toast("info", "", `Didn't find any new not expired certificate.`);
          }
          reload_servers.call(document.getElementById("trusted-table"));
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          toast_error(jqXHR, textStatus, errorThrown);
        })
        .always(function () {
          btn.removeAttr("disabled").find(".icon-animation").remove();
        });
    } else {
      form[0].dataset.found = 0;
      var dz = form[0].dropzone;
      dz.processQueue();
    }
  }

  var add_certificate = function (e) {
    e.preventDefault();
    var btns = [
      "close",
      {
        name: "save",
        type: "primary",
        display: "Upload",
        onclick: save_certificate,
      },
    ];
    var format = $(this).data("format") || "file";
    var modal_size = format === "text" ? "lg" : "md";
    var modal = new_modal(modal_size, btns);
    var id = modal[0].id;
    // var header = modal.get_header();
    var body = modal.get_body();
    // var footer = modal.get_footer();
    modal.get_header_h().html("Add trusted certificate(s)");

    var actions = $(this).closest(".actions");
    var rest_path = actions.attr("data-rest-path") || window.location.pathname;
    if (rest_path.charAt(0) != "/") {
      rest_path = window.location.pathname + rest_path;
    }
    var fields;
    modal.data("format", format);
    if (format === "text") {
      fields = `
      <div class="form-group form-group--inline" style="display: flex;">
				<div class="form-group__text flex-fill">
					<textarea 
						id="input-trusted-certificate-${id}" 
						name="certificate" 
						rows="10" 
						required 
						style="overflow-x: hidden; word-wrap: break-word; height: 200px;" 
						class="text-monospace" 
						maxlength="512000"></textarea>
          <label for="input-trusted-certificate-${id}" style="white-space: nowrap;">
            Certificate(s)<br><span class="text-xsmall">PEM only<br>Multiple certificates can be provided</span>
          </label>
				</div>
			</div>`;
      body.append(fields);
    } else {
      let accepted = [
        ".pem",
        ".txt",
        ".log",
        ".out",
        ".cer",
        ".crt",
        ".der",
        ".tar",
        ".zip",
        ".tar.gz",
      ];
      var new_body = $(`<div>
			<form action="/file-upload" class="dropzone panel panel--loose">
				<div class="dz-previews" style="display: none;">
					<div class="file-drop__container container--fluid">
						<div class="row"></div>
					</div>
					<div class="file-drop__filecnt"></div>
				</div>
				<div class="dz-message">
					<span class="file-drop__icon icon-upload"></span>
					<h4 class="text-muted">Click Here or Drop Files to Upload</h4>
				</div>
				<div class="fallback">
					<input name="file" type="file" multiple />
				</div>
			</form>
			</div>
			<div class="help-block text-muted base-margin-top">
				<span class="icon-info-outline"></span>
				<span>Allowed file extensions: ${accepted.join(
          ", "
        )}. You can paste "show tech" from ISE as well, all found certificates will be saved as trusted</span>
			</div>`);
      body.append(new_body);

      var preview_tmpl = `<div class="file-drop__card col-lg-3 col-md-6 col-sm-6">
	        	<div class="panel panel--ltgray panel--skinny">
	        		<div class="panel__body">
	        			<a class="link pull-right" style="margin-right:5px;" data-dz-remove><span class="icon-close" title="Remove the file."></span></a>
	        			<span class="file-icon text-muted icon-file-o"></span>
	        			<div class="text-ellipsis" data-dz-name></div>
	        			<small data-dz-size></small>
	        			<div class="dz-error-message"><span data-dz-errormessage></span></div>
	        		</div>
	        	</div>
	        </div>`;

      new_body.find("form").dropzone({
        url: globals.rest.cert.trusted,
        clickable: true,
        autoProcessQueue: false,
        previewsContainer: new_body.find(
          "form .dz-previews .file-drop__container .row"
        )[0],
        previewTemplate: preview_tmpl,
        createImageThumbnails: false,
        maxFilesize: 20,
        method: "POST",
        acceptedFiles: accepted.join(","),
        paramName: "trusted",
        params: {
          update_list: 0,
          format: "file",
        },
        init: function () {
          this.on("addedfile", function (file) {
            if (this.files.length) {
              $el = $(this.element);
              modal.find('[id$="-save"]').removeAttr("disabled");
              $el
                .find(".file-drop__filecnt")
                .text(`${this.files.length} Selected`);
              $el.find(".dz-previews").show().next(".dz-message").hide();
            }
          });
          this.on("removedfile", function (file) {
            $el = $(this.element);
            $el
              .find(".file-drop__filecnt")
              .text(`${this.files.length} Selected`);
            if (!this.files.length) {
              modal.find('[id$="-save"]').attr("disabled", "disabled");
              $el.find(".dz-previews").hide().next(".dz-message").show();
            }
          });
          this.on("processing", function (file) {
            var overlay = $(`<div class="loading-overlay"></div>`)
              .css({
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                "background-color": "#e8ebf1",
                opacity: "0.6",
                "z-index": "5",
              })
              .append(
                `<div class="loading-spinner absolute-center"><div class="wrapper"><div class="wheel"></div></div></div>`
              );
            $(file.previewElement).children(".panel").prepend(overlay);
          });
          this.on("complete", function (file) {
            if (file.processing) {
              $(file.previewElement).find(".loading-overlay").remove();
              if (file.status !== Dropzone.ERROR) {
                var r = JSON.parse(file.xhr.response);
                this.element.dataset.found =
                  Number(this.element.dataset.found) +
                  Number(parseInt(r.found) || 0);
                this.removeFile(file);
              }
              this.processQueue();
            }
          });
          this.on("queuecomplete", function (file) {
            modal
              .find('[id$="-save"]')
              .removeAttr("disabled")
              .find(".icon-animation")
              .remove();
            if (this.files.length) {
              for (var i = 0; i < this.files.length; i++) {
                this.files[i].status = Dropzone.ADDED;
                this.files[i].accepted = true;
                this.enqueueFile(this.files[i]);
              }
            }
            if (this.element.dataset.found > 0) {
              toast(
                "success",
                "Certificates added",
                `Succesfully found and saved ${this.element.dataset.found} certificates<br>Refreshing table`
              );
              request_update.call(document.getElementById("trusted-table"));
            } else {
              toast("info", "", `No certificates added.`);
            }
          });
        },
        error: function (file, err, xhr) {
          if (!xhr) {
            this.removeFile(file);
            toast("error", file.name, err);
          } else {
            toast_error(xhr, "", err, file.name);
          }
        },
      });
      modal.find('[id$="-save"]').attr("disabled", "disabled");
    }

    modal.modal("toggle");
  };

  var export_cert_btn_click = function (e) {
    $.export_certificates(
      $("#trusted-table").checkboxes("get_selected"),
      "trusted",
      {
        allow_export_pvk: false,
        allow_export_chain: true,
        allow_change_format: false,
        method: "POST",
        rest: globals.rest.cert.base + "export/",
      }
    );
  };

  function rename_cert(e) {
    $.change_certificate_attribute(
      $("#trusted-table").checkboxes("get_selected")[0],
      {
        attribute: "friendly_name",
        attribute_display: "Friendly Name",
        hint: "If empty, Subject will be used as Friendly Name",
        success: function (data) {
          reload_servers.call(document.getElementById("trusted-table"));
        },
      }
    );
  }

  function cert_details(e) {
    $.certificate_details($("#trusted-table").checkboxes("get_selected")[0], {
      type: "trusted",
      get_method: "POST",
    });
  }

  let actions_pane = $("#trusted-actions");

  $("#trusted-table").checkboxes({
    actions: actions_pane,
    block_on_multi: actions_pane.find(
      ".btn-details-trusted,.btn-rename-trusted"
    ),
    result_attribute: "trusted",
    id_attribute: "id",
    checkbox_class: "trusted-checkbox",
    placeholder: $("#trusted-table").prev(".table-placeholder"),
    hide_on_empty: actions_pane.find(".hide-empty"),
    update_method: "GET",
    update_url:
      globals.rest.cert.trusted +
      "page/{{page}}/per-page/{{per-page}}/sort/{{sort}}/order/{{order}}/",
    scroll: {
      above_height: $("header").outerHeight(),
      movable: actions_pane,
      wrapper: $("main"),
      width_element: $("#trusted-table"),
    },
    column_handlers: {
      not_after: not_after_handler,
    },
  });

  $(".btn-remove").click(remove_btn_click);

  $(".btn-add-trusted").click(add_certificate);

  $(".btn-export-trusted").click(export_cert_btn_click);

  $(".btn-rename-trusted").click(rename_cert);

  $(".btn-details-trusted").click(cert_details);
});

function not_after_handler(table, tr, el, column) {
  let td = $("<td></td>");
  if (el.is_expired) {
    td.append(
      '<span class="icon-warning text-warning qtr-margin-right" title="Certificate is expired"></span>'
    );
  }
  td.append(el.not_after);
  tr.append(td);
}
