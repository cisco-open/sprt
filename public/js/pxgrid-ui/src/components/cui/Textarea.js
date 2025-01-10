import React from "react";
import PropTypes from "prop-types";

import { helpBlockAnimation } from "./utils";

const Textarea = ({
  className,
  id,
  input,
  label,
  meta,
  innerRef,
  textareaClass,
  rows,
  resize,
  ...rest
}) => {
  const { touched, error, asyncValidating } = meta;

  return (
    <div
      className={
        "form-group" +
        (className ? ` ${className}` : "") +
        (touched && error ? " form-group--error" : "") +
        (asyncValidating ? " form-group--loading" : "")
      }
      ref={innerRef}
    >
      <div className="form-group__text">
        <textarea
          {...input}
          className={textareaClass}
          id={id}
          rows={rows}
          {...rest}
        >
          {input.value}
        </textarea>
        {label ? <label htmlFor={id}>{label}</label> : null}
      </div>
      {touched && error ? (
        <div
          className={`help-block text-danger ${helpBlockAnimation}`}
          role="alert"
        >
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
};

Textarea.propTypes = {
  label: PropTypes.node,
  textareaClass: PropTypes.string,
  rows: PropTypes.number
};

const refTextarea = React.forwardRef((props, ref) => (
  <Textarea innerRef={ref} {...props} />
));
export { refTextarea as Textarea };
