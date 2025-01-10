Object.byString = function (o, s) {
  s = s.replace(/\[(\w+)\]/g, ".$1"); // convert indexes to properties
  s = s.replace(/^\./, ""); // strip a leading dot
  var a = s.split(".");
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
};

String.ucFirstLetter = function (s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

String.prototype.lines = function () {
  let text = this.replace(/\r+/g, "");
  return text.split(/\n/);
};
String.prototype.lineCount = function () {
  return this.lines().filter((l) => l.length > 0).length;
};

String.prototype.hexEncode = function () {
  var hex, i;

  var result = [];
  for (i = 0; i < this.length; i++) {
    hex = this.charCodeAt(i).toString(16);
    result.push(("0" + hex).slice(-2));
  }

  return result;
};

String.prototype.hexDump = function (blockSize, newLine) {
  // Taken from https://gist.github.com/igorgatis/d294fe714a4f523ac3a3
  blockSize = blockSize || 16;
  newLine = newLine || "\n";
  var lines = [];
  var hex = "0123456789ABCDEF";
  for (var b = 0; b < this.length; b += blockSize) {
    var block = this.slice(b, Math.min(b + blockSize, this.length));
    var addr = ("0000" + b.toString(16)).slice(-4);
    var codes = block
      .split("")
      .map(function (ch) {
        var code = ch.charCodeAt(0);
        return " " + hex[(0xf0 & code) >> 4] + hex[0x0f & code];
      })
      .join("");
    codes += "   ".repeat(blockSize - block.length);
    var chars = block.replace(/[\x00-\x1F\x20]/g, ".");
    chars += " ".repeat(blockSize - block.length);
    lines.push(addr + " " + codes + "  " + chars);
  }
  return lines.join(newLine);
};

const standart_buttons = {
  close: {
    name: "close",
    type: "light",
    display: "Close",
  },
  back: {
    name: "back",
    type: "light",
    display: "Back",
  },
  save: {
    name: "save",
    type: "success",
    display: "Save",
  },
  remove: {
    name: "remove",
    type: "danger",
    display: "Delete",
  },
};

$(function () {
  $.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
      if (o[this.name]) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || "");
      } else {
        o[this.name] = this.value || "";
      }
    });
    return o;
  };

  // https://stackoverflow.com/questions/2360655/jquery-event-handlers-always-execute-in-order-they-were-bound-any-way-around-t
  $.fn.bindFirst = function (name, data, fn) {
    // bind as you normally would
    // don't want to miss out on any jQuery magic
    this.on(name, data, fn);

    // Thanks to a comment by @Martin, adding support for
    // namespaced events too.
    this.each(function () {
      var handlers = $._data(this, "events")[name.split(".")[0]];
      // take out the handler we just inserted from the end
      var handler = handlers.pop();
      // move it at the beginning
      handlers.splice(0, 0, handler);
    });
  };

  $(".header-bar.container .toggle-menu").click(function () {
    $("#main_sidebar").toggleClass("sidebar--hidden");
  });

  $("#main_sidebar .sidebar__drawer > a").click(function (e) {
    e.stopPropagation();
    $(".sidebar__drawer--opened").removeClass("sidebar__drawer--opened");
    $(this).parent().toggleClass("sidebar__drawer--opened");
  });

  $(
    "body:not(.ReactModal__Body--open) .dropdown > .btn, body:not(.ReactModal__Body--open) .dropdown > a," +
      ":not(#react-app, .react-app) .dropdown > .btn, :not(#react-app, .react-app) .dropdown > a"
  ).click(dropDownClick);

  $("body:not(.ReactModal__Body--open)").on(
    "click",
    ".drawer > a, .drawer > .drawer__header a",
    toggleDrawer
  );

  $(document).click(function (e) {
    $(".sidebar .sidebar__drawer").removeClass("sidebar__drawer--opened");
    if (e) {
      let el = $(e.target);

      if (
        el.closest(".btn--dropdown").length ||
        el.is(".btn--dropdown") ||
        el.closest(".dropdown--checkboxes").length
      ) {
        return true;
      }
    }
    $(".dropdown.active").each(function () {
      if (
        $(this).parents(".ReactModal__Body--open, #react-app, .react-app")
          .length
      )
        return;
      else $(this).removeClass("active");
    });
  });

  $('a[data-sidebar-item="manipulate"]').click(loadServersSessions);

  $("body").on(
    "click",
    ".tabs.switchable .tab a:not(.no-tab)",
    switchGeneralTab
  );

  $("body").on("click", ".tabs.enabled .tab a", enabledTabSwitch);

  $("body").on("click", "a#login-as-admin", loginForm);
});

function dataLoader(hidden = true, title = true) {
  return `<div ${hidden ? `style="display:none;"` : ""}>
		${
      title
        ? `<h4 class="text-center text-capitalize">Fetching data from server</h4>`
        : ""
    }
		<div class="loading-dots loading-dots--info">
			<span></span>
			<span></span>
			<span></span>
		</div>
	</div>`;
}

function alert(severity, message) {
  let icon;
  switch (severity) {
    case "warning":
    case "warn":
      severity = "warning";
      icon = "icon-warning-outline";
      break;
    case "success":
    case "ok":
      severity = "success";
      icon = "icon-check-outline";
      break;
    case "danger":
    case "error":
      severity = "danger";
      icon = "icon-check-outline";
      break;
    default:
      severity = "info";
      icon = "icon-error-outline";
  }
  return $(`<div class="alert alert--${severity}"><div class="alert__icon ${icon}"></div>
		<div class="alert__message">${message}</div></div>`);
}

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

jQuery.expr[":"].parents = function (a, i, m) {
  return jQuery(a).parents(m[3]).length < 1;
};

function intersection() {
  return Array.from(arguments).reduce(function (previous, current) {
    return previous.filter(function (element) {
      return current.indexOf(element) > -1;
    });
  });
}

function dropDownClick(e) {
  // e.stopPropagation();
  let $t = $(this);
  let parent = $t.parent();
  if (parent.hasClass("active")) {
    parent.removeClass("active");
  } else {
    $(".dropdown.active").removeClass("active");
    parent.addClass("active");
  }
  return true;
}

function toggleDrawer(e) {
  let $t = $(this);
  let drwr = $t.closest(".drawer");
  if (drwr.data("group")) {
    $(`.drawer.drawer--opened[data-group="${drwr.data("group")}"]`)
      .not(drwr)
      .removeClass("drawer--opened");
  }
  drwr.toggleClass("drawer--opened");
}

function numberPre(pre) {
  pre.innerHTML =
    '<span class="line-number text-muted text-monospace"></span>' +
    pre.innerHTML +
    '<span class="cl"></span>';
  var num = pre.innerHTML.split(/\n/).length;
  for (var j = 0; j < num; j++) {
    var line_num = pre.getElementsByTagName("span")[0];
    line_num.innerHTML += "<span>" + (j + 1) + "</span>";
  }
}

function textareaCounter(t) {
  if (!t.data("counter")) {
    return;
  }
  t.on("input", changeCounter);
}

function changeCounter(e) {
  $($(this).data("counter")).html(this.value.lineCount());
  $(this).trigger("counter_changed");
}

function clone(obj) {
  if (null == obj || "object" != typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}

function loadServersSessions(e) {
  let el = $(this);
  let ul = el.next("ul");
  ul.empty().append(`<li class="sidebar__item">
		<a class="flex" style="flex-direction: row;">
			<div class="flex-fluid">Loading...</div><span class="icon-animation spin" aria-hidden="true"></span>
		</a>
	</li>`);

  $.ajax({
    url: "/manipulate/servers/?no_bulks=1",
    method: "GET",
    async: true,
    cache: false,
    data: "",
    dataType: "json",
    contentType: "application/json",
    headers: {
      Accept: "application/json",
    },
  })
    .done((data) => {
      makeSessionsSidebar(ul, data);
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      toast_error(jqXHR, textStatus, errorThrown);
    })
    .always(() => {});
}

function makeSessionsSidebar(ul, data) {
  if (
    !data.hasOwnProperty("servers") ||
    (Array.isArray(data.servers) && !data.servers.length)
  ) {
    ul.children(":not(.sidebar__name)").remove();
    ul.append(`<li class="sidebar__item">
			<a href="javascript:;">No sessions found</a>
		</li>`);
    return;
  }

  ul.children(":not(.sidebar__name)").remove();
  if (!Array.isArray(data.servers)) {
    Object.keys(data.servers)
      .sort()
      .forEach((k) => {
        let new_ul = $("<ul></ul>");
        makeSessionsSidebar(new_ul, {
          servers: data.servers[k],
          link: `/manipulate/server/${k}/`,
        });
        ul.append(
          $(`<li class="sidebar__drawer">
          <a data-sidebar-item="sessions-${k}">
            <span class="sidebar__item-title">${k.toUpperCase()}</span>
          </a>
        </li>`).append(new_ul)
        );
      });
    return;
  }

  let sort_servers = (a, b) => {
    if (!a.friendly_name || a.friendly_name < b.friendly_name) {
      return -1;
    }
    if (!b.friendly_name || a.friendly_name > b.friendly_name) {
      return 1;
    }
    // a must be equal to b
    return 0;
  };

  data.servers.sort(sort_servers).forEach((s) => {
    let link = s.link || data.link || "/manipulate/server/";
    ul.append(`<li class="sidebar__item">
			<a class="flex" style="flex-direction: row;" href="${link}${s.server}/">
				<div class="flex-fluid">${
          s.friendly_name ? s.friendly_name + " (" + s.server + ")" : s.server
        }</div>
				<span class="label label--tiny label--info" title="Amount of sessions">${
          s.sessionscount
        }</span>
			</a>
		</li>`);
  });
}

const new_tab_container = (heading, subheading, btns, handlers = {}) => {
  let c = $(`<div class="tab-pane active animated fadeIn">
		<div class="tab-header">
			<h2 class="display-3 no-margin text-capitalize flex-fluid">${heading}</h2>
			${
        subheading
          ? `<h5 class="base-margin-bottom subheading">${subheading}</h5>`
          : ""
      }
		</div>
		<div class="panel no-padding base-margin-top dbl-margin-bottom tab-body">
		</div>
	</div>`);

  var id = guid();

  if (Array.isArray(btns) && btns.length) {
    let footer = $('<div class="panel no-padding dbl-margin-bottom"></div>');
    for (var i = 0; i < btns.length; i++) {
      if (typeof btns[i] === "string") {
        if (standart_buttons[btns[i]]) {
          btns[i] = standart_buttons[btns[i]];
        } else {
          continue;
        }
      }

      if (handlers.hasOwnProperty(btns[i].name)) {
        btns[i].onclick = handlers[btns[i].name];
      }
      if (btns[i].type === "default") {
        btns[i].type = "white";
      }
      if (btns[i].type === "grey") {
        btns[i].type = "default";
      }
      var btn = $(`<button 
				id="${id}-${btns[i].name}" 
				type="button" 
				class="btn btn--${btns[i].type || "default"}" 
				data-dismiss="modal">${btns[i].display}</button>`);
      if (btns[i].hasOwnProperty("onclick")) {
        btn.click(btns[i].onclick);
      }
      footer.append(btn);
    }
    c.append(footer);
  }

  c.body = c.find(".tab-body");
  c.header = c.find(".tab-header");
  c.id = id;

  return c;
};

function switchGeneralTab(e) {
  e.preventDefault();
  let $t = $(this);
  let li = $t.closest("li.tab");
  if (li.hasClass("active")) {
    return;
  }
  let parent = $t.closest(".tabs");
  parent.find(".active").removeClass("active");
  li.addClass("active");

  let $tab = $("#" + $t.data("target"));
  $tab
    .closest(".tab-content")
    .children(".tab-pane.active")
    .removeClass("active");
  $tab.addClass("active");
  window.history.pushState(
    "",
    "",
    `${globals.current_base}tab/${$t.data("target")}/`
  );
  globals.current_tab = $t.data("target");
}

function topFunction() {
  $("main > .content").scrollTop(0);
}

function enabledTabSwitch(e) {
  e.preventDefault();

  let $t = $(this);
  let li = $t.closest("li.tab");
  if (li.hasClass("active")) {
    return;
  }

  let parent = $t.closest(".tabs");
  parent.find(".active").removeClass("active");
  li.addClass("active");

  let $tab = $("#" + $t.data("target"));
  $tab
    .closest(".tab-content")
    .children(".tab-pane.active")
    .removeClass("active");
  $tab.addClass("active");
}

function insertAtCursor(myField, myValue) {
  //IE support
  if (document.selection) {
    myField.focus();
    sel = document.selection.createRange();
    sel.text = myValue;
  }
  //MOZILLA and others
  else if (myField.selectionStart || myField.selectionStart == "0") {
    var startPos = myField.selectionStart;
    var endPos = myField.selectionEnd;
    myField.value =
      myField.value.substring(0, startPos) +
      myValue +
      myField.value.substring(endPos, myField.value.length);
    myField.selectionStart = startPos + myValue.length;
    myField.selectionEnd = startPos + myValue.length;
  } else {
    myField.value += myValue;
  }
}

function tryLogin(e) {
  e.preventDefault();
  e.stopPropagation();
  var modal = $(this).closest(".modal");
  var btn = modal.find("button[id$='login']");
  var form = modal.find("form");
  if (!btn.attr("disabled")) {
    btn
      .attr("disabled", "disabled")
      .prepend(
        '<span class="icon-animation gly-spin" aria-hidden="true"></span> '
      );
  }

  var pass = form.find("input#admin-password").val();

  $.ajax({
    url: "/auth/login/",
    method: "POST",
    data: JSON.stringify({ password: pass }),
    cache: false,
    dataType: "json",
    contentType: "application/json",
    headers: {
      Accept: "application/json",
    },
    async: true,
  })
    .done(function (data) {
      if (data.status === "ok") {
        toast("success", "", "All good, refreshing.");
        setTimeout(() => window.location.reload(), 600);
        modal.modal("hide");
      } else {
        toast("error", "Error", data.error || "Couldn't login");
      }
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      toast_error(jqXHR, textStatus, errorThrown);
    })
    .always(function () {
      btn.removeAttr("disabled").find(".icon-animation").remove();
    });
}

function loginForm(e) {
  e.preventDefault();
  var btns = [
    "close",
    {
      name: "login",
      type: "primary",
      display: "Login",
      onclick: tryLogin,
    },
  ];
  var modal = new_modal("sm", btns);
  // var id = modal[0].id;
  // var header = modal.get_header();
  var body = modal.get_body();
  // var footer = modal.get_footer();
  modal.get_header_h().html("Admin Password");
  body.append(`<div>
    <form>
      <div class="form-group">
        <div class="form-group__text">
          <input id="admin-password" type="password">
          <label for="admin-password">Admin password</label>
        </div>
      </div>
    </form>
  </div>`);

  body.find("form").on("submit", tryLogin);
  modal.modal("show");
}

function skipVersion(version) {
  $.ajax({
    url: `/preferences/versions/${version}`,
    method: "PUT",
    cache: false,
    dataType: "json",
    contentType: "application/json",
    data: JSON.stringify({ skip: 1 }),
    headers: {
      Accept: "application/json",
    },
    async: true,
  }).done(() => {
    toast("info", "", "Response saved");
  });
}

function notifyOfNewVersion(newVersion, ownVersion) {
  toast(
    "info",
    "New version",
    `<div class="qtr-margin-top">Version <span class="text-bold">${newVersion}</span> is now available!</div>` +
      `<div>Your version: <span class="text-bold">${ownVersion}</span></div>` +
      '<div class="qtr-margin-top">' +
      '<a href="https://github.com/cisco-open/sprt/wiki" target="_blank" class="text-muted">Upgrade</a>' +
      '<span class="half-margin-right half-margin-left">|</span>' +
      '<a href="https://github.com/cisco-open/sprt/blob/main/CHANGELOG.md" target="_blank" class="text-muted">Change log</a>' +
      '<span class="half-margin-right half-margin-left">|</span>' +
      `<a onclick="skipVersion('${newVersion}')" class="text-muted">Skip this version</a>` +
      "</div>"
  );
}

function checkVersion() {
  return;
}
