export interface DeviceCall {
  kind: "calling",
  name: "playTone"
}

export type DeviceState = { kind: "start" }
  | { kind: "connecting" }
  | { kind: "ready" }
  | DeviceCall
  | { kind: "closing" }
  | { kind: "closed" }
  | { kind: "gone" }
  ;

export type Tab = "Buttons" | "Log";

export interface AppProps {
  deviceState: DeviceState,
  tab: Tab,
  log: string[]

  chooseTab: (tab: Tab) => void;
  playTone: () => void;
}

export interface DeviceOutput {
  commandDone(): void;
  deviceClosed(): void;
  deviceCrashed(message: any): void;
  log(line: string): void;
}

export class State extends EventTarget {
  private state = { kind: "start" } as DeviceState;
  private tab = "Log" as Tab;
  private output = [] as string[];

  get props(): AppProps {
    return {
      deviceState: this.state,
      tab: this.tab,
      log: this.output,

      chooseTab: (tab: Tab) => {
        this.tab = tab;
        this.render();
      },

      playTone: () => {
        if (this.state.kind == "ready") {
          this.stateChanged({kind: "calling", name: "playTone"});
        }
      }
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

  private stateChanged(state: DeviceState, options?: {message?: any}) {
    if (this.state.kind == state.kind) throw "invalid state change";

    this.state = state;
    switch (state.kind) {
      case "connecting":
        this.dispatchEvent(new CustomEvent("connect"));
        break;
      case "calling":
        this.dispatchEvent(new CustomEvent("call", {detail: state}));
        this.log(`*** calling ${state.name} ***`);
        return;
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
