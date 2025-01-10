import React from "react";
import PropTypes from "prop-types";

import { helpBlockAnimation } from "./utils";

const Input = ({ className, id, type, input, label, meta, innerRef }) => {
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
        <input {...input} id={id} type={type || "text"} />
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

Input.propTypes = {
  label: PropTypes.node,
  rows: PropTypes.number,
  asyncValidating: PropTypes.bool
};

const refInput = React.forwardRef((props, ref) => (
  <Input innerRef={ref} {...props} />
));
export { refInput as Input };
