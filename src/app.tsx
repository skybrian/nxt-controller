import {h, render} from "preact";
import {Device} from "./device";
import {State} from "./state";
import {Connect, App} from "./view";

const main = async () => {
  const appElt = document.getElementById("app");

  const serial = navigator.serial;
  if (!serial) {
    render(<div>Web Serial API unavailable</div>, appElt)
    return;
  }

  let port = null as SerialPort;
  while (port == null) {
    await new Promise((resolve, _) => {
      render(<Connect onClick={resolve}/>, appElt)
    })
    port = await serial.requestPort();
  }

  const state = new State();
  const dev = new Device(port, state.deviceOutput);

  state.addEventListener("save", () => {
    const props = state.props;
    switch (props.deviceState.kind) {
      case "connecting":
        dev.connect();
    }
    render(<App {...props}/>, appElt);
  });

  state.start();
}

main();
