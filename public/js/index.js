$(function () {
  $("a#btn-generate").click(function (e) {
    e.preventDefault();
    e.stopPropagation();

    let modal = new_modal("lg", ["close"]);
    let header = modal.find(".modal__header h2");
    let body = modal.find(".modal__body");

    header.html("Choose protocol");
    body.append(`
    <div class="row">
    <div class="col">
            <div class=" flex flex-center-vertical grouper grouper--accent">
                  <span class="grouper__title half-margin-right">RADIUS</span><hr class="flex-fill">
            </div>
            <div class="">
                  <a class="no-transform" href="/generate/mab/"><div class="panel card half-margin text-center hover-emboss--small">
                        <h5 class="half-margin-top">MAB</h5>
                  </div></a>
                  <a class="no-transform" href="/generate/pap/"><div class="panel card half-margin text-center hover-emboss--small">
                        <h5 class="half-margin-top">PAP/CHAP</h5>
                  </div></a>
                  <a class="no-transform" href="/generate/peap/"><div class="panel card half-margin text-center hover-emboss--small">
                        <h5 class="half-margin-top">PEAP</h5>
                  </div></a>
                  <a class="no-transform" href="/generate/eap-tls/"><div class="panel card half-margin text-center hover-emboss--small">
                        <h5 class="half-margin-top">EAP-TLS</h5>
                  </div></a>
            </div>
      </div>
      <div class="col">
            <div class=" flex flex-center-vertical grouper grouper--accent">
                  <span class="grouper__title half-margin-right">TACACS+</span><hr class="flex-fill">
            </div>
            <div class="">
                  <a class="no-transform" href="/tacacs/"><div class="panel card half-margin text-center hover-emboss--small">
                        <h5 class="half-margin-top">TACACS+</h5>
                  </div></a>
            </div>
      </div>
      </div>`);

    modal.modal("show");
  });
});
