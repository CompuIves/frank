import React from "react";
import Link from "next/link";
import Head from "next/head";
import PubNub from "pubnub";

import "../styles/global.css";
import { BLOCK_SIZE } from "../utils/constants";
import Block from "../components/Block";

const WALL_HEIGHT = BLOCK_SIZE() * 10;

const BLOCK_WIDTH = 5;
const BLOCK_HEIGHT = 10;
const FRANK_OFFSET = 2;
const TOTAL_BOOSTS = BLOCK_HEIGHT / 5;

Math.seedrandom(`frank${Math.floor(Date.now() / (1000 * 60))}`);

const MY_ID = Math.floor(Math.random() * 10000);

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

const INITIAL_STATE = {
  top: -WALL_HEIGHT,
  frankY: 0,
  frankX: 1,
  otherFranks: [],
  frankPicture: 1,
  chars: generateString(),
  nextChars: generateString(),
  timer: null,
  boosts: generateBoosts(),
  finished: false,
  notification: null,
  history: [],
  ghostFrank: {
    x: -1,
    y: -1
  },
  bonus: 0
};

export default class Game extends React.PureComponent {
  lastRender = 0;

  state = INITIAL_STATE;

  showNotification = msg => {
    this.setState({ notification: msg });

    clearTimeout(this.notificationTimeout);

    this.notificationTimeout = setTimeout(() => {
      this.setState({ notification: null });
    }, 5000);
  };

  componentDidMount() {
    const zoomMultiplier = (window.innerHeight * window.innerWidth) / 921600;

    // document.body.style += `;transform:scale(${zoomMultiplier}, ${zoomMultiplier});`;

    this.update();

    this.registerKeyListeners();

    const pubnub = new PubNub({
      publishKey: "pub-c-3f722022-dbf9-408b-b5a1-5884f28b6f77",
      subscribeKey: "sub-c-b0160ba0-3793-11e9-b5cf-1e59042875b2"
    });

    this.pubnub = pubnub;

    const publishSampleMessage = () => {
      const publishConfig = {
        channel: "hello_world",
        message: {
          type: "join",
          sender: MY_ID,
          x: this.state.frankX,
          y: this.state.frankY
        }
      };
      pubnub.publish(publishConfig, function(status, response) {
        console.log(status, response);
      });
    };

    pubnub.addListener({
      status: function(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") {
          publishSampleMessage();
        }
      },
      message: msg => {
        if (msg.message.sender !== MY_ID) {
          if (msg.message.type === "frankPos") {
            this.setState({
              otherFranks: {
                ...this.state.otherFranks,
                [msg.message.sender]: {
                  x: msg.message.x,
                  y: msg.message.y
                }
              }
            });
          } else if (msg.message.type === "join") {
            this.showNotification(
              `Frank ${msg.message.sender} joined the game!`
            );

            this.setState({
              otherFranks: {
                ...this.state.otherFranks,
                [msg.message.sender]: {
                  x: msg.message.x,
                  y: msg.message.y
                }
              }
            });

            this.pubnub.publish({
              channel: "hello_world",
              message: {
                type: "frankPos",
                x: this.state.frankX,
                y: this.state.frankY,
                sender: MY_ID
              }
            });
          }
        }
      },
      presence: presenceEvent => {
        // handle presence
      }
    });

    pubnub.subscribe({
      channels: ["hello_world"]
    });
    window.pubnub = pubnub;
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

    const newState = {};

    if (this.state.timer !== null && !this.state.finished) {
      newState.timer = this.state.timer + delta;
    }

    const previousHistory = JSON.parse(localStorage.getItem("ghost"));

    let currentCoordinate = null;
    if (previousHistory) {
      for (let i = 0; i < previousHistory.history.length; i++) {
        if (previousHistory.history[i]) {
          if (this.state.timer > previousHistory.history[i].time) {
            if (
              !previousHistory.history[i + 1] ||
              previousHistory.history[i + 1].time > this.state.timer
            ) {
              currentCoordinate = {
                x: previousHistory.history[i].frankX,
                y: previousHistory.history[i].frankY
              };
            }
          }
        }
      }
    }

    if (currentCoordinate) {
      newState.ghostFrank = currentCoordinate;
    }

    this.setState(newState, () => {
      requestAnimationFrame(this.update);
    });
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
      const frankY = this.state.frankY + 1;
      const frankX = location;
      const history = [
        ...this.state.history,
        { time: this.state.timer || 0, frankX, frankY }
      ];

      const newState = {
        frankY,
        frankX,
        frankPicture: Math.floor(Math.random() * 5),
        nextChars: generateString(),
        chars: this.state.nextChars,
        history
      };

      if (this.state.timer === null) {
        newState.timer = 0;
      }

      if (
        this.state.boosts[this.state.frankY + 1] !== undefined &&
        this.state.boosts[this.state.frankY + 1] === location
      ) {
        newState.bonus = this.state.bonus + 1000;
      }

      if (BLOCK_HEIGHT - 1 === this.state.frankY + 1) {
        // WINNER WINNER CHICKEN DINNER
        const winnerTime = this.state.timer - this.state.bonus;

        const previousHistory = JSON.parse(localStorage.getItem("ghost"));

        if (!previousHistory || previousHistory.time > winnerTime) {
          localStorage.setItem(
            "ghost",
            JSON.stringify({ time: winnerTime, history })
          );
        }

        newState.finished = true;

        import("confetti-js").then(x => {
          var confettiSettings = { target: "confetti" };
          var confetti = new ConfettiGenerator(confettiSettings);
          confetti.render();
        });
      }

      var publishConfig = {
        channel: "hello_world",
        message: {
          type: "frankPos",
          x: newState.frankX,
          y: newState.frankY,
          sender: MY_ID
        }
      };
      this.pubnub.publish(publishConfig, function(status, response) {
        console.log(status, response);
      });

      this.setState(newState);
    } else if (this.state.frankY > 0) {
      this.setState({
        frankY: this.state.frankY - 1,
        chars: generateString(),
        history: [
          ...this.state.history,
          {
            time: this.state.timer || 0,
            frankX: this.state.frankX,
            frankY: this.state.frankY - 1
          }
        ]
      });
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
          <script src="/static/seedrandom.js" />
        </Head>

        {this.state.finished && (
          <div>
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
              <p
                style={{ fontSize: "6rem", cursor: "pointer", marginTop: 0 }}
                onClick={() => this.setState(INITIAL_STATE)}
              >
                Play Again
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 100,
            fontSize: "3rem",
            fontFamily: "VT323",
            fontFeatureSettings: "tnum",
            fontVariantNumeric: "tabular-nums",
            zIndex: 300
          }}
        >
          {this.state.notification}
        </div>

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
          {this.state.timer &&
            ((this.state.timer - this.state.bonus) / 1000).toFixed(2)}
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
                    {i === this.state.ghostFrank.y &&
                      j - 1 === this.state.ghostFrank.x && (
                        <img
                          src={`/static/frank${this.state.frankPicture}.png`}
                          style={{
                            position: "absolute",

                            height: BLOCK_SIZE(),
                            borderRadius: "100%",
                            zIndex: 100,
                            opacity: 0.5,
                            filter:
                              "sepia(100%) hue-rotate(190deg) grayscale(100%)"
                          }}
                        />
                      )}

                    {Object.keys(this.state.otherFranks).map(
                      f =>
                        i === this.state.otherFranks[f].y &&
                        j - 1 === this.state.otherFranks[f].x && (
                          <img
                            src={`/static/frank${this.state.frankPicture}.png`}
                            style={{
                              position: "absolute",

                              height: BLOCK_SIZE(),
                              borderRadius: "100%",
                              zIndex: 100,
                              filter:
                                "sepia(100%) hue-rotate(190deg) saturate(500%)"
                            }}
                          />
                        )
                    )}

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
