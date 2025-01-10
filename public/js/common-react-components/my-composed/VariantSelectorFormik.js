import React from "react";
import PropTypes from "prop-types";
import { connect, getIn } from "formik";

import { Dropdown } from "react-cui-2.0";

export const VariantSelectorFormik = connect(
  React.forwardRef(
    (
      {
        variants,
        varPrefix,
        title,
        formik,
        inline,
        onChange,
        disableable,
        enableTitleAppend,
        className,
      },
      ref
    ) => {
      const [curIdx, setIdx] = React.useState(() => {
        const idx = variants.findIndex(
          (v) =>
            v.selected ||
            v.variant ===
              getIn(formik.values, `${varPrefix}.variant`, undefined)
        );
        return !disableable && idx < 0 ? 0 : idx;
      });

      React.useEffect(() => {
        const idx = variants.findIndex(
          (v) =>
            v.variant ===
            getIn(formik.values, `${varPrefix}.variant`, undefined)
        );
        if (idx < 0 || idx === curIdx) return;
        setIdx(idx);
      }, [getIn(formik.values, `${varPrefix}.variant`, undefined)]);

      React.useLayoutEffect(() => {
        if (curIdx >= 0) {
          formik.setFieldValue(
            `${varPrefix}.variant`,
            variants[curIdx].variant
          );
          if (onChange) onChange(variants[curIdx]);
        } else {
          formik.setFieldValue(varPrefix, undefined);
          formik.unregisterField(varPrefix);
        }
      }, [curIdx]);

      const dd = (el, t) =>
        React.createElement(
          el,
          { className: "secondary-tabs" },
          t ? <span className="half-margin-right">{t}</span> : null,
          <Dropdown
            type="link"
            header={variants[curIdx].display}
            alwaysClose
            className="flex-center-vertical"
            stopPropagation
          >
            {variants.map((v, idx) => (
              <a
                key={v.variant}
                onClick={() => setIdx(idx)}
                className={
                  variants[curIdx].variant === v.variant ? "selected" : ""
                }
              >
                {v.display}
              </a>
            ))}
          </Dropdown>
        );

      return (
        <div
          className={
            "form-group" +
            (inline ? " inline-variants" : "") +
            (className ? ` ${className}` : "")
          }
          ref={ref}
        >
          {disableable ? (
            <span className="flex-center-vertical">
              <label className="switch">
                <input
                  type="checkbox"
                  onChange={() => setIdx((p) => (p >= 0 ? -1 : 0))}
                  checked={curIdx >= 0}
                />
                <span className="switch__input" />
                <span className="switch__label">{title}</span>
              </label>
              {curIdx >= 0 ? dd("span", enableTitleAppend) : null}
            </span>
          ) : (
            dd("div", title)
          )}
          {disableable && curIdx < 0 ? null : (
            <div className="tabs-wrap panel">{variants[curIdx].component}</div>
          )}
        </div>
      );
    }
  )
);

VariantSelectorFormik.propTypes = {
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      variant: PropTypes.string,
      display: PropTypes.string,
      component: PropTypes.node,
    })
  ).isRequired,
  varPrefix: PropTypes.string.isRequired,
  title: PropTypes.node,
  inline: PropTypes.bool,
  onChange: PropTypes.func,
  disableable: PropTypes.bool,
  isDisabled: PropTypes.bool,
  enableTitleAppend: PropTypes.string,
};

VariantSelectorFormik.defaultProps = {
  disableable: false,
  isDisabled: false,
};
