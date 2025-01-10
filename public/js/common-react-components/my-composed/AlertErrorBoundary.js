import React from "react";
import { Alert } from "react-cui-2.0";

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error);
    console.warn(errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <Alert.Error title="Error">Something went wrong.</Alert.Error>;
    }

    return this.props.children;
  }
}

export default Boundary;
