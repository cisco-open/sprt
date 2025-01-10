import React from "react";
import { connect, Field, getIn } from "formik";

import { Select } from "react-cui-2.0";

import { OptionsContext } from "../../../contexts";

const RFC_CONSTANTS = [
  ["TAC_PLUS_AUTHEN_SVC_NONE", 0x00],
  ["TAC_PLUS_AUTHEN_SVC_LOGIN", 0x01],
  ["TAC_PLUS_AUTHEN_SVC_ENABLE", 0x02],
  ["TAC_PLUS_AUTHEN_SVC_PPP", 0x03],
  ["TAC_PLUS_AUTHEN_SVC_ARAP", 0x04],
  ["TAC_PLUS_AUTHEN_SVC_PT", 0x05],
  ["TAC_PLUS_AUTHEN_SVC_RCMD", 0x06],
  ["TAC_PLUS_AUTHEN_SVC_X25", 0x07],
  ["TAC_PLUS_AUTHEN_SVC_NASI", 0x08],
  ["TAC_PLUS_AUTHEN_SVC_FWPROX", 0x09],
];

const Service = ({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.service",
      getIn(options, "auth.attributes.service", 0x01),
      false
    );
  }, []);

  return (
    <Field
      name="auth.attributes.service"
      component={Select}
      title="Service"
      prompt="Select service"
      id="auth.attributes.service"
    >
      {RFC_CONSTANTS.map(([service, value]) => (
        <option id={service} value={value} key={service}>
          {service}
        </option>
      ))}
    </Field>
  );
};

export default connect(Service);
