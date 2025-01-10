import React from "react";
import { sortableElement } from "react-sortable-hoc";

import { toast, Dropdown, Panel } from "react-cui-2.0";

import { SetActionsContext } from "../../contexts";

import WithHandle from "../common/WithHandle";
import { msToTime, MS_IN_HOUR } from "../common/Time";

const EditContext = React.createContext();

const ActionButton = ({ icon, marginLeft, ...props }) => (
  <a className={`no-decor${marginLeft ? " qtr-margin-left" : ""}`} {...props}>
    <span className={`icon-${icon}`} />
  </a>
);

const DeleteButton = ({ icon, ...props }) => (
  <ActionButton icon="delete" {...props} />
);

const EditDly = ({ inputRef }) => {
  const { index, value, saveDly: save, cancel } = React.useContext(EditContext);
  const [v, setV] = React.useState(value.dly);

  const change = (e) => {
    let v = e.target.value;
    if (Number.isNaN(v)) {
      toast("error", "Incorrect input", "Only numbers allowed", false);
      return;
    }
    v = parseInt(v, 10);
    if (v < 0) {
      toast("error", "Incorrect input", "Only positive numbers allowed", false);
      return;
    }
    if (v > 10 * MS_IN_HOUR) {
      toast("error", "Incorrect input", "Not more than 10 hours", false);
      return;
    }

    setV(v || 0);
  };

  const keyPress = (e) => {
    if (e.key === "Enter") {
      save(v);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  return (
    <div className="form-group">
      <div className="form-group__text">
        <input
          ref={inputRef}
          type="text"
          value={v}
          onChange={change}
          onKeyPress={keyPress}
          onBlur={() => save(v)}
          id={`delay-edit-${index}`}
        />
        <label htmlFor={`delay-edit-${index}`}>
          {"Delay "}
          <span className="text-small">(ms)</span>
        </label>
      </div>
    </div>
  );
};

const EditAcct = () => {
  const {
    value: { acc },
    saveAcc: save,
  } = React.useContext(EditContext);

  return (
    <div className="form-group form-group--inline">
      <div className="form-group__text">
        <label htmlFor="-">Accounting</label>
        <ul className="list list--inline divider--vertical">
          {[
            ["off", "off"],
            ["authorized", "if authorized"],
            ["always", "always"],
          ].map(([v, text]) => (
            <li key={v} style={{ whiteSpace: "nowrap" }}>
              {acc === v ? (
                <span className="text-primary">{text}</span>
              ) : (
                <span className="link" onClick={() => save(v)}>
                  {text}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const EditStop = () => {
  const {
    value: { stop },
    saveStop: save,
  } = React.useContext(EditContext);

  return (
    <div className="form-group">
      <label className="switch" style={{ top: "unset" }}>
        <input type="checkbox" checked={stop} onChange={() => save(!stop)} />
        <span className="switch__input" />
        <span className="switch__label hidden-xs">
          Stop if authorization failed
        </span>
      </label>
    </div>
  );
};

const EditDropDown = () => {
  return (
    <Panel>
      <EditDly />
      <EditStop />
      <EditAcct />
    </Panel>
  );
};

const DisplayActions = () => {
  const { editState, index } = React.useContext(EditContext);
  const { deleteCommand } = React.useContext(SetActionsContext);
  if (editState) return null;

  return (
    <div className="actions flex flex-center-vertical base-margin-left">
      <DeleteButton onClick={() => deleteCommand(index)} title="Delete" />
    </div>
  );
};

const EditActions = () => {
  const { editState, cancel, saveCmd, saveDly } = React.useContext(EditContext);
  if (!editState) return null;

  return (
    <div className="actions flex flex-center-vertical">
      <ActionButton
        onClick={editState === "CMD" ? saveCmd : saveDly}
        title="Save"
        icon="check"
      />
      <ActionButton onClick={cancel} title="Cancel" marginLeft icon="close" />
    </div>
  );
};

const Display = ({ inputRef, ...props }) => {
  const { editState, value, editCmd } = React.useContext(EditContext);
  if (editState) return null;
  const [cmd, ...attributes] = value.cmd.split(" ");
  return (
    <>
      <WithHandle>
        <span
          className="half-margin-right text-ellipsis"
          {...props}
          style={{ cursor: "text" }}
          onClick={editCmd}
        >
          <span className="text-bold command" title="Command">
            {cmd}
          </span>
          <span key="attributes" className="attributes" title="Attributes">
            {` ${attributes.join(" ")}`}
          </span>
        </span>
      </WithHandle>
      <Dropdown
        type="custom"
        header={
          <div className="delay-wrap btn--dropdown">
            <span title="Delay">{`+${msToTime(value.dly)}`}</span>
            {", "}
            <span title="Accounting">
              {"accounting: "}
              {value.acc === "off" ? (
                <span className="text-danger">off</span>
              ) : value.acc === "authorized" ? (
                <span className="text-success">if authorized</span>
              ) : (
                <span className="text-warning">always</span>
              )}
            </span>
            {value.stop ? (
              <>
                {", "}
                <span title="Stop if authZ failed" className="text-danger">
                  stop
                </span>
              </>
            ) : null}
          </div>
        }
        alwaysClose={false}
        openTo="left"
      >
        <EditDropDown />
      </Dropdown>
    </>
  );
};

const EditCmd = () => {
  const { editState, value, saveCmd: save, cancel } = React.useContext(
    EditContext
  );
  const [v, setV] = React.useState(value.cmd);
  const { addCommand } = React.useContext(SetActionsContext);
  const inputRef = React.useRef();
  React.useEffect(() => {
    if (editState && inputRef.current) inputRef.current.focus();
  }, [editState]);

  if (!editState) return null;

  const paste = (e) => {
    let pastedText;
    if (window.clipboardData && window.clipboardData.getData) {
      // IE
      pastedText = window.clipboardData.getData("Text");
    } else if (e.clipboardData && e.clipboardData.getData) {
      pastedText = e.clipboardData.getData("text/plain");
    }
    if (pastedText) {
      const lines = pastedText
        .split(/\r\n|\r|\n/)
        .filter((v) => v.trim().length)
        .map((v) => v.trim());
      if (lines.length > 1) {
        e.preventDefault();
        e.stopPropagation();

        const from = Math.min(
          inputRef.current.selectionStart,
          inputRef.current.selectionEnd
        );
        const to = Math.max(
          inputRef.current.selectionStart,
          inputRef.current.selectionEnd
        );

        setV(v.substr(0, from) + lines[0] + v.substr(to));
        lines.splice(0, 1);
        lines.forEach((l) => addCommand(l));
        return false;
      }
    }
    return true;
  };

  const change = (e) => setV(e.target.value);

  const keyDown = (e) => {
    if (e.key === "Enter") save(v);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  return (
    <WithHandle>
      <input
        ref={inputRef}
        type="text"
        value={v}
        onChange={change}
        onPaste={paste}
        onKeyDown={keyDown}
        onBlur={() => save(v)}
      />
    </WithHandle>
  );
};

const Command = sortableElement(({ index, value, innerRef }) => {
  const [edit, setEdit] = React.useState(false);
  const { saveCommand, deleteCommand } = React.useContext(SetActionsContext);

  React.useEffect(() => {
    if (!value.cmd) setEdit(true);
  }, []);

  const saveCmd = (cmd) => {
    const newValue = { ...value, cmd };
    setEdit(false);
    if (newValue.cmd.trim()) saveCommand(index, newValue);
    else deleteCommand(index);
  };
  const cancel = () => {
    if (edit && !value.cmd.trim()) deleteCommand(index);
    setEdit(false);
  };
  const saveDly = (dly) => saveCommand(index, { ...value, dly: dly || 0 });
  const saveAcc = (acc) => saveCommand(index, { ...value, acc });
  const saveStop = (stop) => saveCommand(index, { ...value, stop });

  return (
    <EditContext.Provider
      value={{
        editState: edit,
        index,
        value,
        cancel,
        saveCmd,
        saveDly,
        saveAcc,
        saveStop,
        editCmd: () => setEdit(true),
      }}
    >
      <div
        className={`panel panel--bordered like-input ${edit ? "focused" : ""}`}
        ref={innerRef}
      >
        <EditCmd />
        <Display />
        <DisplayActions />
        <EditActions />
      </div>
    </EditContext.Provider>
  );
});

export default Command;
