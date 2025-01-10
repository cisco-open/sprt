import React from "react";
import PropTypes from "prop-types";
import { Field } from "formik";

const Radio = ({
  field: { name, value, onChange, onBlur },
  form: _form,
  id,
  inline,
  spacing,
  innerRef,
  label,
  className,
  ...props
}) => (
  <div
    className={
      "form-group" +
      (inline ? " form-group--inline" : "") +
      (spacing ? ` form-group--${spacing}` : "") +
      (className ? ` ${className}` : "")
    }
    ref={innerRef}
    {...props}
  >
    <label className="radio">
      <input
        type="radio"
        name={name}
        value={id}
        checked={id === value}
        onChange={onChange}
        onBlur={onBlur}
      />
      <span className="radio__input" />
      {label ? <span className="radio__label">{label}</span> : null}
    </label>
  </div>
);

Radio.propTypes = {
  spacing: PropTypes.oneOf([
    false,
    "compressed",
    "regular",
    "loose",
    "nospacing",
  ]),
  inline: PropTypes.bool,
};

const refRadio = React.forwardRef((props, ref) => (
  <Radio innerRef={ref} {...props} />
));
export { refRadio as Radio };

export const Radios = ({ values, ...props }) =>
  values.map((v) => (
    <Field
      component={Radio}
      {...props}
      id={v.value}
      label={v.label}
      key={v.value}
    />
  ));

Radios.propTypes = {
  values: PropTypes.arrayOf(
    PropTypes.exact({
      value: PropTypes.string,
      label: PropTypes.node,
    })
  ),
};
