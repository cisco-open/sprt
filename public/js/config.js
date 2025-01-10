var base_rest_path = "/";
var globals = {
  rest: {
    base: base_rest_path,
    sessions: base_rest_path + "manipulate/",
    tacacs_sessions: base_rest_path + "manipulate/server/tacacs/",
    generate: base_rest_path + "generate/",
    cleanups: base_rest_path + "cleanup/",
    logs: base_rest_path + "logs/",
    preferences: {
      base: base_rest_path + "preferences/",
      save: base_rest_path + "preferences/save/",
      guest: {
        sms: base_rest_path + "guest/sms/",
        sms_examples: base_rest_path + "guest/sms/examples/"
      },
      api: base_rest_path + "api-settings/"
    },
    cert: {
      base: base_rest_path + "cert/",
      details: base_rest_path + "cert/details/",
      attribute: base_rest_path + "cert/attribute/",
      scep: base_rest_path + "cert/scep/",
      trusted: base_rest_path + "cert/trusted/",
      identity: base_rest_path + "cert/identity/",
      templates: base_rest_path + "cert/templates/"
    },
    servers: {
      base: base_rest_path + "servers/",
      server: base_rest_path + "servers/id/",
      groups: base_rest_path + "servers/groups/",
      dropdown: base_rest_path + "servers/dropdown/"
    },
    jobs: {
      base: base_rest_path + "jobs/",
      manipulate: base_rest_path + "jobs/id/",
      all: base_rest_path + "jobs/id/all/"
    },
    dictionaries: {
      base: base_rest_path + "dictionaries/",
      by_type: base_rest_path + "dictionaries/type/",
      by_name: base_rest_path + "dictionaries/name/",
      by_id: base_rest_path + "dictionaries/id/",
      multiple: base_rest_path + "dictionaries/ids/",
      new: base_rest_path + "dictionaries/new/"
    },
    pxgrid: {
      base: base_rest_path + "pxgrid/",
      get_connections: base_rest_path + "pxgrid/get-connections/",
      connection: base_rest_path + "pxgrid/connections/"
    }
  },
  current_base: base_rest_path,
  current_tab: ""
};
