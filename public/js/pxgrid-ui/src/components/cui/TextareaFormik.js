import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

import { InputHelpBlock } from "./InputHelpBlock";

const Textarea = ({
  className,
  id,
  field,
  label,
  labelInline,
  form: { touched, errors },
  innerRef,
  inputRef,
  textareaClass,
  resize,
  ...rest
}) => {
  return (
    <div
      className={
        "form-group" +
        (labelInline ? " label--inline" : "") +
        (className ? ` ${className}` : "") +
        (getIn(touched, field.name) && getIn(errors, field.name)
          ? " form-group--error"
          : "")
      }
      ref={innerRef}
    >
      <div className="form-group__text">
        <textarea
          {...field}
          className={textareaClass}
          id={id}
          ref={inputRef}
          {...rest}
        >
          {field.value}
        </textarea>
        {label ? <label htmlFor={id}>{label}</label> : null}
      </div>
      {getIn(touched, field.name) && getIn(errors, field.name) ? (
        <InputHelpBlock text={getIn(errors, field.name)} />
      ) : null}
    </div>
  );
};

Textarea.propTypes = {
  label: PropTypes.node,
  labelInline: PropTypes.bool,
  textareaClass: PropTypes.string,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ])
};

const refTextarea = React.forwardRef((props, ref) => (
  <Textarea innerRef={ref} {...props} />
));
export { refTextarea as Textarea };
