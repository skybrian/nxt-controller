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
  deviceOpened(): boolean;
  sentCommand(name: DeviceCommand): void;
  deviceClosed(): void;
  deviceCrashed(message: any): void;
  pushDeviceOutput(line: string): void;
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
      deviceOpened: (): boolean => {
        this.stateChanged({kind: "ready"})
        return true;
      },
      sentCommand: (name: DeviceCommand) => {
        this.stateChanged({kind: "calling", name: name})
        this.log(`*** called: ${name} ***`)
      },
      deviceClosed: (): void => {
        this.stateChanged({kind: "closed"});
      },
      deviceCrashed: (message: any): void => {
        this.stateChanged({kind: "gone"}, {message: message})
        this.log(`*** failed: ${message} ***`);
      },
      pushDeviceOutput: (line: string): void => {
        this.log(line);
      }
    }
  }

  start() {
    this.stateChanged({kind: "connecting"});
  }

  private stateChanged(state: DeviceState, options?: {message?: any}) {
    this.state = state;
    const message = options?.message ?? state.kind;
    this.log(`*** ${message} ***`)
  }

  private log(message: string) {
    this.output.push(message);
    this.save();
  }

  private save() {
    this.dispatchEvent(new CustomEvent("save"));
  }
}
