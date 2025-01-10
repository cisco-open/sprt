import React from "react";
import PropTypes from "prop-types";
import omit from "lodash/omit";

/**
 * Tab Link
 */

class Tab extends React.Component {
  renderLink = () => {
    const { badged } = this.props;
    return (
      <a onClick={this.onTabClick} className={badged ? "flex" : ""}>
        {this.renderHeading()}
        {this.props.children}
      </a>
    );
  };

  renderNoLink = () => {
    const { badged } = this.props;
    return (
      <div className={badged ? "flex" : ""}>
        {this.renderHeading()}
        {this.props.children}
      </div>
    );
  };

  renderHeading = () => {
    const { badged } = this.props;
    return (
      <div className={`tab__heading${badged ? " text-left flex-fill" : ""}`}>
        {this.props.title}
      </div>
    );
  };

  onTabClick = e => {
    if (typeof this.props.onTabClick === "function") {
      this.props.onTabClick(this.props.tabName, e);
    }
  };

  render() {
    const { active, className, link, innerRef } = this.props;

    const otherProps = omit(this.props, [
      "active",
      "title",
      "link",
      "children",
      "innerRef",
      "className",
      "tabName",
      "onTabClick",
      "badged"
    ]);

    return (
      <li
        className={`tab${active ? " active" : ""}${
          className ? ` ${className}` : ""
        }`}
        ref={innerRef}
        {...otherProps}
      >
        {link ? this.renderLink() : this.renderNoLink()}
      </li>
    );
  }
}

Tab.propTypes = {
  active: PropTypes.bool,
  title: PropTypes.node.isRequired,
  link: PropTypes.bool,
  tabName: PropTypes.string.isRequired,
  onTabClick: PropTypes.func,
  badged: PropTypes.bool
};

Tab.defaultProps = {
  active: false,
  title: "Tab",
  link: true,
  badged: false
};

const refTab = React.forwardRef((props, ref) => (
  <Tab innerRef={ref} {...props} />
));
export { refTab as Tab };

/**
 * Tab Pane
 */

const TabPane = ({ active, children, className, innerRef }) => (
  <div
    className={`tab-pane${active ? " active" : ""}${
      className ? ` ${className}` : ""
    }`}
    ref={innerRef}
  >
    {children}
  </div>
);

TabPane.propTypes = {
  active: PropTypes.bool
};

TabPane.defaultProps = {
  active: false
};

const refTabPane = React.forwardRef((props, ref) => (
  <TabPane innerRef={ref} {...props} />
));
export { refTabPane as TabPane };

/**
 * Tabs UL Container
 */

class Tabs extends React.Component {
  getClassName() {
    const { align, vertical, inline, bordered, tall, className } = this.props;

    return (
      "tabs" +
      (align && typeof align === "string" && align !== "left"
        ? ` tabs--${align}`
        : "") +
      (tall ? " tabs--tall" : "") +
      (vertical ? " tabs--vertical" : "") +
      (bordered ? " tabs--bordered" : "") +
      (inline ? " tabs--inline" : "") +
      (className ? ` ${className}` : "")
    );
  }

  handleTabClick = (tabName, e) => {
    if (typeof this.props.onTabChange === "function") {
      this.props.onTabChange(tabName, e);
    }
  };

  renderChildren = children => {
    return React.Children.map(children, child => {
      if (child.props.tabName) {
        return React.cloneElement(child, { onTabClick: this.handleTabClick });
      } else {
        return child;
      }
    });
  };

  render() {
    const { children, innerRef } = this.props;

    const otherProps = omit(this.props, [
      "align",
      "tall",
      "vertical",
      "bordered",
      "inline",
      "className",
      "children",
      "onTabChange",
      "innerRef"
    ]);

    return (
      <ul className={this.getClassName()} ref={innerRef} {...otherProps}>
        {this.renderChildren(children)}
      </ul>
    );
  }
}

Tabs.propTypes = {
  align: PropTypes.oneOf([false, "left", "centered", "right"]),
  vertical: PropTypes.bool,
  inline: PropTypes.bool,
  bordered: PropTypes.bool,
  tall: PropTypes.bool,
  onTabChange: PropTypes.func
};

Tabs.defaultProps = {
  align: "left",
  vertical: false,
  inline: false,
  bordered: false,
  tall: false
};

const refTabs = React.forwardRef((props, ref) => (
  <Tabs innerRef={ref} {...props} />
));
export { refTabs as Tabs };
