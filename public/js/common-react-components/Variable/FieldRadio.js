import React from "react";
import { getIn } from "formik";

import { Radios } from "react-cui-2.0";

import { VarContext } from "./utils";

const FieldRadio = ({ f, postfix }) => {
  const { form, field, updateOnChange } = React.useContext(VarContext);
  const fieldName = f.name ? field.name + postfix + f.name : fieldName.name;

  React.useEffect(() => {
    if (!getIn(form.values, fieldName) && typeof f.value !== "undefined")
      form.setFieldValue(fieldName, f.value);

    return () => {
      form.unregisterField(fieldName);
      form.setFieldValue(fieldName, undefined, false);
    };
  }, []);

  React.useEffect(() => {
    if (f.update_on_change) {
      updateOnChange({
        update: f.update_on_change,
        value: getIn(form.values, fieldName),
      });
    }
  }, [getIn(form.values, fieldName)]);

  return (
    <div className="flex flex-center-vertical dbl-margin-top">
      <div className="base-margin-right">{field.label}</div>
      <Radios name={fieldName} values={field.variants} />
    </div>
  );
};

export default FieldRadio;
