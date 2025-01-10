import React from "react";
import { getIn, Field } from "formik";

import { ButtonGroup, Input } from "react-cui-2.0";

import { ButtonSet } from "./ButtonSet";
import { VarContext, simpleValidator, insertAtCursor } from "./utils";

const FieldInput = ({ f, postfix }) => {
  const { form, field } = React.useContext(VarContext);
  const fieldName = f.name ? field.name + postfix + f.name : fieldName.name;

  React.useEffect(() => {
    if (!getIn(form.values, fieldName) && typeof f.value !== "undefined")
      form.setFieldValue(fieldName, f.value);

    return () => {
      form.unregisterField(fieldName);
      form.setFieldValue(fieldName, undefined, false);
    };
  }, []);

  const inputRef = React.useRef();
  const setValue = (value, insert = false) =>
    form.setFieldValue(
      fieldName,
      insert && inputRef.current
        ? insertAtCursor(inputRef.current, value)
        : value
    );

  const input = (
    <Field
      component={Input}
      name={fieldName}
      validate={(value) => simpleValidator(value, f.validate)}
      type={f.type}
      className={
        Array.isArray(f.buttons) && f.buttons.length
          ? " half-margin-right flex-fill"
          : ""
      }
      id={`input-${fieldName}`}
      min={typeof f.min !== "undefined" ? f.min : null}
      max={typeof f.max !== "undefined" ? f.max : null}
      placeholder={typeof f.placeholder !== "undefined" ? f.placeholder : null}
      inputRef={inputRef}
      label={f.label}
    />
  );

  if (Array.isArray(f.buttons) && f.buttons.length) {
    return (
      <div className="flex">
        {input}
        <ButtonGroup square className="base-margin-top">
          <ButtonSet buttons={f.buttons} setValue={setValue} />
        </ButtonGroup>
      </div>
    );
  } else return input;
};

export default FieldInput;
