import React from "react";
import TransitionGroup from "react-transition-group/TransitionGroup";
import { connect, getIn } from "formik";
// import arrayMove from "array-move";
import uuid from "uuid/v4";

import { Alert } from "react-cui-2.0";
import Fade from "animations/FadeCollapse";

import { SetActionsContext } from "../../contexts";

import CommandSet from "./CommandSet";
import AddButton from "../common/AddButton";
import EditModal from "./EditModal";

const SetsList = ({ items }) => (
  <div className="list sortable">
    <TransitionGroup component={null} appear>
      {items.map((value, index) => (
        <Fade key={value.id}>
          <CommandSet index={index} value={value} />
        </Fade>
      ))}
    </TransitionGroup>
  </div>
);

const Sets = ({ formik }) => {
  const [order, setOrder] = React.useState([]);
  const [toEdit, setToEdit] = React.useState(null);

  React.useEffect(() => {
    if (!toEdit) {
      formik.setFieldValue("commands.temp", undefined, false);
      formik.unregisterField("commands.temp");
    }
  }, [toEdit]);

  React.useEffect(() => {
    formik.setFieldValue(
      "commands.order",
      order.map((o) => o.id),
      false
    );
  }, [order]);

  // const onSortEnd = ({ oldIndex, newIndex }) =>
  //   setOrder((items) => arrayMove(items, oldIndex, newIndex));

  const addSet = () => {
    setOrder((prev) => {
      const newOrder = [
        ...prev,
        { id: uuid(), name: `Set ${prev.length + 1}` },
      ];
      setToEdit(newOrder[newOrder.length - 1]);
      return newOrder;
    });
  };

  const editSet = (set) => setToEdit(set);

  const saveSet = (set, data) => {
    formik.setFieldValue(["commands", set.id], data, false);
    const idx = order.findIndex((v) => v.id === set.id);
    order[idx].name = data.name;
    order[idx].count = data.commands.length || 0;
    setOrder([...order]);
    setToEdit(null);
  };

  const deleteSet = (set) => {
    const idx = order.findIndex((v) => v.id === set.id);
    formik.setFieldValue(["commands", set.id], undefined, false);
    formik.unregisterField(["commands", set.id]);

    setOrder([...order.slice(0, idx), ...order.slice(idx + 1)]);
  };

  return (
    <>
      <div className="form-group">
        <div className="form-group__text">
          <label>
            Command sets
            {getIn(formik.values, "commands.order", []).length > 1
              ? ". You can re-order them by dragging."
              : ""}
          </label>
          {order.length ? (
            <SetActionsContext.Provider
              value={{
                editSet,
                deleteSet,
              }}
            >
              <SetsList items={order} />
            </SetActionsContext.Provider>
          ) : (
            <Alert.Info>
              No sets yet, add if authorization/accounting is required.
            </Alert.Info>
          )}
        </div>
      </div>
      <AddButton text="Add set" onClick={addSet} />
      <EditModal
        set={toEdit}
        handleClose={() => setToEdit(null)}
        save={saveSet}
      />
    </>
  );
};

export default connect(Sets);
