import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

import { InputHelpBaloon } from "./InputHelpBaloon";
import { InputHelpBlock } from "./InputHelpBlock";

const Input = ({
  className,
  id,
  field,
  label,
  type,
  form: { touched, errors },
  baloon,
  innerRef,
  inputRef,
  compressed,
  inline,
  icon,
  iconClick,
  helpBlock,
  ...rest
}) => (
  <div
    className={
      "form-group" +
      (compressed ? " input--compressed" : "") +
      (className ? ` ${className}` : "") +
      (getIn(touched, field.name) && getIn(errors, field.name)
        ? " form-group--error"
        : "") +
      (inline === "form" || inline === "both" ? " form-group--inline" : "") +
      (inline === "label" || inline === "both" ? " label--inline" : "") +
      (icon ? " input--icon" : "")
    }
    ref={innerRef}
  >
    <div className="form-group__text">
      <input
        {...field}
        id={id || field.name}
        type={type}
        ref={inputRef}
        {...rest}
      />
      {label ? (
        <label htmlFor={id || field.name}>
          {label}
          {baloon ? <InputHelpBaloon baloon={baloon} /> : null}
        </label>
      ) : null}
      {icon ? (
        <button
          type="button"
          className="link"
          tabIndex="-1"
          onClick={iconClick}
        >
          <span className={`icon-${icon}`}></span>
        </button>
      ) : null}
    </div>
    {helpBlock && getIn(touched, field.name) && getIn(errors, field.name) ? (
      <InputHelpBlock text={getIn(errors, field.name)} />
    ) : null}
  </div>
);

Input.propTypes = {
  label: PropTypes.node,
  rows: PropTypes.number,
  readonly: PropTypes.bool,
  baloon: PropTypes.string,
  type: PropTypes.string,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]),
  compressed: PropTypes.bool,
  inline: PropTypes.oneOf([false, "group", "label", "both"]),
  helpBlock: PropTypes.bool
};

Input.defaultProps = {
  type: "text",
  inline: false,
  helpBlock: true
};

const refInput = React.forwardRef((props, ref) => (
  <Input innerRef={ref} {...props} />
));

export { refInput as Input };
