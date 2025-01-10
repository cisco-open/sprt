// import "@babel/polyfill";
import React from "react";
import ReactDOM from "react-dom";
import ReactModal from "react-modal";
import { Route, Router, Switch } from "react-router-dom";
import { connect, Provider } from "react-redux";
import { ToastContainer } from "react-cui-2.0";

import history from "./history";
import AddConnection from "./components/addConnection";
import ViewConnection from "./components/viewConnection";
import NotFound from "./components/notFound";
import ConnectionCardList from "./components/connectionCards";
import store from "./store";

require("./utils/axios");

ReactModal.setAppElement("body");

const AppComponent = () => (
  <Router history={history}>
    <>
      <Switch>
        <Route exact path="/pxgrid/" component={ConnectionCardList} />
        <Route exact path="/pxgrid/add/" component={AddConnection} />
        <Route
          path="/pxgrid/connections/:id([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})"
          component={ViewConnection}
        />
        <Route component={NotFound} />
      </Switch>
      <ToastContainer />
    </>
  </Router>
);

const mapStateToProps = (state) => {
  return {
    connections: state.connections,
  };
};

const App = connect(mapStateToProps)(AppComponent);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("react-app")
);
