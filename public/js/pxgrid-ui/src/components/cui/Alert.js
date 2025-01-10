import React from "react";
import PropTypes from "prop-types";

const Alert = ({
  type,
  children,
  title,
  dismissable,
  innerRef,
  className,
  onDismiss
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  const handleDismiss = e => {
    setDismissed(true);
    if (onDismiss) onDismiss(e);
  };

  if (dismissed) return null;

  let alertClass, icon;

  switch (type) {
    case "warning":
      alertClass = "alert--warning";
      icon = "icon-warning-outline";
      break;

    case "danger":
    case "error":
      alertClass = "alert--danger";
      icon = "icon-error-outline";
      break;

    case "success":
      alertClass = "alert--success";
      icon = "icon-check-outline";
      break;

    default:
      alertClass = "";
      icon = "icon-info-outline";
      break;
  }

  return (
    <div
      className={`alert ${alertClass} ${className ? className : ""}`}
      ref={innerRef}
    >
      <div className={`alert__icon ${icon}`} />
      <div className="alert__message">
        {title && <h4>{title}</h4>}
        {children}
      </div>
      {dismissable && (
        <a className="alert__close icon-close" onClick={handleDismiss} />
      )}
    </div>
  );
};

Alert.propTypes = {
  type: PropTypes.oneOf(["warning", "danger", "error", "success", "info"])
    .isRequired,
  dismissable: PropTypes.bool,
  title: PropTypes.string,
  onDismiss: PropTypes.func
};

Alert.defaultProps = {
  type: "info",
  dismissable: false,
  title: ""
};

const refAlert = React.forwardRef((props, ref) => (
  <Alert innerRef={ref} {...props} />
));

refAlert.Warning = React.forwardRef(({ type, ...props }, ref) => (
  <Alert innerRef={ref} type="warning" {...props} />
));
refAlert.Danger = React.forwardRef(({ type, ...props }, ref) => (
  <Alert innerRef={ref} type="danger" {...props} />
));
refAlert.Error = React.forwardRef(({ type, ...props }, ref) => (
  <Alert innerRef={ref} type="error" {...props} />
));
refAlert.Success = React.forwardRef(({ type, ...props }, ref) => (
  <Alert innerRef={ref} type="success" {...props} />
));
refAlert.Info = React.forwardRef(({ type, ...props }, ref) => (
  <Alert innerRef={ref} type="info" {...props} />
));

export { refAlert as Alert };
