import React from "react";
import PropTypes from "prop-types";
import { useFormikContext } from "formik";
import { useParams } from "react-router-dom";

import API, { HEADERS } from "my-utils/API";
import { Alert } from "react-cui-2.0";

import { OptionsContext } from "../contexts";
import { loadApiSettings } from "../../../api_settings-ui/src/actions";

const APITab = () => {
  const {
    values,
    validateForm,
    setSubmitting,
    setTouched,
  } = useFormikContext();
  const { token } = React.useContext(OptionsContext);
  const { tab } = useParams();

  const check = React.useCallback(async () => {
    const err = await validateForm();
    if (err && Object.keys(err).length) {
      setTouched(err);
      setSubmitting(true);
    }
  }, [setSubmitting, setTouched, validateForm]);

  React.useEffect(() => {
    if (tab === "api") check();
  }, [tab, check]);

  if (!token) return null;

  return (
    <>
      <h2 className="display-3 no-margin half-margin-bottom text-capitalize flex-fluid">
        API
      </h2>
      <div className="panel-body collector-no-submit">
        {!values ? (
          <Alert.Warning title="Fields are missing">
            Fill all required fields first.
          </Alert.Warning>
        ) : (
          <API
            method="POST"
            headers={HEADERS.ALL}
            auth={`Bearer ${token}`}
            data={values}
            url={`${window.location.origin}/tacacs/`}
          />
        )}
      </div>
    </>
  );
};

APITab.propTypes = {};

APITab.defaultProps = {};

export const ApiCheck = ({ addTab }) => {
  const { setOption } = React.useContext(OptionsContext);
  React.useEffect(() => {
    const f = async () => {
      const { preferences } = await loadApiSettings();
      if (!preferences || !preferences.token) return;
      addTab({
        link: "/api/",
        name: "api",
        display: "API",
        component: APITab,
        mapping: [/^api[.]/],
      });
      setOption("token", preferences.token);
    };

    f();
  }, []);
  return null;
};

ApiCheck.propTypes = {
  addTab: PropTypes.func.isRequired,
};
