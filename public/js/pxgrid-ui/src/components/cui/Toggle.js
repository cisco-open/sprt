import React from "react";
import PropTypes from "prop-types";
import omit from "lodash/omit";

class Toggle extends React.Component {
  state = { toggled: false };

  onToggleClick = () => {
    this.setState({ toggled: !this.state.toggled });
  };

  renderLinks = () => {
    const { toggled } = this.state;
    const { showText, hideText, links } = this.props;

    return (
      <div className={`links ${toggled ? "active" : ""}`}>
        <a onClick={this.onToggleClick} className="toggle-link link">
          <span className="toggle-label">
            {toggled && hideText ? hideText : showText}
          </span>
        </a>
        {links
          ? links.map(({ className, onClick, text }) => {
              return (
                <React.Fragment>
                  <div className="v-separator" />
                  <a
                    className={`link ${className ? className : ""}`}
                    onClick={onClick}
                  >
                    {text}
                  </a>
                </React.Fragment>
              );
            })
          : null}
      </div>
    );
  };

  renderBody = () => {
    const { toggled } = this.state;
    const { className } = this.props.children.props;

    return React.cloneElement(this.props.children, {
      className: (className ? className : "") + (!toggled ? " hide" : "")
    });
  };

  render() {
    const { innerRef, className } = this.props;
    const otherProps = omit(this.props, [
      "children",
      "innerRef",
      "className",
      "links",
      "showText",
      "hideText"
    ]);

    return (
      <div
        className={"toggler " + (className ? className : "")}
        ref={innerRef}
        {...otherProps}
      >
        {this.renderLinks()}
        {this.renderBody()}
      </div>
    );
  }
}

Toggle.propTypes = {
  children: PropTypes.element.isRequired,
  showText: PropTypes.string.isRequired,
  hideText: PropTypes.string,
  links: PropTypes.arrayOf(PropTypes.object)
};

const refToggle = React.forwardRef((props, ref) => (
  <Toggle innerRef={ref} {...props} />
));
export { refToggle as Toggle };
