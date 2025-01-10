import React from "react";
import PropTypes from "prop-types";
import omit from "lodash/omit";

class Panel extends React.Component {
  state = { hovered: false };

  getMPB() {
    const { hover } = this.props;
    const { hovered } = this.state;

    const attributes = [
      ["noMargin", "no-margin"],
      ["border", "panel--bordered"],
      ["noPadding", "no-padding"],
    ];
    let result = [];
    for (const attribute of attributes) {
      var v =
        hovered &&
        typeof hover === "object" &&
        typeof hover[attribute[0]] !== "undefined"
          ? hover[attribute[0]]
          : this.props[attribute[0]];

      if (!v) {
        continue;
      }

      if (typeof v === "boolean") {
        result.push(attribute[1]);
        continue;
      }

      v.split(",").forEach((b) => {
        if (["top", "bottom", "left", "right"].includes(b)) {
          result.push(`${attribute[1]}-${b}`);
        }
      });
    }

    if (result.length) {
      return " " + result.join(" ");
    } else {
      return "";
    }
  }

  getRaise() {
    const { hover } = this.props;
    const { hovered } = this.state;

    const raised =
      hovered &&
      typeof hover === "object" &&
      typeof hover.raised !== "undefined"
        ? hover.raised
        : this.props.raised;

    if (!raised) {
      return "";
    }

    if (typeof raised === "boolean") {
      return " panel--raised";
    }

    return raised !== "flat"
      ? ` panel--raised${raised !== "medium" ? `-${raised}` : ""}`
      : "";
  }

  getHoverClass() {
    const { hover } = this.props;
    const { hovered } = this.state;
    if (typeof hover === "string" && hover && hovered) {
      return ` ${hover}`;
    }
    return "";
  }

  getColor() {
    const { hover, color } = this.props;
    const { hovered } = this.state;

    if (hovered && typeof hover === "object" && hover.color) {
      return ` panel--${hover.color}`;
    }

    return color !== "default" ? ` panel--${color}` : "";
  }

  getClassName() {
    const { compressed, loose, well, className } = this.props;

    return (
      "panel" +
      this.getColor() +
      (compressed ? " panel--compressed" : "") +
      (loose ? " panel--loose" : "") +
      (well ? " panel--well" : "") +
      this.getMPB() +
      this.getHoverClass() +
      this.getRaise() +
      (className ? ` ${className}` : "")
    );
  }

  render() {
    const { children, innerRef } = this.props;
    let otherProps = omit(this.props, [
      "color",
      "compressed",
      "loose",
      "raised",
      "border",
      "well",
      "hoverClass",
      "innerRef",
      "className",
      "children",
      "noMargin",
      "noPadding",
    ]);

    return (
      <div
        className={this.getClassName()}
        onMouseEnter={(e) => this.setState({ hovered: true })}
        onMouseLeave={(e) => this.setState({ hovered: false })}
        ref={innerRef}
        {...otherProps}
      >
        {children}
      </div>
    );
  }
}

Panel.propTypes = {
  color: PropTypes.oneOf([
    "default",
    "ltblue",
    "ltgray",
    "mdgray",
    "dkgray",
    "blue",
    "vibblue",
    "indigo",
    "success",
  ]).isRequired,
  compressed: PropTypes.bool,
  loose: PropTypes.bool,
  raised: PropTypes.oneOf([true, false, "flat", "small", "medium", "large"])
    .isRequired,
  border: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  noMargin: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  noPadding: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  well: PropTypes.bool,
  hover: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

Panel.defaultProps = {
  color: "default",
  compressed: false,
  loose: false,
  raised: false,
  border: false,
  noMargin: false,
  noPadding: false,
  well: false,
};

const refPanel = React.forwardRef((props, ref) => (
  <Panel innerRef={ref} {...props} />
));
export { refPanel as Panel };
