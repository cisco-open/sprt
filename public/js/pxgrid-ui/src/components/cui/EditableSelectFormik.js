import React from "react";
import PropTypes from "prop-types";

import { InputHelpBlock } from "./InputHelpBlock";

import { getIn } from "formik";

const SelectChildren = ({ children, handleOptionClick, isSelected }) =>
  React.Children.map(children, (child, idx) => {
    switch (child.type) {
      case "option":
        return (
          <a
            key={idx}
            disabled={child.props.disabled}
            onClick={e => handleOptionClick(e, child.props.value)}
            className={isSelected(child.props.value) ? "selected" : ""}
          >
            {child.props.children}
          </a>
        );
      case "optgroup":
        return (
          <div key={idx} className="dropdown__group">
            <div className="dropdown__group-header">{child.props.label}</div>
            <SelectChildren
              handleOptionClick={handleOptionClick}
              isSelected={isSelected}
            >
              {child.props.children}
            </SelectChildren>
          </div>
        );
      default:
        return child;
    }
  });

const Select = ({
  children,
  compressed,
  field,
  form,
  id,
  inline,
  innerRef,
  prompt,
  title,
  type,
  ...rest
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [node, setNode] = React.useState(undefined);

  const handleClick = (newState = true) => {
    if (newState && !isOpen)
      document.addEventListener("click", handleOutsideClick, false);
    else document.removeEventListener("click", handleOutsideClick, false);

    setOpen(newState);
  };

  const handleOutsideClick = e => {
    const n = innerRef ? innerRef : node;
    if (n && n.contains(e.target)) return;

    handleClick(false);
  };

  const handleOptionClick = (e, newValue) => {
    form.setFieldValue(field.name, newValue);
    form.setFieldTouched(field.name, true);

    handleClick(false);
  };

  const isSelected = checkValue => field.value === checkValue;

  return (
    <div
      className={
        `form-group dropdown` +
        (compressed ? " input--compressed" : "") +
        (isOpen ? " active" : "") +
        (inline ? " label--inline" : "") +
        (getIn(form.touched, field.name) && getIn(form.errors, field.name)
          ? " form-group--error"
          : "")
      }
      ref={innerRef ? innerRef : node => setNode(node)}
    >
      <div
        className="form-group__text select editable"
        onClick={() => handleClick(true)}
      >
        <input
          id={id}
          {...field}
          type={type}
          placeholder={prompt}
          autoComplete="off"
          {...rest}
        />
        <label htmlFor={id}>{title}</label>
      </div>
      <div className="dropdown__menu">
        <SelectChildren
          handleOptionClick={handleOptionClick}
          isSelected={isSelected}
        >
          {children}
        </SelectChildren>
      </div>
      {getIn(form.touched, field.name) && getIn(form.errors, field.name) ? (
        <InputHelpBlock text={getIn(form.errors, field.name)} />
      ) : null}
    </div>
  );
};

Select.propTypes = {
  compressed: PropTypes.bool,
  id: PropTypes.string,
  title: PropTypes.string,
  prompt: PropTypes.string,
  inline: PropTypes.bool,
  type: PropTypes.oneOf(["number", "text"])
};

Select.defaultProps = {
  compressed: false,
  prompt: "Select an option",
  inline: false,
  type: "text"
};

const refSelect = React.forwardRef((props, ref) => (
  <Select innerRef={ref} {...props} />
));
export { refSelect as EditableSelect };
