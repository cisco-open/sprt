(function ($) {
  var export_certificates = function (e) {
    e.preventDefault();
    var btn = $(this);
    var modal = btn.closest(".modal");
    var selected = modal.data("selected");
    var rest_path = modal.data("rest-path");

    btn
      .attr("disabled", "disabled")
      .append(
        '<span class="icon-animation gly-spin qtr-margin-left" aria-hidden="true"></span>'
      );
    $.ajax({
      url: rest_path,
      method: modal.data("method"),
      cache: false,
      processData: false,
      data: JSON.stringify({
        what: selected,
        how:
          modal.find('[type="radio"]:checked').val() ||
          modal.find('input[name="what-export"]').val(),
        password: modal.find("input.password-edit").length
          ? modal.find("input.password-edit").val()
          : undefined,
        "full-chain": modal.find('input[name="full-chain"]').is(":checked")
          ? 1
          : 0,
        "export-format": modal
          .find('input[name="export-format"]')
          .is(":checked")
          ? "der"
          : "pem",
        type: modal.data("cert-type"),
      }),
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data, textStatus, request) {
        var filename = request.getResponseHeader("Content-Disposition");
        var matches = filename.match(/filename="([^"]+)"/i);
        filename = matches[1] || "archive.tar";
        saveAs(
          new Blob([data], { type: request.getResponseHeader("Content-Type") }),
          filename
        );
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
      })
      .always(function () {
        btn.removeAttr("disabled").find(".icon-animation").remove();
      });
  };

  var export_parameters = function (what, type, options) {
    var btns = [
      "close",
      {
        name: "export",
        type: "success",
        display: "Export",
        onclick: export_certificates,
      },
    ];
    var modal = new_modal("md", btns);
    var header = modal.find(".modal__header");
    var body = modal.find(".modal__body");
    // var footer = modal.find('.modal__footer');
    header.find("h2").html("Export parameters");

    if (options.allow_export_pvk) {
      body.append(
        $(`
            <div class="form-group">
                <div class="form-group form-group--inline">
                    <label class="radio radio--alt radio--stacked">
                        <input type="radio" name="what-export" value="certificates">
                        <span class="radio__input"></span>
                        <span class="radio__label">Export Certificate${
                          what.length > 1 ? "s" : ""
                        } Only</span>
                    </label>
                    </div>
                    <div class="form-group form-group--inline">
                    <label class="radio radio--alt radio--stacked">
                        <input type="radio" checked name="what-export" value="certificates-and-keys">
                        <span class="radio__input"></span>
                        <span class="radio__label">Export Certificate${
                          what.length > 1 ? "s" : ""
                        } and Private Key${what.length > 1 ? "s" : ""}</span>
                    </label>
                </div>
            </div>
            `)
      );

      body.find('[type="radio"]').click(function (e) {
        var pass_edit = body.find(".password-edit");
        var only_cert = $(this).val() !== "certificates-and-keys";
        if (only_cert && pass_edit.length) {
          pass_edit.closest(".form-group").fadeOut(100, function (e) {
            $(this).remove();
          });
        } else if (!only_cert && !pass_edit.length) {
          pass_edit = $(`<div class="form-group">
                        <div class="form-group__text">
                            <input id="export-password-edit" class="password-edit" type="text" name="pvk-password">
                            <label for="export-password-edit">Private Key Password <span class="text-xsmall">(optional)</span></label>
                        </div>
                    </div>`).hide();
          $(this)
            .closest(".form-group:not(.form-group--inline)")
            .after(pass_edit);
          pass_edit.fadeIn("fast");
        }
      });
      body.find('[type="radio"]:checked').trigger("click");
    } else {
      body.append(
        `<input type="hidden" value="certificates" name="what-export" />`
      );
    }

    if (options.allow_export_chain) {
      let sw = `<label class="switch switch--small" style="height: 33px;">
                <input type="checkbox" checked name="full-chain">
                <span class="switch__input"></span>
                <span class="switch__label">Export with Full Chain${
                  what.length > 1 ? "s" : ""
                }</span>
            </label>`;
      body.append(sw);
    }
    if (options.allow_change_format) {
      let sw = $(`<label class="switch switch--small" style="height: 33px;">
                <input type="checkbox" name="export-format">
                <span class="switch__input"></span>
                <span class="switch__label">Export in DER format (otherwise in PEM)</span>
            </label>`);
      body.append(sw);
      if (sw.prev().is("label")) {
        sw.css("margin-top", "0");
      }
    }

    modal.data({
      "rest-path": options.rest,
      method: options.method || "POST",
      selected: what,
      "cert-type": type,
    });
    modal.modal("toggle");
  };

  var remove_certificates = function (what, options) {
    var text;
    if (Array.isArray(what)) {
      text = `${what.length} certificates`;
      if (what.length === 1 && options.names) {
        text = `'${options.names[0]}'`;
      }
    } else {
      text = `${options["what-display"] || what} certificates`;
    }

    var confirmed = function (e) {
      e.preventDefault();

      var btn = $(this);
      btn
        .attr("disabled", "disabled")
        .prepend(
          '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
        );
      $.ajax({
        url: options.rest,
        method: options.method || "DELETE",
        cache: false,
        processData: false,
        data: JSON.stringify({ what: what }),
        contentType: "application/json",
        headers: {
          Accept: "application/json",
        },
        async: true,
      })
        .done(function (data) {
          btn.closest(".modal").modal("hide");
          toast("success", "", "Refreshing page.");
          if (typeof options.success === "function") {
            options.success(data);
          }
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          toast_error(jqXHR, textStatus, errorThrown);
        })
        .always(function () {
          btn.removeAttr("disabled").find(".icon-animation").remove();
        });
    };

    var modal = new_confirmation_modal(
      confirmed,
      `Are you sure you want to delete ${text}?`,
      "Delete"
    );
  };

  var save_attribute = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var btn = $(this);
    var modal = btn.closest(".modal");
    var input = modal.find(`input[name="${btn.data("attribute")}"]`);
    btn
      .attr("disabled", "disabled")
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );

    $.ajax({
      url: btn.data("update-rest"),
      method: btn.data("update-method"),
      cache: false,
      data: JSON.stringify({ value: input.val() }),
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        toast("success", "", "Certificate saved.");
        if (typeof btn.data("success") === "function") {
          btn.data("success")(data);
        }
        modal.modal("hide");
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
      })
      .always(function () {
        btn.removeAttr("disabled").find(".icon-animation").remove();
      });
  };

  var change_attribute = function (id, options) {
    var modal = new_modal("md", ["close", "save"]);
    var header = modal.get_header();
    var body = modal.get_body();
    var footer = modal.get_footer();
    modal.get_header_h().html("Update certificate");

    var save_btn = footer
      .find('button[id$="-save"]')
      .attr("disabled", "disabled");

    modal.data("certificate", id);
    modal.modal("show");
    body.empty().append(dataLoader(false));

    $.ajax({
      url:
        options.rest ||
        globals.rest.cert.attribute + options.attribute + "/" + id + "/",
      method: options.get_method || "GET",
      cache: false,
      processData: false,
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        body.empty().append(`<div class="form-group ${options.hint ? "form-group--helper" : ""}">
                <div class="form-group__text">
                    <input id="attribute-${
                      options.attribute
                    }" type="text" name="${options.attribute}" value="${data.result}">
                    <label for="attribute-${
                      options.attribute
                    }">${options.attribute_display}</label>
                </div>
                ${
                  options.hint
                    ? `<div class="help-block text-muted">
                                    <span class="icon-info-outline"></span>
                                    <span>${options.hint}</span>
                                </div>`
                    : ""
                }
            </div>`);
        save_btn
          .data({
            "cert-id": id,
            attribute: options.attribute,
            "update-method": options.update_method || "PATCH",
            "update-rest":
              options.update_rest ||
              globals.rest.cert.attribute + options.attribute + "/" + id + "/",
            success: options.success || undefined,
          })
          .removeAttr("disabled")
          .click(save_attribute);
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

  var certificate_details = function (id, options) {
    var modal = new_modal("md", ["close"]);
    // var header = modal.get_header();
    var body = modal.get_body();
    // var footer = modal.get_footer();
    modal.get_header_h().html("Certificate details");

    modal.data("certificate", id);
    body.empty().append(dataLoader(false));
    modal.modal("show");

    $.ajax({
      url: options.rest || globals.rest.cert.details + id + "/",
      method: options.get_method || "GET",
      cache: false,
      processData: false,
      data: JSON.stringify({ type: options.type || undefined }),
      contentType: "application/json",
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        body.empty();
        modal.change_size("large");
        if (!data.result[data.result.length - 1].root) {
          data.result.push("no-root");
        }

        build_cert_details.call(modal[0], data.result);
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

  var change_certificate = function (e) {
    e.preventDefault();
    var $this = $(this);
    if ($this.hasClass("selected")) {
      return;
    }
    var cert_id = $this.data("certificate");
    var body = $this.closest(".modal__body");
    var list = body.children("ul.list:first");
    body.find(".certificate-data").fadeOut("fast", function (e) {
      $(this).remove();
      list.find("a.selected").removeClass("selected text-secondary");
      $this.addClass("selected text-secondary");
      build_fields.call(
        body[0],
        $this.closest(".modal").data("certificates")[cert_id]
      );
    });
  };

  var build_cert_details = function (certificates) {
    var modal = $(this);
    var body = modal.find(".modal__body");

    var tree = $('<ul class="list"></ul>');
    var last_ul;
    for (let i = 0; i <= certificates.length - 1; i++) {
      let li = $('<li class="panel panel--compressed"></li>');
      let ul_w = $('<ul class="list"></ul>');
      if (typeof certificates[i] === "object") {
        if (i != certificates.length - 1) {
          li.append('<span class="text-muted">&#9495;</span>&nbsp;');
        } else {
          li.append(
            '<span class="icon-software-certified text-primary" title="Root"></span>&nbsp;'
          );
        }

        li.append(`<a class="link cert-selector${
          i === 0 ? " text-secondary selected" : ""
        }" data-certificate="${i}">
                    ${certificates[i].subject.join(", ")}
                </a>`);
      } else {
        if (certificates[i] === "no-root") {
          li.append(`<span class="icon-exclamation-triangle text-warning"></span>
                        <span>&nbsp;Root certificate not found</span>`);
        }
      }
      ul_w.append(li);
      if (last_ul) {
        li.append(last_ul);
      }
      last_ul = ul_w;
    }
    last_ul.find("a.cert-selector").click(change_certificate);
    body.append(last_ul);
    modal.data("certificates", certificates);
    build_fields.call(body[0], certificates[0]);
  };

  var x509_fields_order = [
    {
      type: "basic",
      header: "Basic Fields",
      attributes: [
        { value: "{{version}}", header: "Version" },
        { value: "{{serial}}", header: "Serial number" },
        {
          value: "{{signature.encalg}}",
          header: "Signature encryption algorithm",
        },
        {
          value: "{{signature.hashalg}}",
          header: "Signature hashing algorithm",
        },
        { value: "{{issuer}}", header: "Issuer" },
        { value: "{{notBefore}}", header: "Valid from" },
        { value: "{{notAfter}}", header: "Valid till" },
        { value: "{{subject}}", header: "Subject" },
        {
          value: "{{pubkey.alg}} ({{pubkey.size}} bits)",
          header: "Public key",
        },
      ],
    },
    {
      type: "extensions",
      header: "Extensions",
      attributes: [
        { value: "{{aki}}", header: "Authority key identifier" },
        { value: "{{ski}}", header: "Subject key identifier" },
        { value: "{{extkeyusage}}", header: "Extended key usage" },
        { value: "{{san}}", header: "Subject alternative names" },
        { value: "{{keyusage}}", header: "Key usage" },
        { value: "{{basicconstraints}}", header: "Basic constraints" },
      ],
    },
  ];

  var build_fields = function (x509) {
    var body = $(this);

    var wrapper = $('<div class="certificate-data"></div>').hide();
    x509_fields_order.forEach(function (f) {
      // let li = $('<li></li>');
      var panel = $('<div class="panel"></div>');
      var dl = $('<dl class="dl--inline-wrap dl--inline-centered"></dl>');
      var found_smth = false;
      f.attributes.forEach(function (el) {
        let re = /{{([^{}]+)}}/g;
        let val = el.value;
        let m, critical;

        do {
          m = re.exec(el.value);
          if (m) {
            let d = Object.byString(x509, m[1]);
            if (Array.isArray(d)) {
              if (d[0] === "critical") {
                critical = true;
              }
              d = build_ext(m[1], d);
            }
            d = d || "";
            val = val.replace(`{{${m[1]}}}`, d);
          }
        } while (m);

        if (val) {
          found_smth = true;
          dl.append(
            `<dt>${
              critical
                ? '<span class="icon-circle text-warning" title="Critical"></span>&nbsp;'
                : ""
            }${el.header}</dt>`
          );
          dl.append(`<dd>${val}</dd>`);
        }
      });

      if (found_smth) {
        panel.append($(`<h4 class="display-4">${f.header}</h4>`).add(dl));
        wrapper.append(panel);
      }
    });
    body.append(wrapper);
    wrapper.fadeIn("fast");
  };

  var extkeyusages = {
    "1.3.6.1.4.1.311.21.6": "Key Recovery Agent",
    "1.3.6.1.4.1.311.20.2.1": "Certificate Request Agent",
    "1.3.6.1.4.1.311.10.3.1": "Microsoft Trust List Signing",
    "1.3.6.1.4.1.311.10.3.3": "Microsoft Server Gated Crypto (SGC)",
    "1.3.6.1.4.1.311.10.3.4": "Encrypting File System",
    "1.3.6.1.5.5.7.3.7": "IP Security User",
    "1.3.6.1.5.5.7.3.6": "IP Security Tunnel Termination",
    "1.3.6.1.5.5.7.3.5": "IP Security End System",
    "1.3.6.1.5.5.7.3.8": "Timestamping",
    "1.3.6.1.5.5.7.3.9": "OCSP Signing",
    serverAuth: "SSL/TLS Web Server Authentication",
    clientAuth: "SSL/TLS Web Client Authentication",
    codeSigning: "Code signing",
    emailProtection: "E-mail Protection (S/MIME)",
    timeStamping: "Trusted Timestamping",
    msCodeInd: "Microsoft Individual Code Signing (authenticode)",
    msCodeCom: "Microsoft Commercial Code Signing (authenticode)",
    msCTLSign: "Microsoft Trust List Signing",
    msSGC: "Microsoft Server Gated Crypto",
    msEFS: "Microsoft Encrypted File System",
    nsSGC: "Netscape Server Gated Crypto",
  };

  var keyusages = {
    digitalSignature: "Digital Signature",
    nonRepudiation: "Non Repudiation",
    keyEncipherment: "Key Encipherment",
    dataEncipherment: "Data Encipherment",
    keyAgreement: "Key Agreement",
    keyCertSign: "Certificate Signing",
    cRLSign: "CRL Signing",
    encipherOnly: "Encipher Only",
    decipherOnly: "Decipher Only",
  };

  var SANtypes = {
    otherName: "Other Name",
    rfc822Name: "RFC822 Name",
    dNSName: "DNS Name",
    x400Address: "X.400 Address",
    directoryName: "Directory Name",
    ediPartyName: "ediPartyName",
    uniformResourceIdentifier: "Uniform Resource Identifier",
    iPAddress: "IP Address",
    registeredID: "registeredID",
  };

  var dispatch = {
    subject: function (v) {
      return v.reverse().join(", ");
    },
    issuer: function (v) {
      return v.reverse().join(", ");
    },
    keyusage: function (v) {
      for (let i = 0; i < v.length; i++) {
        if (keyusages[v[i]]) {
          v[i] = keyusages[v[i]] + " (" + v[i] + ")";
        }
      }
      return v.join(", ");
    },
    extkeyusage: function (v) {
      for (let i = 0; i < v.length; i++) {
        if (extkeyusages[v[i]]) {
          v[i] = extkeyusages[v[i]] + " (" + v[i] + ")";
        }
      }
      return v.join("<br>");
    },
    basicconstraints: function (v) {
      var r = {
        ca: false,
        path: "None",
      };
      v.forEach(function (e) {
        let a = e.split("=", 2);
        a[0] = a[0].trim();
        a[1] = a[1].trim();
        if (a[0].toLowerCase() === "ca") {
          r.ca = a[1];
        } else {
          r.path = a[1];
        }
      });
      return `Subject Type = ${
        r.ca ? "CA" : "End Entity"
      }<br>Path Length Constraint = ${r.path}`;
    },
    san: function (v) {
      for (let i = 0; i < v.length; i++) {
        let a = v[i].split("=", 2);
        if (a[0] === "iPAddress") {
          a[1] = `${a[1].charCodeAt(0)}.${a[1].charCodeAt(1)}.${a[1].charCodeAt(
            2
          )}.${a[1].charCodeAt(3)}`;
        }
        v[i] = SANtypes[a[0]] + " = " + a[1];
      }
      return v.join("<br>");
    },
  };

  var build_ext = function (name, values) {
    if (dispatch.hasOwnProperty(name)) {
      let v_temp;
      if (values[0] === "critical") {
        v_temp = values.slice(1);
      } else {
        v_temp = values.slice();
      }
      return dispatch[name](v_temp);
    }
  };

  $.extend({
    export_certificates: export_parameters,
    remove_certificates: remove_certificates,
    change_certificate_attribute: change_attribute,
    certificate_details: certificate_details,
  });
})(jQuery);
