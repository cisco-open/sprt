import React from "react";
import { Field } from "formik";

import { EditableSelect } from "react-cui-2.0";

const RFC_CONSTANTS = [
  "shell",
  "tty-server",
  "connection",
  "system",
  "firewall",
];

const Service = ({ prefix }) => (
  <Field
    name={`${prefix}.service`}
    component={EditableSelect}
    title="Service"
    prompt="Select service"
    id={`${prefix}.service`}
  >
    {RFC_CONSTANTS.map((service) => (
      <option id={service} value={service} key={service}>
        {service}
      </option>
    ))}
  </Field>
);

export default Service;
