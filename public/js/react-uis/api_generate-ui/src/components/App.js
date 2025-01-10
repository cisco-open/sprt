import React from "react";
import PropTypes from "prop-types";

import { Alert } from "react-cui-2.0";

import API, { HEADERS } from "my-utils/API";

const App = ({ token, setListner, getParams }) => {
  const [params, setParams] = React.useState(null);

  React.useEffect(() => {
    if (typeof setListner === "function" && typeof getParams === "function")
      setListner(async (e) => setParams(await getParams(e)));
  });

  return (
    <>
      <h2 className="display-3 no-margin half-margin-bottom text-capitalize flex-fluid">
        API
      </h2>
      <div className="panel-body collector-no-submit">
        {!params ? (
          <Alert.Warning title="Fields are missing">
            Fill all required fields first.
          </Alert.Warning>
        ) : (
          <API
            method="POST"
            headers={HEADERS.ALL}
            auth={`Bearer ${token}`}
            data={params}
            url={`${window.location.origin}/generate/`}
          />
        )}
      </div>
    </>
  );
};

App.propTypes = {
  token: PropTypes.string.isRequired,
  setListner: PropTypes.func,
  getParams: PropTypes.func,
};

App.defaultProps = {
  setListner: null,
  getParams: null,
};

export default App;
