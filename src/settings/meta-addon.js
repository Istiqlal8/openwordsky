// One addon entry for the player-facing meta layer: tutorial, achievements, settings menu.
import { Onboarding } from '../tutorial/onboarding.js';
import { AchieveAddon } from '../achieve/achieve-addon.js';
import { SettingsAddon } from './settings-addon.js';

function loadCss() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'src/ui/meta.css';
  document.head.append(link);
}

export class MetaAddon {
  constructor(w) {
    loadCss();
    this.tutorial = new Onboarding(w);
    this.achieve = new AchieveAddon(w);
    this.settings = new SettingsAddon(w, this.tutorial);
    this.settings.onOpen = () => this.tutorial.mark('settings');
  }

  update(input, w) {
    this.settings.update(input, w);
    this.achieve.update(input, w);
    this.tutorial.update(input, w);
  }

  arrived(planet) { this.achieve.arrived(planet); }
}
