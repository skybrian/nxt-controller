import {h, render} from "preact";
import {Device, DeviceOutput} from "./device";

const Connect = (props: {onClick: (_) => void}) => {
  return <button onClick={props.onClick}>Connect</button>
}

const App = (props: {log: string[]}) => {
  return <div>
    {props.log.map((line) => <div>{line}</div>)}
  </div>
}

const appElt = document.getElementById("app");

const output = [] as string[];

const log = (message: string) => {
  output.push(message);
  render(<App log={output}/>, appElt);
}

class State implements DeviceOutput {
  deviceOpened(): boolean {
    log("*** opened ***");
    return true;
  }
  sentCommand(name: string) {
    log(`*** called: ${name} ***`)
  }
  deviceClosed(): void {
    log("*** closed ***");
  }
  deviceCrashed(message: any): void {
    log(`*** failed: ${message} ***`);
  }
  pushDeviceOutput(line: string): void {
    log(line);
  }
}

const main = async () => {
  const serial = navigator.serial;
  if (!serial) {
    log("bluetooth API unavailable");
    return;
  }

  let port = null as SerialPort;
  while (port == null) {
    await new Promise((resolve, _) => {
      render(<Connect onClick={resolve}/>, appElt)
    })
    port = await serial.requestPort();
  }

  const dev = new Device(port, new State());
  dev.start();
}

main();
