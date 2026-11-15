import { useState } from 'react';
import Screen from '../../components/Screen.jsx';
import Icon from '../../components/Icon.jsx';
import { Pill } from '../../components/ui.jsx';
import TwinPanel from './TwinPanel.jsx';

export default function Twin() {
  const [pid, setPid] = useState('alex');
  return (
    <Screen theme="evening" bg="linear-gradient(180deg,#0a1516,#0d1b1d 60%,#0b1819)">
      <div className="row-flex between" style={{ marginBottom: 12 }}>
        <div><div className="t-cap">Digital twin workspace</div><h1 className="h1" style={{ marginTop: 2 }}>Brain twin</h1></div>
        <Pill tone="amber" icon="FlaskConical">Experimental</Pill>
      </div>
      <TwinPanel patientId={pid} onPatient={setPid} />
    </Screen>
  );
}
