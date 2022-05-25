import {h} from "preact";
import {AppProps} from "./state";
import {TabView} from "./tabs";

export const Connect = (props: {onClick: (_) => void}) => {
  return <div class="connect-view">
      <button onClick={props.onClick}>Connect</button>
   </div>
}

export const App = (props: AppProps) => {
  return <TabView labels={["Log", "Buttons"]} selected={props.tab} chooseTab={props.chooseTab} >
    <LogView log={props.log}/>
    <div>
      <div>
        <button onClick={props.playTone} disabled={props.deviceState.kind != "ready"}>Play Tone</button>
      </div>
      <div>
        Motor A:
          <button onClick={(e) => props.runMotor("a")} disabled={props.deviceState.kind != "ready"}>Run</button>
          <button onClick={(e) => props.idleMotor("a")} disabled={props.deviceState.kind != "ready"}>Idle</button>
      </div>
    </div>
  </TabView>
}

export const LogView = (props: {log: string[]}) => {
  return <div>
    {props.log.map((line) => <div>{line}</div>)}
  </div>
}
