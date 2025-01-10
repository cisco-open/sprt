var saver;

$(function () {
  globals.current_base = globals.rest.preferences.base;
  window.addEventListener("beforeunload", checkBeforeLeave);
  saver = new DataSaver({
    statusElement: $(".status"),
    rest: globals.rest.preferences.save,
  });
  chkbxEvents();
  loadVaribles();
  addCOAOptions();
  saveEvents();
  check_url();
});

function check_url(tab = "[^/]+") {
  let re = new RegExp(`\/preferences\/tab\/${tab}\/`, "i");
  if (!re.test(window.location.pathname)) {
    return;
  }
  $(`a[href="${decodeURIComponent(window.location.pathname)}"]`).click();
}

function checkBeforeLeave(event) {
  if (saver.isWaiting()) {
    event.preventDefault();
    event.returnValue = "o/";
    return "Changes weren't saved yet. Would you like to leave?";
  }
}

function chkbxEvents() {
  $("#save-sessions, #send-acct-start-switch").change(function () {
    let gr = $(this).closest("label").next(".form-group, .flex");
    if ($(this).is(":checked")) {
      gr.hide().removeClass("hide").fadeIn("fast");
    } else {
      gr.fadeOut("fast", () => {
        gr.addClass("hide");
      });
    }
  });

  $("#framed-mtu-switch").change(function () {
    $("#framed-mtu").prop("disabled", !$(this).is(":checked"));
  });

  $('input[name="NAS-Port-Type"]').change(function () {
    let t = $('input[name="NAS-Port-Type"]:checked').val();
    let el = $("#NAS-Port-Type-flex");
    if (t === "Other") {
      el.fadeIn("fast");
    } else {
      el.fadeOut("fast");
    }
  });
}

function saveEvents() {
  let inpts = $(".container :input, .container-fluid :input");
  inpts.not('[type="number"], [type="text"]').change(inputChanged);
  inpts.filter('[type="number"], [type="text"]').on("input", inputChanged);
}

function inputChanged() {
  let $t = $(this);
  let name = this.id === "NAS-Port-Type-selector" ? "NAS-Port-Type" : this.name;
  let val =
    this.id === "NAS-Port-Type-selector"
      ? $(`#NAS-Port-Type-selector option:selected`).val()
      : $t.val();
  if ($t.is(":checkbox")) {
    val = $t.is(":checked") ? 1 : 0;
  }
  if (this.name === "NAS-Port-Type" && val === "Other") {
    val = $(`#NAS-Port-Type-selector option:selected`).val();
  }

  saver.saveValue(name, val, $t.closest(".section").data("section"));
}

function varInputChanged() {
  let stopper = $(this).closest("[data-stopper]");
  let v = collectVariants.call(stopper[0]);
  if (stopper.data("attribute")) {
    saver.saveValue(stopper.data("attribute"), v, "vars");
  } else {
    saver.saveValue(Object.keys(v)[0], v[Object.keys(v)[0]], "vars");
  }
}

function setVarChage() {
  let $t = $(this);
  $t.find("[data-tabs-for]").each(function () {
    this.addEventListener("on.tab.change", varInputChanged);
  });

  let inpts = $t.find(":input");
  inpts.not('[type="number"], [type="text"]').change(varInputChanged);
  inpts.filter('[type="number"], [type="text"]').on("input", varInputChanged);
}

function loadVaribles() {
  $("#variable-mac").attr("data-stopper", 1);
  loadEditAttribute(
    "mac",
    $("#variable-mac .panel-body"),
    "not-submit",
    setVarChage
  );
  $("#variable-ip").attr("data-stopper", 1);
  loadEditAttribute(
    "ip",
    $("#variable-ip .panel-body"),
    "not-submit",
    setVarChage
  );
}

function addCOAOptions() {
  if ($("#coa-options").length) {
    return;
  }

  let tabs = $(".tabs--vertical");
  let btn = $(`<a href="/preferences/tab/coa-options/" data-target="coa-options">
        <div class="text-left flex-fluid">CoA Options</div>
        <span class="icon-animation spin half-margin-right" aria-hidden="true"></span>
    </a>`);
  tabs.append($(`<li class="tab"></li>`).append(btn));
  $(".tab-content:first")
    .append(`<div class="tab-pane animated fadeIn" id="coa-options">
        <div class="tab-header">
            <h2 class="display-3 no-margin text-capitalize flex-fluid">CoA Options</h1>
        </div>
    </div>`);
  btn.click(switchGeneralTab);

  let section = $("#coa-options");
  $.ajax({
    url: `${globals.rest.generate}get-attribute-data/coa/`,
    type: "GET",
    cache: false,
    processData: false,
    async: true,
    contentType: "application/json",
    headers: { Accept: "application/json" },
  })
    .done(function (data) {
      append = $(`<div 
            class="panel no-padding base-margin-top dbl-margin-bottom tab-body" 
            data-stopper="1" 
            data-attribute="COA">
                <div class="panel-body just-wrap"></div>
        </div>`);
      addFields(
        append.children(".panel-body"),
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
      section.children(":not(.tab-header)").remove();
      section.append(append);
      setVarChage.call(append[0]);
      check_url("coa-options");
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      section.remove();
      toast_error(jqXHR, textStatus, errorThrown);
    })
    .always(() => {
      btn.find(".icon-animation").remove();
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
