import React from "react";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import { Dropdown, toast } from "react-cui-2.0";

import { deferLoadValues } from "../my-actions";

const Li = ({ value: { val, title, hint, ...options }, onClick }) => {
  if (val) options.value = val;

  return (
    <li>
      <a
        onClick={(e) => onClick(e, options)}
        title={hint || null}
        dangerouslySetInnerHTML={{ __html: title }}
      />
    </li>
  );
};

const DropdownValues = ({ values, onClick, renderElement }) => {
  if (!renderElement) renderElement = Li;

  return Object.keys(values).map((el, idx) => {
    if (typeof values[el] === "object") {
      if (values[el].type) {
        let di = values[el].title;
        switch (values[el].type) {
          case "header":
          case "header-full":
            return (
              <React.Fragment key={idx}>
                <a className="dropdown__group-header">{di}</a>
                {values[el].values ? (
                  <DropdownValues
                    values={values[el].values}
                    onClick={onClick}
                    renderElement={renderElement}
                  />
                ) : null}
              </React.Fragment>
            );
          case "group":
            return (
              <div className="submenu" key={idx}>
                <a>{di}</a>
                <div className="dropdown__menu">
                  {values[el].values ? (
                    <DropdownValues
                      values={values[el].values}
                      onClick={onClick}
                      renderElement={renderElement}
                    />
                  ) : null}
                </div>
              </div>
            );
          case "link":
          case "rest":
          case "value":
            return React.createElement(renderElement, {
              key: idx,
              value: values[el],
              onClick,
            });
        }
      } else
        return React.createElement(renderElement, {
          key: idx,
          value: values[el],
          onClick,
        });
    } else if (typeof values[el] === "string") {
      switch (values[el]) {
        case "divider":
          return <div key={idx} className="dropdown__divider" />;
        case "loader":
          return (
            <a key={idx}>
              <span className="icon-animation spin" aria-hidden="true" />
              &nbsp;Loading...
            </a>
          );
        case "loader-error":
          return (
            <a key={idx} className="text--danger">
              Got an error on loading data.
            </a>
          );
        case "empty":
          return <a key={idx}>Nothing saved.</a>;
        default:
          return React.createElement(renderElement, {
            key: idx,
            value: { value: values[el], title: values[el] },
            onClick,
          });
      }
    }
  });
};
export const DropdownWithValues = ({ title, type, openTo, ...rest }) => (
  <Dropdown
    openTo={openTo || "left"}
    header={title}
    type={type}
    className="btn--link"
    alwaysClose
  >
    <DropdownValues {...rest} />
  </Dropdown>
);

export const DropdownWithLoad = ({
  title,
  load_values,
  onClick,
  type,
  renderElement,
  openTo,
  ...props
}) => {
  const loadingState = useAsync({
    deferFn: deferLoadValues,
    from: load_values,
  });

  const reload = React.useCallback(() => loadingState.run(), [loadingState]);

  return (
    <Dropdown
      openTo={openTo || "left"}
      type={type}
      header={title}
      onOpen={reload}
      className="btn--link"
      alwaysClose
      {...props}
    >
      <IfRejected state={loadingState}>
        {(error) => {
          toast.error("Operation failed", error.message, false);
          return <DropdownValues values={["loader-error"]} />;
        }}
      </IfRejected>
      <IfPending state={loadingState}>
        <DropdownValues values={["loader"]} />
      </IfPending>
      <IfFulfilled state={loadingState}>
        {(data) => (
          <DropdownValues
            values={data}
            onClick={onClick}
            renderElement={renderElement}
          />
        )}
      </IfFulfilled>
    </Dropdown>
  );
};
