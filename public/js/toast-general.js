var notify_settings = {
	element: 'body',
	position: null,
	type: "info",
	allow_dismiss: true,
	newest_on_top: false,
	showProgressbar: false,
	placement: {
		from: "bottom",
		align: "right"
	},
	offset: 20,
	spacing: 10,
	z_index: 1060,
	delay: 3000,
	timer: 1000,
	url_target: '_blank',
	mouse_over: 'pause',
	animate: {
		enter: 'animated fadeInDown',
		exit: 'animated fadeOutUp'
	},
	onShow: null,
	onShown: null,
	onClose: null,
	onClosed: null,
	icon_type: 'class',
	template: `<div class="toast" data-notify="container" role="alert" style="max-width: 500px;">
			<div style="display: flex !important;">
				<div data-notify="icon" class="toast__icon"></div>
				<div class="toast__body">
					<div data-notify="title" class="toast__title">{1}</div>
					<div data-notify="message" class="toast__message">{2}</div>
				</div>
			</div>
		</div>`
};

function toast(type, title, message) {
	var iconClass;
	switch (type) {
		case 'success':
			iconClass = 'icon-check-outline text-success';
			break;
		case 'warning':
		case 'alert':
			iconClass = 'icon-warning-outline text-warning';
			type = 'warning';
			break;
		case 'error':
		case 'danger':
			iconClass = 'icon-error-outline text-danger';
			type = 'danger';
			break;
		default:
			iconClass = 'icon-info-outline text-info';
			type = 'info';
			break;
	}

	notify_settings.type = type;
	if (this.hasOwnProperty('update') && typeof this.update === 'function') {
		this.update({'type': type, 'icon': iconClass, 'title': title, 'message': message});
		return this;
	} else {
		return $.notify({
			icon: iconClass,
			title: title,
			message: message,
			url: null,
			target: null
		}, notify_settings);
	}
}

function toast_error(jqXHR, textStatus, errorThrown, subject = '') {
	var message = errorThrown;
	if (jqXHR && jqXHR.hasOwnProperty('responseJSON') && jqXHR.responseJSON.hasOwnProperty('error')) {
		message = jqXHR.responseJSON.error;
	} else if (jqXHR.hasOwnProperty('response')) {
		try {
			message = JSON.parse(jqXHR.response).error;
		} catch (e) {
			message = jqXHR.response; 
		}
	} else {
		if (typeof message === 'object') {
			message = message.error;
		}else {
			try {
				// Try to parse message, it might be a JSON
				message = JSON.parse(message).messageString;
			} catch (e) {
				// Do nothing :)
			}
		}
	}
	toast.call(this, 'error', subject, message);
}