import React from "react";

export default ({ f: { grouper, accent } }) => {
  if (grouper) {
    return (
      <div
        className={
          "flex flex-center-vertical grouper" +
          (accent ? " grouper--accent" : "")
        }
      >
        <span className="grouper__title half-margin-right">{grouper}</span>
        <hr className="flex-fill" />
      </div>
    );
  }
  return <hr />;
};
