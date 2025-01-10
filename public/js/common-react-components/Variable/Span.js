import React from "react";

const Span = ({ f }) => {
  if (f.name === "head") {
    return (
      <p className="half-margin-top">
        <span className="text-muted">How it works: </span>
        <span>{f.value}</span>
      </p>
    );
  } else {
    return <p>{f.value}</p>;
  }
};

export default Span;
