import React from "react";
import { BLOCK_SIZE } from "../utils/constants";

export default class Block extends React.Component {
  shouldComponentUpdate() {
    return false;
  }

  getTile = () => {
    let basis = "";
    if (this.props.top) {
      basis = "_top";
    }
    if (this.props.left) {
      return basis + "_left";
    }

    if (this.props.right) {
      return basis + "_right";
    }

    if (basis) {
      return basis + "_mid";
    }

    if (Math.random() > 0.7) {
      return 1;
    }

    if (Math.random() > 0.7) {
      return 2;
    }

    return 0;
  };

  render() {
    const { children } = this.props;
    return (
      <div
        style={{
          position: "relative",
          width: BLOCK_SIZE(),
          height: BLOCK_SIZE(),
          backgroundImage: `url(/static/tile${this.getTile()}.png)`,

          backgroundSize: BLOCK_SIZE()
        }}
      >
        {children}
      </div>
    );
  }
}
