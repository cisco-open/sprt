import React from "react";
import { connect, Field, getIn } from "formik";

import { Switch } from "react-cui-2.0";

import OptionsSectionHeader from "../../common/OptionsSectionHeader";
import Selector from "./Selector";

import { OptionsContext } from "../../../contexts";

const credentials = connect(({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.credentials.limit_sessions",
      getIn(options, "auth.credentials.limit_sessions", false),
      false
    );
  }, []);

  return (
    <>
      <OptionsSectionHeader title="Credentials" />
      <div className="panel-body">
        <Field
          component={Switch}
          name="auth.credentials.limit_sessions"
          right="Amount of sessions equals to amount of credentials"
        />
        <Selector />
      </div>
    </>
  );
});

export default credentials;
