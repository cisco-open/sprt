import React from "react";
import PropTypes from "prop-types";

const Checkbox = ({ input, inline, innerRef, children }) => (
  <div
    className={`form-group ${inline ? "form-group--inline" : ""}`}
    ref={innerRef}
  >
    <label class="checkbox">
      <input type="checkbox" {...input} />
      <span class="checkbox__input" />
      <span class="checkbox__label">{children}</span>
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
