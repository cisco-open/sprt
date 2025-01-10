import React from "react";
import PropTypes from "prop-types";

class Select extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      title: props.multiple ? [] : ""
    };
  }

  handleClick = () => {
    if (!this.state.isOpen) {
      // attach/remove event handler
      document.addEventListener("click", this.handleOutsideClick, false);
    } else {
      document.removeEventListener("click", this.handleOutsideClick, false);
    }

    this.setState(prevState => ({
      isOpen: !prevState.isOpen
    }));
  };

  handleOutsideClick = e => {
    // ignore clicks on the component itself
    const n = this.props.innerRef ? this.props.innerRef : this.node;
    if (n.contains(e.target)) {
      return;
    }

    this.handleClick();
  };

  handleOptionClick = (e, newValue, title) => {
    const { input, multiple } = this.props;
    if (!multiple) {
      input.onChange(newValue);
      this.setState({ title });

      this.handleClick();
    } else {
      if (e.target.checked) {
        input.onChange([...input.value, newValue]);
        this.setState({ title: [...this.state.title, title] });
      } else {
        input.onChange(input.value.filter(v => v !== newValue));
        this.setState({ title: this.state.title.filter(t => t !== title) });
      }
    }
  };

  isSelected = checkValue => {
    const { value } = this.props.input;

    if (this.props.multiple) {
      return (
        Array.isArray(value) && value.findIndex(v => v === checkValue) >= 0
      );
    }
    return value === checkValue;
  };

  renderOption = child => {
    const { value, children } = child.props;

    if (this.props.multiple) {
      return (
        <a>
          <label className="checkbox">
            <input
              type="checkbox"
              onClick={e => this.handleOptionClick(e, value, children)}
              checked={this.isSelected(value) ? true : false}
            />
            <span className="checkbox__input"></span>
          </label>
          <span>{children}</span>
        </a>
      );
    }

    return (
      <a
        onClick={e => this.handleOptionClick(e, value, children)}
        className={this.isSelected(value) ? "selected" : ""}
      >
        {children}
      </a>
    );
  };

  renderOptgroup = child => {
    const { label, children } = child.props;
    return (
      <div className="dropdown__group">
        <div className="dropdown__group-header">{label}</div>
        {this.renderChildren(children)}
      </div>
    );
  };

  renderChildren = children => {
    return React.Children.map(children, child => {
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

  findTitle = () => {
    let r = [];
    React.Children.forEach(this.props.children, ch => {
      if (this.isSelected(ch.props.value)) {
        r.push(ch.props.children);
      }
    });
    return r.join(", ");
  };

  getShowValue = () => {
    const { multiple, prompt, input } = this.props;
    if (
      typeof input.value === "undefined" ||
      input.value === null ||
      !input.value.toString().length
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
      input,
      id,
      meta,
      title,
      children,
      inline,
      innerRef
    } = this.props;
    const { touched, error, asyncValidating } = meta;

    return (
      <div
        className={
          `form-group dropdown` +
          (compressed ? " input--compressed" : "") +
          (this.state.isOpen ? " active" : "") +
          (inline ? " label--inline" : "") +
          (touched && error ? " form-group--error" : "") +
          (asyncValidating ? " form-group--loading" : "")
        }
        ref={
          innerRef
            ? innerRef
            : node => {
                this.node = node;
              }
        }
        {...(inline === "both" ? { style: { display: "inline-block" } } : {})}
      >
        <div className="form-group__text select" onClick={this.handleClick}>
          <input id={id} {...input} value={this.getShowValue()} />
          {title ? <label htmlFor={id}>{title}</label> : null}
        </div>
        <div className="dropdown__menu">{this.renderChildren(children)}</div>
        {touched && error ? (
          <div
            className={`help-block text-danger ${helpBlockAnimation}`}
            role="alert"
          >
            <span>{error}</span>
          </div>
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
  inline: PropTypes.oneOf([false, true, "both"])
};

Select.defaultProps = {
  compressed: false,
  prompt: "Select an option",
  multiple: false,
  inline: false
};

const refSelect = React.forwardRef((props, ref) => (
  <Select innerRef={ref} {...props} />
));
export { refSelect as Select };
