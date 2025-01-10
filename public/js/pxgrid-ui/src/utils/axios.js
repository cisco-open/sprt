import _axios from "axios";

_axios.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response.status === 401) {
      setTimeout(() => location.reload(), 3000);
      error.response.data.error = "Unauthorized";
      error.response.data.message = "Page will be reloaded in 3 seconds";
      return Promise.reject(error);
    } else {
      return Promise.reject(error);
    }
  }
);
