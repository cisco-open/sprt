import React from "react";
import PropTypes from "prop-types";

import { InputHelpBlock } from "./InputHelpBlock";

import { getIn } from "formik";

class Select extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      title: props.multiple ? [] : "",
    };
  }

  handleClick = () => {
    if (!this.state.isOpen) {
      // attach/remove event handler
      document.addEventListener("click", this.handleOutsideClick, false);
    } else {
      document.removeEventListener("click", this.handleOutsideClick, false);
    }

    this.setState((prevState) => ({
      isOpen: !prevState.isOpen,
    }));
  };

  handleOutsideClick = (e) => {
    // ignore clicks on the component itself
    const n = this.props.innerRef ? this.props.innerRef : this.node;
    if (n && n.contains(e.target)) {
      return;
    }

    this.handleClick();
  };

  handleOptionClick = (e, newValue, title) => {
    const { field, multiple, form } = this.props;

    if (!multiple) {
      form.setFieldValue(field.name, newValue);
      form.setFieldTouched(field.name);
      this.setState({ title });

      this.handleClick();
    } else {
      if (e.target.checked) {
        form.setFieldValue(field.name, [...field.value, newValue]);
        form.setFieldTouched(field.name);
        this.setState({ title: [...this.state.title, title] });
      } else {
        form.setFieldValue(
          field.name,
          field.value.filter((v) => v !== newValue)
        );
        form.setFieldTouched(field.name);
        this.setState({ title: this.state.title.filter((t) => t !== title) });
      }
    }
  };

  isSelected = (checkValue) => {
    const { value } = this.props.field;

    if (this.props.multiple) {
      return (
        Array.isArray(value) && value.findIndex((v) => v === checkValue) >= 0
      );
    }
    return value === checkValue;
  };

  renderOption = (child) => {
    const { value, children, disabled } = child.props;

    if (this.props.multiple) {
      return (
        <a disabled={disabled}>
          <label className="checkbox">
            <input
              type="checkbox"
              onClick={(e) =>
                this.handleOptionClick(
                  e,
                  value,
                  Array.isArray(children) ? children.join("") : children
                )
              }
              checked={this.isSelected(value) ? true : false}
            />
            <span className="checkbox__input" />
          </label>
          <span>{children}</span>
        </a>
      );
    }

    return (
      <a
        disabled={disabled}
        onClick={(e) =>
          this.handleOptionClick(
            e,
            value,
            Array.isArray(children) ? children.join("") : children
          )
        }
        className={this.isSelected(value) ? "selected" : ""}
      >
        {children}
      </a>
    );
  };

  renderOptgroup = (child) => {
    const { label, children } = child.props;
    return (
      <div className="dropdown__group">
        <div className="dropdown__group-header">{label}</div>
        {this.renderChildren(children)}
      </div>
    );
  };

  renderChildren = (children) => {
    return React.Children.map(children, (child) => {
      switch (child.type) {
        case "option":
          return this.renderOption(child);
        case "optgroup":
          return this.renderOptgroup(child);
        default:
          return child;
      }
    });
  };

  findTitle = (where) => {
    let r = [];
    React.Children.forEach(where || this.props.children, (ch) => {
      if (ch.type === "optgroup") {
        const temp = this.findTitle(ch.props.children);
        if (temp) r.push(temp);
      }
      if (this.isSelected(ch.props.value)) {
        r.push(
          Array.isArray(ch.props.children)
            ? ch.props.children.join("")
            : ch.props.children
        );
      }
    });
    return r.join(", ");
  };

  getShowValue = () => {
    const { multiple, prompt, field } = this.props;
    if (
      typeof field.value === "undefined" ||
      field.value === null ||
      !field.value.toString().length
    ) {
      return prompt;
    }

    if (multiple) {
      return this.state.title.length
        ? this.state.title.join(", ")
        : this.findTitle();
    } else {
      return this.state.title ? this.state.title : this.findTitle();
    }
  };

  render() {
    const {
      compressed,
      field,
      id,
      form,
      title,
      children,
      inline,
      up,
      innerRef,
      className,
      disabled,
      width,
    } = this.props;
    const { touched, errors } = form;

    return (
      <div
        className={
          `form-group dropdown` +
          (compressed ? " input--compressed" : "") +
          (this.state.isOpen ? " active" : "") +
          (inline ? " label--inline" : "") +
          (up ? " dropdown--up" : "") +
          (disabled ? " disabled" : "") +
          (className ? ` ${className}` : "") +
          (getIn(touched, field.name) && getIn(errors, field.name)
            ? " form-group--error"
            : "")
          // (asyncValidating ? " form-group--loading" : "")
        }
        ref={
          innerRef
            ? innerRef
            : (node) => {
                this.node = node;
              }
        }
        {...(inline === "both" ? { style: { display: "inline-block" } } : {})}
      >
        <div className="form-group__text select" onClick={this.handleClick}>
          <input
            id={id}
            {...field}
            value={this.getShowValue()}
            disabled={disabled}
            {...(width
              ? { style: { width: `${width}px`, minWidth: `${width}px` } }
              : {})}
          />
          {title ? <label htmlFor={id}>{title}</label> : null}
        </div>
        <div
          className="dropdown__menu"
          {...(width
            ? { style: { width: `${width}px`, minWidth: `${width}px` } }
            : {})}
        >
          {this.renderChildren(children)}
        </div>
        {getIn(touched, field.name) && getIn(errors, field.name) ? (
          <InputHelpBlock text={getIn(errors, field.name)} />
        ) : null}
      </div>
    );
  }
}

Select.propTypes = {
  compressed: PropTypes.bool,
  id: PropTypes.string,
  title: PropTypes.string,
  prompt: PropTypes.string,
  multiple: PropTypes.bool,
  inline: PropTypes.oneOf([false, true, "both"]),
  up: PropTypes.bool,
  disabled: PropTypes.bool,
  width: PropTypes.number,
};

Select.defaultProps = {
  compressed: false,
  prompt: "Select an option",
  multiple: false,
  inline: false,
};

const refSelect = React.forwardRef((props, ref) => (
  <Select innerRef={ref} {...props} />
));
export { refSelect as Select };
