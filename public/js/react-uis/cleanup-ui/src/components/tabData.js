import React from "react";

import { Sessions } from "./Sessions";
import { Flows } from "./Flows";
import { CLIs } from "./CLIs";
import { Procs } from "./Procs";
import { Settings } from "./Settings";
import { Schedules } from "./Schedules";

export const pathPrefix = "/cleanup";

export const tabData = [
  {
    path: "sessions",
    component: <Sessions />,
    title: "Outdated Sessions",
    checker: true,
  },
  {
    path: "flows",
    component: <Flows />,
    title: "Orphaned Flows",
    checker: true,
  },
  {
    path: "clis",
    component: <CLIs />,
    title: "Orphaned CLIs",
    checker: true,
  },
  {
    path: "procs",
    component: <Procs />,
    title: "Running Processes",
    checker: true,
  },
  {
    path: "schedules",
    component: <Schedules />,
    title: "Scheduled",
    checker: true,
  },
  {
    path: "settings",
    component: <Settings />,
    title: "Settings",
    checker: false,
  },
];
