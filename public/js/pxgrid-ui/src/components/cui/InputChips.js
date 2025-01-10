import React from "react";
import PropTypes from "prop-types";
import { getIn } from "formik";

import { InputHelpBaloon } from "./InputHelpBaloon";
import { InputHelpBlock } from "./InputHelpBlock";

const InputChips = ({
  className,
  id,
  field,
  label,
  form: { touched, errors, setFieldValue, setFieldTouched },
  chipsColor,
  addOnBlur,
  allowRegex,
  allowRepeat,
  delimiters,
  valueValidator,
  maxChips,
  baloon,
  innerRef
}) => {
  const [focused, setFocus] = React.useState(false);

  const handleKeyDown = event => {
    if (typeof delimiters === "string") {
      const map = Array.prototype.map;
      delimiters = map.call(delimiters, ch => ch.charCodeAt(0));
    }

    if (delimiters.includes(event.keyCode)) {
      addValue(event.target.value);
      event.target.value = "";
      event.stopPropagation();
      event.preventDefault();
    }
  };

  React.useEffect(() => {
    if (
      maxChips &&
      Array.isArray(field.value) &&
      field.value.length >= maxChips
    )
      setFocus(false);
  }, [field.value]);

  const addValue = v => {
    if (typeof valueValidator === "function") {
      v = valueValidator(v);
      if (v === false) return;
    }
    if (allowRepeat) {
      setFieldValue(field.name, [...field.value, v]);
    } else {
      if (!field.value.includes(v))
        setFieldValue(field.name, [...field.value, v]);
    }
  };

  const handleBlur = event => {
    if (addOnBlur && event.target && event.target.value) {
      const { value } = event.target;
      if (allowRegex && RegExp(allowRegex).test(value)) {
        addValue(value);
      } else if (!allowRegex) {
        addValue(value);
      }
    }
    event.target.value = "";
    setFocus(false);
    field.onBlur();
  };

  const handleDelete = idx => {
    const na = [...field.value];
    na.splice(idx, 1);

    setFieldTouched(field.name, true);
    setFieldValue(field.name, na);
  };

  return (
    <div
      className={
        "form-group" +
        (className ? ` ${className}` : "") +
        (getIn(touched, field.name) && getIn(errors, field.name)
          ? " form-group--error"
          : "")
      }
      ref={innerRef}
    >
      <div className={`form-group__text chips ${focused ? "focused" : ""}`}>
        {label ? (
          <label htmlFor={id}>
            {label}
            {baloon ? <InputHelpBaloon baloon={baloon} /> : null}
          </label>
        ) : null}
        <div className="input">
          {Array.isArray(field.value) && field.value.length ? (
            <span className="chips-outer">
              <span className="chips-inner">
                {field.value.map((v, i) => (
                  <span
                    className={`label label--${chipsColor} label--small`}
                    key={`${v}-${i}`}
                  >
                    {v}
                    <span
                      className="icon-close"
                      onClick={() => handleDelete(i)}
                    />
                  </span>
                ))}
              </span>
            </span>
          ) : null}
          {!maxChips ||
          (maxChips &&
            Array.isArray(field.value) &&
            field.value.length < maxChips) ? (
            <input
              type="text"
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={() => setFocus(true)}
            />
          ) : null}
        </div>
      </div>
      {getIn(touched, field.name) && getIn(errors, field.name) ? (
        <InputHelpBlock text={getIn(errors, field.name)} />
      ) : null}
    </div>
  );
};

InputChips.propTypes = {
  label: PropTypes.node,
  rows: PropTypes.number,
  chipsColor: PropTypes.oneOf([
    "info",
    "success",
    "warning",
    "warning-alt",
    "danger",
    "blue",
    "dkgray",
    "vibblue",
    "indigo",
    "default",
    "ltgray",
    "white",
    "ghost"
  ]),
  addOnBlur: PropTypes.bool,
  allowRepeat: PropTypes.bool,
  allowRegex: PropTypes.string,
  delimiters: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.number)
  ]),
  valueValidator: PropTypes.func,
  maxChips: PropTypes.number,
  baloon: PropTypes.string
};

InputChips.defaultProps = {
  color: "default",
  addOnBlur: true,
  delimiters: [13]
};

const refInputChips = React.forwardRef((props, ref) => (
  <InputChips innerRef={ref} {...props} />
));

export { refInputChips as InputChips };
