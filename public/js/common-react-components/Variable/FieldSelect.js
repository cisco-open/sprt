import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { Field } from "formik";

import { Select, toast } from "react-cui-2.0";

import { VarContext } from "./utils";
import { loadSelectValues } from "../my-actions";

const loadWrapper = async ({ from, value }) => {
  if (from) {
    return await loadSelectValues(from);
  } else return value;
};

const FieldSelect = ({ f, postfix }) => {
  const { field } = React.useContext(VarContext);
  const fieldName = f.name ? field.name + postfix + f.name : fieldName.name;

  React.useEffect(() => {
    if (!getIn(form.values, fieldName) && typeof f.value !== "undefined")
      form.setFieldValue(fieldName, f.value);

    return () => {
      form.unregisterField(fieldName);
      form.setFieldValue(fieldName, undefined, false);
    };
  }, []);

  const loadingState = useAsync({
    promiseFn: loadWrapper,
    from: f.load_values,
    value: f.value,
  });

  return (
    <Field
      name={fieldName}
      component={Select}
      title={f.label}
      inline={Boolean(f.inline)}
      prompt="Please select"
      id={fieldName}
    >
      <IfPending state={loadingState}>
        <option>Loading...</option>
      </IfPending>
      <IfRejected state={loadingState}>
        {(error) => {
          toast.error("Operation failed", error.message, false);
          <option>Loading error</option>;
        }}
      </IfRejected>
      <IfFulfilled state={loadingState}>
        {(data) =>
          data.map((v) => (
            <option key={v.value} value={v.value}>
              {e.label}
            </option>
          ))
        }
      </IfFulfilled>
    </Field>
  );
};

export default FieldSelect;
