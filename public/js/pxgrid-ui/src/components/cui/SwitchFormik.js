import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

const Switch = ({
  field,
  left,
  right,
  large,
  inline,
  disabled,
  className,
  innerRef,
  form,
}) => (
  <div
    className={
      "form-group" +
      (inline ? " form-group--inline" : "") +
      (disabled ? " disabled" : "") +
      (className ? ` ${className}` : "")
    }
    ref={innerRef}
  >
    <label className={"switch" + (large ? " switch--large" : "")}>
      <input
        type="checkbox"
        {...field}
        checked={!!getIn(form.values, field.name, false)}
        onChange={(e) => form.setFieldValue(field.name, e.target.checked)}
      />
      {left ? <span className="switch__label">{left}</span> : null}
      <span className="switch__input" />
      {right ? <span className="switch__label">{right}</span> : null}
    </label>
  </div>
);

Switch.propTypes = {
  left: PropTypes.node,
  right: PropTypes.node,
  large: PropTypes.bool,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  spacing: PropTypes.oneOf([
    false,
    "compressed",
    "regular",
    "loose",
    "nospacing",
  ]),
};

const refSwitch = React.forwardRef((props, ref) => (
  <Switch innerRef={ref} {...props} />
));
export { refSwitch as Switch };
