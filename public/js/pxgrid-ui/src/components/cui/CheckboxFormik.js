import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

const Checkbox = ({ field, form, inline, innerRef, children }) => (
  <div
    className={`form-group ${inline ? "form-group--inline" : ""}`}
    ref={innerRef}
  >
    <label className="checkbox">
      <input
        type="checkbox"
        {...field}
        checked={getIn(form.values, field.name, false)}
      />
      <span className="checkbox__input" />
      {children ? <span className="checkbox__label">{children}</span> : null}
    </label>
  </div>
);

Checkbox.propTypes = {
  inline: PropTypes.bool
};

const refCheckbox = React.forwardRef((props, ref) => (
  <Checkbox innerRef={ref} {...props} />
));
export { refCheckbox as Checkbox };
