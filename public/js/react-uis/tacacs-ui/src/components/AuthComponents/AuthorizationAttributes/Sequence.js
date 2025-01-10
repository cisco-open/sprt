import React from "react";
import { sortableContainer } from "react-sortable-hoc";
import TransitionGroup from "react-transition-group/TransitionGroup";
import { connect, getIn } from "formik";
import arrayMove from "array-move";
import uuid from "uuid/v4";

import { Alert, Button, ButtonGroup } from "react-cui-2.0";
import Fade from "animations/FadeCollapse";

import { SetActionsContext } from "../../../contexts";

import Request from "./Request";
import EditModal from "./EditModal";

const RequestsList = sortableContainer(({ items }) => {
  return (
    <div className="list sortable">
      <TransitionGroup component={null} appear>
        {items.map((value, index) => (
          <Fade key={value.id}>
            <Request index={index} value={value} />
          </Fade>
        ))}
      </TransitionGroup>
    </div>
  );
});

const Sequence = ({ formik }) => {
  const [order, setOrder] = React.useState([]);
  const [toEdit, setToEdit] = React.useState(null);

  React.useEffect(() => {
    if (!toEdit) {
      formik.setFieldValue("authz.temp", undefined, false);
      formik.unregisterField("authz.temp");
    }
  }, [toEdit]);

  React.useEffect(() => {
    formik.setFieldValue(
      "authz.order",
      order.map((o) => o.id),
      false
    );
  }, [order]);

  const onSortEnd = ({ oldIndex, newIndex }) =>
    setOrder((items) => arrayMove(items, oldIndex, newIndex));

  const addReq = (type) => {
    setOrder((prev) => {
      const id = uuid();
      const newOrder = [
        ...prev,
        {
          id,
          type,
          dly: 0,
          name: `Request ${prev.length + 1}`,
        },
      ];
      formik.setFieldValue(["authz", id, "dly"], 0, false);
      formik.setFieldValue(["authz", id, "type"], type, false);
      if (type === "author")
        formik.setFieldValue(["authz", id, "service"], "shell", false);
      setToEdit(newOrder[newOrder.length - 1]);
      return newOrder;
    });
  };

  const editReq = (set) => setToEdit(set);

  const saveReq = (set, { name, ...data }) => {
    formik.setFieldValue(["authz", set.id], data, false);
    const idx = order.findIndex((v) => v.id === set.id);
    order[idx].name = name;
    order[idx].dly = data.dly;
    setOrder([...order]);
    setToEdit(null);
  };

  const deleteReq = (set) => {
    const idx = order.findIndex((v) => v.id === set.id);
    formik.setFieldValue(["authz", set.id], undefined, false);
    formik.unregisterField(["authz", set.id]);

    setOrder([...order.slice(0, idx), ...order.slice(idx + 1)]);
  };

  return (
    <>
      <div className="form-group">
        <div className="form-group__text">
          <label htmlFor="_">
            Authorization requests
            {getIn(formik.values, "authz.order", []).length > 1
              ? ". You can re-order them by dragging."
              : ""}
          </label>
          {order.length ? (
            <SetActionsContext.Provider
              value={{
                editReq,
                deleteReq,
              }}
            >
              <RequestsList
                items={order}
                onSortEnd={onSortEnd}
                lockAxis="y"
                transitionDuration={300}
                useDragHandle
                helperClass="form-group panel--raised like-input-hover opacity-70"
              />
            </SetActionsContext.Provider>
          ) : (
            <Alert.Info>
              No requests yet, add if authorization is required.
            </Alert.Info>
          )}
        </div>
      </div>
      <div className="flex flex-center half-margin-top half-margin-bottom">
        <ButtonGroup>
          <Button.Light
            onClick={() => addReq("author")}
            className="flex-center"
          >
            Add authorization
            <span
              className="icon-add-outline qtr-margin-left"
              title="Add authorization"
            />
          </Button.Light>
          <Button.Light onClick={() => addReq("acct")} className="flex-center">
            Add accounting
            <span
              className="icon-add-outline qtr-margin-left"
              title="Add accounting"
            />
          </Button.Light>
        </ButtonGroup>
      </div>
      <EditModal
        set={toEdit}
        handleClose={() => setToEdit(null)}
        save={saveReq}
      />
    </>
  );
};

export default connect(Sequence);
