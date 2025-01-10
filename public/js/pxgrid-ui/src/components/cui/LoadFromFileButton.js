import React from "react";
import PropTypes from "prop-types";

import { Button } from "./Button";

const LoadFromFileButton = ({ onLoad, ...rest }) => {
  const inputRef = React.createRef();
  let fileReader;

  const handleFileRead = e => {
    const content = fileReader.result;
    onLoad(content);
  };

  const handleFileChosen = file => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  return (
    <>
      <Button
        onClick={() => {
          inputRef.current.click();
        }}
        {...rest}
      />
      <input
        type="file"
        style={{ display: "none" }}
        id="file"
        ref={inputRef}
        onChange={e => handleFileChosen(e.target.files[0])}
      />
    </>
  );
};

LoadFromFileButton.propTypes = {
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
  type: PropTypes.string,
  icon: PropTypes.string,
  title: PropTypes.string,
  onLoad: PropTypes.func.isRequired
};

LoadFromFileButton.defaultProps = {
  type: "button",
  icon: "upload",
  color: "white",
  title: "Load from file"
};

const refLoadFromFileButton = React.forwardRef((props, ref) => (
  <LoadFromFileButton innerRef={ref} {...props} />
));
export { refLoadFromFileButton as LoadFromFileButton };
