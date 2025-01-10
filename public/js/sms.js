var saver;

$(function () {
    globals.current_base = globals.rest.preferences.guest.sms;
    saver = new DataSaver({
        statusElement: $('.status'),
        rest: globals.rest.preferences.guest.sms,
        method: 'POST',
        onSave: updateResults,
    });
    $('#method-select').change(methodChanged);
    $('#basic-auth-switch').change(authReqChanged);
    setLoadDropDown();
    saveEvents();
    updateResults();
    check_url();
    $('body').on('click', '#results-tab .tab a', switchResultTab);
});

function check_url(tab = '[^/]+') {
    let re = new RegExp(`\/guest\/sms\/tab\/${tab}\/`,"i");
	if (! re.test(window.location.pathname)){ return; }
	$(`a[href="${decodeURIComponent(window.location.pathname)}"]`).click();
}

function methodChanged(e) {
    if ($('#method-select option:selected').val() === 'post') {
        $('#body-template').prop('disabled', false).next('label').prop('disabled', false);
        $('#content-type').closest('.form-group').show();
    } else {
        $('#body-template').prop('disabled', true).next('label').prop('disabled', true);
        $('#content-type').closest('.form-group').hide();
    }
}

function authReqChanged(e) {
    if ($(this).is(':checked')) {
        $('#http-basic-auth').show();
    } else {
        $('#http-basic-auth').hide();
    }
}

function setLoadDropDown() {
    $("#url-examples").data({'load-from': {
		link: globals.rest.preferences.guest.sms_examples,
		nolocation: true,
	}, target: populateConfiguration}).click(loadValues);
}

function populateConfiguration(e) {
    let v = $(this).data('value');
    $('#method-select :selected').prop('selected', false);
    $(`#method-select option[value="${v.method}"]`).prop('selected', true);

    $('#sms-gateway-url').val(v.url_postfix);
    $('#body-template').val(v.body_template || '');
    $('#message-template').val(v.message_template || '');
    $('#basic-auth-switch').prop('checked', v.basic_auth ? true : false);

    $('#basic-auth-user').val(v.username || '');
    $('#basic-auth-password').val(v.password || '');  

    if (v.method === 'post') {
        $('#content-type').val(v.content_type || 'text/plain');
    }

    $('form[name="smsConfig"] :input').not('[type="number"], [type="text"]').trigger('change');
    $('form[name="smsConfig"] :input').filter('[type="number"], [type="text"]').trigger('input');
}

function saveEvents() {
    let inpts = $('form[name="smsConfig"] :input');
    inpts.not('[type="number"], [type="text"]').change(inputChanged);
    inpts.filter('[type="number"], [type="text"]').on('input', inputChanged);
}

function inputChanged() {
    let $t   = $(this);
    let name = this.name;
    let val  = $t.val();
    if ($t.is(':checkbox')) { val = $t.is(':checked') ? 1 : 0; }

    saver.saveValue(name, val, 'sms');
}

function updateResults() {
    let hostname = $('#host-info').data('hostname');
    let path = $('#host-info').data('path');
    let method = $('#method-select :selected').val();
    let suffix = $('#sms-gateway-url').val();
    let c_type = $('#content-type').val();

    let username = $('#basic-auth-switch').is(':checked') ? $('#basic-auth-user').val() : '';
    let password = $('#basic-auth-switch').is(':checked') ? $('#basic-auth-password').val() : '';
    let auth = username && password ? `${username}:${password}@` : '';
    let body = method === 'post' ? $('#body-template').val() : '';
    body = body.replace(/[\u00A0-\u9999<>\&]/gim, (i) => { return '&#'+i.charCodeAt(0)+';'; });

    if (method === 'get' && /\$message\$$/.test(suffix)) {
        body = '$message$';
        suffix = suffix.replace(/\$message\$$/, '');
    }

    suffix = suffix.replace('$phone$', '$mobilenumber$');
    body = body.replace('$phone$', '$mobilenumber$');

    let r_http = $('#http-result');
    r_http.empty();
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="http://${auth}${hostname}${path}${suffix}">
            <label>URL:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <textarea rows="5" readonly>${body}</textarea>
            <label>Data (Url encoded portion):</label>
        </div>
    </div>`);
    r_http.append(`<label class="checkbox disabled half-margin-top">
        <input type="checkbox" ${method === 'post' ? 'checked' : ''}>
        <span class="checkbox__input"></span>
        <span class="checkbox__label">Use HTTP POST method for data portion</span>
    </label>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="${method === 'post' ? c_type : ''}">
            <label>HTTP POST data content type:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="">
            <label>HTTPS Username:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="">
            <label>HTTPS Password:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="">
            <label>HTTPS Host:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="443">
            <label>HTTPS Port:</label>
        </div>
    </div>`);
    r_http.append(`<label class="checkbox disabled half-margin-top">
        <input type="checkbox">
        <span class="checkbox__input"></span>
        <span class="checkbox__label">Break up long message into multiple parts (140 byte chunks)</span>
    </label>`);

    r_http = $('#https-result');
    r_http.empty();
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="https://${hostname}${path}${suffix}">
            <label>URL:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <textarea rows="5" readonly>${body}</textarea>
            <label>Data (Url encoded portion):</label>
        </div>
    </div>`);
    r_http.append(`<label class="checkbox disabled half-margin-top">
        <input type="checkbox" ${method === 'post' ? 'checked' : ''}>
        <span class="checkbox__input"></span>
        <span class="checkbox__label">Use HTTP POST method for data portion</span>
    </label>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="${method === 'post' ? c_type : ''}">
            <label>HTTP POST data content type:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="${username}">
            <label>HTTPS Username:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="${password}">
            <label>HTTPS Password:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="${hostname}">
            <label>HTTPS Host:</label>
        </div>
    </div>`);
    r_http.append(`<div class="form-group">
        <div class="form-group__text">
            <input type="text" readonly value="443">
            <label>HTTPS Port:</label>
        </div>
    </div>`);
    r_http.append(`<label class="checkbox disabled half-margin-top">
        <input type="checkbox">
        <span class="checkbox__input"></span>
        <span class="checkbox__label">Break up long message into multiple parts (140 byte chunks)</span>
    </label>`);
    r_http.append(`<div class="alert base-margin-top">
        <div class="alert__icon icon-info-outline"></div>
        <div class="alert__message">Do not forget about certificates for HTTPS.</div>
    </div>`)
}

function switchResultTab(e) {
    e.preventDefault();
    let $t = $(this);

    let li = $t.closest('li.tab');
    if (li.hasClass('active')) { return; }
    
	let parent = $t.closest('.tabs');
	parent.find('.active').removeClass('active');
	li.addClass('active');

    let $tab = $('#'+$t.data('target'));
	$tab.closest('.tab-content').find('.tab-pane.active').removeClass('active');
    $tab.addClass('active');
}