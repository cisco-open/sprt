import React from "react";
import { connect, Field, getIn } from "formik";

import { EditableSelect } from "react-cui-2.0";

import { OptionsContext } from "../../../contexts";

const RFC_CONSTANTS = [
  ["TAC_PLUS_PRIV_LVL_MAX", 0x0f],
  ["TAC_PLUS_PRIV_LVL_USER", 0x01],
  ["TAC_PLUS_PRIV_LVL_MIN", 0x00],
];

const PrivilegeLevel = ({ formik }) => {
  const options = React.useContext(OptionsContext);

  React.useEffect(() => {
    formik.setFieldValue(
      "auth.attributes.priv_lvl",
      getIn(options, "auth.attributes.priv_lvl", 0x00),
      false
    );
  }, []);

  return (
    <Field
      name="auth.attributes.priv_lvl"
      component={EditableSelect}
      type="number"
      min={0}
      max={15}
      title="Privilege Level"
      prompt="Select level"
      id="auth.attributes.priv_lvl"
    >
      {RFC_CONSTANTS.map(([service, value]) => (
        <option id={service} value={value} key={service}>
          {service}
        </option>
      ))}
    </Field>
  );
};

export default connect(PrivilegeLevel);
