import PropTypes from "prop-types";

export const selectedType = PropTypes.oneOfType([
  PropTypes.arrayOf(
    PropTypes.shape({
      mac: PropTypes.string,
      ipAddr: PropTypes.string,
      sessid: PropTypes.string
    })
  ),
  PropTypes.string
]);

export const actionType = {
  update: "update",
  drop: "drop"
};
