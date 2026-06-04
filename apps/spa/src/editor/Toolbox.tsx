import { BackgroundControl } from './controls/BackgroundControl.js';
import { ResolutionControl } from './controls/ResolutionControl.js';
import { ShapeControl } from './controls/ShapeControl.js';

export function Toolbox() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BackgroundControl />
      <ShapeControl />
      <ResolutionControl />
    </div>
  );
}
