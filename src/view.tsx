import {h} from "preact";
import {AppProps, MotorPorts} from "./state";
import {TabView} from "./tabs";

export const Connect = (props: {onClick: (_) => void}) => {
  return <div class="connect-view">
      <button class="pure-button pure-button-primary" onClick={props.onClick}>Connect</button>
   </div>
}

export const App = (props: AppProps) => {
  return <TabView labels={["Log", "Buttons"]} selected={props.tab} chooseTab={props.chooseTab} >
    <LogView log={props.log}/>
    <div>
      <div>
        <button class="pure-button" onClick={props.playTone} disabled={props.deviceState.kind != "ready"}>Play Tone</button>
      </div>
      <div>
        {MotorPorts.map((port) =>
          <div class="motor-row">
            Motor {port}: <button class="pure-button" onClick={(e) => props.runMotor(port)} disabled={props.deviceState.kind != "ready"}
            >Run</button> <button class="pure-button" onClick={(e) => props.idleMotor(port)} disabled={props.deviceState.kind != "ready"}
            >Idle</button>
          </div>
        )}
      </div>
    </div>
  </TabView>
}

export const LogView = (props: {log: string[]}) => {
  return <div>
    {props.log.map((line) => <div>{line}</div>)}
  </div>
}
