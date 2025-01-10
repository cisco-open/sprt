import React from "react";
import PropTypes from "prop-types";

const Drawer = ({
  innerRef,
  children,
  isOpen,
  useHeader,
  title,
  className
}) => {
  const [state, setState] = React.useState(isOpen);

  const onClick = e => {
    e.stopPropagation();
    e.preventDefault();
    setState(prev => !prev);
  };

  return (
    <div
      className={
        "drawer" +
        (state ? " drawer--opened" : "") +
        (className ? ` ${className}` : "")
      }
      ref={innerRef}
    >
      {React.createElement(
        useHeader ? "h5" : "div",
        {
          className: "half-margin-bottom drawer__header"
        },
        <a onClick={onClick}>{title}</a>
      )}
      <div className="drawer__body animated faster fadeIn">{children}</div>
    </div>
  );
};

Drawer.propTypes = {
  isOpen: PropTypes.bool,
  useHeader: PropTypes.bool,
  title: PropTypes.string
};

const refDrawer = React.forwardRef((props, ref) => (
  <Drawer innerRef={ref} {...props} />
));

export { refDrawer as Drawer };
