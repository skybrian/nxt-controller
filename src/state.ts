export type DeviceCommand = "getFirmwareVersion";

export type DeviceState = { kind: "start" }
  | { kind: "connecting" }
  | { kind: "ready" }
  | { kind: "calling", name: DeviceCommand }
  | { kind: "closing" }
  | { kind: "closed" }
  | { kind: "gone" }
  ;

export interface AppProps {
  deviceState: DeviceState,
  log: string[]
}

export interface DeviceOutput {
  commandDone(): void;
  deviceClosed(): void;
  deviceCrashed(message: any): void;
  log(line: string): void;
}

export class State extends EventTarget {
  private state = { kind: "start" } as DeviceState;
  private output = [] as string[];

  get props(): AppProps {
    return {
      deviceState: this.state,
      log: this.output
    }
  }

  get deviceOutput(): DeviceOutput {
    return {
      commandDone: () => {
        this.stateChanged({kind: "ready"});
      },
      deviceClosed: (): void => {
        this.stateChanged({kind: "closed"});
      },
      deviceCrashed: (message: any): void => {
        this.stateChanged({kind: "gone"}, {message: message})
      },
      log: (line: string): void => {
        this.log(line);
      }
    }
  }

  start() {
    this.stateChanged({kind: "connecting"});
  }

  private stateChanged(state: DeviceState, options?: {message?: any, detail?: any}) {
    if (this.state.kind == state.kind) throw "invalid state change";

    this.state = state;
    switch (state.kind) {
      case "connecting":
        this.dispatchEvent(new CustomEvent("connecting"));
        break;

    }

    const message = options?.message ?? state.kind;
    this.log(`*** ${message} ***`)
  }

  private log(message: string) {
    this.output.push(message);
    this.render();
  }

  private render() {
    this.dispatchEvent(new CustomEvent("render"));
  }
}
