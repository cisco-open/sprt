import React from "react";
import { getIn, Field } from "formik";

import { Checkboxes } from "react-cui-2.0";

import { VarContext } from "./utils";

export default ({ f, postfix }) => {
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
    if (f.update_on_change)
      updateOnChange({
        fieldName,
        value: getIn(form.values, fieldName, []),
        update: field.update_on_change,
      });
  }, [getIn(form.values, fieldName, [])]);

  return (
    <div className="checkboxes">
      {f.label ? <div class="qtr-margin-bottom">{f.label}</div> : null}
      <Field
        component={Checkboxes}
        name={fieldName}
        variants={f.variants.map((v) => ({ id: v.name, name: v.label }))}
      />
    </div>
  );
};
