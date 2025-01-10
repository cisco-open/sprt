import "react";

export const userRegex = new RegExp(
  `${globals.rest.jobs.base}(?:user/([^/]+)/)?`
);
