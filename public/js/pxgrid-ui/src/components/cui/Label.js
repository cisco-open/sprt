import React from "react";
import PropTypes from "prop-types";
import omit from "lodash/omit";

class Label extends React.Component {
  state = { removed: false };

  prepareClassName = () => {
    const result = ["label"];
    const { color, size, raised, outlined, circle, className } = this.props;
    if (color !== "default") {
      result.push(`label--${color}`);
    }
    if (size !== "default") {
      result.push(`label--${size}`);
    }
    if (raised) {
      result.push(`label--raised`);
    }
    if (outlined) {
      result.push(`label--outlined`);
    }
    if (circle) {
      result.push(`label--circle`);
    }
    if (className) {
      result.push(className);
    }

    return result.join(" ");
  };

  renderCloseButton = () => {
    if (!this.props.removable) {
      return null;
    }

    return (
      <span className="icon-close" onClick={e => this.handleCloseClick(e)} />
    );
  };

  handleCloseClick = e => {
    let removed = true;
    const { onRemove } = this.props;
    if (onRemove) {
      removed = onRemove(e);
    }

    this.setState({ removed });
  };

  render() {
    const { removed } = this.state;
    if (removed) {
      return null;
    }

    const otherProps = omit(this.props, [
      "color",
      "size",
      "raised",
      "removable",
      "onRemove",
      "outlined",
      "circle",
      "className",
      "children",
      "innerRef"
    ]);

    return (
      <span className={this.prepareClassName()} {...otherProps}>
        {this.props.children}
        {this.renderCloseButton()}
      </span>
    );
  }
}

Label.propTypes = {
  color: PropTypes.oneOf([
    "info",
    "success",
    "warning",
    "warning-alt",
    "danger",
    "blue",
    "dkgray",
    "vibblue",
    "indigo",
    "default",
    "ltgray",
    "white",
    "ghost"
  ]),
  size: PropTypes.oneOf([
    "tiny",
    "small",
    "default",
    "large",
    "xlarge",
    "huge",
    "goliath"
  ]),
  raised: PropTypes.bool,
  removable: PropTypes.bool,
  onRemove: PropTypes.func,
  outlined: PropTypes.bool,
  circle: PropTypes.bool
};

Label.defaultProps = {
  color: "default",
  size: "default",
  raised: false,
  removable: false,
  outlined: false,
  circle: false
};

const refLabel = React.forwardRef((props, ref) => (
  <Label innerRef={ref} {...props} />
));
export { refLabel as Label };
