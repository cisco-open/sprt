(function ($) {
  var default_csr = {
    subject: {
      cn: "test",
      ou: ["RADGen"],
    },
    san: {
      dNSName: ["test"],
      iPAddress: ["1.1.1.1"],
    },
    key_type: "rsa",
    key_length: 2048,
    digest: "sha256",
    ext_key_usage: {
      clientAuth: true,
      serverAuth: false,
    },
    key_usage: {},
  };

  var dn = {};
  DN_IN = function (full, short, display) {
    var t = {
      short: short,
      full: full,
      display: display,
    };
    dn[short] = t;
    dn[full] = t;
  };

  DN_IN("commonName", "CN", "Common Name");
  DN_IN("countryName", "C", "Country");
  DN_IN("localityName", "L", "Locality");
  DN_IN("stateOrProvinceName", "ST", "State or Province");
  DN_IN("organizationName", "O", "Organization");
  DN_IN("organizationalUnitName", "OU", "Organizational Unit");
  DN_IN("emailAddress", "E", "Email Address");

  const subj_order = ["cn", "ou", "o", "l", "st", "c", "e"];

  var SAN_types = {
    // 0: otherName,
    // otherName: 'Other Name',
    // 1: 'rfc822Name',
    rfc822Name: "RFC822 Name (can be MAC)",
    // 2: 'dNSName',
    dNSName: "DNS Name",
    // 3: 'x400Address',
    // 'x400Address': 'X.400 Address',
    // 4: 'directoryName',
    directoryName: "Directory Name",
    // 5: ediPartyName,
    // ediPartyName: 'ediPartyName',
    // 6: 'uniformResourceIdentifier',
    uniformResourceIdentifier: "Uniform Resource Identifier",
    // 7: 'iPAddress',
    iPAddress: "IP Address",
    // 8: registeredID,
    // registeredID: 'registeredID',
  };

  var san_hints = {
    directoryName: `Directory Name - A string representation of distinguished name(s) (DNs) defined per RFC 2253.
Use a comma (,) to separate the DNs. For &quot;dnQualifier&quot; RDN, escape the comma and use backslash-comma &quot;&#92;,&quot; as separator.
For example, CN=AAA,dnQualifier=O=Example&#92;,DC=COM,C=IL`,
  };

  var key_types = {
    rsa: "RSA",
    dsa: "DSA",
    ecc: "ECC",
  };

  var digests = {
    sha1: "SHA-1",
    sha256: "SHA-256",
    sha384: "SHA-384",
    sha512: "SHA-512",
    // sha512_224: 'SHA-512/224',
    // sha512_256: 'SHA-512/256'
  };

  var ext_key_usages = {
    clientAuth: "Client Authentication",
    serverAuth: "Server Authentication",
    codeSigning: "Code Signing",
    emailProtection: "Email Protection",
    timeStamping: "Time Stamping",
  };

  var key_usages = {
    digitalSignature: "Digital Signature",
    nonRepudiation: "Non Repudiation",
    keyEncipherment: "Key Encipherment",
    dataEncipherment: "Data Encipherment",
    keyAgreement: "Key Agreement",
    keyCertSign: "Key CertSign",
    cRLSign: "CRL Sign",
    encipherOnly: "Encipher Only",
    decipherOnly: "Decipher Only",
  };

  var remove_field = function (e) {
    e.preventDefault();
    var $this = $(this);
    let flex = $this.closest(".flex");
    var input = flex.find("input")[0].id;
    var m = input.match(/([a-z\d]+-[a-z\d]+-)\d+/i);
    flex.fadeOut("fast", function (e) {
      var similars = [];
      if (m && m.length) {
        similars = flex
          .closest(".panel")
          .find(`[id^="${m[1]}"]`)
          .not(`#${input}`);
      }
      $(this).remove();
      if (similars.length) {
        for (var i = 0; i < similars.length; i++) {
          var new_v = m[1] + i;
          if (similars[i].id !== new_v) {
            similars
              .eq(i)
              .attr("id", new_v)
              .attr("name", new_v)
              .next("label")
              .attr("for", new_v);
          }
        }
      }
    });
  };

  var prepare_dropdown = function (
    btn_name,
    btn_text,
    values,
    onclick,
    ul = undefined
  ) {
    var btn;
    if (!ul) {
      ul = $('<div class="dropdown__menu" aria-labelledby="dLabel"></div>');
      btn = $(
        `<a href="javascript:;" class="btn--dropdown" id="btn-${btn_name}">${btn_text}</a>`
      );
    }
    Object.keys(values).forEach(function (el) {
      if (typeof values[el] === "object") {
        var a = $(
          `<a>${values[el].title || values[el].friendly_name || el}</a>`
        ).data("value", values[el].val || values[el].content);
        ul.append(a);
      } else if (typeof values[el] === "string") {
        switch (values[el]) {
          case "divider":
            ul.append(`<div class="dropdown__divider"></div>`);
            break;
          case "loader":
            ul.append(
              `<a><span class="icon-animation gly-spin" aria-hidden="true"></span>&nbsp;Loading...</a>`
            );
            break;
          case "loader-error":
            ul.append("<a>Got an error on loading data.</a>");
            break;
          case "empty":
            ul.append("<a>Nothing saved.</a>");
            break;
          default:
            ul.append(`<a data-value="${el}">${values[el]}</a>`);
        }
      }
    });
    ul.find("a").click(onclick);
    if (btn) {
      var result = $('<div class="dropdown"></div>').append(btn).append(ul);
      btn.click(dropDownClick);
      return result;
    }
  };

  async function load_preloaded(from, container, parser) {
    container.append(
      prepare_dropdown(
        "load-template",
        "Select template",
        ["loader"],
        load_preloaded_click
      ).addClass("flex-center-vertical")
    );
    var ul = container.find(".dropdown__menu");

    $.ajax({
      url: from,
      method: "GET",
      cache: false,
      contentType: false,
      processData: false,
      headers: {
        Accept: "application/json",
      },
      async: true,
    })
      .done(function (data) {
        var arr;
        if (parser) {
          arr = parser(data);
        } else {
          arr = data;
        }

        ul.empty();
        if (!Array.isArray(arr) || !arr.length) {
          arr = ["empty"];
        }
        prepare_dropdown("", "", arr, load_preloaded_click, ul);
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        toast_error(jqXHR, textStatus, errorThrown);
        ul.empty();
        prepare_dropdown("", "", ["loader-error"], load_preloaded_click, ul);
      });
  }

  var prepare_preloaded = function (preloaded) {
    var inner_container = $(
      `<div class="panel panel--condensed preloaded-wrap"></div>`
    );
    if (Array.isArray(preloaded)) {
      inner_container.append(
        prepare_dropdown(
          "load-template",
          "Select template",
          preloaded,
          load_preloaded_click
        )
      );
    } else if (typeof preloaded === "object") {
      if (preloaded.load_from) {
        load_preloaded(
          preloaded.load_from,
          inner_container,
          preloaded.parser || undefined
        );
      } else {
        throw new Error("Cannot load templates.");
      }
    } else {
      throw new Error("Cannot load templates.");
    }
    return $(
      '<div class="flex"><h5 class="half-margin-right flex-center-vertical">Load Saved Template</h5></div>'
    ).append(inner_container.children().addClass("half-margin-bottom"));
  };

  var load_preloaded_click = function (e) {
    var data = $(this).data("value");
    if (!data) {
      return;
    }

    var form = $(this).closest("form.csr-wrap");
    var container = form.data("columns") ? form.children(".row") : form;
    container.children(":not(.preloaded-loader)").remove();
    add_csr_fields(container, data);
    make_headers(container, data);
  };

  var add_subject_field = function (
    type,
    panel,
    hidden = true,
    idx = undefined,
    value = ""
  ) {
    var after = panel.find(`[id^="dn-${type}-"]`);
    var pr_idx = subj_order.indexOf(type.toLowerCase()) - 1;
    while (!after.length) {
      if (pr_idx < 0) {
        break;
      }
      after = panel.find(`[id^="dn-${subj_order[pr_idx].toUpperCase()}-"]`);
      pr_idx--;
    }

    var dn_element = dn[type];
    var el = $(`
		<div class="flex form-group--margin">
			<div class="form-group half-margin-right flex-fill">
				<div class="form-group__text">
					<input type="text" 
						id="dn-${dn_element.short}-${after.length}" 
						name="dn-${dn_element.short}-${after.length}" 
						value="${value}"
						data-element="${dn_element.short}"
						data-type="string">
					<label for="dn-${dn_element.short}-${after.length}">${dn_element.display} (${dn_element.short})</label>
				</div>
			</div>
			<div class="btn-group btn-group--square base-margin-top">
				<button type="button" class="btn btn--icon btn--link remove-subj remove-btn">
					<span class="icon-remove" title="Remove subject element"></span>
				</button>
			</div>
		</div>`);
    if (hidden) {
      el.hide();
    }
    if (after.length) {
      after.last().closest(".flex").after(el);
    } else {
      panel.find(".dropdown").before(el);
    }
    el.find(".remove-btn").click(remove_field);
    return el;
  };

  var add_subject_field_click = function (e) {
    e.preventDefault();
    var $this = $(this);
    var to_add = $this.data("value");
    var panel = $this.closest(".panel");
    var el = add_subject_field(to_add, panel);
    el.fadeIn("fast");
  };

  var prepare_subject = function (subject) {
    var inner_container = $(
      `<div class="panel panel--condensed subject-wrap"></div>`
    );
    inner_container.append(
      prepare_dropdown(
        "add-subj",
        "Add subject element",
        (function () {
          var tmp = {};
          Object.keys(dn).forEach(function (key) {
            if (key.length < 3) {
              tmp[key] = dn[key].display + " (" + dn[key].short + ")";
            }
          });
          return tmp;
        })(),
        add_subject_field_click
      )
    );
    subj_order.forEach(function (el) {
      var dn_element = dn[el] || dn[el.toUpperCase()];
      if (!dn_element) {
        return;
      }
      var val = [];
      if (subject.hasOwnProperty(dn_element.short)) {
        val = val.concat(subject[dn_element.short]);
      }
      if (subject.hasOwnProperty(dn_element.short.toLowerCase())) {
        val = val.concat(subject[dn_element.short.toLowerCase()]);
      }
      if (subject.hasOwnProperty(dn_element.full)) {
        val = val.concat(subject[dn_element.full]);
      }
      if (!val.length) {
        return;
      }
      for (var i = 0; i < val.length; i++) {
        add_subject_field(dn_element.short, inner_container, false, i, val[i]);
      }
    });
    // inner_container.find('.remove-btn').click(remove_field);
    return $("<h5>Subject</h5>").add(inner_container);
  };

  var add_san_field = function (
    san_type,
    panel,
    hidden = true,
    idx = undefined,
    value = ""
  ) {
    var after = panel.find(`[id^="san-${san_type}-"]`);
    idx = typeof idx !== "undefined" ? idx : after.length;
    var el = $(`<div class="flex form-group--margin">
			<div class="form-group half-margin-right flex-fill">
				<div class="form-group__text">
					<input type="text" 
						id="san-${san_type}-${idx}" 
						name="san-${san_type}-${idx}" 
						value="${value}"
						data-san-type="${san_type}"
						data-type="string">
					<label for="san-${san_type}-${idx}">${SAN_types[san_type]}</label>
				</div>
			</div>
			<div class="btn-group btn-group--square base-margin-top">
				<button type="button" class="btn btn--icon btn--link remove-san remove-btn">
					<span class="icon-remove" title="Remove SAN"></span>
				</button>
			</div>
		</div>`);
    if (san_hints[san_type]) {
      el.find("button").before(`<button 
			type="button" 
			class="link btn-info" 
			onclick="return false;" 
			data-balloon="${san_hints[san_type]}" 
			data-balloon-pos="up" 
			data-balloon-length="xlarge">
				<span class="icon-info-outline"></span>
			</button>`);
    }
    if (hidden) {
      el.hide();
    }
    if (after.length) {
      after.last().closest(".flex").after(el);
    } else {
      panel.find(".dropdown").before(el);
    }
    el.find(".remove-btn").click(remove_field);
    return el;
  };

  var add_san_field_click = function (e) {
    e.preventDefault();
    var $this = $(this);
    var to_add = $this.data("value");
    var panel = $this.closest(".panel");
    // var after = panel.find(`[id^="san-${to_add}-"]`);
    var el = add_san_field(to_add, panel);
    el.fadeIn("fast");
  };

  var prepare_sans = function (san) {
    var inner_container = $(
      `<div class="panel panel--condensed san-wrap"></div>`
    );
    inner_container.append(
      prepare_dropdown("add-san", "Add SAN", SAN_types, add_san_field_click)
    );
    if (san) {
      Object.keys(san).forEach(function (el) {
        if (!SAN_types[el]) {
          return;
        }
        var val = [].concat(san[el]);
        for (var i = 0; i < val.length; i++) {
          add_san_field(el, inner_container, false, i, val[i]);
        }
      });
    }
    inner_container.find(".remove-btn").click(remove_field);
    return $("<h5>Subject Alternative Names (SAN)</h5>").add(inner_container);
  };

  var prepare_rsa = function (key_length, digest) {
    var inner_container = $(
      `<div class="panel panel--condensed rsa-wrap"></div>`
    );
    inner_container.append(`<div class="form-group">
			<div class="form-group__text">
				<input id="key-length" name="key-length" type="number" value="${key_length}">
				<label for="key-length">RSA Key Length</label>
			</div>
		</div>`);
    return $("<h5>RSA Parameters</h5>").add(inner_container);
  };

  var prepare_ext_key_usage = function (ext_key_usage) {
    var result;
    var inner_container = $(
      `<div class="panel panel--condensed eku-wrap"></div>`
    );

    Object.keys(ext_key_usages).forEach(function (d) {
      inner_container.append(`<div class="form-group">
				<label class="checkbox">
					<input type="checkbox" name="eku-${d}"${ext_key_usage[d] ? " checked" : ""} data-eku="${d}">
					<span class="checkbox__input"></span>
					<span class="checkbox__label">${ext_key_usages[d]}</span>
				</label>
			</div>`);
    });

    result = $("<h5>Extended Key Usage</h5>").add(inner_container);

    return result;
  };

  var prepare_key_usage = function (key_usage) {
    var result;
    var inner_container = $(
      `<div class="panel panel--condensed keyuse-wrap"></div>`
    );

    Object.keys(key_usages).forEach(function (d) {
      inner_container.append(`<div class="form-group">
				<label class="checkbox">
					<input type="checkbox" name="keyuse-${d}"${key_usage[d] ? " checked" : ""} data-keyuse="${d}">
					<span class="checkbox__input"></span>
					<span class="checkbox__label">${key_usages[d]}</span>
				</label>
			</div>`);
    });

    result = $("<h5>Key Usage</h5>").add(inner_container);

    return result;
  };

  var divider = function () {
    return $(`<hr>`);
  };

  var add_csr_fields = function (
    container,
    csr,
    order = [
      ["subject", "san"],
      ["rsa", "key-usage", "ext-key-usage"],
    ],
    use_dividers = true
  ) {
    var after;
    order.forEach(function (el, idx) {
      if (Array.isArray(el)) {
        var temp_container = $('<div class="col"></div>');
        add_csr_fields(temp_container, csr, el, false);
        container.append(temp_container);
      } else {
        var t;
        if (use_dividers && idx) {
          t = divider();
          if (after) {
            after.last().after(t);
          } else {
            container.prepend(t);
          }
          after = t;
        }
        switch (el) {
          case "subject":
            t = prepare_subject(csr.subject).data("csr-section", "subject");
            break;
          case "san":
            t = prepare_sans(csr.san).data("csr-section", "san");
            break;
          case "rsa":
            t = prepare_rsa(csr.key_length, csr.digest).data(
              "csr-section",
              "rsa"
            );
            break;
          case "key-usage":
            t = prepare_key_usage(csr.key_usage).data(
              "csr-section",
              "key-usage"
            );
            break;
          case "ext-key-usage":
            t = prepare_ext_key_usage(csr.ext_key_usage).data(
              "csr-section",
              "ext-key-usage"
            );
            break;
        }
        if (after) {
          after.last().after(t);
        } else {
          container.prepend(t);
        }
        after = t;
      }
    });
  };

  var make_headers = function (container, csr) {
    container.find("h5").each(function (el) {
      var $this = $(this);
      if ($this.parent().hasClass("flex")) {
        return;
      }
      if (
        $this.data("csr-section") == "subject" ||
        $this.data("csr-section") == "rsa" ||
        $this.data("csr-section") == "preloaded"
      ) {
        return;
      }
      var txt = $this.text();
      var switch_el = $(`<label class="switch switch--small">
					<input type="checkbox" checked="">
					<span class="switch__input"></span>
					<span class="switch__label">${txt}</span>
				</label>`);

      switch_el.find("input").click(function (e) {
        var w = $(this).closest("h5").next('div[class$="wrap"]');
        if ($(this).is(":checked")) {
          w.fadeIn("fast");
        } else {
          w.fadeOut("fast");
        }
      });

      var hide = false;
      switch ($this.data("csr-section")) {
        case "san":
          hide = Object.keys(csr.san).length == 0;
          break;
        case "key-usage":
          hide = Object.keys(csr.key_usage).length == 0;
          break;
        case "ext-key-usage":
          hide = Object.keys(csr.ext_key_usage).length == 0;
          break;
      }
      if (hide) {
        $this.next('div[class$="wrap"]').hide();
        switch_el.find("input").prop("checked", false);
      }

      $this.html(switch_el);
    });
  };

  var prepare_fields = function (csr, preloaded, columns = true) {
    var container = $('<form class="csr-wrap"></form>');
    container.data("columns", columns);
    var inner_container = container;
    if (columns) {
      inner_container = $('<div class="row"></div>');
      container.prepend(inner_container);
    }
    add_csr_fields(inner_container, csr);

    if (preloaded) {
      container.append(divider().addClass("preloaded-loader"));

      container.append(
        prepare_preloaded(preloaded)
          .data("csr-section", "preloaded")
          .addClass("preloaded-loader")
      );
    }

    make_headers(container, csr);

    return container;
  };

  var collect_fields = function (body) {
    var csr = {
      subject: {},
      san: {},
      ext_key_usage: {},
      key_usage: {},
      key_type: "rsa",
      key_length: "",
      digest: "",
    };
    body.find('input[id^="dn-"]').each(function () {
      var current = $(this).data("element").toLowerCase();
      if (!csr.subject.hasOwnProperty(current)) {
        csr.subject[current] = [];
      }
      csr.subject[current].push($(this).val());
    });

    if (!Object.keys(csr.subject).length) {
      add_subject_field(
        "CN",
        body.find(".subject-wrap"),
        true,
        undefined,
        "At least CN must present"
      ).fadeIn("fast");
      csr.subject.cn = ["At least CN must present"];
    }

    if (body.find(".san-wrap").prev("h5").find("input").is(":checked")) {
      body.find('input[id^="san-"]').each(function () {
        var current = $(this).data("san-type");
        if (!csr.san.hasOwnProperty(current)) {
          csr.san[current] = [];
        }
        csr.san[current].push($(this).val());
      });
    }
    if (body.find(".eku-wrap").prev("h5").find("input").is(":checked")) {
      body.find('input[type="checkbox"][name^="eku"]').each(function () {
        csr.ext_key_usage[$(this).data("eku")] = $(this).is(":checked");
      });
    }
    if (body.find(".keyuse-wrap").prev("h5").find("input").is(":checked")) {
      body.find('input[type="checkbox"][name^="keyuse"]').each(function () {
        csr.key_usage[$(this).data("keyuse")] = $(this).is(":checked");
      });
    }
    csr.key_length = parseInt(body.find("input#key-length").val()) || 1024;
    csr.digest = body.find("select#sign-digest option:selected").val();
    return csr;
  };

  $.extend({
    create_csr: function (onclose, initial, body, preloaded) {
      var closed = function (e) {
        var saved = $(this).data("saved") || false;
        var data = $(this).data("initial");
        if (saved) {
          data = collect_fields($(this).find("form"));
        }
        onclose(data);
      };
      var btns = [
        { name: "close", type: "default", display: "Close" },
        {
          name: "save",
          type: "success",
          display: "Save",
          onclick: function (e) {
            $(this).closest(".modal").data("saved", "true");
          },
        },
      ];

      if (!body) {
        var modal = new_modal("lg", btns, true, { hidden: { func: closed } });
        // var header = modal.get_header();
        body = modal.get_body();
        // var footer = modal.get_footer();
        modal.get_header_h().html("Edit CSR");
        initial = initial || default_csr;
        modal.data("initial", initial);

        body.append(prepare_fields(initial, preloaded));

        modal.modal("toggle");
      } else {
        body.append(prepare_fields(initial, preloaded));
      }
    },
  });

  var builder_methods = {
    init: function (csr, preloaded) {
      // var args = arguments;
      return this.each(function () {
        $.create_csr(undefined, csr || default_csr, $(this), preloaded);
      });
    },
    collect: function (e) {
      return collect_fields($(this));
    },
  };

  $.fn.csr_builder = function (methodOrOptions) {
    if (builder_methods[methodOrOptions]) {
      return builder_methods[methodOrOptions].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    } else {
      return builder_methods.init.apply(this, arguments);
    }
  };
})(jQuery);
