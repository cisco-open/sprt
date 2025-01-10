import React from "react";
import PropTypes from "prop-types";

import { Button, Icon } from "react-cui-2.0";

export const LoadFromFileButton = ({ onLoad, ...rest }) => {
  const inputRef = React.createRef();
  let fileReader;

  const handleFileRead = (e) => {
    const content = fileReader.result;
    onLoad(content);
  };

  const handleFileChosen = (file) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  return (
    <>
      <input
        type="file"
        style={{ display: "none" }}
        id="file"
        ref={inputRef}
        onChange={(e) => handleFileChosen(e.target.files[0])}
      />
      <Button
        onClick={() => {
          inputRef.current.click();
        }}
        {...rest}
      />
    </>
  );
};

LoadFromFileButton.propTypes = {
  color: PropTypes.string.isRequired,
  type: PropTypes.string,
  icon: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
  onLoad: PropTypes.func.isRequired,
};

LoadFromFileButton.defaultProps = {
  type: "button",
  icon: true,
  title: "Load from file",
  children: <Icon icon="upload" />,
};
