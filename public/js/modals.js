$(function () {
  let modal_methods = {
    show: show_modal,
    hide: hide_modal,
    toggle: toggle_modal,
  };

  $.fn.modal = function (m) {
    if (modal_methods[m]) {
      return modal_methods[m].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    }
  };

  $("body").on("click", '[data-dismiss="modal"]', function () {
    $(this).closest(".modal").modal("hide");
  });
});

function show_modal() {
  let $m = $(this);
  if ($m.hasClass("shown")) {
    return;
  }

  $m.trigger("show.bs.modal");
  $m.addClass("animated faster");
  if (!$("body > .modal-backdrop").length) {
    $("body").append('<div class="modal-backdrop animated faster"></div>');
  }
  $m.show();
  setTimeout(function () {
    $m.removeClass("animated faster").addClass("shown");
    $("body > .modal-backdrop").removeClass("animated faster");
    $m.trigger("shown.bs.modal");
  }, 500);
}

function hide_modal() {
  let $m = $(this);
  if (!$m.hasClass("shown")) {
    return;
  }

  $b = $("body > .modal-backdrop");
  $m.trigger("hide.bs.modal");
  if ($b.length) {
    $b.addClass("animated fadeOut65 faster");
  }
  $m.addClass("animated fadeOut faster");
  setTimeout(function () {
    $m.hide();
    $m.removeClass("animated fadeOut faster shown");
    $b.remove();
    $m.trigger("hidden.bs.modal");
  }, 500);
}

function toggle_modal() {
  let $m = $(this);
  if ($m.hasClass("shown")) {
    $m.modal("hide");
  } else {
    $m.modal("show");
  }
}

var new_modal = function (size, btns, remove_on_hide = true, handlers = {}) {
  var id = guid();
  switch (size) {
    case "md":
    case "medium":
      size = "medium";
      break;
    case "sm":
    case "small":
      size = "small";
      break;
    case "xlg":
    case "xlarge":
      size = "xlarge";
      break;
    default:
      size = "large";
      break;
  }

  var modal = $(`<div id="${id}" class="modal modal--${size}" tabindex="-1" role="dialog" aria-labelledby="${id}-label" style="display: none;">
	  <div class="modal__dialog" role="document">
		<div class="modal__content">
		  <a class="modal__close close" data-dismiss="modal" aria-label="Close"><span class="icon-close"></span></a>
	      <div class="modal__header">
	        <h2 class="modal__title" id="${id}-label"></h4>
	      </div>
	      <div class="modal__body text-left">
	      </div>
	      <div class="modal__footer">
	      </div>
	    </div>
	  </div>
	</div>`);

  modal.get_body = get_modal_body;
  modal.get_header = get_modal_header;
  modal.get_footer = get_modal_footer;
  modal.get_header_h = get_modal_header_h;
  modal.change_size = modal_change_size;
  modal.add_button = add_button;

  btns.forEach((btn, idx) => modal.add_button(btn, idx, handlers));

  if (handlers.hasOwnProperty("show")) {
    modal.on("show.bs.modal", function (e) {
      handlers.show.func.call(modal, handlers.show.args);
    });
  }

  if (handlers.hasOwnProperty("shown")) {
    modal.on("shown.bs.modal", function (e) {
      handlers.shown.func.call(modal, handlers.shown.args);
    });
  }

  if (handlers.hasOwnProperty("hide")) {
    modal.on("hide.bs.modal", function (e) {
      handlers.hide.func.call(modal, handlers.hide.args);
    });
  }

  modal.on("hidden.bs.modal", function (e) {
    if (
      handlers.hasOwnProperty("hidden") &&
      !$(this).data("not_real_closure")
    ) {
      handlers.hidden.func.call(modal, handlers.hidden.args);
    }
    if (remove_on_hide && !$(this).data("keep_created")) {
      $(this).remove();
    }
  });

  $("body").append(modal);
  return modal;
};

function add_button(btn, id = 0, handlers = {}) {
  const footer = this.get_footer();

  if (typeof btn === "string") {
    if (standart_buttons[btn]) {
      btn = standart_buttons[btn];
      if (handlers.hasOwnProperty(btn.name)) {
        btn.onclick = handlers[btn.name];
      }
    } else {
      return;
    }
  }

  if (btn.type === "default") {
    btn.type = "light";
  }
  if (btn.type === "grey") {
    btn.type = "default";
  }
  const element = $(`<button 
		id="${id}-${btn.name}" 
		type="button" 
		class="btn btn--${btn.type || "default"}" 
		${btn.no_dismiss ? "" : 'data-dismiss="modal"'}>${btn.display}</button>`);
  if (btn.hasOwnProperty("onclick")) {
    element.click(btn.onclick);
  }

  footer.append(element);
  return element;
}

function modal_change_size(new_size) {
  let modal = $(this);
  switch (new_size) {
    case "md":
    case "medium":
      new_size = "medium";
      break;
    case "sm":
    case "small":
      new_size = "small";
      break;
    default:
      new_size = "large";
      break;
  }

  let to_remove =
    (new_size === "large" ? "" : " modal--large") +
    (new_size === "medium" ? "" : " modal--medium") +
    (new_size === "small" ? "" : " modal--small");

  modal.switchClass(to_remove, `modal--${new_size}`, 300);
}

function get_modal_body() {
  let m = $(this);
  return m.find(".modal__body");
}

function get_modal_header() {
  let m = $(this);
  return m.find(".modal__header");
}

function get_modal_footer() {
  let m = $(this);
  return m.find(".modal__footer");
}

function get_modal_header_h() {
  let m = $(this);
  return m.find(".modal__header h2");
}

var new_confirmation_modal = function (
  onconfirm,
  text,
  confirm_btn,
  type = "danger",
  size = "md",
  toggle = true
) {
  var btns = [
    {
      name: "close",
      type: "light",
      display: "Close",
    },
    {
      name: "confirm",
      type: type,
      display: confirm_btn,
      onclick: onconfirm,
    },
  ];
  var modal = new_modal(size, btns);
  var body = modal.find(".modal__body");
  var header = modal.find(".modal__header");
  header.find("h2").html("Confirmation");
  body.append(`<p>${text}</p>`);

  if (toggle) {
    modal.modal("toggle");
  }
  return modal;
};
