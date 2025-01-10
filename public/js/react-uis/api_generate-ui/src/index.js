import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";

import { loadApiSettings } from "../../api_settings-ui/src/actions";

(async () => {
  if (typeof addTab !== "function" || typeof $ !== "function") return;

  const { preferences } = await loadApiSettings();
  if (!preferences || !preferences.token) return;

  let clickListner;
  const setListner = listner => {
    clickListner = listner;
  };

  // eslint-disable-next-line no-undef
  addTab("API", "", "api-result-tab", "", 2000);
  // eslint-disable-next-line no-undef
  $('a[data-target="api-result-tab"]').on("click", e => {
    if (typeof clickListner === "function") clickListner(e);
  });

  let getParams;
  if (typeof getParamsFromForm === "function") {
    // eslint-disable-next-line no-undef
    getParams = getParamsFromForm.bind(
      document.getElementsByTagName("form")[0]
    );
  }

  ReactDOM.render(
    <App
      token={preferences.token}
      setListner={setListner}
      getParams={getParams}
    />,
    document.getElementById("api-result-tab")
  );
})();
