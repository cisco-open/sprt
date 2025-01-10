import React from "react";
import { connect, Field, getIn } from "formik";

import { Input } from "react-cui-2.0";

import { OptionsContext } from "../../../contexts";

const Port = ({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.port",
      getIn(options, "auth.attributes.port", "tty1"),
      false
    );
  }, []);

  return (
    <Field
      name="auth.attributes.port"
      component={Input}
      label="Port"
      prompt="Port"
      id="auth.attributes.port"
    />
  );
};

export default connect(Port);
