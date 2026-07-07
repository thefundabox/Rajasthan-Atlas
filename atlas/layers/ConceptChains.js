/**
 * ConceptChains — declarative learning chains rendered as clickable step pills.
 * Each step is a real feature; clicking it selects the feature on the map.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';

/**
 * The chain library. Each chain tells a spatial story from climate through
 * soil and vegetation to the flagship protected area(s).
 */
export const CHAINS = [
  {
    id: 'arid-syndrome',
    title: 'The Arid Syndrome',
    story: 'How aridity produces the Thar\'s signature landscape',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-arid',       label: 'Arid Climate' },
      { layerId: 'rainfall',        featureId: 'rainfall-lt-200',            label: '< 200 mm rainfall' },
      { layerId: 'soil-types',      featureId: 'soil-types-desert',          label: 'Desert soils' },
      { layerId: 'vegetation',      featureId: 'vegetation-thorn-forest',    label: 'Thorn forest' },
      { layerId: 'vegetation',      featureId: 'vegetation-grassland',       label: 'Sewan grasslands' },
      { layerId: 'national-parks',  featureId: 'desert-np',                  label: 'Desert National Park' },
    ],
  },
  {
    id: 'aravalli-tiger',
    title: 'The Aravalli Tiger Corridor',
    story: 'Semi-arid climate, red-loamy soils, dry-deciduous forest — the fabric of the tiger landscape',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-semi-arid',  label: 'Semi-arid Climate' },
      { layerId: 'physiography',    featureId: 'physiography-aravalli-hills-region', label: 'Aravalli Hills' },
      { layerId: 'soil-types',      featureId: 'soil-types-red-loamy',       label: 'Red loamy soils' },
      { layerId: 'vegetation',      featureId: 'vegetation-dry-deciduous',   label: 'Dry deciduous forest' },
      { layerId: 'tiger-reserves',  featureId: 'sariska-tr',                 label: 'Sariska Tiger Reserve' },
      { layerId: 'tiger-reserves',  featureId: 'ranthambore-tr',             label: 'Ranthambore Tiger Reserve' },
    ],
  },
  {
    id: 'humid-southeast',
    title: 'The Humid South-East',
    story: 'Where the monsoon reaches Rajasthan strongest',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-humid-pocket', label: 'Humid pocket' },
      { layerId: 'rainfall',        featureId: 'rainfall-gt-1000',           label: '> 1000 mm rainfall' },
      { layerId: 'physiography',    featureId: 'physiography-southern-hills-region', label: 'Southern hills / Mahi basin' },
      { layerId: 'soil-types',      featureId: 'soil-types-mixed-red-black', label: 'Mixed red-black soils' },
      { layerId: 'vegetation',      featureId: 'vegetation-dry-mixed',       label: 'Dry mixed forest' },
      { layerId: 'wildlife-sanctuaries', featureId: 'sitamata-wls',          label: 'Sitamata WLS' },
      { layerId: 'wildlife-sanctuaries', featureId: 'phulwari-ki-nal-wls',   label: 'Phulwari ki Nal WLS' },
    ],
  },
  {
    id: 'chambal-network',
    title: 'The Chambal Water Network',
    story: 'From the Chambal River to its downstream conservation footprint',
    steps: [
      { layerId: 'drainage-basins', featureId: 'drainage-basins-chambal',    label: 'Chambal Basin' },
      { layerId: 'rivers',          featureId: 'chambal-river',              label: 'Chambal River' },
      { layerId: 'vegetation',      featureId: 'vegetation-riparian',        label: 'Riparian vegetation' },
      { layerId: 'wildlife-sanctuaries', featureId: 'national-chambal-wls',  label: 'National Chambal WLS' },
      { layerId: 'tiger-reserves',  featureId: 'mukundra-hills-tr',          label: 'Mukundra Hills TR' },
      { layerId: 'tiger-reserves',  featureId: 'dholpur-karauli-tr',         label: 'Dholpur–Karauli TR' },
    ],
  },
  {
    id: 'wetland-birds',
    title: 'The Ramsar Wetland Story',
    story: 'Rajasthan\'s wetlands — from an inland salt lake to Bharatpur\'s bird paradise',
    steps: [
      { layerId: 'drainage-basins', featureId: 'drainage-basins-interior-drainage', label: 'Interior drainage' },
      { layerId: 'ramsar-sites',    featureId: 'sambhar-ramsar',             label: 'Sambhar Ramsar (1990)' },
      { layerId: 'ramsar-sites',    featureId: 'keoladeo-ramsar',            label: 'Keoladeo Ramsar (1981)' },
      { layerId: 'ramsar-sites',    featureId: 'khichan-ramsar',             label: 'Khichan Ramsar (2025)' },
      { layerId: 'ramsar-sites',    featureId: 'menar-ramsar',               label: 'Menar Ramsar (2025)' },
      { layerId: 'vegetation',      featureId: 'vegetation-wetland',         label: 'Wetland vegetation' },
    ],
  },
  {
    id: 'hadoti-plateau',
    title: 'The Hadoti Black-Soil Plateau',
    story: 'Vertisols meet the Chambal — how the SE plateau feeds Rajasthan\'s soybean and orange belt',
    steps: [
      { layerId: 'physiography',    featureId: 'physiography-southeastern-plateau-region', label: 'SE Plateau (Hadoti)' },
      { layerId: 'soil-types',      featureId: 'soil-types-black',           label: 'Black cotton soils' },
      { layerId: 'agro-climatic-zones', featureId: 'agro-climatic-zones-5',  label: 'Zone V (humid SE)' },
      { layerId: 'rainfall',        featureId: 'rainfall-700-1000',          label: '700-1000 mm rainfall' },
      { layerId: 'national-parks',  featureId: 'mukundra-hills-np',          label: 'Mukundra Hills NP' },
    ],
  },
  {
    id: 'canal-command',
    title: 'The Canal Command (IGNP)',
    story: 'How the Indira Gandhi Canal turned hyper-arid districts into wheat–cotton fields',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-arid',       label: 'Arid climate baseline' },
      { layerId: 'agro-climatic-zones', featureId: 'agro-climatic-zones-1b', label: 'Zone IB (Irrigated NW)' },
      { layerId: 'drainage-basins', featureId: 'drainage-basins-ghaggar',    label: 'Ghaggar basin' },
      { layerId: 'desertification', featureId: 'desertification-moderate',   label: 'Moderate desertification' },
    ],
  },
];

/**
 * Render the chain library as scrollable card set. Used by RevisionDashboard.
 */
export function renderConceptChains() {
  const wrap = el('div', { class: 'concept-chains' });
  for (const chain of CHAINS) {
    const card = el('div', { class: 'chain-card' });
    card.append(el('h3', { class: 'chain-title' }, [chain.title]));
    card.append(el('p',   { class: 'chain-story' }, [chain.story]));
    const steps = el('div', { class: 'chain-steps' });
    chain.steps.forEach((s, i) => {
      if (i > 0) steps.append(el('span', { class: 'chain-arrow' }, ['→']));
      const btn = el('button', {
        class: `chain-step chip-${s.layerId}`,
        title: s.label,
        onclick: () => {
          Atlas.interaction.select(s.layerId, s.featureId);
          document.querySelector('.revision-overlay')?.classList.remove('open');
        },
      }, [s.label]);
      steps.append(btn);
    });
    card.append(steps);
    wrap.append(card);
  }
  return wrap;
}
