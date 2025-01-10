import React from "react";
import { getIn, Field } from "formik";

import { Switch } from "react-cui-2.0";

import { VarContext } from "./utils";

const FieldCheckbox = ({ f, postfix }) => {
  const { form, field, rebuildDependands } = React.useContext(VarContext);
  const fieldName = f.name ? field.name + postfix + f.name : fieldName.name;

  React.useEffect(() => {
    if (!getIn(form.values, fieldName) && typeof f.value !== "undefined")
      form.setFieldValue(fieldName, Boolean(f.value));

    return () => {
      form.unregisterField(fieldName);
      form.setFieldValue(fieldName, undefined, false);
    };
  }, []);

  React.useEffect(() => {
    if (Array.isArray(f.dependants) && f.dependants.length)
      rebuildDependands({
        dependants: f.dependants,
        show_if_checked: f.show_if_checked,
        select_dependant: f.select_dependant,
      });
  }, [getIn(form.values, fieldName, false)]);

  return (
    <Field
      component={Switch}
      name={fieldName}
      right={f.label}
      className="half-margin-top"
    />
  );
};

export default FieldCheckbox;
