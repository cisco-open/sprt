import React from "react";
import { Field } from "formik";

import Dictionary from "my-composed/Dictionary";
import { loadDictionaries } from "../my-actions";
import { VarContext } from "./utils";

export default ({ f }) => {
  const { field } = React.useContext(VarContext);
  const fieldName = field.name;

  return (
    <Field
      component={Dictionary}
      name={`${fieldName}.dictionary`}
      varPrefix={fieldName}
      label={f.label}
      types={
        Array.isArray(f.dictionary_type)
          ? f.dictionary_type
          : f.dictionary_type.split(",")
      }
      loadDictionaries={loadDictionaries}
      color="light"
      validate={(v) => {
        let error;
        if (Array.isArray(v) && !v.length)
          error = "Select at least one dictionary";
        return error;
      }}
    />
  );
};
