$(function () {
	setTimeout(function() {
		window.location.href = `${redirectUrl}session/${sessionID}/?token=`+escape(JWT)+`&back=`+escape(window.location.origin);
	}, 3000);
});