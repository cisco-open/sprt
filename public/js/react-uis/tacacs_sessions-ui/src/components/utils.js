import "react";

export const srvRegex = new RegExp(
  `${globals.rest.tacacs_sessions}([^/]+)/(?:bulk/([^/]+)/)?`
);
