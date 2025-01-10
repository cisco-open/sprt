import React from "react";
import TransitionGroup from "react-transition-group/TransitionGroup";
import CSSTransition from "react-transition-group/CSSTransition";

import { Button } from "react-cui-2.0";

import { SetActionsContext } from "../../contexts";

const DeleteButton = (props) => (
  <a className="no-decor qtr-margin-left" {...props}>
    <span className="icon-trash qtr-margin-right" />
    Delete
  </a>
);

const Confirmation = ({ confirm, cancel, ...props }) => (
  <span {...props}>
    Are you sure?
    <Button.Danger
      size="small"
      className="qtr-margin-left no-decor"
      onClick={confirm}
    >
      Yes
    </Button.Danger>
    <Button.Light
      size="small"
      className="qtr-margin-left no-decor"
      onClick={cancel}
    >
      No
    </Button.Light>
  </span>
);

const EditButton = (props) => (
  <a className="no-decor" {...props}>
    <span className="icon-edit qtr-margin-right" />
    Edit
  </a>
);

const transitionOptions = {
  timeout: {
    appear: 200,
    enter: 200,
    exit: 100,
  },
  classNames: {
    appearActive: "animated fast-200 fadeIn",
    enterActive: "animated fast-200 fadeIn",
    exitActive: "animated fast-100 fadeOut",
  },
  onExit: (node) => {
    node.style.position = "absolute";
    node.style.right = "10px";
  },
  onExited: (node) => {
    node.style.position = undefined;
    node.style.right = undefined;
  },
};

const SetActions = ({ set }) => {
  const { editSet, deleteSet } = React.useContext(SetActionsContext);
  const [needConfirm, setNeedConfirm] = React.useState(false);

  return (
    <div className="actions flex flex-center-vertical">
      <TransitionGroup component={null}>
        {needConfirm ? (
          <CSSTransition key={`confirmation-${set.id}`} {...transitionOptions}>
            <Confirmation
              confirm={() => deleteSet(set)}
              cancel={() => setNeedConfirm(false)}
              onMouseLeave={() => setNeedConfirm(false)}
            />
          </CSSTransition>
        ) : (
          <CSSTransition key={`actions-${set.id}`} {...transitionOptions}>
            <span>
              <EditButton onClick={() => editSet(set)} />
              <DeleteButton onClick={() => setNeedConfirm(true)} />
            </span>
          </CSSTransition>
        )}
      </TransitionGroup>
    </div>
  );
};

const CommandSet = ({ value, className }) => (
  <div
    className={`panel panel--bordered like-input ${className ? className : ""}`}
  >
    <div className="flex-fill flex-center-vertical" style={{ minWidth: 0 }}>
      <span className="half-margin-right text-ellipsis">
        {value.name}
        {value.count ? (
          <span className="qtr-margin-left text-muted text-small">
            {`Commands: ${value.count}`}
          </span>
        ) : (
          <span className="qtr-margin-left text-warning text-small">
            No commands
          </span>
        )}
      </span>
    </div>
    <SetActions set={value} />
  </div>
);

export default CommandSet;
