var vsa_container;

var collectorCallbacks = [];
var attr_obj = {};

const registerCollector = (name, cb, validate) => {
  collectorCallbacks = collectorCallbacks.filter((c) => c.name !== name);
  collectorCallbacks.push({ name, cb, validate });
};

$(function () {
  $(".copy-attribute").click(function (e) {
    var copyText = $("#nad-ip");
    copyText.select();
    document.execCommand("Copy");
    toast("info", "", "NAD IP address copied to clipboard.");
  });

  $("#save-sessions").click(function (e) {
    if ($(this).is(":checked")) {
      if (!$("#save-options").is(":visible")) {
        $("#save-options").fadeIn("fast");
      }
    } else {
      if ($("#save-options").is(":visible")) {
        $("#save-options").fadeOut("fast");
      }
    }
  });

  $("input.autocomplete").each(function (i) {
    $(this)
      .autocomplete({
        source: JSON.parse($(this).attr("data-autocomplete")),
        minLength: 0,
      })
      .focus(function () {
        $(this).autocomplete("search", $(this).val());
      });
  });

  $("#attributes-modal .add-button").click(addAttributesToForm);

  $(".add-attribute-btn").click(showAttributesModal);

  $("#access-request-attributes").on("hide.bs.collapse", function () {
    $("#access-request-toggle").removeClass("expanded");
  });

  $("#access-request-attributes").on("show.bs.collapse", function () {
    $("#access-request-toggle").addClass("expanded");
  });

  $("#accounting-start-attributes").on("hide.bs.collapse", function () {
    $("#accounting-start-toggle").removeClass("expanded");
  });

  $("#accounting-start-attributes").on("show.bs.collapse", function () {
    $("#accounting-start-toggle").addClass("expanded");
  });

  $("form").submit(async function (e) {
    e.preventDefault();
    const $this = $(this);
    const btn = $this.find("button[type=submit]");
    btn
      .prop("disabled", true)
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );

    const parameters = await getParamsFromForm.call(this, e);

    if (!parameters || (typeof no_send !== "undefined" && no_send)) {
      if (typeof no_send !== "undefined" && no_send) console.log(parameters);
      btn.prop("disabled", false).find(".icon-animation").remove();
      e.stopPropagation();
      return false;
    }

    $.ajax({
      url: globals.rest.generate,
      type: "POST",
      data: JSON.stringify(parameters),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      async: true,
    })
      .done(function (data) {
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
          toast("error", "Error", data.error);
        } else if (data.success) {
          toast("success", "Success", data.success);
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        var message = errorThrown;
        if (
          jqXHR.hasOwnProperty("responseJSON") &&
          jqXHR.responseJSON.hasOwnProperty("error")
        ) {
          message = jqXHR.responseJSON.error;
        } else if (jqXHR.hasOwnProperty("responseText")) {
          message = jqXHR.responseText;
        }
        toast("error", "Error", message);
      })
      .always(function () {
        btn.prop("disabled", false).find(".icon-animation").remove();
      });
  });

  //Copy Accounting attributes from request
  (function () {
    var attributes = [
      { name: "Acct-Authentic", value: "RADIUS", values: [] },
      { name: "Acct-Status-Type", value: "Start", values: [] },
      {
        name: "Service-Type",
        value: "Copy Latest Value",
        values: ["Copy Latest Value"],
      },
      {
        name: "User-Name",
        value: "Copy From Response",
        values: ["Copy From Response"],
      },
      {
        name: "Acct-Session-Id",
        value: "Copy Latest Value",
        values: ["Copy Latest Value"],
      },
      {
        name: "Class",
        value: "Copy From Response",
        values: ["Copy From Response"],
      },
    ];
    var request_attributes_dom = $("#access-request-attributes").children(
      "div.form-group, div.vsa-row"
    );
    var request_attributes = {
      attributes: [],
    };
    attr_obj = request_attributes;
    request_attributes_dom.each(attrCollector);
    request_attributes.attributes.forEach(function (entry) {
      if (
        entry.name === "User-Password" ||
        entry.name === "CHAP-Password" ||
        entry.name === "Reply-Message" ||
        entry.name === "State" ||
        entry.name === "Message-Authenticator"
      ) {
        return;
      }
      attributes.push({
        name: entry.name,
        value: "Copy Latest Value",
        values: ["Copy Latest Value"],
      });
    });

    attributes.push({ name: "Framed-IP-Address", value: "$IP$", values: [] });
    var insert_before = $(
      "#accounting-start-attributes .add-attribute-btn"
    ).parent();

    addAttributes(insert_before, false, attributes);
  })();

  $(".proto-select").click(changeProto);

  $("#send-acct-start-switch").change(function (e) {
    var that = $(this);
    if (that.is(":checked")) {
      that.prop("disabled", true);
      that.closest("label").next(".form-group").fadeIn("fast");
      $("#acct-start-panel").fadeIn("fast", function (e) {
        that.prop("disabled", false);
      });
    } else {
      that.prop("disabled", true);
      that.closest("label").next(".form-group").fadeOut("fast");
      $("#acct-start-panel").fadeOut("fast", function (e) {
        that.prop("disabled", false);
      });
    }
  });

  $("#NAS-Port-Type-selector").change(changeNASPortType).trigger("change");
  $("#framed-mtu").change(changeFramedMTU);
  $("#framed-mtu-switch").change(changeFramedMTUInput).change();

  loadEditAttribute("mac", $("#variable-mac .panel-body"), "not-submit");
  loadEditAttribute("ip", $("#variable-ip .panel-body"), "not-submit");

  addActionButtons();

  $("#server-load-dd")
    .data({
      "load-from": {
        link: globals.rest.servers.dropdown,
        nolocation: true,
      },
      target: populateServer,
    })
    .click(loadValues);

  $("#server-data :input")
    .not("#save-server, #shared-secret")
    .change(unblockSaveServer);

  $("#nad-ips-dd a[data-value]").click(updateNadIp);

  populateRadiusDictionaries("preloaded");

  check_url();
});

function check_url() {
  let re = new RegExp(`\/generate\/([^/]+)\/(tab\/([^/]+)\/)?`, "i");
  let proto, tab;
  if (!re.test(window.location.pathname)) {
    window.history.pushState("", "", `${globals.rest.generate}mab/`);
    proto = "mab";
    tab = "general";
  } else {
    let match = window.location.pathname.match(re);
    proto = match[1];
    tab = match[3] || "general";
  }
  globals.current_base = `${globals.rest.generate}${proto}/`;
  $(`a.proto-select[data-protocol="${proto}"]`).click();
  if (tab) {
    $(`.tabs--vertical.switchable a[data-target="${tab}"]`).click();
  }
}

function changeNASPortType(e) {
  let $t = $(this);
  let inpt = $("#nas-port");
  if (!inpt.length) {
    return;
  }
  inpt.val($t.find("option:selected").val());
}

function changeFramedMTU() {
  let $t = $(this);
  let inpt = $("#Framed-MTU-input");
  if (!inpt.length) {
    return true;
  }
  inpt.val($t.val());
}

function changeFramedMTUInput() {
  let $t = $(this);
  let inpt = $("#framed-mtu");
  let chkd = $t.is(":checked");
  inpt.prop("disabled", !chkd);
  let rds = $("#access-request-attributes");
  if (chkd) {
    if (rds.find("#Framed-MTU-input").length) {
      return;
    }

    let el = $(`<div class="form-group form-group--dunset flex">
			<div class="form-group half-margin-right flex-fill"> 
				<div class="form-group__text"> 
					<input id="Framed-MTU-input" name="Framed-MTU" value="${inpt.val()}" class="radius-attribute" data-type="string" type="text"> 
					<label for="Framed-MTU-input">Framed-MTU <span class="text-xsmall">(string)</span></label> 
				</div>
			</div>
		</div>`)
      .hide()
      .append(
        $(
          `<div class="btn-group btn-group--large btn-group--square base-margin-top" />`
        ).append(actionBtn_Remove())
      );
    rds.children(".form-group").last().after(el);
    el.fadeIn("fast");
  } else {
    rds
      .find("#Framed-MTU-input")
      .closest(".flex")
      .fadeOut("fast", function () {
        $(this).remove();
      });
  }
}

var proto_dispatch = {
  pap: changeToPAP,
  mab: changeToMAB,
  "eap-tls": changeToEAPTLS,
  eaptls: changeToEAPTLS,
  "eap-mschapv2": changeToEAPMSCHAPV2,
  peap: changeToPEAP,
};

function changeProto(e, newProto = undefined) {
  var $this = $(this);
  var proto = newProto || $this.data("protocol");
  e.preventDefault();

  // if ($this.parent().hasClass("selected")) {
  //   return;
  // }

  if (proto_dispatch[proto]) {
    $("#proto-show").html(proto === "pap" ? "pap/chap" : proto);
    $("#count")
      .prop("disabled", false)
      .removeAttr("disabled")
      .val("1")
      .attr("type", "number");
    // $this
    //   .closest("ul")
    //   .find(".sidebar__item--selected")
    //   .removeClass("sidebar__item--selected");
    // $this.parent().addClass("sidebar__item--selected");
    $("input[name='protocol']").val(proto);
    // globals.current_base = `${globals.rest.generate}${proto}/`;
    // window.history.pushState(
    //   "",
    //   "",
    //   `${globals.current_base}${
    //     globals.current_tab ? `tab/${globals.current_tab}/` : ""
    //   }`
    // );
    cleanProtoSpecific.call(this, e, proto_dispatch[proto]);
  }
}

function cleanProtoSpecific(e, done) {
  removeTab(".proto-specific", e, done);
}

function changeToMAB(e) {
  let mab_a = [
    {
      id: "Service-Type",
      value: "Call-Check",
      overwrite: true,
    },
    {
      id: "User-Name",
      value: "Same as MAC address",
      overwrite: true,
    },
  ];
  changeFramedMTUState(true);
  rebuildRADIUS(mab_a);
}

function changeToPAP(e) {
  $.ajax({
    type: "GET",
    url: `${globals.rest.generate}get-proto-specific-params/pap/`,
    cache: false,
    processData: false,
    async: true,
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      append = $('<div class="just-wrap"></div>');
      addFields(append, data.parameters, undefined);
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle(data.title, data.subtitle || "");
      p.find(".panel-body")
        .append(append)
        .find(":input")
        .addClass("not-submit");
      addTab(
        data.title,
        $(
          `<div class="section section--compressed protocol-specific collectable"></div>`
        )
          .data("attribute", "pap-params")
          .append(p),
        "proto-specific",
        "proto-specific",
        2
      );

      p.find(".has-dependants").each(function () {
        changeDependands.call(this, undefined);
      });

      p.find(".update-on-change").each(function () {
        $(this).find(":input").last().trigger("change");
      });

      p.find("[data-tab] > a.selected").click();

      if (data.radius) {
        rebuildRADIUS(data.radius);
      }

      changeFramedMTUState(true);

      applyCountSwitch(p);

      var chap = p.find('[name="chap"]');
      chap.prop(
        "checked",
        page_attributes.hasOwnProperty("chap") ? page_attributes["chap"] : false
      );
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function changeToEAPTLS(e) {
  $.ajax({
    type: "GET",
    url: `${globals.rest.generate}get-proto-specific-params/eap-tls/`,
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      append = $('<div class="just-wrap"></div>');
      addFields(append, data.parameters, undefined);
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle(data.title, data.subtitle || "");
      p.find(".panel-body")
        .append(append)
        .find(":input")
        .addClass("not-submit");
      addTab(
        "EAP-TLS Parameters",
        $(
          `<div class="section section--compressed protocol-specific collectable"></div>`
        )
          .data("attribute", "eap-tls-params")
          .append(p),
        "proto-specific",
        "proto-specific",
        2
      );

      p.find(".has-dependants").each(function () {
        changeDependands.call(this, undefined);
      });

      p.find(".update-on-change").each(function () {
        $(this).find(":input").last().trigger("change");
      });

      p.find("[data-tab] > a.selected").click();

      if (data.radius) {
        rebuildRADIUS(data.radius);
      }

      changeFramedMTUState(false);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function changeToPEAP(e) {
  $.ajax({
    type: "GET",
    url: `${globals.rest.generate}get-proto-specific-params/peap/`,
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      append = $('<div class="just-wrap"></div>');
      addFields(append, data.parameters, undefined);
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle(data.title, data.subtitle || "");
      p.find(".panel-body")
        .append(append)
        .find(":input")
        .addClass("not-submit");
      addTab(
        "PEAP Parameters",
        $(
          `<div class="section section--compressed protocol-specific collectable"></div>`
        )
          .data("attribute", "peap-params")
          .append(p),
        "proto-specific",
        "proto-specific",
        2
      );

      p.find(".has-dependants").each(function () {
        changeDependands.call(this, undefined);
      });

      p.find(".update-on-change").each(function () {
        $(this).find(":input").last().trigger("change");
      });

      p.find("[data-tab] > a.selected").click();

      if (data.radius) {
        rebuildRADIUS(data.radius);
      }

      changeFramedMTUState(false);

      applyCountSwitch(p);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function changeToEAPMSCHAPV2() {
  $.ajax({
    type: "GET",
    url: `${globals.rest.generate}get-proto-specific-params/eap-mschapv2/`,
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      append = $('<div class="just-wrap"></div>');
      addFields(append, data.parameters, undefined);
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle(data.title, data.subtitle || "");
      p.find(".panel-body")
        .append(append)
        .find(":input")
        .addClass("not-submit");
      addTab(
        "EAP-MSCHAPv2",
        $(
          `<div class="section section--compressed protocol-specific collectable"></div>`
        )
          .data("attribute", "eap-mschapv2-params")
          .append(p),
        "proto-specific",
        "proto-specific",
        2
      );

      p.find(".has-dependants").each(function () {
        changeDependands.call(this, undefined);
      });

      p.find(".update-on-change").each(function () {
        $(this).find(":input").last().trigger("change");
      });

      p.find("[data-tab] > a.selected").click();

      if (data.radius) {
        rebuildRADIUS(data.radius);
      }

      changeFramedMTUState(false);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function rebuildRADIUS(ro_values) {
  let acc_req = $("#access-request-attributes");
  $("#access-request-attributes .protocol-specific")
    .fadeOut("fast")
    .promise()
    .done(() => {
      $("#access-request-attributes .protocol-specific").remove();
      if (!ro_values || !ro_values.length) {
        return;
      }
      ro_values.reverse().forEach((el) => {
        acc_req.prepend(`<div class="form-group protocol-specific">
				<div class="form-group__text">
					<input type="text" value="${el.value}" class="radius-attribute" id="${
          el.id
        }-input" readonly="">
					<label for="${el.id}-input">${el.id} 
						<span class="text-xsmall">(${radius_dictionary.names[el.id].type})</span>
					</label>
				</div>
			</div>`);
      });
    });
}

function panelWithTitle(title, subtitle) {
  return $(`<div>
		<h2 class="display-3 no-margin text-capitalize flex-fluid ${
      subtitle ? "" : "base-margin-bottom"
    }">${title}</h2>
		${subtitle ? `<h5 class="base-margin-bottom subheading">${subtitle}</h5>` : ""}
		<div class="panel-body parameters"></div>
	<div>`);
}

function addActionButtons() {
  let acc_req = $("#access-request-attributes");
  let acct_st = $("#accounting-start-attributes");

  let fn = function (i) {
    let fg = $(this).closest(".form-group:not(.form-group--dunset)");
    if (fg.hasClass("flex-fill")) {
      return;
    }
    fg.addClass("half-margin-right flex-fill")
      .wrap('<div class="form-group form-group--dunset flex" />')
      .after(
        $(
          `<div class="btn-group btn-group--large btn-group--square base-margin-top" />`
        ).append(actionBtn_Remove())
      );
  };

  acc_req.find(":input:not([readonly])").each(fn);
  acct_st.find(":input:not([readonly])").each(fn);
}

function actionBtn_Remove() {
  let btn = $(`<button type="button" class="btn btn--icon btn--link not-submit remove-attribute">
		<span class="icon-remove" title="Remove attribute"></span>
	</button>`).click(function (e) {
    e.preventDefault();
    $(this)
      .closest(".form-group--dunset")
      .fadeOut("fast", function () {
        let $t = $(this);
        let vr = $t.closest(".vsa-row");
        if (vr.length && vr.find("input.radius-attribute").length == 1) {
          vr.removeData("vendor");
        }
        $t.remove();
      });
  });
  return btn;
}

function changeFramedMTUState(editable, checked = true) {
  if (editable) {
    if (!$("#framed-mtu-switch").prop("disabled")) {
      return;
    }
    $("#framed-mtu-switch")
      .prop("disabled", false)
      .closest(".flex-center-vertical")
      .removeClass("hide")
      .fadeIn("fast")
      .closest(".flex")
      .find(".flex-fill")
      .addClass("half-margin-right");
  } else {
    if ($("#framed-mtu-switch").prop("disabled")) {
      return;
    }
    $("#framed-mtu-switch")
      .closest(".flex-center-vertical")
      .fadeOut("fast", function () {
        $(this)
          .addClass("hide")
          .closest(".flex")
          .find(".flex-fill")
          .removeClass("half-margin-right");
      });
    $("#framed-mtu-switch")
      .prop("checked", checked)
      .prop("disabled", true)
      .change();
  }
}

function populateServer(data) {
  if (!data.hasOwnProperty("server")) {
    return;
  }

  let nad_family = $("#nad-ip").data("family");
  let sadd;
  if (nad_family === "v4") {
    sadd = data.server.address || "";
  } else {
    sadd = data.server.attributes.v6_address || "";
  }

  if (!sadd) {
    toast_error(
      {},
      "",
      `Selected server doesn't have IP${nad_family} address assigned. Please select server with IP${nad_family} address`
    );
    return;
  }

  if ($("#save-server").parent().is(":visible")) {
    $("#save-server").parent().fadeOut("fast");
  }
  $("#server-ip").val(sadd).data("family", nad_family);
  $("#auth-port").val(data.server.auth_port);
  $("#acct-port").val(data.server.acct_port);
  $("#shared-secret").val(data.server.attributes.shared);

  if ($("#server-inet-family").length) {
    $("#server-inet-family").val(nad_family);
  } else {
    $("#server-ip").after(
      `<input type="hidden" id="server-inet-family" name="server-inet-family" value="${nad_family}">`
    );
  }

  if ($("#server-loaded-id").length) {
    $("#server-loaded-id").val(data.server.id);
  } else {
    $("#server-ip").after(
      `<input type="hidden" id="server-loaded-id" name="server-loaded-id" value="${data.server.id}">`
    );
  }

  if (data.server.coa) {
    addCOAOptions();
    addGuestFlow();
  } else {
    removeCOAOptions();
    removeGuestFlow();
  }
}

function unblockSaveServer() {
  if (!$("#save-server").parent().is(":visible")) {
    $("#save-server").parent().fadeIn("fast");
  }
  $("#server-loaded-id").val("").remove();
  removeCOAOptions();
  removeGuestFlow();
}

function clearServer() {
  unblockSaveServer();
  $("#server-ip").removeData("family").val("");
  $("#shared-secret").val("");
}

function removeCOAOptions() {
  if ($("#coa-options").length) {
    removeTab(".coa-options");
  }
}

function removeGuestFlow() {
  if ($("#guest-flow").length) {
    removeTab(".guest-flow");
  }
}

function addCOAOptions() {
  if ($("#coa-options").length) {
    return;
  }

  $.ajax({
    url: `${globals.rest.generate}get-attribute-data/coa/`,
    type: "GET",
    cache: false,
    processData: false,
    contentType: "application/json",
    headers: {
      Accept: "application/json",
    },
    async: true,
  })
    .done(function (data) {
      let append = $('<div class="just-wrap"></div>');
      addFields(
        append,
        data.parameters,
        undefined,
        data.hasOwnProperty("defaults") ? data.defaults : undefined
      );
      append.find(":input").addClass("not-submit");
      append.find("select").change(coaSelectChange).change();
      append
        .find('[data-wrap-for="new-session-id"] input')
        .change(triggerDropOldSwitch)
        .trigger("change");
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle("CoA Options", "");
      p.find(".panel-body").append(append);
      addTab(
        "CoA Options",
        $(
          `<div class="section section--compressed collectable" data-attribute="coa-options"/>`
        )
          .data("attribute", "coa-options")
          .append(p),
        "coa-options",
        "coa-options",
        3
      );
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      section.remove();
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function coaSelectChange(e) {
  let $t = $(this);
  let v = $t.find("option:selected").val();
  let p = $t
    .closest(".parameters")
    .find('[data-wrap-for="new-session-id"], [data-wrap-for="drop-old"]');
  if (v === "nothing") {
    p.fadeOut("fast").addClass("hide");
  } else {
    p.removeClass("hide").fadeIn("fast");
  }
}

function triggerDropOldSwitch(e) {
  let $t = $(this);
  let f = $t.is(":checked") && !$t.hasClass("hide");
  let p = $t.closest(".parameters").find('[data-wrap-for="drop-old"]');
  if (f) {
    p.fadeIn("fast");
  } else {
    p.fadeOut("fast");
  }
}

function checkEapTlsInputs(c) {
  if (!c.hasOwnProperty("eap-tls-params")) {
    return false;
  }
  c = c["eap-tls-params"];
  if (
    c["identity-certificates"].variant === "selected" &&
    !c["identity-certificates"].certificates.length
  ) {
    toast_error(
      {},
      undefined,
      "At least one Identity certificate should be selected."
    );
    let w = $(
      '[data-wrap-for="identity-certificates"] [data-wrap-for="certificates"]'
    );
    w.addClass("form-group--error")
      .find("input")
      .one("change", () => {
        w.removeClass("form-group--error");
      });
    $('.tabs.switchable a[data-target="proto-specific"]').click();
    return false;
  }

  if (!c["allowed-ciphers"].length) {
    toast_error(
      {},
      undefined,
      "At least one allowed cipher should be selected."
    );
    return false;
  }

  if (
    c["identity-certificates"].variant === "scep" &&
    (!c["identity-certificates"]["scep-server"] ||
      !c["identity-certificates"]["scep-server"].length)
  ) {
    toast_error({}, undefined, "Select correct SCEP server first");
    return false;
  }

  return true;
}

function checkPeapInputs(c) {
  if (!c.hasOwnProperty("peap-params")) return false;
  c = c["peap-params"];

  if (!checkCredentials(c.credentials)) return false;
  if (!c["allowed-ciphers"].length) {
    toast_error(
      {},
      undefined,
      "At least one allowed cipher should be selected."
    );
    return false;
  }

  return true;
}

function checkPapInputs(p) {
  if (!p.hasOwnProperty("pap-params")) return false;
  p = p["pap-params"];
  if (!checkCredentials(p.credentials)) return false;
  return true;
}

function checkCredentials(
  credentials,
  input_selector = "#input-credentials-list",
  tab_name = "proto-specific"
) {
  if (credentials.variant === "list") {
    let proceed = true;
    credentials["credentials-list"] = credentials["credentials-list"]
      .replace("\r\n", "\n")
      .split("\n")
      .filter((x) => x.length > 0);
    var BreakException = {};

    try {
      if (!credentials["credentials-list"].length) {
        toast_error({}, undefined, `Please provide credentials`);
        throw BreakException;
      }
      credentials["credentials-list"].forEach((value, index) => {
        value = value.trim();
        if (!/^[^:]+:.+/.test(value)) {
          toast_error({}, undefined, `Please check syntax of credentials`);
          throw BreakException;
        }
        credentials["credentials-list"][index] = value;
      });
    } catch (e) {
      proceed = false;
      if (e !== BreakException) throw e;
    }
    if (!proceed) {
      $(`.tabs.switchable a[data-target="${tab_name}"]`).click();
      $(input_selector)
        .focus()
        .closest(".form-group")
        .addClass("form-group--error");
      return false;
    }
  }
  return true;
}

function addTab(name, content, id, classes, order = 1) {
  $(".tab-content").append(
    $(`<div 
			class="tab-pane animated fadeIn section no-padding ${classes}${
      globals.current_tab === id ? " active" : ""
    }" 
			id="${id}"></div>`).append(content)
  );
  let li = $(`<li 
		class="tab animated fadeIn faster ${classes}${
    globals.current_tab === id ? " active" : ""
  }"
		data-order="${order}"></li>`).append(
    $(`<a href="javascript:;" data-target="${id}">${name}</a>`).click(
      switchGeneralTab
    )
  );

  let orders = $(".tab")
    .map(function () {
      return parseInt($(this).attr("data-order"));
    })
    .toArray();
  orders = orders
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    })
    .sort((a, b) => {
      return a - b;
    });

  for (o in orders) {
    let v = orders[o];
    if (v === order) {
      $(`.tabs--vertical.switchable .tab[data-order="${v}"]:last`).after(li);
      return;
    } else if (v > order) {
      $(`.tabs--vertical.switchable .tab[data-order="${v}"]:first`).before(li);
      return;
    }
  }
}

function removeTab(id, event, done) {
  $(`.tabs--vertical.switchable ${id}`).remove();
  $(`.tab-pane${id}`).remove();
  if (done) {
    done.call(this, event);
  }
}

async function formChecks() {
  let form = $(this);
  form
    .find(".form-group--error")
    .filter((_, el) => !el.closest(".react-app"))
    .removeClass("form-group--error");
  form
    .find(".help-block.text-danger")
    .filter((_, el) => !el.closest(".react-app"))
    .remove();
  const validators = await formCallValidators();
  return formCheckRequired.call(this) && formValidate.call(this) && validators;
}

function formCheckRequired() {
  let form = $(this);
  let result = true;
  form.find(":input.required:not([disabled])").each(function () {
    let el = $(this);
    let type = el.attr("type");
    type = type ? type : el.is("textarea") ? "textarea" : type;
    if (!type) {
      return true;
    }
    let v = el.val();
    let r = false;

    switch (type) {
      case "number":
        r = parseInt(v) == v;
        if (!r) {
          break;
        }
        v = parseInt(v);
        r = Number.isInteger(v);
        if (el.attr("min") !== undefined) {
          r = r && v >= parseInt(el.attr("min"));
        }
        if (el.attr("max") !== undefined) {
          r = r && v <= parseInt(el.attr("max"));
        }
        break;
      default:
        r = String(v).length > 0;
    }

    if (!r) {
      let tab = el.closest(".tab-pane").attr("id");
      $(`.tabs.switchable a[data-target="${tab}"]`).click();
      el.closest(".form-group").addClass("form-group--error");
      el.focus();
      result = r;
      return false;
    }
  });
  return result;
}

function errorHelpBlock(text) {
  return `<div class="help-block text-danger animated fadeIn" role="alert"><span>${text}</span></div>`;
}

function formValidate() {
  let form = $(this);
  let result = true;

  form.find(":input.validate:not([disabled])").each(function () {
    let el = $(this);
    let err = undefined;
    let v = el.val();
    switch (el.data("validate")) {
      case "range":
        if (!/^\d+$/.test(v) && !/^\d+\.\.\d+$/.test(v)) {
          err = "Incorrect format";
        }

        if (!err) {
          var matches = v.match(/^(\d+)\.\.(\d+)$/);
          if (
            matches != null &&
            matches.length == 3 &&
            parseInt(matches[2]) < parseInt(matches[1])
          ) {
            err = "N2 cannot be less than N1";
          }
        }
        break;
    }

    if (err) {
      let tab = el.closest(".tab-pane").attr("id");
      $(`.tabs.switchable a[data-target="${tab}"]`).click();
      el.closest(".form-group")
        .addClass("form-group--error")
        .append(errorHelpBlock(err));
      el.focus();
      result = false;
      return false;
    }
  });
  return result;
}

function formValidateDictionaries(o, parent = undefined) {
  for (k in o) {
    if (typeof o[k] === "object" && Object.keys(o[k]).length) {
      let r = formValidateDictionaries(o[k], k);
      if (!r) {
        return false;
      }
      continue;
    }

    if (k === "variant" && o[k] === "dictionary") {
      if (!o.hasOwnProperty("dictionary") || o.dictionary.length === 0) {
        let el = $(`[data-wrap-for="${parent}"]`);
        let tab = el.closest(".tab-pane").attr("id");
        $(`.tabs.switchable a[data-target="${tab}"]`).click();
        el = el.find('[data-var-type="dictionary"]:first');
        el.addClass("form-group--error");
        el.find("input:first").one("change", () => {
          el.removeClass("form-group--error");
        });
        el.focus();
        toast_error(
          {},
          undefined,
          "At least one dictionary should be selected."
        );
        return false;
      }
    }
  }
  return true;
}

async function formCallValidators() {
  if (!collectorCallbacks.length) return true;

  for (const { name, validate } of collectorCallbacks) {
    if (typeof validate === "function" && !(await validate())) {
      const tab = $(`#collector-${name}`).closest(".tab-pane").attr("id");
      $(`.tabs.switchable a[data-target="${tab}"]`).click();
      return false;
    }
  }

  return true;
}

/**********************
 * Attributes
 */
function checkFramedIPAddress() {
  var inputs = $('input[name="Framed-IP-Address"]');
  if (inputs.length) {
    if (inputs.first().val() === "Same As Last Generated") {
      inputs
        .first()
        .val("$IP$")
        .autocomplete({
          source: ["$IP$"],
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    }
    if (inputs.length > 1) {
      inputs
        .filter(":not(:first)")
        .val("Same As Last Generated")
        .autocomplete({
          source: ["$IP$", "Same As Last Generated"],
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    }
  }
}

function addVSA(e) {
  e.preventDefault();
  var that = $(this);
  var vsaGroup = that.closest(".vsa-row");
  var vendor = "";
  if (vsaGroup.data("vendor")) {
    vendor = vsaGroup.data("vendor");
  }

  var modal = $("#attributes-modal");
  var body = modal.find(".modal__body");

  body.empty();

  var select = $(
    '<select id="radius-attributes" multiple="multiple"></select>'
  );

  for (var dictionary in radius_dictionary.by_dictionary) {
    var display_name = dictionary;
    if (/^dictionary\./.test(display_name)) {
      display_name = display_name.replace("dictionary.", "");
      if (/^rfc/i.test(display_name)) {
        display_name = display_name.toUpperCase();
      } else {
        display_name = display_name.replace(/\b\w/g, function (l) {
          return l.toUpperCase();
        });
      }
    }
    var group = $('<optgroup label="' + display_name + '"></optgroup>');

    var sorted = Object.keys(radius_dictionary.by_dictionary[dictionary]);
    sorted.sort();

    for (var i in sorted) {
      var attribute = sorted[i];
      if (
        typeof radius_dictionary.by_dictionary[dictionary][attribute].id !=
          "undefined" &&
        ((vendor &&
          radius_dictionary.by_dictionary[dictionary][attribute].vendor ===
            vendor) ||
          (!vendor &&
            radius_dictionary.by_dictionary[dictionary][attribute].vendor !==
              "not defined"))
      ) {
        var option = $(
          '<option value="' + attribute + '">' + attribute + "</option>"
        );
        group.append(option);
      }
    }

    if (group.find("option").length) {
      select.append(group);
    }
  }

  modal.find(".add-button").prop("disabled", true);

  body.append(select);

  select.multiSelect({
    selectableHeader:
      '<div class="form-group label--inline input--compressed half-margin-bottom"><div class="form-group__text">' +
      '<input id="search-selectable" type="search">' +
      '<label for="search-selectable">Search</label>' +
      "</div></div>",
    selectionHeader:
      '<div class="form-group label--inline input--compressed half-margin-bottom"><div class="form-group__text">' +
      '<input id="search-selection" type="search">' +
      '<label for="search-selection">Search</label>' +
      "</div></div>",
    afterInit: function (ms) {
      var that = this,
        $selectableSearch = that.$selectableUl.prev("div").find("input"),
        $selectionSearch = that.$selectionUl.prev("div").find("input"),
        selectableSearchString =
          "#" +
          that.$container.attr("id") +
          " .ms-elem-selectable:not(.ms-selected)",
        selectionSearchString =
          "#" + that.$container.attr("id") + " .ms-elem-selection.ms-selected";

      that.qs1 = $selectableSearch
        .quicksearch(selectableSearchString)
        .on("keydown", function (e) {
          if (e.which === 40) {
            that.$selectableUl.focus();
            return false;
          }
        });

      that.qs2 = $selectionSearch
        .quicksearch(selectionSearchString)
        .on("keydown", function (e) {
          if (e.which == 40) {
            that.$selectionUl.focus();
            return false;
          }
        });

      that.addButton = modal.find(".add-button");
    },
    afterSelect: function () {
      this.qs1.cache();
      this.qs2.cache();

      this.addButton.prop(
        "disabled",
        !$("select#radius-attributes option:selected").length
      );

      var select = $("select#radius-attributes");
      if (!select.data("vendor")) {
        var ven = select
          .find("option:selected")
          .filter(":first")
          .parent()
          .attr("label");
        select
          .find('optgroup[label!="' + ven + '"] option')
          .prop("disabled", true);
        select.multiSelect("refresh");
        select.data("vendor", ven);
      }
    },
    afterDeselect: function () {
      this.qs1.cache();
      this.qs2.cache();

      this.addButton.prop(
        "disabled",
        !$("select#radius-attributes option:selected").length
      );

      var select = $("select#radius-attributes");
      if (select.data("vendor") && !select.find("option:selected").length) {
        select.find("option").prop("disabled", false);
        select.multiSelect("refresh");
        select.removeData("vendor");
      }
    },
  });

  vsa_container = vsaGroup;
  modal.data("vsa", "1").modal("toggle");
}

function addAttributes(insert_before, vsa, what) {
  what.forEach(function (entry) {
    var attribute = radius_dictionary.names[entry.name];
    if (!attribute) {
      return;
    }
    if (attribute.vendor === "not defined" && attribute.id == 26) {
      return;
    } // No VSA here

    if (attribute.vendor != "not defined") {
      if (vsa && vsa_container) {
        vsa_container.data("vendor", attribute.vendor);
      }
    }

    var uuid = guid();
    var form_group = $(`<div class="form-group">
					<div class="form-group__text">
						<input type="text" 
							id="${entry.name}-${uuid}-input" 
							name="${entry.name}" 
							value="${entry.value}" 
							class="radius-attribute" 
							data-type="${attribute.type}" 
							data-vendor="${attribute.vendor}"
							data-dictionary="${attribute.dictionary}">
						<label for="${entry.name}-${uuid}-input">${entry.name}
						 <span class="text-xsmall">(${attribute.type})</span>
						</label>
					</div>
				</div>`);

    if (typeof radius_dictionary.values[entry.name] != "undefined") {
      var values = [];
      var sorted = Object.keys(radius_dictionary.values[entry.name]);
      sorted.sort();
      for (var i in sorted) {
        if (
          typeof radius_dictionary.values[entry.name][sorted[i]].name ==
          "undefined"
        ) {
          values.push(sorted[i]);
        }
      }

      form_group
        .find("input")
        .autocomplete({
          source: values.concat(entry.values),
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    } else if (entry.name === "Message-Authenticator") {
      form_group
        .find("input")
        .autocomplete({
          source: ["Calculate"].concat(entry.values),
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    } else if (entry.name === "Framed-IP-Address") {
      form_group
        .find("input")
        .autocomplete({
          source: ["$IP$"].concat(entry.values),
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    } else {
      form_group
        .find("input")
        .autocomplete({
          source: entry.values,
          minLength: 0,
        })
        .focus(function () {
          $(this).autocomplete("search", $(this).val());
        });
    }

    insert_before.before(form_group);
    if (entry.name === "Framed-IP-Address") {
      checkFramedIPAddress();
    }
  });
  addActionButtons();
}

function addAttributesToForm(e) {
  var modal = $("#attributes-modal");
  var insert_before = $(
    "#" + modal.attr("data-target") + " .add-attribute-btn"
  ).parent();
  var vsa = false;
  if (modal.data("vsa")) {
    vsa = true;
    insert_before = vsa_container.find(".add-vsa-btn").parent();
  }
  $("select#radius-attributes option:selected").each(function () {
    var attr_name = $(this).val();
    var attribute = radius_dictionary.names[attr_name];

    if (attribute.vendor === "not defined" && attribute.id == 26 && !vsa) {
      // VSA wrapper
      var div = $(`<div class="row vsa-row">
				<div class="col-2 text-italic">
					<div 
						class="panel panel--light qtr-padding" 
						style="height: 100%;">VSA <button class="link pull-right remove-vsa-btn" type="button" title="Remove VSA"><span class="icon-remove"></span></button>
					</div>
				</div>
				<div class="col-10" style="display: flex; flex-direction: column;">
					<div class="text-center">
						<button class="add-vsa-btn half-margin-top half-margin-bottom link" type="button" title="Add to VSA">
							Add to VSA<span class="icon-add-outline qtr-margin-left half-margin-right"></span>
						</button>
					</div>
				</div>
			</div>`);

      div.find(".remove-vsa-btn").click(function () {
        var group = $(this).parents(".vsa-row");
        group.fadeOut("fast", function (e) {
          $(this).remove();
        });
      });

      div.find(".add-vsa-btn").click(addVSA);

      insert_before.before(div);
    } else {
      addAttributes(
        insert_before,
        vsa,
        new Array({ name: attr_name, value: "", values: [] })
      );
    }
  });
  // if ( vsa && vsa_container ) {
  // 	vsa_container.attr('data-vendor', '')
  // }
  modal.modal("toggle");
}

/**********************
 * RADIUS Dictionaries work
 */
function addRadiusDictionary(dictionary, select) {
  var display_name = dictionary;
  if (/^dictionary\./.test(display_name)) {
    display_name = display_name.replace("dictionary.", "");
    if (/^rfc/i.test(display_name)) {
      display_name = display_name.toUpperCase();
    } else {
      display_name = display_name.replace(/\b\w/g, function (l) {
        return l.toUpperCase();
      });
    }
  }
  if (!select.find(`optgroup[label="${display_name}"]`).length) {
    var group = $('<optgroup label="' + display_name + '"></optgroup>');
    var sorted = Object.keys(radius_dictionary.by_dictionary[dictionary]);
    sorted.sort();

    for (var i in sorted) {
      var attribute = sorted[i];
      if (
        typeof radius_dictionary.by_dictionary[dictionary][attribute].id !=
        "undefined"
      ) {
        var option = $(
          '<option value="' + attribute + '">' + attribute + "</option>"
        );
        group.append(option);
      }
    }
    select.append(group);
  }
}

function showAttributesModal(e) {
  e.preventDefault();
  var modal = $("#attributes-modal");
  var body = modal.find(".modal__body");

  body.empty();
  modal.attr(
    "data-target",
    $(this).parents(".radius-attributes-wrap").attr("id")
  );

  var select = $(
    '<select id="radius-attributes" multiple="multiple"></select>'
  );
  for (var dictionary in radius_dictionary.by_dictionary) {
    addRadiusDictionary(dictionary, select);
  }

  modal.find(".add-button").prop("disabled", true);

  body.append(select);

  select.multiSelect({
    selectableHeader:
      '<div class="form-group label--inline input--compressed half-margin-bottom"><div class="form-group__text">' +
      '<input id="search-selectable" type="search">' +
      '<label for="search-selectable">Search</label>' +
      "</div></div>",
    selectionHeader:
      '<div class="form-group label--inline input--compressed half-margin-bottom"><div class="form-group__text">' +
      '<input id="search-selection" type="search">' +
      '<label for="search-selection">Search</label>' +
      "</div></div>",
    afterInit: function (ms) {
      var that = this,
        $selectableSearch = that.$selectableUl.prev("div").find("input"),
        $selectionSearch = that.$selectionUl.prev("div").find("input"),
        selectableSearchString =
          "#" +
          that.$container.attr("id") +
          " .ms-elem-selectable:not(.ms-selected)",
        selectionSearchString =
          "#" + that.$container.attr("id") + " .ms-elem-selection.ms-selected";

      that.qs1 = $selectableSearch
        .quicksearch(selectableSearchString)
        .on("keydown", function (e) {
          if (e.which === 40) {
            that.$selectableUl.focus();
            return false;
          }
        });

      that.qs2 = $selectionSearch
        .quicksearch(selectionSearchString)
        .on("keydown", function (e) {
          if (e.which == 40) {
            that.$selectionUl.focus();
            return false;
          }
        });

      that.addButton = modal.find(".add-button");
    },
    afterSelect: function () {
      this.qs1.cache();
      this.qs2.cache();
      this.addButton.prop(
        "disabled",
        !$("select#radius-attributes option:selected").length
      );
    },
    afterDeselect: function () {
      this.qs1.cache();
      this.qs2.cache();
      this.addButton.prop(
        "disabled",
        !$("select#radius-attributes option:selected").length
      );
    },
  });
  vsa_container = undefined;
  modal.removeData("vsa").modal("toggle");
}

function radiusDictionaryCompare(a, b) {
  if (typeof a === "object") {
    a = a.name || "";
  }
  if (typeof b === "object") {
    b = b.name || "";
  }

  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

function radiusDictionariesLevel(ds, sub, multi) {
  let where = sub;
  if (multi) {
    where = undefined;
    sub.addClass("flex");
  }
  let a = Array.isArray(ds) ? ds : Object.keys(ds);
  a.sort(radiusDictionaryCompare).forEach((k, idx) => {
    if (multi && idx % 15 === 0) {
      if (where !== undefined) {
        sub.append(where);
        where = undefined;
      }
      where = $(`<div></div>`);
    }
    if (Array.isArray(ds[k])) {
      let new_sub = $(
        `<div class="submenu"><a href="javascript:;">${k}</a><div class="dropdown__menu"></div></div>`
      );
      radiusDictionariesLevel(
        ds[k],
        new_sub.find(".dropdown__menu"),
        Object.keys(ds[k]).length > 15
      );
      where.append(new_sub);
    } else {
      let new_a = $(
        `<a href="javascript:;" data-file="${k.file}">${k.name}</a>`
      );
      if (!radius_dictionary.by_dictionary.hasOwnProperty(k.file)) {
        new_a.click(loadRadiusDictionary);
      } else {
        new_a.addClass("disabled already-loaded");
      }
      where.append(new_a);
    }
  });
  if (multi && where !== undefined) {
    sub.append(where);
  }
}

function loadRadiusDictionaries(e) {
  let dd_menu = $(this).closest(".dropdown").children(".dropdown__menu");
  $.ajax({
    url: `${globals.rest.generate}get-dictionaries/`,
    type: "GET",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      dd_menu.empty();
      if (
        data.hasOwnProperty("dictionaries") &&
        typeof data.dictionaries === "object" &&
        Object.keys(data.dictionaries).length
      ) {
        let ds = data.dictionaries;
        radiusDictionariesLevel(ds, dd_menu, false);
        dd_menu
          .addClass("row")
          .children(".submenu")
          .addClass("submenu--open-down");
      } else {
        dd_menu.empty().append(`<a>Didn't find any dictionary</a>`);
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
      dd_menu
        .empty()
        .append(`<a class="text--danger">Got an error on loading data.</a>`);
    });
}

function radiusDictionaryLabel(name, classes) {
  let display_name = name;
  if (/^dictionary\./.test(display_name)) {
    display_name = display_name.replace("dictionary.", "");
  }
  let l = $(`<span class="label label--light label--small dictionary ${classes}" data-dictionary="${name}">
		<span>${display_name}</span><span class="icon-close" title="Remove"></span>
	</span>`);
  l.find(".icon-close").click(removeRadiusDictionaryClick);
  return l;
}

function loadRadiusDictionary(e) {
  let file = $(this).data("file");
  loadRadiusDictionaryFile(file);
}

function loadRadiusDictionaryFile(file, callback = undefined) {
  $.ajax({
    url: `${globals.rest.generate}get-dictionary/${file}/`,
    type: "GET",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      if (
        !data.hasOwnProperty("dictionary") ||
        !Object.keys(data.dictionary).length
      ) {
        toast("alert", "", "Got empty response");
        return;
      }

      radius_dictionary.by_dictionary[file] = data.dictionary;
      radius_dictionary.by_vendor = Object.assign(
        radius_dictionary.by_vendor,
        data.vendor
      );
      radius_dictionary.names = Object.assign(
        radius_dictionary.names,
        data.dictionary
      );
      radius_dictionary.values = Object.assign(
        radius_dictionary.values,
        data.values
      );

      $(".dictionaries-container .label:last").after(
        radiusDictionaryLabel(file, "animated fadeIn faster")
      );

      if (callback) {
        callback();
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function populateRadiusDictionaries(classes) {
  let c = $(".dictionaries-container");
  Object.keys(radius_dictionary.by_dictionary).forEach((e) => {
    c.append(radiusDictionaryLabel(e, classes));
  });

  let add_dictionary_btn = $(
    `<a href="javascript:;" class="btn--dropdown add-dictionary-btn" type="button">Add dictionary</a>`
  );
  add_dictionary_btn.click(loadRadiusDictionaries);
  c.append(
    $(`<div class="half-margin-top"></div>`).append(
      prepareDropDown(add_dictionary_btn, ["loader"], () => {}).addClass(
        "base-margin-bottom"
      )
    )
  );
}

function removeRadiusDictionaryClick(e) {
  e.preventDefault();
  let $t = $(this);
  let label = $t.closest(".label.dictionary");

  const confirmed = function () {
    let n = label.data("dictionary");
    delete radius_dictionary.by_dictionary[n];

    label.fadeOut("fast", function () {
      $(this).remove();
    });
  };

  if (label.hasClass("preloaded")) {
    new_confirmation_modal(
      confirmed,
      "This is a default dictionary, are you sure you want to delete it?",
      "Delete"
    );
  } else {
    confirmed();
  }
}

function updateNadIp(e) {
  e.preventDefault();
  let t = $(this);
  $("#nad-ip").val(t.data("value")).data("family", t.data("family"));
  if (
    $("#server-ip").data("family") &&
    $("#server-ip").data("family") !== t.data("family")
  ) {
    clearServer();
  }

  if (t.data("family") === "v6") {
    switchToV6();
  } else {
    switchToV4();
  }
}

function switchToV6() {
  let nadinp = $("#nad-ip");
  const updateAttribute = () => {
    let nasinp = $('#access-request-attributes input[name="NAS-IPv6-Address"]');
    if (nasinp.length) {
      nasinp.val(nadinp.val());
    } else {
      addAttributes($("#access-request-attributes > div:last-child"), false, [
        { name: "NAS-IPv6-Address", value: nadinp.val(), values: [] },
      ]);
      addAttributes($("#accounting-start-attributes > div:last-child"), false, [
        {
          name: "NAS-IPv6-Address",
          value: "Copy Latest Value",
          values: ["Copy Latest Value"],
        },
      ]);

      $('input[name="NAS-IP-Address"]').closest(".form-group--dunset").remove();
    }
  };

  if (!$('span.dictionary[data-dictionary="dictionary.rfc3162"]').length) {
    loadRadiusDictionaryFile("dictionary.rfc3162", updateAttribute);
  }

  $("#server-load-dd").data("load-from", {
    link: globals.rest.servers.dropdown + "v6/",
    nolocation: true,
  });
}

function switchToV4() {
  let nadinp = $("#nad-ip");
  let nasinp = $('#access-request-attributes input[name="NAS-IP-Address"]');
  if (nasinp.length) {
    nasinp.val(nadinp.val());
  } else {
    addAttributes($("#access-request-attributes > div:last-child"), false, [
      { name: "NAS-IP-Address", value: nadinp.val(), values: [] },
    ]);
    addAttributes($("#accounting-start-attributes > div:last-child"), false, [
      {
        name: "NAS-IP-Address",
        value: "Copy Latest Value",
        values: ["Copy Latest Value"],
      },
    ]);

    $('input[name="NAS-IPv6-Address"]').closest(".form-group--dunset").remove();
  }

  $("#server-load-dd").data("load-from", {
    link: globals.rest.servers.dropdown + "v4/",
    nolocation: true,
  });
}

function addGuestFlow() {
  if ($("#guest-flow").length) {
    return;
  }

  $.ajax({
    type: "GET",
    url: `${globals.rest.generate}get-attribute-data/guest/`,
    cache: false,
    processData: false,
    async: true,
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      if (data.error) {
        return;
      }
      append = $('<div class="just-wrap"></div>');
      addFields(append, data.parameters, undefined);
      let ch = append.children();
      if (ch.length === 1 && !ch.hasClass("just-wrap")) {
        append = ch.addClass("just-wrap");
      }
      let p = panelWithTitle("Guest Flow", data.subtitle || "");
      p.find(".panel-body")
        .append(append)
        .find(":input")
        .addClass("not-submit");
      addTab(
        "Guest Flow",
        $(
          `<div class="section section--compressed guest-flow collectable"></div>`
        )
          .data("attribute", "guest-flow")
          .append(p),
        "guest-flow",
        "guest-flow",
        10
      );

      p.find(".has-dependants").each(function () {
        changeDependands.call(this, undefined);
      });

      p.find(".update-on-change").each(function () {
        $(this).find(":input").last().trigger("change");
      });

      p.find("[data-tab] > a.selected").click();

      if (data.radius) {
        rebuildRADIUS(data.radius);
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    });
}

function applyCountSwitch(p, name = "pap-count-as-creds") {
  var countSwitch = p.find(`[name="${name}"]`);
  if (!countSwitch.length) return;
  countSwitch.prop(
    "checked",
    page_attributes.hasOwnProperty(name) ? page_attributes[name] : true
  );
  var counter = $("#count");
  var ta = p.find("textarea");

  countSwitch
    .on("change", function () {
      let c = $(this).is(":checked");
      counter.prop("disabled", c);
      ta.trigger("counter_changed");
      if (c) {
        counter.attr({ disabled: "disabled", type: "text" }).val("auto");
      } else {
        counter.removeAttr("disabled").val("0").attr("type", "number");
      }
    })
    .trigger("change");
}

function attrCollector(i) {
  var input = $(this).find("input[type!=hidden]");
  if (!input.length) {
    return;
  }
  if ($(this).hasClass("form-group")) {
    var val = input.val();
    if (input.prop("readOnly") && input[0].hasAttribute("data-true-val")) {
      val = JSON.parse(input.attr("data-true-val"));
    } else if (
      input.prop("readOnly") &&
      input[0].hasAttribute("data-collect")
    ) {
      var t = input.data("collect");
      var collected = collectVariants.call(
        $(`.section.collectable[data-attribute="${t}"]`)[0]
      );
      val = collected || val;
    } else if (input.prop("readOnly") && input.data("include")) {
      val = input.val();
    } else if (input.prop("readOnly")) {
      return;
    }
    let new_attr = {
      name: input.attr("name"),
      value: val,
      vendor: input.data("vendor"),
    };
    if (input.data("dictionary")) {
      new_attr.dictionary = input.data("dictionary");
    }
    // var name = input.attr('name');
    var vendor = input.data("vendor");
    attr_obj.attributes.push(new_attr);
  } else {
    var vsa = [];
    var vendor = $(this).data("vendor");

    input.each(function (j) {
      if ($(this).prop("readOnly")) {
        return;
      }
      var name = $(this).attr("name");
      var val = $(this).val();
      vsa.push({
        name: name,
        value: val,
      });
    });

    attr_obj.attributes.push({
      name: "Vendor-Specific",
      value: vsa,
      vendor: vendor,
    });
  }
}

async function getParamsFromForm(e) {
  e.preventDefault();
  var $this = $(this);

  if (!(await formChecks.call(this))) return false;

  if ($("#save-options").is(":visible") && $("#bulk-name").val()) {
    if (!$("#save-bulk").length) {
      $("#bulk-name").after(
        '<input type="hidden" name="save-bulk" id="save-bulk" value="1">'
      );
    }
  } else if ($("#save-bulk").length) {
    $("#save-bulk").remove();
  }

  var radius = {};

  var request_attributes_dom = $("#access-request-attributes").find(
    " > div.vsa-row, > div.form-group"
  );
  var request_attributes = {
    attributes: [],
  };
  attr_obj = request_attributes;
  request_attributes_dom.each(attrCollector);
  radius.request = request_attributes.attributes;

  if ($("#send-acct-start-switch").is(":checked")) {
    var acct_start_attributes_dom = $("#accounting-start-attributes").find(
      " > div.vsa-row, > div.form-group"
    );
    var acct_start_attributes = {
      attributes: [],
    };
    attr_obj = acct_start_attributes;
    acct_start_attributes_dom.each(attrCollector);
    radius.acct_start = acct_start_attributes.attributes;
  } else {
    radius.acct_start = { nosend: 1 };
  }

  radius.dicts = [];
  $(".dictionaries-container .label.dictionary").each(function () {
    radius.dicts.push($(this).data("dictionary"));
  });

  var parameters = $this
    .find(":input:not(.radius-attribute,.not-submit)")
    .filter((_, el) => !el.closest(".collector-no-submit"))
    .serializeObject();
  parameters.radius = radius;

  var collectables = {};
  $this.find(".collectable").each(function () {
    let aname = $(this).data("attribute");
    collectables[aname] = Object.assign(
      collectables[aname] || {},
      collectVariants.call(this)
    );
  });

  if (
    collectables.vars.MAC.variant === "list" &&
    !collectables.vars.MAC["mac-list"].trim().length
  ) {
    $("#input-mac-list").focus();
    toast_error({}, undefined, `Please specify at least 1 MAC address`);
    return false;
  }

  if (
    collectables["guest-flow"] &&
    collectables["guest-flow"].GUEST_FLOW &&
    collectables["guest-flow"].GUEST_FLOW.variant === "none"
  ) {
    ["user-agents", "how-to-follow", "disallow-repeats"].forEach(
      (v) => delete collectables["guest-flow"][v]
    );
  }

  if (!formValidateDictionaries(collectables)) return false;

  parameters.collectables = collectables;

  const protoCheck = {
    pap: checkPapInputs,
    "eap-tls": checkEapTlsInputs,
    peap: checkPeapInputs,
  };

  if (
    typeof protoCheck[$('input[name="protocol"]').val()] === "function" &&
    !protoCheck[$('input[name="protocol"]').val()](collectables)
  )
    return false;

  if (!parameters.hasOwnProperty("count"))
    parameters.count = $("input#count").val();

  if (parameters.count === "auto") parameters.count = 1;

  if (!parameters.count) {
    toast_error({}, undefined, "Count cannot be 0");
    return false;
  }

  if (collectorCallbacks.length)
    collectorCallbacks.forEach(({ name, cb }) => {
      parameters.collectables[name] = cb(parameters);
    });

  return parameters;
}
