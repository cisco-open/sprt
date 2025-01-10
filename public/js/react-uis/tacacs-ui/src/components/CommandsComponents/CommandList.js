import React from "react";
import { sortableContainer } from "react-sortable-hoc";
import TransitionGroup from "react-transition-group/TransitionGroup";
import { getIn } from "formik";
import arrayMove from "array-move";

import { Alert } from "react-cui-2.0";
import Fade from "animations/FadeCollapse";

import { SetActionsContext } from "../../contexts";

import Command from "./Command";
import AddButton from "../common/AddButton";

const List = sortableContainer(({ items }) => {
  return (
    <div className="list sortable">
      <TransitionGroup component={null} appear>
        {items.map((value, index) => (
          <Fade key={index}>
            <Command key={index} index={index} value={value} />
          </Fade>
        ))}
      </TransitionGroup>
    </div>
  );
});

const Commands = ({ form, field }) => {
  const [commands, setCommands] = React.useState(
    getIn(form.values, field.name, [])
  );

  React.useEffect(() => {
    form.setFieldValue(field.name, commands);
  }, [commands]);

  const onSortEnd = ({ oldIndex, newIndex }) =>
    setCommands((v) => arrayMove(v, oldIndex, newIndex));

  const addCommand = (cmd = "") =>
    setCommands((v) => [...v, { cmd, dly: 0, acc: "authorized", stop: false }]);

  const saveCommand = (idx, command) =>
    setCommands((v) => {
      v[idx] = command;
      return [...v];
    });

  const deleteCommand = (idx) =>
    setCommands((v) => {
      v.splice(idx, 1);
      return [...v];
    });

  return (
    <>
      <div className="form-group">
        {field.value && field.value.length ? (
          <SetActionsContext.Provider
            value={{
              saveCommand,
              deleteCommand,
              addCommand,
            }}
          >
            <List
              items={field.value}
              onSortEnd={onSortEnd}
              lockAxis="y"
              transitionDuration={300}
              useDragHandle
              helperClass="form-group panel--raised like-input-hover opacity-70 z1100 no-margin"
            />
          </SetActionsContext.Provider>
        ) : (
          <Alert.Info>No commands added yet.</Alert.Info>
        )}
        <AddButton text="Add commands" onClick={() => addCommand()} />
      </div>
    </>
  );
};

export default Commands;
