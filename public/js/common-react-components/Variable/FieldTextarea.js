import React from "react";
import { Field } from "formik";

import { ButtonGroup, Button, Textarea } from "react-cui-2.0";
import { LoadFromFileButton } from "my-composed/LoadFromFileButton";

import { ButtonSet } from "./ButtonSet";
import { VarContext, simpleValidator, insertAtCursor } from "./utils";

const FieldTextarea = ({ f, postfix }) => {
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
      component={Textarea}
      name={fieldName}
      validate={(value) => simpleValidator(value, f.validate)}
      className="half-margin-right flex-fill"
      id={`input-${fieldName}`}
      placeholder={typeof f.placeholder !== "undefined" ? f.placeholder : null}
      inputRef={inputRef}
    />
  );

  if (!Array.isArray(f.buttons) || !f.buttons.length) f.buttons = [];
  f.buttons.unshift({
    type: "component",
    component: <LoadFromFileButton onLoad={(content) => setValue(content)} />,
  });
  f.buttons.unshift({
    type: "component",
    component: <Button icon="trash" onClick={() => setValue("")} />,
  });

  <div className="flex flex-center-vertical">
    {input}
    <ButtonGroup square className="base-margin-top half-margin-bottom">
      <ButtonSet buttons={f.buttons} setValue={setValue} />
    </ButtonGroup>
  </div>;
};

export default FieldTextarea;
