export const copyStringToClipboard = str => {
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

export const ErrorDetails = ({ error }) => {
  if (
    error.hasOwnProperty("response") &&
    error.response.hasOwnProperty("data") &&
    error.response.data.hasOwnProperty("error")
  )
    return (
      <div>
        Details:
        <pre>{error.response.data.error}</pre>
      </div>
    );
  return null;
};

export const DelayedHOC = ({ delay, onDelay, children }) => {
  React.useEffect(() => {
    const t = setTimeout(() => onDelay(), delay);
    return () => clearTimeout(t);
  }, []);

  return children;
};
