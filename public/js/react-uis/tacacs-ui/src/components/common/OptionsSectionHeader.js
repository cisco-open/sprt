import React from "react";
import PropTypes from "prop-types";

const OptionsSectionHeader = ({
  title,
  subTitle,
  marginBottom,
  className,
  ...props
}) => {
  if (subTitle) {
    return (
      <>
        <h2
          className={`display-3 no-margin text-capitalize flex-fluid ${
            className ? className : ""
          }`}
          {...props}
        >
          {title}
        </h2>
        <h5 className="base-margin-bottom subheading">{subTitle}</h5>
      </>
    );
  } else {
    return (
      <h2
        className={`display-3 no-margin ${
          marginBottom ? "half-margin-bottom" : ""
        } text-capitalize flex-fluid ${className ? className : ""}`}
        {...props}
      >
        {title}
      </h2>
    );
  }
};

OptionsSectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subTitle: PropTypes.string,
  marginBottom: PropTypes.bool,
  className: PropTypes.string
};

OptionsSectionHeader.defaultProps = {
  marginBottom: true
};

export default OptionsSectionHeader;
