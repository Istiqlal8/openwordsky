# Open World Sky

A tiny No Man's Sky: fly between 4,096 star systems (starting in our own
Solar System) and land on ~14,000 procedurally generated planets. Every planet has its own biome, colors,
terrain, weather, flora, fauna and resources, all derived from one seed.
No image or audio files: every asset is generated in code.
Works on phones too (touch controls appear automatically).

## Run
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Controls
| Key | Space | Surface |
|---|---|---|
| Mouse | look | look |
| W A S D | thrust / strafe | walk |
| R / C | up / down | - |
| Z / X | roll | - |
| Shift | boost | sprint |
| Space | pulse drive | jump, hold for jetpack |
| E | land (or fly into the atmosphere) | board/leave your ship |
| T | - | interact (tame a creature, read ruins) |
| N | minimap zoom | minimap zoom |
| F | scan | scan |
| M | galaxy map | - |
| Left mouse | laser | mining beam |
| Right mouse | homing rocket | blaster |
| V | chase / cockpit camera | first / third person |
| H | hangar | - |
| G | - | recharge suit |
| Tab / I | inventory | inventory |

See [PRD.md](PRD.md) for scope and architecture.
