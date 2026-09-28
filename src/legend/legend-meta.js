// Meta addon (src/game/addons.js): legend journal card, riding (H), photo mode (P) and photo
// challenges. Keys run here because meta addons get the input and update after the surface
// view, wildlife and pets, right before the frame is rendered.
import { LegendJournal } from './legend-journal.js';
import { RideControl } from '../ride/ride-control.js';
import { PhotoMode } from '../photo/photo-mode.js';
import { PhotoJournal } from '../photo/photo-journal.js';

export class LegendMeta {
  constructor(wiring) {
    this.legends = new LegendJournal(wiring);
    this.ride = new RideControl(wiring);
    this.photo = new PhotoMode(wiring, this.ride);
    this.photos = new PhotoJournal(wiring);
    wiring.panel.sections.push({ journal: () => this.legends.card() }, { journal: () => this.photos.card() });
  }

  update(input) {
    this.ride.update(input);
    this.photo.update(input);
  }

  departed() {
    this.ride.dismount();
    this.photo.dispose();
  }
}
