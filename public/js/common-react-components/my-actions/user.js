import axios from "axios";

import { updateHeaders } from "./headers";

export const login = async (password) => {
  const r = await axios.post(
    "/auth/login/",
    { password },
    { headers: updateHeaders }
  );

  return r.data;
};

export const logout = () => {
  window.location.href = "/auth/logout/";
};
