import React from "react";
import PropTypes from "prop-types";

const Gauge = ({ size, percentage, color, showPercentSign, innerRef }) => (
  <div
    className={`gauge gauge--${size} gauge--${color}`}
    data-percentage={percentage}
    ref={innerRef}
  >
    <div className="gauge__circle">
      <div className="mask full">
        <div className="fill" />
      </div>
      <div className="mask half">
        <div className="fill" />
        <div className="fill fix" />
      </div>
    </div>
    <div className="gauge__inset">
      <div className="gauge__percentage flex-center-vertical">
        <span>{percentage}</span>
        {showPercentSign ? <span className="text-large">%</span> : null}
      </div>
    </div>
  </div>
);

Gauge.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  percentage: PropTypes.number.isRequired,
  color: PropTypes.oneOf([
    false,
    "primary",
    "success",
    "danger",
    "warning",
    "warning-alt",
    "info"
  ]),
  showPercentSign: PropTypes.bool
};

Gauge.defaultProps = {
  size: "medium",
  color: false,
  showPercentSign: false
};

const refGauge = React.forwardRef((props, ref) => (
  <Gauge innerRef={ref} {...props} />
));
export { refGauge as Gauge };
