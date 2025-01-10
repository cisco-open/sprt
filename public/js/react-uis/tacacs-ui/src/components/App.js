import React from "react";
import ReactModal from "react-modal";
import { Formik, Form } from "formik";

import {
  BrowserRouter,
  useParams,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import {
  Spinner as Loader,
  Alert,
  Button,
  ToastContainer,
  toast,
} from "react-cui-2.0";

import Portal from "portal";

import { getTacacsOptions, startTacacs } from "../actions";
import { OptionsContext } from "../contexts";

import ErrorFocus from "./common/ErrorFocus";
import General from "./General";
import UserData from "./UserData";
import Commands from "./Commands";
import Authen from "./Authen";
import Author from "./Author";
import Scheduler from "./Scheduler";
import { ApiCheck } from "./Api";

const DEFAULT_TABS = [
  {
    link: "/",
    name: "general",
    display: "General",
    component: General,
    mapping: [/^nad/, /^server/, /^generation/],
  },
  {
    link: "/user/",
    name: "user",
    display: "User Data",
    component: UserData,
    mapping: [/^auth[.]credentials/, /^auth[.]ip/],
  },
  {
    link: "/authen/",
    name: "authen",
    display: "Authentication",
    component: Authen,
    mapping: [/^auth[.]/],
  },
  {
    link: "/commands/",
    name: "commands",
    display: "Command sets",
    component: Commands,
    mapping: [/^commands[.]/],
  },
  {
    link: "/author/",
    name: "author",
    display: "Authorization & Accounting",
    component: Author,
    mapping: [/^authz[.]/],
  },
  {
    link: "/scheduler/",
    name: "scheduler",
    display: "Scheduler",
    component: Scheduler,
    mapping: [/^scheduler[.]/],
  },
];

const StartButton = ({ isSubmitting }) => (
  <div className="section section--compressed non-removable base-margin-bottom">
    <div className="text-center">
      <Button color="primary" type="submit" disabled={isSubmitting}>
        Start
        {isSubmitting ? (
          <span className="icon-animation spin qtr-margin-left" />
        ) : null}
      </Button>
    </div>
  </div>
);

const Tab = ({ tab: { name, component } }) => {
  const { tab } = useParams();
  return (
    <div
      className={`tab-pane${
        name === tab || (!tab && name === "general") ? " active" : ""
      }`}
    >
      {React.createElement(component, {})}
    </div>
  );
};

export default () => {
  React.useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  const [tabs, setTabs] = React.useState(DEFAULT_TABS);

  const [options, setOptions] = React.useState({ loading: "loading" });

  const load = async () => {
    setOptions({ loading: "loading" });
    try {
      setOptions(await getTacacsOptions());
    } catch (error) {
      setOptions({ error });
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  if (options.loading)
    return (
      <div className="section sticky">
        <Loader />
      </div>
    );

  if (options.error) {
    return (
      <Alert type="error" title="Operation failed">
        {`Couldn't get TACACS+ options: ${options.error.message}`}
      </Alert>
    );
  }

  return (
    <OptionsContext.Provider
      value={{
        ...options,
        setOption: (name, value) =>
          setOptions((curr) => ({ ...curr, [name]: value })),
      }}
    >
      <BrowserRouter basename="/tacacs">
        <Formik
          initialValues={{}}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              if (values.auth.credentials.limit_sessions)
                values.generation.amount = 1;
              const result = await startTacacs(values);
              if (result.data && result.data.status === "ok")
                toast.success("", "Started");
            } catch (e) {
              toast.error("Error", e.data.error || e.message, false);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => {
            const { pathname } = useLocation();
            return (
              <Form>
                <div className="section">
                  <div className="row">
                    <div className="col-md-4 col-lg-3 col-xl-2 fixed-left-lg-up">
                      <div className="subheader base-margin-left hidden-sm-down">
                        Parameters
                      </div>
                      <ul className="tabs tabs--vertical">
                        {tabs.map((t) => (
                          <li
                            key={`tacacs-tab-${t.name}`}
                            className={`tab ${
                              t.link === pathname ? "active" : ""
                            }`}
                          >
                            <Link to={t.link} onClick={t.onClick}>
                              {t.display}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="col-md-8 col-lg-9 col-xl-10 offset-xl-2 offset-lg-3">
                      <div className="tab-content">
                        <Route path="/:tab?" strict>
                          {tabs.map((t) => (
                            <Tab key={`tacacs-tab-${t.name}`} tab={t} />
                          ))}
                        </Route>
                      </div>
                    </div>
                  </div>
                </div>
                <StartButton isSubmitting={isSubmitting} />
                <ErrorFocus tabs={tabs} />
                <ApiCheck addTab={(tab) => setTabs((curr) => [...curr, tab])} />
              </Form>
            );
          }}
        </Formik>
        <Portal id="toast-portal">
          <ToastContainer />
        </Portal>
      </BrowserRouter>
    </OptionsContext.Provider>
  );
};
