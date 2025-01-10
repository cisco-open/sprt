import React from "react";
import { connect, Field, getIn } from "formik";

import { Select } from "react-cui-2.0";

import { OptionsContext } from "../../../contexts";

const AuthMethod = ({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.method",
      getIn(options, "auth.method", "pap"),
      false
    );
  }, []);

  return (
    <Field
      name="auth.method"
      component={Select}
      title="Authentication type"
      prompt="Select type"
      id="authentication-method"
    >
      {options.auth.methods.map((method) => (
        <option id={method} value={method} key={method}>
          {method.toUpperCase()}
        </option>
      ))}
    </Field>
  );
};

export default connect(AuthMethod);
