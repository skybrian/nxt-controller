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

  state.addEventListener("connect", () => dev.connect());
  state.addEventListener("call", (e: CustomEvent) => dev.startCall(e.detail));
  state.addEventListener("render", () => render(<App {...state.props}/>, appElt));

  state.start();
}

main();
