import { Canvas } from '@react-three/fiber';
import { GameLoop } from './game/GameLoop';
import { Hud } from './ui/Hud';

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04080f', touchAction: 'none' }}>
      <Canvas
        camera={{ position: [-6, 1.5, 9], fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#04080f']} />
        <fog attach="fog" args={['#04080f', 14, 30]} />
        <GameLoop />
      </Canvas>
      <Hud />
    </div>
  );
}
