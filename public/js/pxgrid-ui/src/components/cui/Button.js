import React from "react";
import PropTypes from "prop-types";

const Button = ({
  color,
  size,
  disabled,
  icon,
  children,
  selected,
  innerRef,
  className,
  ...rest
}) => (
  <button
    className={
      `btn` +
      (color === "default" ? "" : ` btn--${color}`) +
      (size === "default" ? "" : ` btn--${size}`) +
      (icon ? " btn--icon" : "") +
      (disabled ? " disabled" : "") +
      (selected ? " selected" : "") +
      (className ? ` ${className}` : "")
    }
    ref={innerRef}
    {...rest}
  >
    {typeof icon === "string" ? <span className={`icon-${icon}`} /> : ""}
    {children}
  </button>
);

Button.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "negative",
    "success",
    "gray-ghost",
    "default",
    "white",
    "white-ghost"
  ]),
  size: PropTypes.oneOf(["small", "default", "wide", "large"]),
  disabled: PropTypes.bool,
  icon: PropTypes.string,
  selected: PropTypes.bool,
  type: PropTypes.string
};

Button.defaultProps = {
  color: "default",
  size: "default",
  disabled: false,
  icon: false,
  selected: false,
  type: "button"
};

const refButton = React.forwardRef((props, ref) => (
  <Button innerRef={ref} {...props} />
));

refButton.Primary = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="primary" {...props} />
));
refButton.Secondary = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="secondary" {...props} />
));
refButton.Negative = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="negative" {...props} />
));
refButton.Success = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="success" {...props} />
));
refButton.GrayGhost = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="gray-ghost" {...props} />
));
refButton.White = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="white" {...props} />
));
refButton.WhiteGhost = React.forwardRef(({ color, ...props }, ref) => (
  <Button innerRef={ref} color="white-ghost" {...props} />
));

export { refButton as Button };

const ButtonGroup = ({
  wide,
  square,
  withDivider,
  children,
  innerRef,
  className,
  ...rest
}) => (
  <div
    className={
      "btn-group" +
      (wide ? " btn-group--wide" : "") +
      (square ? " btn-group--square" : "") +
      (withDivider ? " btn-group--divider" : "") +
      (className ? ` ${className}` : "")
    }
    ref={innerRef}
    {...rest}
  >
    {children}
  </div>
);

ButtonGroup.propTypes = {
  wide: PropTypes.bool,
  square: PropTypes.bool,
  withDivider: PropTypes.bool
};

ButtonGroup.defaultProps = {
  wide: false,
  square: false,
  withDivider: false
};

const refButtonGroup = React.forwardRef((props, ref) => (
  <ButtonGroup innerRef={ref} {...props} />
));
export { refButtonGroup as ButtonGroup };
