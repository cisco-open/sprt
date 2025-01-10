import React from "react";
import {
  toast as _toast,
  cssTransition,
  ToastContainer as ToastifyContainer
} from "react-toastify";
import PropTypes from "prop-types";
import "react-toastify/dist/ReactToastify.min.css";

const copyStringToClipboard = str => {
  // Create new element
  var el = document.createElement("textarea");
  // Set value (string to be copied)
  el.value = str;
  // Set non-editable to avoid focus and move outside of view
  el.setAttribute("readonly", "");
  el.style = { position: "absolute", left: "-9999px" };
  document.body.appendChild(el);
  // Select text inside element
  el.select();
  // Copy text to clipboard
  document.execCommand("copy");
  // Remove temporary element
  document.body.removeChild(el);
};

const ToastIcon = ({ type }) => {
  switch (type) {
    case "success":
      type = "text-success icon-check-outline";
      break;
    case "error":
      type = "text-danger icon-error-outline";
      break;
    case "warning":
      type = "text-warning icon-warning-outline";
      break;
    case "info":
      type = "text-info icon-info-outline";
      break;
    case "none":
      return null;
    default:
      type = "text-muted icon-alert";
      break;
  }

  return <div className={`toast__icon ${type}`} />;
};

const Toast = ({ title, message, type, copyError }) => (
  <div className="flex">
    <ToastIcon type={type} />
    <div className="toast__body">
      {title ? <div className="toast__title">{title}</div> : null}
      {message ? (
        <div className="toast__message">
          {message}
          {type === "error" && copyError ? (
            <>
              <br />
              <br />
              <a onClick={() => copyStringToClipboard(message)}>
                Copy to clipboard
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  </div>
);

const Fade = cssTransition({
  enter: "fadeIn",
  exit: "fadeOut",
  duration: 300
});

export const toast = (
  type,
  title,
  message,
  copyError = true,
  containerId = "_GLOBAL_"
) =>
  _toast(<Toast {...{ type, title, message, copyError }} />, { containerId });

toast.success = (...args) => toast("success", ...args);
toast.error = (...args) => toast("error", ...args);
toast.warning = (...args) => toast("warning", ...args);
toast.info = (...args) => toast("info", ...args);
toast.none = (...args) => toast("none", ...args);
toast.update = (...args) => _toast.update(...args);
toast.dismiss = (...args) => _toast.dismiss(...args);

export const ToastContainer = props => (
  <ToastifyContainer
    transition={Fade}
    {...props}
    closeButton={false}
    toastClassName="toast"
    style={{
      width: "unset"
    }}
  />
);

ToastContainer.propTypes = {
  position: PropTypes.string,
  autoClose: PropTypes.number,
  draggable: PropTypes.bool,
  hideProgressBar: PropTypes.bool,
  containerId: PropTypes.oneOf(PropTypes.string, PropTypes.number)
};

ToastContainer.defaultProps = {
  position: "bottom-right",
  autoClose: 5000,
  draggable: false,
  hideProgressBar: true,
  containerId: "_GLOBAL_"
};
