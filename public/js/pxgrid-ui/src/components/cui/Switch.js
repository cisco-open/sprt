import React from "react";
import PropTypes from "prop-types";

const Switch = ({ input, left, right, innerRef /*, value */ }) => (
  <div className="form-group form-group--stacked" ref={innerRef}>
    <label className="switch">
      <input
        type="checkbox"
        {...input}
        // value={value}
        // checked={input.value}
      />
      {left ? <span className="switch__label">{left}</span> : null}
      <span className="switch__input" />
      {right ? <span className="switch__label">{right}</span> : null}
    </label>
  </div>
);

Switch.propTypes = {
  left: PropTypes.string,
  right: PropTypes.string
};

const refSwitch = React.forwardRef((props, ref) => (
  <Switch innerRef={ref} {...props} />
));
export { refSwitch as Switch };
