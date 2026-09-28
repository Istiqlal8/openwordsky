// Earth-only extras for the surface view: ground cover around the player and distant woods.
import { EarthGrass } from './earth-grass.js';
import { FarForest } from './far-forest.js';

export class EarthWorld {
  constructor(view) {
    this.view = view;
    this.grass = new EarthGrass(view.scene, view.patch, view.props);
    this.forest = view.far ? new FarForest(view.scene) : null;
    this.forestDue = false; // rebuilt the frame after the far ring swaps, to spread the work
    if (view.far) view.far.onBuilt = () => { this.forestDue = true; };
  }

  // The terrain patch moved (or clear zones changed with a rebuild).
  recenter() { this.grass.invalidate(); }

  update(dt, cam) {
    this.grass.update(cam);
    this.forest?.update(this.view.center);
    if (this.forestDue) { this.forestDue = false; this.forest.rebuild(this.view.far.grid, this.view.h); }
  }

  dispose() {
    this.grass.dispose();
    this.forest?.dispose();
  }
}
