import React from "react";
import Link from "next/link";
import Head from "next/head";

import "../styles/global.css";
import { BLOCK_SIZE } from "../utils/constants";
import Block from "../components/Block";

const WALL_HEIGHT = BLOCK_SIZE() * 10;

const BLOCK_WIDTH = 5;
const BLOCK_HEIGHT = 10;
const FRANK_OFFSET = 2;
const TOTAL_BOOSTS = BLOCK_HEIGHT / 5;

const generateString = () =>
  Math.random()
    .toString(36)
    .substring(7);

const countBoosts = arr => {
  return arr.filter(a => a != undefined).length;
};

const generateBoosts = () => {
  const result = Array.apply(null, Array(BLOCK_HEIGHT));
  let i = Math.floor(1 + Math.random() * BLOCK_HEIGHT) % BLOCK_HEIGHT;
  while (countBoosts(result) < TOTAL_BOOSTS) {
    if (Math.random() > 0.95 && result[i] == null) {
      result[i] = Math.floor(Math.random() * (BLOCK_WIDTH - 2));
    }
    i = Math.floor(Math.random() * BLOCK_HEIGHT);
  }

  return result;
};

const getDistance = (a, b) => (b > a ? b - a : a - b);

export default class Game extends React.PureComponent {
  lastRender = 0;

  state = {
    top: -WALL_HEIGHT,
    frankY: 0,
    frankX: 1,
    frankPicture: 1,
    chars: generateString(),
    nextChars: generateString(),
    timer: null,
    boosts: generateBoosts(),
    finished: false
  };

  componentDidMount() {
    const zoomMultiplier = (window.innerHeight * window.innerWidth) / 921600;

    // document.body.style += `;transform:scale(${zoomMultiplier}, ${zoomMultiplier});`;

    this.update();

    this.registerKeyListeners();
  }

  componentWillUnmount() {
    this.update = () => {};
    this.disposeKeyListeners();
  }

  registerKeyListeners = () => {
    document.addEventListener("keydown", this.handleKeyDown);
  };

  disposeKeyListeners = () => {
    document.removeEventListener("keydown", this.handleKeyDown);
  };

  update = () => {
    const time = Date.now();
    const delta = this.lastRender ? time - this.lastRender : 0;

    this.lastRender = time;

    if (this.state.timer === null && !this.state.finished) {
      requestAnimationFrame(this.update);
    } else {
      this.setState(
        c => ({
          timer: c.timer + delta
        }),
        () => {
          requestAnimationFrame(this.update);
        }
      );
    }
  };

  handleKeyDown = e => {
    if (this.state.finished) {
      return;
    }

    const location = this.state.chars.indexOf(e.key);

    if (
      location > -1 &&
      location < 3 &&
      getDistance(location, this.state.frankX) < 2
    ) {
      const newState = {
        frankY: this.state.frankY + 1,
        frankX: location,
        frankPicture: Math.floor(Math.random() * 5),
        nextChars: generateString(),
        chars: this.state.nextChars
      };

      if (this.state.timer === null) {
        newState.timer = 0;
      }

      if (
        this.state.boosts[this.state.frankY + 1] !== undefined &&
        this.state.boosts[this.state.frankY + 1] === location
      ) {
        newState.timer = this.state.timer - 1000;
      }

      if (BLOCK_HEIGHT - 1 === this.state.frankY + 1) {
        newState.finished = true;
        this.update = () => {};

        import("confetti-js").then(x => {
          var confettiSettings = { target: "confetti" };
          var confetti = new ConfettiGenerator(confettiSettings);
          confetti.render();
        });
      }

      this.setState(newState);
    } else if (this.state.frankY > 0) {
      this.setState({ frankY: this.state.frankY - 1, chars: generateString() });
    }
  };

  render() {
    return (
      <div id="game">
        <canvas id="confetti" />

        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Patrick+Hand+SC|VT323"
            rel="stylesheet"
          />
        </Head>

        {this.state.finished && (
          <div
            style={{
              position: "fixed",
              top: 150,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: "12rem",
              fontFamily: "VT323",
              fontFeatureSettings: "tnum",
              fontVariantNumeric: "tabular-nums"
            }}
          >
            WINNER
          </div>
        )}

        <div
          style={{
            position: "fixed",
            top: 100,
            right: 100,
            fontSize: "6rem",
            fontFamily: "VT323",
            fontFeatureSettings: "tnum",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {this.state.timer && (this.state.timer / 1000).toFixed(2)}
        </div>
        <div
          style={{
            transform: `translateY(${BLOCK_SIZE() * this.state.frankY}px)`,
            display: "flex",

            flexDirection: "column-reverse"
          }}
        >
          {Array.apply(null, Array(FRANK_OFFSET)).map((a, i) => (
            <div key={i} style={{ display: "flex" }}>
              {Array.apply(null, Array(BLOCK_WIDTH)).map((b, j) => (
                <Block
                  key={i * BLOCK_HEIGHT + j}
                  index={i * BLOCK_HEIGHT + j}
                  left={j === 0}
                  right={j === BLOCK_WIDTH - 1}
                />
              ))}
            </div>
          ))}

          {Array.apply(null, Array(BLOCK_HEIGHT)).map((a, i) => (
            <div key={i} style={{ display: "flex" }}>
              {Array.apply(null, Array(BLOCK_WIDTH)).map((b, j) => {
                const left = j === 0;
                const right = j === BLOCK_WIDTH - 1;
                return (
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "center"
                    }}
                  >
                    {i === this.state.frankY && j - 1 === this.state.frankX && (
                      <img
                        src={`/static/frank${this.state.frankPicture}.png`}
                        style={{
                          position: "absolute",

                          height: BLOCK_SIZE(),
                          borderRadius: "100%",
                          zIndex: 100
                        }}
                      />
                    )}

                    {i > this.state.frankY &&
                      this.state.boosts[i] !== undefined &&
                      j - 1 === this.state.boosts[i] && (
                        <img
                          src={`/static/club_mate.png`}
                          style={{
                            position: "absolute",

                            height: BLOCK_SIZE() / 2,
                            borderRadius: "100%",
                            zIndex: 100
                          }}
                        />
                      )}

                    {i === this.state.frankY + 2 &&
                      getDistance(j - 1, this.state.frankX) < 2 &&
                      !right && (
                        <div
                          style={{
                            position: "absolute",
                            width: BLOCK_SIZE(),
                            height: BLOCK_SIZE(),
                            borderRadius: "100%",
                            zIndex: 100,
                            fontSize: BLOCK_SIZE() / 2,
                            fontWeight: 800,
                            fontFamily: "Patrick Hand SC",
                            textAlign: "center",
                            color: "rgba(0, 0, 0, 0.15)"
                          }}
                        >
                          {typeof window !== "undefined" &&
                            this.state.nextChars[j - 1]}
                        </div>
                      )}

                    {i === this.state.frankY + 1 &&
                      getDistance(j - 1, this.state.frankX) < 2 &&
                      !right && (
                        <div
                          style={{
                            position: "absolute",
                            width: BLOCK_SIZE(),
                            height: BLOCK_SIZE(),
                            borderRadius: "100%",
                            zIndex: 100,
                            fontSize: BLOCK_SIZE() / 2,
                            fontWeight: 800,
                            fontFamily: "Patrick Hand SC",
                            textAlign: "center",
                            color: "rgba(0, 0, 0, 0.6)"
                          }}
                        >
                          {typeof window !== "undefined" &&
                            this.state.chars[j - 1]}
                        </div>
                      )}
                    <Block
                      key={i * BLOCK_HEIGHT + j}
                      index={i * BLOCK_HEIGHT + j}
                      left={left}
                      right={right}
                      top={i === BLOCK_HEIGHT - 1}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ position: "relative" }}>
            <img
              style={{
                position: "absolute",
                width: BLOCK_SIZE(),
                height: BLOCK_SIZE(),
                bottom: 0
              }}
              src="/static/flag_yellow.png"
            />
            <img
              style={{
                position: "absolute",
                right: 0,
                width: BLOCK_SIZE(),
                height: BLOCK_SIZE(),
                transform: "scaleX(-1)",
                bottom: 0
              }}
              src="/static/flag_red.png"
            />
          </div>
        </div>
      </div>
    );
  }
}
