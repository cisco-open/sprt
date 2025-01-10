import React from "react";
import omit from "lodash/omit";
import { Dropzone, Dropdown, Textarea } from "./";

class FileOrText extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selected: "file" };

    if (
      props.input &&
      props.input.value &&
      typeof props.input.value === "string"
    ) {
      this.state.selected = "text";
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.selected !== nextState.selected) {
      nextProps.input.onChange(null);
      if (nextProps.meta) {
        nextProps.meta.touched = false;
      }
    }
    return true;
  }

  renderInner() {
    const childProps = {
      ...this.props,
      label: null
    };
    return (
      <div className="animated fadeIn fastest">
        {this.state.selected === "file" ? (
          <Dropzone {...childProps} />
        ) : (
          <Textarea
            {...omit(childProps, [
              "inline",
              "maxFileSize",
              "maxFiles",
              "showTotalSelected"
            ])}
            rows={5}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            name="clientCertificate"
            textareaClass="text-monospace"
          />
        )}
      </div>
    );
  }

  render() {
    const { selected } = this.state;
    const { name, label, innerRef } = this.props;

    return (
      <div className="form-group" ref={innerRef}>
        <div className="flex">
          <label htmlFor={name} className="half-margin-right flex-fill">
            {label}
          </label>
          <Dropdown
            type="link"
            tail
            header={selected === "file" ? "As file" : "As text"}
            alwaysClose
            openTo="left"
          >
            <a
              onClick={() => this.setState({ selected: "file" })}
              className={selected === "file" ? "selected" : ""}
            >
              <span className="icon-file-text-o half-margin-right" />
              As file
            </a>
            <a
              onClick={() => this.setState({ selected: "text" })}
              className={selected === "text" ? "selected" : ""}
            >
              <span className="icon-text half-margin-right" />
              As text
            </a>
          </Dropdown>
        </div>
        {this.renderInner()}
      </div>
    );
  }
}

const refFileOrText = React.forwardRef((props, ref) => (
  <FileOrText innerRef={ref} {...props} />
));
export { refFileOrText as FileOrText };
