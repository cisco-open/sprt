import React from "react";
import PropTypes from "prop-types";

export const InputHelpBaloon = ({ baloon }) => (
  <span
    data-balloon={baloon}
    data-balloon-length="large"
    data-balloon-pos="up"
    className="qtr-margin-left"
  >
    <span className="icon-question-circle" style={{ cursor: "help" }} />
  </span>
);

InputHelpBaloon.propTypes = {
  baloon: PropTypes.string
};
