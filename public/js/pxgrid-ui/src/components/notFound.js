import React from "react";
import { Link, withRouter } from "react-router-dom";
import posed, { PoseGroup } from "react-pose";

const Container = posed.div({
  enter: { opacity: 1 },
  exit: { opacity: 0 },
});

const NotFound = () => (
  <PoseGroup animateOnMount>
    <Container key="notfound" className="flex-center" style={{ flex: "1" }}>
      <div>
        <h2 className="text-danger">Sorry, error 404</h2>
        <h5 className="subheading">Page not found</h5>
        <p>How did you get here?</p>
        <p>
          <Link to="/pxgrid/">Go home</Link>
        </p>
      </div>
    </Container>
  </PoseGroup>
);

export default withRouter(NotFound);
